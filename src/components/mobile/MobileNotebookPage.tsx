import React, { useState, useMemo } from 'react';
import {
  Search,
  BookOpen,
  GraduationCap,
  Target,
  FileText,
  Loader2,
  ArrowLeft,
} from 'lucide-react';
import { useLocalizedNavigate } from '../../hooks/useLocalizedNavigate';
import { useQuery } from 'convex/react';
import { qRef } from '../../utils/convexRefs';
import NoteDetailModal from '../notebook/NoteDetailModal';
import { useTranslation } from 'react-i18next';
import { Sheet, SheetContent, SheetPortal } from '../ui';
import { Button } from '../ui';
import { Input } from '../ui';

interface Note {
  id: string;
  type: string;
  title: string;
  preview: string | null;
  tags: string[];
  createdAt: string;
}

export const MobileNotebookPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useLocalizedNavigate();

  const tabs = useMemo(
    () => [
      { key: 'ALL', label: t('notes.tabs.all', { defaultValue: 'All' }), icon: FileText },
      {
        key: 'GRAMMAR',
        label: t('notes.tabs.grammar', { defaultValue: 'Grammar' }),
        icon: GraduationCap,
      },
      {
        key: 'MISTAKE',
        label: t('notes.tabs.wrong', { defaultValue: 'Mistakes' }),
        icon: Target,
      },
    ],
    [t]
  );

  const [activeTab, setActiveTab] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);

  // Data Fetching
  const type = activeTab === 'ALL' ? undefined : activeTab;
  const notebooksResult = useQuery(
    qRef<{ type?: string }, { success: boolean; data?: any[] }>('notebooks:list'),
    { type }
  );

  const loading = notebooksResult === undefined;
  const notes: Note[] = useMemo(() => {
    if (!notebooksResult?.data) return [];
    return notebooksResult.data.map((n: any) => ({
      id: String(n.id),
      type: n.type,
      title: n.title,
      preview: n.preview ?? null,
      tags: n.tags,
      createdAt: n.createdAt,
    }));
  }, [notebooksResult]);

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

  return (
    <div className="min-h-[100dvh] bg-muted flex flex-col">
      {/* Header */}
      <div className="bg-card border-b border-border p-4 sticky top-0 z-10">
        <div className="flex items-center gap-3 mb-4">
          <Button
            variant="ghost"
            size="auto"
            onClick={() => navigate('/dashboard')}
            className="p-2 -ml-2"
          >
            <ArrowLeft className="w-6 h-6 text-foreground" />
          </Button>
          <h1 className="text-xl font-black text-foreground">
            {t('notes.title', { defaultValue: 'Notebook' })}
          </h1>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={t('notes.searchPlaceholder', { defaultValue: 'Search notes...' })}
            className="w-full bg-muted h-10 rounded-xl pl-9 pr-4 text-sm font-bold placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-indigo-100"
          />
        </div>

        {/* Tabs */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <Button
                variant="ghost"
                size="auto"
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all border ${
                  isActive
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-200'
                    : 'bg-card text-muted-foreground border-border'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </Button>
            );
          })}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 p-4">
        {loading ? (
          <div className="py-20 flex justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
          </div>
        ) : filteredNotes.length === 0 ? (
          <div className="py-20 text-center text-muted-foreground">
            <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-bold">{t('notes.noNotes', { defaultValue: 'No notes found' })}</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {filteredNotes.map(note => (
              <Button
                variant="ghost"
                size="auto"
                key={note.id}
                onClick={() => setSelectedNoteId(note.id)}
                className="bg-card p-4 rounded-2xl border-2 border-border shadow-[2px_2px_0px_0px_rgba(0,0,0,0.05)] active:scale-[0.98] transition-all text-left"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-bold text-foreground line-clamp-1 text-lg">{note.title}</h3>
                  <span className="text-[10px] font-bold px-2 py-1 bg-muted text-muted-foreground rounded-md shrink-0">
                    {note.type}
                  </span>
                </div>
                {note.preview && (
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-3 leading-relaxed">
                    {note.preview}
                  </p>
                )}
                <div className="flex gap-2 flex-wrap">
                  {note.tags.map(tag => (
                    <span
                      key={tag}
                      className="text-xs font-bold text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-md"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </Button>
            ))}
          </div>
        )}
      </div>

      {/* Detail Sheet/Modal */}
      <Sheet open={selectedNoteId !== null} onOpenChange={open => !open && setSelectedNoteId(null)}>
        <SheetPortal>
          <SheetContent
            unstyled
            forceMount
            closeOnEscape={false}
            lockBodyScroll={false}
            className="fixed inset-0 z-50 bg-card md:hidden transition-transform duration-300 data-[state=open]:translate-y-0 data-[state=closed]:translate-y-[105%] data-[state=closed]:pointer-events-none"
          >
            {selectedNoteId && (
              <div className="h-full overflow-y-auto">
                <div className="sticky top-0 bg-card border-b p-4 flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="auto"
                    onClick={() => setSelectedNoteId(null)}
                    className="p-2 -ml-2 bg-muted rounded-full"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </Button>
                  <span className="font-bold">
                    {t('notes.details', { defaultValue: 'Note Details' })}
                  </span>
                </div>
                <NoteDetailModal
                  noteId={selectedNoteId}
                  onClose={() => setSelectedNoteId(null)}
                  onDelete={() => {}} // Auto refresh
                />
              </div>
            )}
          </SheetContent>
        </SheetPortal>
      </Sheet>
    </div>
  );
};
