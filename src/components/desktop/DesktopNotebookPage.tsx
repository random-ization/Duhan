import React, { useState, useMemo } from 'react';
import { Search, BookOpen, GraduationCap, Target, FileText, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocalizedNavigate } from '../../hooks/useLocalizedNavigate';
import { useQuery } from 'convex/react';
import NoteCard from '../notebook/NoteCard';
import NoteDetailModal from '../notebook/NoteDetailModal';
import { qRef } from '../../utils/convexRefs';

// Tab configuration
const TABS = [
  { key: 'ALL', label: '全部', icon: FileText },
  { key: 'GRAMMAR', label: '语法', icon: GraduationCap },
  { key: 'MISTAKE', label: 'TOPIK', icon: Target },
];

interface Note {
  id: string;
  type: string;
  title: string;
  preview: string | null;
  tags: string[];
  createdAt: string;
}

export const DesktopNotebookPage: React.FC = () => {
  const navigate = useLocalizedNavigate();

  const [activeTab, setActiveTab] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);

  // 使用Convex获取笔记列表
  const type = activeTab === 'ALL' ? undefined : activeTab;
  const notebooksResult = useQuery(
    qRef<
      { type?: string },
      {
        success: boolean;
        data?: Array<{
          id: string;
          type: string;
          title: string;
          preview?: string | null;
          tags: string[];
          createdAt: string;
        }>;
      }
    >('notebooks:list'),
    { type }
  );
  const loading = notebooksResult === undefined;
  const notes: Note[] = useMemo(() => {
    if (!notebooksResult?.data) return [];
    return notebooksResult.data.map(n => ({
      id: String(n.id),
      type: n.type,
      title: n.title,
      preview: n.preview ?? null,
      tags: n.tags,
      createdAt: n.createdAt,
    }));
  }, [notebooksResult]);

  // Filter notes by search query
  const filteredNotes = useMemo(() => {
    if (!searchQuery.trim()) return notes;
    const q = searchQuery.toLowerCase();
    return notes.filter(
      n =>
        n.title.toLowerCase().includes(q) ||
        n.preview?.toLowerCase().includes(q) ||
        n.tags.some(t => t.toLowerCase().includes(q))
    );
  }, [notes, searchQuery]);

  // Handle delete (Convex will auto-refresh the list)
  const handleDelete = (_id: string) => {
    // List will auto-refresh via Convex subscription
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
        </div>
      );
    }

    if (filteredNotes.length === 0) {
      return <EmptyState hasFilter={searchQuery.trim().length > 0 || activeTab !== 'ALL'} />;
    }

    return (
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
      >
        <AnimatePresence mode="popLayout">
          {filteredNotes.map(note => (
            <NoteCard key={note.id} {...note} onClick={() => setSelectedNoteId(note.id)} />
          ))}
        </AnimatePresence>
      </motion.div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white/80 backdrop-blur-lg border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">智能笔记本</h1>
              <p className="text-sm text-slate-500">你的学习笔记和生词收藏</p>
            </div>
            <button
              onClick={() => navigate('/dashboard')}
              className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors"
            >
              返回
            </button>
          </div>

          {/* Tabs & Search */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            {/* Tabs */}
            <div className="flex gap-2 overflow-x-auto scrollbar-hide">
              {TABS.map(tab => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                      isActive
                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Search */}
            <div className="flex-1 sm:max-w-xs">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="搜索笔记..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-100 border-0 rounded-lg text-sm focus:ring-2 focus:ring-indigo-200 focus:bg-white transition-all"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">{renderContent()}</div>

      {/* Detail Modal */}
      {selectedNoteId && (
        <NoteDetailModal
          noteId={selectedNoteId}
          onClose={() => setSelectedNoteId(null)}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
};

// Empty state component
const EmptyState: React.FC<{ hasFilter: boolean }> = ({ hasFilter }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="flex flex-col items-center justify-center py-20 text-center"
  >
    <div className="w-24 h-24 bg-indigo-100 rounded-full flex items-center justify-center mb-6">
      <BookOpen className="w-12 h-12 text-indigo-400" />
    </div>
    <h3 className="text-xl font-bold text-slate-700 mb-2">
      {hasFilter ? '没有找到匹配的笔记' : '笔记本是空的'}
    </h3>
    <p className="text-slate-500 max-w-sm">
      {hasFilter
        ? '尝试调整搜索条件或切换分类'
        : '在复习模式中选中文字，点击「存入生词本」即可保存'}
    </p>
  </motion.div>
);
