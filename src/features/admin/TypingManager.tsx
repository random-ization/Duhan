import React, { useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Id } from '../../../convex/_generated/dataModel';
import { Type, Plus, Search, ChevronDown, Loader2 } from 'lucide-react';
import { TypingImporter, TypingTextData } from './TypingImporter';
import { TypingList } from './TypingList';

export const TypingManager: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'WORD' | 'SENTENCE' | 'ARTICLE'>('WORD');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [isImporterOpen, setIsImporterOpen] = useState(false);
  const [editingText, setEditingText] = useState<any>(null);

  // Queries
  const textsResult = useQuery(api.typing.listTexts, {
    type: activeTab,
    paginationOpts: { numItems: 100, cursor: null },
  });
  const categories = useQuery(api.typing.listCategories) || [];

  // Mutations
  const createText = useMutation(api.typing.createText);
  const updateText = useMutation(api.typing.updateText);
  const deleteText = useMutation(api.typing.deleteText);

  // Derived categories from actual data if API list is empty or for fallback
  const availableCategories =
    categories.length > 0
      ? categories
      : Array.from(
        new Set(textsResult?.page.map((t: any) => t.category).filter(Boolean) as string[])
      );

  // Filtered data
  const filteredTexts = textsResult?.page.filter((text: any) => {
    const matchesSearch =
      text.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (text.content.length < 100 && text.content.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = availableCategories.includes(selectedCategory)
      ? text.category === selectedCategory
      : true;
    return matchesSearch && matchesCategory;
  });

  const handleDelete = async (id: Id<'typing_texts'>) => {
    if (confirm('确定要删除这条内容吗？')) {
      await deleteText({ id });
    }
  };

  const handleSave = async (data: TypingTextData) => {
    try {
      if (editingText) {
        await updateText({
          id: editingText._id,
          ...data,
        });
      } else {
        await createText(data);
      }
      setIsImporterOpen(false);
      setEditingText(null);
    } catch (error) {
      console.error('Failed to save:', error);
      alert('保存失败，请重试');
    }
  };

  const renderContent = () => {
    if (textsResult === undefined) {
      return (
        <div className="p-12 flex justify-center text-zinc-400">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      );
    }

    if (filteredTexts?.length === 0) {
      return (
        <div className="p-12 text-center text-zinc-400 italic">暂无内容，点击右上角新建</div>
      );
    }

    return (
      <TypingList
        texts={filteredTexts || []}
        onEdit={text => {
          setEditingText(text);
          setIsImporterOpen(true);
        }}
        onDelete={handleDelete}
      />
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-zinc-900 flex items-center gap-2">
          <Type className="w-8 h-8" />
          打字练习管理
        </h2>
        <button
          onClick={() => {
            setEditingText(null);
            setIsImporterOpen(true);
          }}
          className="bg-zinc-900 text-white px-4 py-2 rounded-xl font-medium flex items-center gap-2 hover:bg-zinc-800 transition shadow-lg shadow-zinc-900/10"
        >
          <Plus size={18} />
          新建内容
        </button>
      </div>

      <div className="bg-white rounded-2xl border-2 border-zinc-900 shadow-[6px_6px_0px_0px_#18181B] overflow-hidden">
        {/* Tabs */}
        <div className="flex border-b-2 border-zinc-900 bg-zinc-50">
          <button
            onClick={() => setActiveTab('WORD')}
            className={`flex-1 py-4 text-center font-bold text-sm uppercase tracking-wide transition-colors ${activeTab === 'WORD' ? 'bg-white text-zinc-900' : 'text-zinc-500 hover:text-zinc-700'
              }`}
          >
            单词 (Word)
          </button>
          <div className="w-[2px] bg-zinc-900" />
          <button
            onClick={() => setActiveTab('SENTENCE')}
            className={`flex-1 py-4 text-center font-bold text-sm uppercase tracking-wide transition-colors ${activeTab === 'SENTENCE'
              ? 'bg-white text-zinc-900'
              : 'text-zinc-500 hover:text-zinc-700'
              }`}
          >
            句子 (Sentence)
          </button>
          <div className="w-[2px] bg-zinc-900" />
          <button
            onClick={() => setActiveTab('ARTICLE')}
            className={`flex-1 py-4 text-center font-bold text-sm uppercase tracking-wide transition-colors ${activeTab === 'ARTICLE'
              ? 'bg-white text-zinc-900'
              : 'text-zinc-500 hover:text-zinc-700'
              }`}
          >
            长文 (Article)
          </button>
        </div>

        {/* Toolbar */}
        <div className="p-4 border-b-2 border-zinc-900 bg-white flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 w-4 h-4" />
            <input
              type="text"
              placeholder="搜索标题或内容..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-lg border-2 border-zinc-200 focus:border-zinc-900 focus:outline-none transition-colors"
              aria-label="搜索标题或内容"
            />
          </div>
          <div className="relative">
            <select
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
              className="appearance-none pl-4 pr-10 py-2 rounded-lg border-2 border-zinc-200 focus:border-zinc-900 focus:outline-none bg-white transition-colors"
              aria-label="选择分类"
            >
              <option value="">所有分类</option>
              {availableCategories.map(cat => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 w-4 h-4 pointer-events-none" />
          </div>
        </div>

        {/* List */}
        <div className="overflow-x-auto">{renderContent()}</div>
      </div>

      {/* Import/Edit Modal */}
      {isImporterOpen && (
        <TypingImporter
          initialData={editingText}
          type={activeTab}
          onSave={handleSave}
          onClose={() => {
            setIsImporterOpen(false);
            setEditingText(null);
          }}
        />
      )}
    </div>
  );
};
