import React, { useState } from 'react';
import { useAction, useMutation, useQuery } from 'convex/react';
import { Button, Input, Textarea } from '../../components/ui';
import { DesktopCard } from '../../components/desktop/ui/DesktopCard';
import { HanjaSeal } from '../../components/desktop/ui/HanjaSeal';
import { DesignChip } from '../../components/desktop/ui/DesignChip';
import { notify } from '../../utils/notify';
import {
  ArrowLeft,
  Save,
  Sparkles,
  BookOpen,
  Clock,
  BarChart3,
  ChevronRight,
  Link2,
  FileText,
  PlayCircle,
  CheckCircle2,
  FolderOpen,
  CalendarDays,
  TrendingUp,
} from 'lucide-react';
import { useLocalizedNavigate } from '../../hooks/useLocalizedNavigate';
import { Id } from '../../../convex/_generated/dataModel';
import type { ImportedContentSentenceRecord } from '../../../convex/importedContent';
import { IMPORTED_CONTENT, READING_PROGRESS } from '../../utils/convexRefs';
import type { ImportedContentUrlImportResult } from '../../../convex/contentImport/shared';
import { clsx } from 'clsx';

type ImportMode = 'text' | 'url';
type SentenceQueueFilter = 'all' | 'pending' | 'saved';
type ContentLibraryFilter = 'all' | 'inProgress' | 'completed';
type ContentSourceFilter = 'all' | 'text' | 'url';
type ContentFolderFilter = 'all' | 'uncategorized' | string;

