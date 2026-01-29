import React, { useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Id } from '../../../convex/_generated/dataModel';
import { Type, Trash2, Plus, Search, Edit2, ChevronDown, Loader2, Globe, Lock } from 'lucide-react';
import { TypingImporter, TypingTextData } from './TypingImporter';

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
            className={`flex - 1 py - 4 text - center font - bold text - sm uppercase tracking - wide transition - colors ${
              activeTab === 'WORD' ? 'bg-white text-zinc-900' : 'text-zinc-500 hover:text-zinc-700'
            } `}
          >
            单词 (Word)
          </button>
          <div className="w-[2px] bg-zinc-900" />
          <button
            onClick={() => setActiveTab('SENTENCE')}
            className={`flex - 1 py - 4 text - center font - bold text - sm uppercase tracking - wide transition - colors ${
              activeTab === 'SENTENCE'
                ? 'bg-white text-zinc-900'
                : 'text-zinc-500 hover:text-zinc-700'
            } `}
          >
            句子 (Sentence)
          </button>
          <div className="w-[2px] bg-zinc-900" />
          <button
            onClick={() => setActiveTab('ARTICLE')}
            className={`flex - 1 py - 4 text - center font - bold text - sm uppercase tracking - wide transition - colors ${
              activeTab === 'ARTICLE'
                ? 'bg-white text-zinc-900'
                : 'text-zinc-500 hover:text-zinc-700'
            } `}
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
            />
          </div>
          <div className="relative">
            <select
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
              className="appearance-none pl-4 pr-10 py-2 rounded-lg border-2 border-zinc-200 focus:border-zinc-900 focus:outline-none bg-white transition-colors"
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
        <div className="overflow-x-auto">
          {textsResult === undefined ? (
            <div className="p-12 flex justify-center text-zinc-400">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
          ) : filteredTexts?.length === 0 ? (
            <div className="p-12 text-center text-zinc-400 italic">暂无内容，点击右上角新建</div>
          ) : (
            <table className="w-full text-left">
              <thead className="bg-zinc-50 border-b-2 border-zinc-900">
                <tr>
                  <th className="px-6 py-3 font-black text-xs uppercase text-zinc-500 tracking-wider">
                    标题
                  </th>
                  <th className="px-6 py-3 font-black text-xs uppercase text-zinc-500 tracking-wider">
                    分类
                  </th>
                  <th className="px-6 py-3 font-black text-xs uppercase text-zinc-500 tracking-wider">
                    状态
                  </th>
                  <th className="px-6 py-3 font-black text-xs uppercase text-zinc-500 tracking-wider text-right">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {filteredTexts?.map(text => (
                  <tr key={text._id} className="group hover:bg-zinc-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-zinc-900">{text.title}</div>
                      <div className="text-xs text-zinc-500 mt-0.5 truncate max-w-[300px]">
                        {text.description ||
                          (text.type !== 'ARTICLE' ? text.content : 'No description')}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {text.category ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-md bg-indigo-50 text-indigo-700 text-xs font-bold border border-indigo-100">
                          {text.category}
                        </span>
                      ) : (
                        <span className="text-zinc-400 text-xs">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {text.isPublic ? (
                        <span className="inline-flex items-center gap-1 text-green-600 text-xs font-bold">
                          <Globe size={12} /> 公开
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-zinc-400 text-xs font-bold">
                          <Lock size={12} /> 私密
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => {
                            setEditingText(text);
                            setIsImporterOpen(true);
                          }}
                          className="p-2 rounded-lg bg-white border border-zinc-200 text-zinc-600 hover:border-zinc-900 hover:text-zinc-900 shadow-sm"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(text._id)}
                          className="p-2 rounded-lg bg-white border border-zinc-200 text-red-500 hover:border-red-500 hover:bg-red-50 shadow-sm"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
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
