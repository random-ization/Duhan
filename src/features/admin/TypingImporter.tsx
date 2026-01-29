import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

export interface TypingTextData {
  title: string;
  content: string;
  type: 'WORD' | 'SENTENCE' | 'ARTICLE';
  description?: string;
  category?: string;
  difficulty?: number; // 1-5
  isPublic: boolean;
  tags?: string[];
  source?: string;
}

interface TypingImporterProps {
  initialData?: any;
  type: 'WORD' | 'SENTENCE' | 'ARTICLE';
  onSave: (data: TypingTextData) => Promise<void>;
  onClose: () => void;
}

export const TypingImporter: React.FC<TypingImporterProps> = ({
  initialData,
  type: initialType,
  onSave,
  onClose,
}) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<TypingTextData>({
    title: '',
    content: '',
    type: initialType,
    description: '',
    category: '',
    difficulty: 3,
    isPublic: true,
    tags: [],
    source: '',
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        title: initialData.title,
        content: initialData.content,
        type: initialData.type,
        description: initialData.description || '',
        category: initialData.category || '',
        difficulty: initialData.difficulty || 3,
        isPublic: initialData.isPublic ?? true,
        tags: initialData.tags || [],
        source: initialData.source || '',
      });
    } else {
      // Reset type when modal opens new
      setFormData(prev => ({ ...prev, type: initialType }));
    }
  }, [initialData, initialType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.content) return;

    setLoading(true);
    try {
      await onSave(formData);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-4xl bg-white rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
          <div>
            <h3 className="text-xl font-black text-zinc-900">
              {initialData ? '编辑内容' : '新建内容'}
            </h3>
            <p className="text-sm text-zinc-500 mt-1">
              {formData.type === 'ARTICLE' ? '上传文章' : '批量添加单词或句子'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 transition"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8">
          <form id="typing-form" onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-zinc-700">标题</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  placeholder="例如：常用韩语口语100句"
                  className="w-full px-4 py-3 rounded-xl border-2 border-zinc-200 focus:border-zinc-900 focus:outline-none transition font-medium"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-zinc-700">类型</label>
                <select
                  value={formData.type}
                  onChange={e => setFormData({ ...formData, type: e.target.value as any })}
                  className="w-full px-4 py-3 rounded-xl border-2 border-zinc-200 focus:border-zinc-900 focus:outline-none transition font-medium bg-white"
                >
                  <option value="WORD">单词 (Word)</option>
                  <option value="SENTENCE">句子 (Sentence)</option>
                  <option value="ARTICLE">长文 (Article)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-zinc-700">分类 (可选)</label>
                <div className="relative">
                  <input
                    type="text"
                    list="category-suggestions"
                    value={formData.category}
                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                    placeholder="例如：K-Pop, Proverbs"
                    className="w-full px-4 py-3 rounded-xl border-2 border-zinc-200 focus:border-zinc-900 focus:outline-none transition font-medium"
                  />
                  <datalist id="category-suggestions">
                    <option value="Basic" />
                    <option value="Business" />
                    <option value="K-Pop" />
                    <option value="Literature" />
                    <option value="News" />
                  </datalist>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-zinc-700">难度 (1-5)</label>
                <input
                  type="number"
                  min="1"
                  max="5"
                  value={formData.difficulty}
                  onChange={e => setFormData({ ...formData, difficulty: Number(e.target.value) })}
                  className="w-full px-4 py-3 rounded-xl border-2 border-zinc-200 focus:border-zinc-900 focus:outline-none transition font-medium"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-zinc-700">状态</label>
                <div className="flex items-center gap-4 px-1 py-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={formData.isPublic}
                      onChange={() => setFormData({ ...formData, isPublic: true })}
                      className="w-5 h-5 accent-zinc-900"
                    />
                    <span className="font-medium">公开</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={!formData.isPublic}
                      onChange={() => setFormData({ ...formData, isPublic: false })}
                      className="w-5 h-5 accent-zinc-900"
                    />
                    <span className="font-medium text-zinc-500">私密</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-zinc-700">描述 (可选)</label>
              <input
                type="text"
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                placeholder="简短描述这段内容的用途或来源..."
                className="w-full px-4 py-3 rounded-xl border-2 border-zinc-200 focus:border-zinc-900 focus:outline-none transition font-medium"
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-end">
                <label className="text-sm font-bold text-zinc-700">
                  内容
                  <span className="text-zinc-400 font-normal ml-2 text-xs">
                    {formData.type === 'ARTICLE' ? '(完整文章文本)' : '(每行一个，空行会被忽略)'}
                  </span>
                </label>
                {formData.type !== 'ARTICLE' && (
                  <span className="text-xs text-indigo-600 font-bold bg-indigo-50 px-2 py-1 rounded-md">
                    支持批量粘贴
                  </span>
                )}
              </div>
              <textarea
                required
                value={formData.content}
                onChange={e => setFormData({ ...formData, content: e.target.value })}
                placeholder={
                  formData.type === 'ARTICLE'
                    ? '请粘贴文章内容...'
                    : 'Word 1\nWord 2\nSentence 1...'
                }
                className="w-full h-64 px-4 py-3 rounded-xl border-2 border-zinc-200 focus:border-zinc-900 focus:outline-none transition font-mono text-sm leading-relaxed resize-none"
              />
              <p className="text-xs text-zinc-400">{formData.content.length} characters</p>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-zinc-100 flex justify-end gap-3 bg-zinc-50/50">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-3 rounded-xl font-bold text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700 transition"
          >
            取消
          </button>
          <button
            type="submit"
            form="typing-form"
            disabled={loading}
            className="px-8 py-3 rounded-xl bg-zinc-900 text-white font-bold hover:bg-zinc-800 active:scale-95 transition shadow-lg shadow-zinc-900/10 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading && (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            )}
            {initialData ? '保存修改' : '确认创建'}
          </button>
        </div>
      </div>
    </div>
  );
};