const TextImportPage: React.FC = () => {
  const navigate = useLocalizedNavigate();
  const [importMode, setImportMode] = useState<ImportMode>('text');
  const [title, setTitle] = useState('');
  const [rawText, setRawText] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [sentenceQueueFilter, setSentenceQueueFilter] = useState<SentenceQueueFilter>('all');
  const [contentLibraryFilter, setContentLibraryFilter] = useState<ContentLibraryFilter>('all');
  const [contentSourceFilter, setContentSourceFilter] = useState<ContentSourceFilter>('all');
  const [contentTagFilter, setContentTagFilter] = useState<string>('all');
  const [contentFolderFilter, setContentFolderFilter] = useState<ContentFolderFilter>('all');
  const [tagDrafts, setTagDrafts] = useState<Record<string, string>>({});
  const [folderDrafts, setFolderDrafts] = useState<Record<string, string>>({});
  const [isImporting, setIsImporting] = useState(false);
  const [importResultId, setImportResultId] = useState<Id<'imported_contents'> | null>(null);

  const importMutation = useMutation(IMPORTED_CONTENT.importTextContent);
  const updateContentTags = useMutation(IMPORTED_CONTENT.updateContentTags);
  const updateContentFolder = useMutation(IMPORTED_CONTENT.updateContentFolder);
  const updateReadingProgress = useMutation(READING_PROGRESS.updateProgress);
  const markReadingCompleted = useMutation(READING_PROGRESS.markCompleted);
  const importFromUrl = useAction(IMPORTED_CONTENT.importFromUrl);
  const importedContent = useQuery(
    IMPORTED_CONTENT.getImportedContentWithSentences,
    importResultId ? { contentId: importResultId } : 'skip'
  );
  const readingProgress = useQuery(
    READING_PROGRESS.getProgress,
    importResultId ? { contentType: 'imported_content', contentId: String(importResultId) } : 'skip'
  );
  const recentStudyStates = useQuery(IMPORTED_CONTENT.listStudyStates, { limit: 12 });

  const resetDraft = (nextMode: ImportMode) => {
    setImportMode(nextMode);
    setTitle('');
    setRawText('');
    setSourceUrl('');
  };

  const handleImport = async () => {
    if (importMode === 'text' && (!title.trim() || !rawText.trim())) {
      notify.info('请输入标题和内容');
      return;
    }

    if (importMode === 'url' && !sourceUrl.trim()) {
      notify.info('请输入可访问的文章来源 URL');
      return;
    }

    setIsImporting(true);
    try {
      let contentId: Id<'imported_contents'>;

      if (importMode === 'text') {
        contentId = await importMutation({
          title: title.trim(),
          rawText,
        });
      } else {
        const result: ImportedContentUrlImportResult = await importFromUrl({
          url: sourceUrl.trim(),
          customTitle: title.trim() || undefined,
        });

        if (!result.success) {
          notify.info('链接内容不足，暂时无法导入，请换一个更完整的页面');
          return;
        }

        contentId = result.contentId;
      }

      setImportResultId(contentId);
      setSentenceQueueFilter('pending');
      notify.success('内容已成功导入并开始分析');
    } catch (error) {
      console.error(error);
      notify.error('导入失败，请重试');
    } finally {
      setIsImporting(false);
    }
  };

  const savedSentenceIdSet = new Set(importedContent?.savedSentenceIds ?? []);
  const totalSentenceCount =
    importedContent?.sentences?.length ?? importedContent?.sentenceCount ?? 0;
  const completedSentenceCount = Math.min(
    totalSentenceCount,
    Math.max(readingProgress?.completedSentenceCount ?? 0, savedSentenceIdSet.size)
  );
  const readingProgressPercent =
    totalSentenceCount > 0 ? Math.round((completedSentenceCount / totalSentenceCount) * 100) : 0;
  const isContentCompleted = Boolean(readingProgress?.completedAt);
  const readingResumeSentenceId = importedContent?.sentences?.find(
    sentence => sentence.sentenceIndex > completedSentenceCount
  )?._id;
  const resumeSentenceId = isContentCompleted
    ? undefined
    : (readingResumeSentenceId ?? importedContent?.nextSentenceId);
  const filteredSentences = importedContent?.sentences?.filter(sentence => {
    const isSaved = savedSentenceIdSet.has(String(sentence._id));
    if (sentenceQueueFilter === 'saved') return isSaved;
    if (sentenceQueueFilter === 'pending') return !isSaved;
    return true;
  });
  const sourceFilteredStudyStates =
    recentStudyStates?.filter(item => {
      if (contentSourceFilter === 'url') return item.sourceType === 'URL';
      if (contentSourceFilter === 'text') return item.sourceType !== 'URL';
      return true;
    }) ?? [];
  const allContentTags = Array.from(
    new Set(sourceFilteredStudyStates.flatMap(item => item.tags ?? []))
  ).sort((a, b) => a.localeCompare(b));
  const allContentFolders = Array.from(
    new Set(
      sourceFilteredStudyStates
        .map(item => item.folderName?.trim())
        .filter((folderName): folderName is string => Boolean(folderName))
    )
  ).sort((a, b) => a.localeCompare(b));
  const librarySummary = {
    total: sourceFilteredStudyStates.length,
    inProgress: sourceFilteredStudyStates.filter(item => !item.readingCompletedAt).length,
    completed: sourceFilteredStudyStates.filter(item => Boolean(item.readingCompletedAt)).length,
  };
  const libraryOutcomeSummary = sourceFilteredStudyStates.reduce(
    (summary, item) => ({
      savedSentenceCount: summary.savedSentenceCount + item.savedSentenceCount,
      savedWordCount: summary.savedWordCount + item.savedWordCount,
      savedGrammarCount: summary.savedGrammarCount + item.savedGrammarCount,
      readingTimeSeconds: summary.readingTimeSeconds + item.readingTimeSeconds,
    }),
    {
      savedSentenceCount: 0,
      savedWordCount: 0,
      savedGrammarCount: 0,
      readingTimeSeconds: 0,
    }
  );
  const libraryOutcomeAssetCount =
    libraryOutcomeSummary.savedSentenceCount +
    libraryOutcomeSummary.savedWordCount +
    libraryOutcomeSummary.savedGrammarCount;
  const libraryCompletionRate =
    librarySummary.total > 0
      ? Math.round((librarySummary.completed / librarySummary.total) * 100)
      : 0;
  const activeReadingPlanItems = sourceFilteredStudyStates.filter(
    item => !item.readingCompletedAt && item.remainingSentenceCount > 0
  );
  const libraryReadingPlanSummary = activeReadingPlanItems.reduce(
    (summary, item) => ({
      contentCount: summary.contentCount + 1,
      remainingSentenceCount: summary.remainingSentenceCount + item.remainingSentenceCount,
      dailySentenceTarget: summary.dailySentenceTarget + item.dailySentenceTarget,
      completionWithinSevenDays:
        summary.completionWithinSevenDays + (item.estimatedStudyDays <= 7 ? 1 : 0),
    }),
    {
      contentCount: 0,
      remainingSentenceCount: 0,
      dailySentenceTarget: 0,
      completionWithinSevenDays: 0,
    }
  );
  const estimatedReadingPlanDays =
    libraryReadingPlanSummary.dailySentenceTarget > 0
      ? Math.ceil(
          libraryReadingPlanSummary.remainingSentenceCount /
            libraryReadingPlanSummary.dailySentenceTarget
        )
      : 0;
  const continuationItems = sourceFilteredStudyStates
    .filter(item => !item.readingCompletedAt && item.nextSentenceId)
    .slice(0, 3);
  const contentLibraryItems = sourceFilteredStudyStates.filter(item => {
    const isCompleted = Boolean(item.readingCompletedAt);
    if (contentTagFilter !== 'all' && !(item.tags ?? []).includes(contentTagFilter)) {
      return false;
    }
    if (contentFolderFilter === 'uncategorized' && item.folderName) {
      return false;
    }
    if (
      contentFolderFilter !== 'all' &&
      contentFolderFilter !== 'uncategorized' &&
      item.folderName !== contentFolderFilter
    ) {
      return false;
    }
    if (contentLibraryFilter === 'completed') return isCompleted;
    if (contentLibraryFilter === 'inProgress') return !isCompleted;
    return true;
  });

  const openImportedContentWorkspace = (contentId: Id<'imported_contents'>) => {
    setImportResultId(contentId);
    setSentenceQueueFilter('pending');
  };

  const parseTagDraft = (value: string): string[] => {
    const tags: string[] = [];
    const seenTags = new Set<string>();
    for (const rawTag of value.split(/[,\n，]/)) {
      const tag = rawTag.trim().replace(/\s+/g, ' ');
      if (!tag || seenTags.has(tag)) continue;
      tags.push(tag);
      seenTags.add(tag);
      if (tags.length >= 8) break;
    }
    return tags;
  };

  const getTagDraftValue = (contentId: Id<'imported_contents'>, tags: string[]) =>
    tagDrafts[String(contentId)] ?? tags.join(', ');

  const updateTagDraft = (contentId: Id<'imported_contents'>, value: string) => {
    setTagDrafts(previous => ({
      ...previous,
      [String(contentId)]: value,
    }));
  };

  const getFolderDraftValue = (contentId: Id<'imported_contents'>, folderName?: string) =>
    folderDrafts[String(contentId)] ?? folderName ?? '';

  const updateFolderDraft = (contentId: Id<'imported_contents'>, value: string) => {
    setFolderDrafts(previous => ({
      ...previous,
      [String(contentId)]: value,
    }));
  };

  const saveContentTags = async (
    contentId: Id<'imported_contents'>,
    title: string,
    currentTags: string[]
  ) => {
    const draft = getTagDraftValue(contentId, currentTags);
    try {
      await updateContentTags({
        contentId,
        tags: parseTagDraft(draft),
      });
      notify.success('标签已保存');
    } catch (error) {
      console.error(error);
      notify.error(`${title} 标签保存失败`);
    }
  };

  const saveContentFolder = async (
    contentId: Id<'imported_contents'>,
    title: string,
    currentFolderName?: string
  ) => {
    const draft = getFolderDraftValue(contentId, currentFolderName);
    try {
      await updateContentFolder({
        contentId,
        folderName: draft,
      });
      notify.success('文件夹已保存');
    } catch (error) {
      console.error(error);
      notify.error(`${title} 文件夹保存失败`);
    }
  };

  const formatReadingMinutes = (readingTimeSeconds: number) =>
    Math.max(1, Math.round(readingTimeSeconds / 60));

  const handleOpenSentence = async (sentence: ImportedContentSentenceRecord) => {
    if (!importResultId) {
      navigate(`/learning/sentence/${sentence._id}`);
      return;
    }

    try {
      await updateReadingProgress({
        contentType: 'imported_content',
        contentId: String(importResultId),
        lastSentenceId: String(sentence._id),
        lastSentenceIndex: sentence.sentenceIndex,
        completedSentenceCount: Math.max(completedSentenceCount, sentence.sentenceIndex),
        totalSentenceCount,
      });
    } catch (error) {
      console.error(error);
    }
    navigate(`/learning/sentence/${sentence._id}`);
  };

  const handleMarkCompleted = async () => {
    if (!importResultId) return;

    try {
      await markReadingCompleted({
        contentType: 'imported_content',
        contentId: String(importResultId),
      });
      notify.success('已标记为完成');
    } catch (error) {
      console.error(error);
      notify.error('标记失败，请稍后重试');
    }
  };

  return (
    <div className="min-h-screen bg-k-bg p-6 md:p-12 font-k-sans pb-32">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/courses')}>
            <ArrowLeft size={20} />
          </Button>
          <div className="flex items-center gap-3">
            <HanjaSeal c="文" size={40} bg="var(--color-k-indigo)" round={10} />
            <div>
              <h1 className="text-2xl font-black text-k-ink">文本导入学习</h1>
              <p className="text-sm text-k-sub font-medium">
                粘贴任何韩语内容 · 智能断句 · AI 辅助学习
              </p>
            </div>
          </div>
        </div>

        {!importResultId ? (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {continuationItems.length > 0 && (
              <DesktopCard className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-black text-k-ink">继续导入内容</h2>
                    <p className="text-xs font-medium text-k-sub">
                      从上次停下的句子继续解释、保存词汇和语法。
                    </p>
                  </div>
                  <DesignChip tone="muted" size="sm">
                    最近导入
                  </DesignChip>
                </div>
                <div className="space-y-3">
                  {continuationItems.map(item => (
                    <div
                      key={String(item.contentId)}
                      className="rounded-2xl border border-k-line bg-k-bg2/35 p-4"
                    >
                      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-black text-k-ink">{item.title}</div>
                          <div className="mt-1 text-[11px] font-bold text-k-sub">
                            已保存 {item.savedSentenceCount} 句 / {item.savedWordCount} 词 /{' '}
                            {item.savedGrammarCount} 语法
                          </div>
                          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-k-line">
                            <div
                              className="h-full rounded-full bg-k-indigo"
                              style={{ width: `${item.progressPercent}%` }}
                            />
                          </div>
                          {item.nextSentenceText && (
                            <p className="mt-2 line-clamp-1 text-xs font-medium text-k-sub">
                              下一句：{item.nextSentenceText}
                            </p>
                          )}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="shrink-0 gap-2 font-black"
                          disabled={!item.nextSentenceId}
                          onClick={() => {
                            if (item.nextSentenceId) {
                              navigate(`/learning/sentence/${item.nextSentenceId}`);
                            }
                          }}
                        >
                          <PlayCircle size={14} />
                          继续下一句
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </DesktopCard>
            )}
            {recentStudyStates && recentStudyStates.length > 0 && (
              <DesktopCard className="space-y-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h2 className="text-base font-black text-k-ink">导入内容库</h2>
                    <p className="text-xs font-medium text-k-sub">
                      重新打开完整句子队列，继续整理词汇、语法和阅读进度。
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { key: 'all' as const, label: '全部内容' },
                      { key: 'inProgress' as const, label: '进行中' },
                      { key: 'completed' as const, label: '已完成' },
                    ].map(item => (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => setContentLibraryFilter(item.key)}
                        className={clsx(
                          'rounded-xl border px-3 py-1 text-xs font-black transition-colors',
                          contentLibraryFilter === item.key
                            ? 'border-k-ink bg-k-ink text-k-bg'
                            : 'border-k-line text-k-sub hover:text-k-ink'
                        )}
                      >
                        {item.label}
                      </button>
                    ))}
                    {[
                      { key: 'all' as const, label: '全部来源' },
                      { key: 'text' as const, label: '文本来源' },
                      { key: 'url' as const, label: 'URL 来源' },
                    ].map(item => (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => setContentSourceFilter(item.key)}
                        className={clsx(
                          'rounded-xl border px-3 py-1 text-xs font-black transition-colors',
                          contentSourceFilter === item.key
                            ? 'border-k-indigo bg-k-indigo text-white'
                            : 'border-k-line text-k-sub hover:text-k-ink'
                        )}
                      >
                        {item.label}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setContentTagFilter('all')}
                      className={clsx(
                        'rounded-xl border px-3 py-1 text-xs font-black transition-colors',
                        contentTagFilter === 'all'
                          ? 'border-k-jade bg-k-jade text-[#2F5847]'
                          : 'border-k-line text-k-sub hover:text-k-ink'
                      )}
                    >
                      全部标签
                    </button>
                    {allContentTags.map(tag => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => setContentTagFilter(tag)}
                        className={clsx(
                          'rounded-xl border px-3 py-1 text-xs font-black transition-colors',
                          contentTagFilter === tag
                            ? 'border-k-jade bg-k-jade text-[#2F5847]'
                            : 'border-k-line text-k-sub hover:text-k-ink'
                        )}
                      >
                        标签：{tag}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setContentFolderFilter('all')}
                      className={clsx(
                        'rounded-xl border px-3 py-1 text-xs font-black transition-colors',
                        contentFolderFilter === 'all'
                          ? 'border-k-butter bg-k-butter text-[#5A4420]'
                          : 'border-k-line text-k-sub hover:text-k-ink'
                      )}
                    >
                      全部文件夹
                    </button>
                    <button
                      type="button"
                      onClick={() => setContentFolderFilter('uncategorized')}
                      className={clsx(
                        'rounded-xl border px-3 py-1 text-xs font-black transition-colors',
                        contentFolderFilter === 'uncategorized'
                          ? 'border-k-butter bg-k-butter text-[#5A4420]'
                          : 'border-k-line text-k-sub hover:text-k-ink'
                      )}
                    >
                      未分组
                    </button>
                    {allContentFolders.map(folderName => (
                      <button
                        key={folderName}
                        type="button"
                        onClick={() => setContentFolderFilter(folderName)}
                        className={clsx(
                          'rounded-xl border px-3 py-1 text-xs font-black transition-colors',
                          contentFolderFilter === folderName
                            ? 'border-k-butter bg-k-butter text-[#5A4420]'
                            : 'border-k-line text-k-sub hover:text-k-ink'
                        )}
                      >
                        文件夹：{folderName}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid gap-2 text-xs font-black text-k-sub md:grid-cols-3">
                  <div className="rounded-xl bg-k-bg2/45 px-3 py-2">
                    {librarySummary.total} 篇内容
                  </div>
                  <div className="rounded-xl bg-k-bg2/45 px-3 py-2">
                    {librarySummary.inProgress} 篇进行中
                  </div>
                  <div className="rounded-xl bg-k-bg2/45 px-3 py-2">
                    {librarySummary.completed} 篇已完成
                  </div>
                </div>
                <section className="rounded-2xl border border-k-line bg-k-bg2/35 p-3">
                  <div className="text-[10px] font-black uppercase text-k-sub">累计产出</div>
                  <div className="mt-2 flex flex-wrap gap-2 text-[10px] font-black text-k-sub">
                    <span className="rounded-full bg-k-card px-2 py-1">
                      {libraryOutcomeSummary.savedSentenceCount} 句子
                    </span>
                    <span className="rounded-full bg-k-card px-2 py-1">
                      {libraryOutcomeSummary.savedWordCount} 词卡
                    </span>
                    <span className="rounded-full bg-k-card px-2 py-1">
                      {libraryOutcomeSummary.savedGrammarCount} 语法
                    </span>
                    {libraryOutcomeSummary.readingTimeSeconds > 0 && (
                      <span className="rounded-full bg-k-card px-2 py-1">
                        阅读 {formatReadingMinutes(libraryOutcomeSummary.readingTimeSeconds)} 分钟
                      </span>
                    )}
                  </div>
                </section>
                <section className="rounded-2xl border border-k-line bg-k-indigo/5 p-3">
                  <div className="flex items-center gap-2 text-[10px] font-black uppercase text-k-sub">
                    <TrendingUp size={13} className="text-k-indigo" />
                    <span>30 天成果趋势</span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2 text-[10px] font-black text-k-sub">
                    <span className="rounded-full bg-k-card px-2 py-1">
                      完成 {librarySummary.completed}/{librarySummary.total} 篇
                    </span>
                    <span className="rounded-full bg-k-card px-2 py-1">
                      完成率 {libraryCompletionRate}%
                    </span>
                    {libraryOutcomeSummary.readingTimeSeconds > 0 && (
                      <span className="rounded-full bg-k-card px-2 py-1">
                        阅读 {formatReadingMinutes(libraryOutcomeSummary.readingTimeSeconds)} 分钟
                      </span>
                    )}
                    <span className="rounded-full bg-k-card px-2 py-1">
                      沉淀 {libraryOutcomeAssetCount} 项资产
                    </span>
                  </div>
                </section>
                {libraryReadingPlanSummary.contentCount > 0 && (
                  <section className="rounded-2xl border border-k-line bg-k-butter/10 p-3">
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase text-k-sub">
                      <CalendarDays size={13} className="text-k-butter" />
                      <span>7 天阅读计划</span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2 text-[10px] font-black text-k-sub">
                      <span className="rounded-full bg-k-card px-2 py-1">
                        未完成 {libraryReadingPlanSummary.contentCount} 篇
                      </span>
                      <span className="rounded-full bg-k-card px-2 py-1">
                        还剩 {libraryReadingPlanSummary.remainingSentenceCount} 句
                      </span>
                      <span className="rounded-full bg-k-card px-2 py-1">
                        每日 {libraryReadingPlanSummary.dailySentenceTarget} 句
                      </span>
                      <span className="rounded-full bg-k-card px-2 py-1">
                        预计 {estimatedReadingPlanDays} 天清空
                      </span>
                      <span className="rounded-full bg-k-card px-2 py-1">
                        本周可完成 {libraryReadingPlanSummary.completionWithinSevenDays} 篇
                      </span>
                    </div>
                  </section>
                )}
                <div className="grid gap-3">
                  {contentLibraryItems.map(item => {
                    const isCompleted = Boolean(item.readingCompletedAt);
                    return (
                      <div
                        key={String(item.contentId)}
                        className="rounded-2xl border border-k-line bg-k-bg2/35 p-4"
                      >
                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <div className="truncate text-sm font-black text-k-ink">
                                {item.title}
                              </div>
                              <DesignChip tone={isCompleted ? 'mint' : 'muted'} size="sm">
                                {isCompleted ? '已完成' : `${item.progressPercent}%`}
                              </DesignChip>
                              <DesignChip tone="muted" size="sm">
                                {item.sourceType === 'URL' ? (item.sourceHost ?? 'URL') : '文本'}
                              </DesignChip>
                              {item.folderName && (
                                <DesignChip tone="muted" size="sm">
                                  <FolderOpen size={11} />
                                  {item.folderName}
                                </DesignChip>
                              )}
                            </div>
                            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-k-line">
                              <div
                                className="h-full rounded-full bg-k-indigo"
                                style={{ width: `${isCompleted ? 100 : item.progressPercent}%` }}
                              />
                            </div>
                            <div className="mt-2 text-[11px] font-bold text-k-sub">
                              {item.completedSentenceCount}/{item.sentenceCount} 句 · 已保存{' '}
                              {item.savedSentenceCount} 句 / {item.savedWordCount} 词 /{' '}
                              {item.savedGrammarCount} 语法
                            </div>
                            <div className="mt-2 flex flex-wrap gap-2 text-[10px] font-black text-k-sub">
                              {item.remainingSentenceCount > 0 ? (
                                <>
                                  <span className="rounded-full bg-k-card px-2 py-1">
                                    剩余 {item.remainingSentenceCount} 句
                                  </span>
                                  <span className="rounded-full bg-k-card px-2 py-1">
                                    每天 {item.dailySentenceTarget} 句
                                  </span>
                                  <span className="rounded-full bg-k-card px-2 py-1">
                                    预计 {item.estimatedStudyDays} 天完成
                                  </span>
                                </>
                              ) : (
                                <span className="rounded-full bg-k-mint/15 px-2 py-1 text-k-mint">
                                  已完成全文
                                </span>
                              )}
                            </div>
                            {isCompleted && (
                              <div className="mt-3 rounded-2xl border border-k-mint/20 bg-k-mint/5 p-3">
                                <div className="text-[10px] font-black uppercase text-k-sub">
                                  完成产出
                                </div>
                                <div className="mt-2 flex flex-wrap gap-2 text-[10px] font-black text-k-sub">
                                  <span className="rounded-full bg-k-card px-2 py-1">
                                    {item.savedSentenceCount} 句子
                                  </span>
                                  <span className="rounded-full bg-k-card px-2 py-1">
                                    {item.savedWordCount} 词卡
                                  </span>
                                  <span className="rounded-full bg-k-card px-2 py-1">
                                    {item.savedGrammarCount} 语法
                                  </span>
                                  {item.readingTimeSeconds > 0 && (
                                    <span className="rounded-full bg-k-card px-2 py-1">
                                      阅读 {formatReadingMinutes(item.readingTimeSeconds)} 分钟
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}
                            <div className="mt-3 grid gap-2 md:grid-cols-[minmax(0,1fr)_auto]">
                              <Input
                                aria-label={`${item.title} 标签`}
                                value={getTagDraftValue(item.contentId, item.tags ?? [])}
                                onChange={event =>
                                  updateTagDraft(item.contentId, event.target.value)
                                }
                                placeholder="添加标签，例如：新闻, 精读"
                                className="h-9 border-k-line text-xs font-bold"
                              />
                              <Button
                                variant="outline"
                                size="sm"
                                aria-label={`保存 ${item.title} 标签`}
                                className="h-9 shrink-0 font-black"
                                onClick={() =>
                                  void saveContentTags(item.contentId, item.title, item.tags ?? [])
                                }
                              >
                                保存标签
                              </Button>
                            </div>
                            <div className="mt-2 grid gap-2 md:grid-cols-[minmax(0,1fr)_auto]">
                              <Input
                                aria-label={`${item.title} 文件夹`}
                                value={getFolderDraftValue(item.contentId, item.folderName)}
                                onChange={event =>
                                  updateFolderDraft(item.contentId, event.target.value)
                                }
                                placeholder="文件夹，例如：新闻精读、韩剧台词"
                                className="h-9 border-k-line text-xs font-bold"
                              />
                              <Button
                                variant="outline"
                                size="sm"
                                aria-label={`保存 ${item.title} 文件夹`}
                                className="h-9 shrink-0 font-black"
                                onClick={() =>
                                  void saveContentFolder(
                                    item.contentId,
                                    item.title,
                                    item.folderName
                                  )
                                }
                              >
                                保存文件夹
                              </Button>
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            className="shrink-0 gap-2 font-black"
                            onClick={() => openImportedContentWorkspace(item.contentId)}
                          >
                            <BookOpen size={14} />
                            打开学习台
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                  {contentLibraryItems.length === 0 && (
                    <div className="rounded-2xl border border-k-line bg-k-bg2/35 p-6 text-center text-sm font-bold text-k-sub">
                      当前筛选下暂无导入内容
                    </div>
                  )}
                </div>
              </DesktopCard>
            )}
            <DesktopCard className="space-y-6">
              <div className="flex flex-wrap gap-2">
                {[
                  { mode: 'text' as const, label: '文本导入', icon: <FileText size={14} /> },
                  { mode: 'url' as const, label: 'URL 导入', icon: <Link2 size={14} /> },
                ].map(item => (
                  <button
                    key={item.mode}
                    type="button"
                    onClick={() => resetDraft(item.mode)}
                    className={clsx(
                      'inline-flex items-center gap-2 rounded-2xl border px-4 py-2 text-sm font-black transition-all',
                      importMode === item.mode
                        ? 'border-k-ink bg-k-ink text-k-bg'
                        : 'border-k-line bg-k-bg text-k-sub hover:text-k-ink'
                    )}
                  >
                    {item.icon}
                    {item.label}
                  </button>
                ))}
              </div>
              <div className="space-y-2">
                <label htmlFor="text-import-title" className="text-sm font-bold text-k-sub">
                  内容标题
                </label>
                <Input
                  id="text-import-title"
                  aria-label="内容标题"
                  placeholder={
                    importMode === 'url'
                      ? '可选：给这篇文章起个学习标题'
                      : '给这段内容起个名字，例如：韩剧台词、新闻报道...'
                  }
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="h-12 border-k-line focus:border-k-indigo text-lg font-bold"
                />
              </div>
              {importMode === 'text' ? (
                <div className="space-y-2">
                  <label htmlFor="text-import-raw" className="text-sm font-bold text-k-sub">
                    韩语内容
                  </label>
                  <Textarea
                    id="text-import-raw"
                    aria-label="韩语内容"
                    placeholder="在这里粘贴你想学习的韩语文本..."
                    value={rawText}
                    onChange={e => setRawText(e.target.value)}
                    className="min-h-[300px] text-lg leading-relaxed border-k-line focus:border-k-indigo font-medium"
                  />
                  <div className="text-right text-xs text-k-sub font-mono">
                    字符数: {rawText.length}
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <label htmlFor="text-import-url" className="text-sm font-bold text-k-sub">
                    文章来源 URL
                  </label>
                  <Input
                    id="text-import-url"
                    aria-label="文章来源 URL"
                    inputMode="url"
                    placeholder="https://example.com/korean-article"
                    value={sourceUrl}
                    onChange={e => setSourceUrl(e.target.value)}
                    className="h-12 border-k-line focus:border-k-indigo text-base font-medium"
                  />
                  <p className="text-xs font-medium text-k-sub">
                    适合新闻、博客、公开文章页面。系统会自动抽取正文、断句并估算难度。
                  </p>
                </div>
              )}
              <Button
                className="w-full h-14 text-lg font-black bg-k-ink hover:bg-k-ink/90 text-k-bg rounded-2xl flex items-center justify-center gap-2"
                disabled={
                  isImporting ||
                  (importMode === 'text' ? !title.trim() || !rawText.trim() : !sourceUrl.trim())
                }
                onClick={handleImport}
              >
                {isImporting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-k-bg border-t-transparent animate-spin rounded-full" />
                    {importMode === 'url' ? '正在抓取并分析内容...' : '正在导入并分析...'}
                  </>
                ) : (
                  <>
                    <Save size={20} className="text-k-butter" />
                    {importMode === 'url' ? '导入链接并开始学习' : '导入并开始学习'}
                  </>
                )}
              </Button>
            </DesktopCard>
          </div>
        ) : (
          /* Import Result & Study View */
          <div className="space-y-8 animate-in fade-in duration-500">
            {/* Analysis Header */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <DesktopCard className="md:col-span-2">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-xl font-black text-k-ink">{importedContent?.title}</h3>
                  <Button variant="ghost" size="sm" onClick={() => setImportResultId(null)}>
                    重置
                  </Button>
                </div>
                {importedContent?.summaryZh ? (
                  <p className="text-sm text-k-ink font-medium leading-relaxed">
                    {importedContent.summaryZh}
                  </p>
                ) : (
                  <div className="flex items-center gap-2 text-k-sub animate-pulse">
                    <Sparkles size={16} className="animate-spin" />
                    AI 正在分析内容并生成摘要...
                  </div>
                )}
              </DesktopCard>
              <DesktopCard className="md:col-span-1 flex flex-col justify-center gap-4">
                <div className="flex items-center gap-3">
                  <BarChart3 size={20} className="text-k-indigo" />
                  <div>
                    <div className="text-[10px] font-black text-k-sub uppercase">难度级别</div>
                    <div className="font-bold text-k-ink">
                      {importedContent?.difficultyLevel || '分析中...'}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Clock size={20} className="text-k-jade" />
                  <div>
                    <div className="text-[10px] font-black text-k-sub uppercase">预估用时</div>
                    <div className="font-bold text-k-ink">
                      {importedContent?.estimatedMinutes
                        ? `${importedContent.estimatedMinutes} 分钟`
                        : '分析中...'}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <BookOpen size={20} className="text-k-butter" />
                  <div>
                    <div className="text-[10px] font-black text-k-sub uppercase">内容统计</div>
                    <div className="font-bold text-k-ink">
                      {importedContent?.sentenceCount || 0} 句 / {importedContent?.wordCount || 0}{' '}
                      词
                    </div>
                  </div>
                </div>
              </DesktopCard>
            </div>

            <DesktopCard className="border-k-line/60">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="text-base font-black text-k-ink">阅读进度</h4>
                    <DesignChip tone={isContentCompleted ? 'mint' : 'muted'} size="sm">
                      {isContentCompleted ? '已完成' : `${readingProgressPercent}%`}
                    </DesignChip>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-k-line">
                    <div
                      className="h-full rounded-full bg-k-indigo transition-all"
                      style={{ width: `${isContentCompleted ? 100 : readingProgressPercent}%` }}
                    />
                  </div>
                  <div className="mt-2 text-xs font-bold text-k-sub">
                    {isContentCompleted ? totalSentenceCount : completedSentenceCount}/
                    {totalSentenceCount} 句
                  </div>
                </div>
                <Button
                  variant={isContentCompleted ? 'outline' : 'default'}
                  className="gap-2 font-black"
                  disabled={isContentCompleted || totalSentenceCount === 0}
                  onClick={handleMarkCompleted}
                >
                  <CheckCircle2 size={16} />
                  {isContentCompleted ? '全文已完成' : '标记全文完成'}
                </Button>
              </div>
            </DesktopCard>

            {/* Sentences List */}
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h4 className="text-lg font-black text-k-ink flex items-center gap-2">
                  分句练习
                  <DesignChip tone="muted" size="sm">
                    {importedContent?.sentences?.length || 0}
                  </DesignChip>
                </h4>
                <div className="flex flex-wrap items-center gap-2">
                  {[
                    { key: 'all' as const, label: '全部' },
                    { key: 'pending' as const, label: '未完成' },
                    { key: 'saved' as const, label: '已完成' },
                  ].map(item => (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setSentenceQueueFilter(item.key)}
                      className={clsx(
                        'rounded-xl border px-3 py-1 text-xs font-black transition-colors',
                        sentenceQueueFilter === item.key
                          ? 'border-k-ink bg-k-ink text-k-bg'
                          : 'border-k-line text-k-sub hover:text-k-ink'
                      )}
                    >
                      {item.label}
                    </button>
                  ))}
                  {resumeSentenceId && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 px-3 text-xs font-black"
                      onClick={() => navigate(`/learning/sentence/${resumeSentenceId}`)}
                    >
                      回到上次进度
                    </Button>
                  )}
                </div>
              </div>
              <div className="space-y-3">
                {filteredSentences?.map((s: ImportedContentSentenceRecord) => {
                  const isSaved = savedSentenceIdSet.has(String(s._id));
                  return (
                    <DesktopCard
                      key={s._id}
                      className={clsx(
                        'group transition-all cursor-pointer flex justify-between items-center',
                        isSaved ? 'border-k-mint/40 bg-k-mint/5' : 'hover:border-k-indigo'
                      )}
                      onClick={() => void handleOpenSentence(s)}
                    >
                      <div className="flex-1">
                        <div className="text-[10px] font-black text-k-sub mb-1 flex items-center gap-2">
                          <span>SENTENCE {s.sentenceIndex}</span>
                          {isSaved && (
                            <span className="rounded-full bg-k-mint/20 px-2 py-0.5 text-[9px] text-k-mint">
                              已保存
                            </span>
                          )}
                        </div>
                        <div className="text-lg font-medium text-k-ink leading-relaxed">
                          {s.text}
                        </div>
                      </div>
                      <div className="ml-4 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="text-k-indigo">
                          <ChevronRight size={24} />
                        </Button>
                      </div>
                    </DesktopCard>
                  );
                })}
                {filteredSentences && filteredSentences.length === 0 && (
                  <DesktopCard className="text-center text-sm font-bold text-k-sub py-10">
                    当前筛选下暂无句子
                  </DesktopCard>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TextImportPage;
