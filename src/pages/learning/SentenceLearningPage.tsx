import React, { useEffect, useState } from 'react';
import { useAction, useMutation, useQuery } from 'convex/react';
import { useParams } from 'react-router-dom';
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  RefreshCw,
  Save,
  Sparkles,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Id } from '../../../convex/_generated/dataModel';
import type {
  SentenceExplanationPayload,
  SentenceVocabularyItem,
} from '../../../convex/sentenceExplainer/shared';
import { Button, Input } from '../../components/ui';
import { DesktopCard } from '../../components/desktop/ui/DesktopCard';
import { DesignChip } from '../../components/desktop/ui/DesignChip';
import { HanjaSeal } from '../../components/desktop/ui/HanjaSeal';
import {
  IMPORTED_CONTENT,
  READING_PROGRESS,
  SENTENCE_EXPLAINER,
  type SentenceExplanationResult,
  type SentenceSaveAssetsResult,
} from '../../utils/convexRefs';
import { notify } from '../../utils/notify';
import { useLocalizedNavigate } from '../../hooks/useLocalizedNavigate';

type RouteParams = {
  sentenceId?: string;
};

type VocabularyCardDraft = SentenceVocabularyItem & {
  key: string;
  meaning: string;
  duplicateCount: number;
};

type GeneratedVocabularyCard = {
  id: Id<'words'>;
  word: string;
  meaning: string;
  reviewStatus: string;
  qualityReviewStatus?: string;
  confidence?: number;
  promptVersion?: string;
  provider?: string;
  source?: string;
  sourceRefId?: string;
};

type SavedAssetQualitySummary = {
  savedWordCount: number;
  savedGrammarCount: number;
  confidence?: number;
  promptVersion?: string;
  provider?: string;
  reviewStatus?: string;
  source?: string;
  sourceRefId?: string;
};

function formatConfidence(value?: number): string {
  return typeof value === 'number' ? `${Math.round(value * 100)}%` : '待补充';
}

function toContentSentenceId(value?: string): Id<'content_sentences'> | null {
  return value ? (value as Id<'content_sentences'>) : null;
}

function toImportedContentId(value?: string): Id<'imported_contents'> | null {
  return value ? (value as Id<'imported_contents'>) : null;
}

function payloadHasLearningAssets(payload: SentenceExplanationPayload): boolean {
  return Boolean(
    payload.vocabulary?.length ||
    payload.grammar?.length ||
    payload.naturalTranslation ||
    payload.overallMeaning
  );
}

function getVocabularyItemKey(item: SentenceVocabularyItem): string {
  return [item.surface.trim(), item.lemma?.trim() ?? '', item.partOfSpeech?.trim() ?? ''].join('|');
}

function buildVocabularyCardDrafts(items: SentenceVocabularyItem[]): VocabularyCardDraft[] {
  const draftsByKey = new Map<string, VocabularyCardDraft>();
  for (const item of items) {
    const key = getVocabularyItemKey(item);
    const existing = draftsByKey.get(key);
    if (existing) {
      draftsByKey.set(key, {
        ...existing,
        duplicateCount: existing.duplicateCount + 1,
        meaning: existing.meaning || item.meaning?.trim() || '',
      });
      continue;
    }

    draftsByKey.set(key, {
      ...item,
      key,
      meaning: item.meaning?.trim() || '',
      duplicateCount: 1,
    });
  }
  return Array.from(draftsByKey.values());
}

const SentenceLearningPage: React.FC = () => {
  const { sentenceId: sentenceIdParam } = useParams<RouteParams>();
  const sentenceId = toContentSentenceId(sentenceIdParam);
  const navigate = useLocalizedNavigate();
  const { i18n } = useTranslation();
  const [explaining, setExplaining] = useState(false);
  const [saving, setSaving] = useState(false);
  const [freshExplanation, setFreshExplanation] = useState<SentenceExplanationResult | null>(null);
  const [knownWordKeys, setKnownWordKeys] = useState<Set<string>>(() => new Set());
  const [editedVocabularyMeanings, setEditedVocabularyMeanings] = useState<Record<string, string>>(
    {}
  );
  const [generatedCards, setGeneratedCards] = useState<GeneratedVocabularyCard[]>([]);
  const [savedAssetQuality, setSavedAssetQuality] = useState<SavedAssetQualitySummary | null>(null);

  const sentence = useQuery(
    IMPORTED_CONTENT.getImportedSentence,
    sentenceId ? { sentenceId } : 'skip'
  );
  const importedContentId =
    sentence?.contentType === 'IMPORTED' ? toImportedContentId(sentence.contentRefId) : null;
  const importedContent = useQuery(
    IMPORTED_CONTENT.getImportedContentWithSentences,
    importedContentId ? { contentId: importedContentId } : 'skip'
  );
  const latestExplanation = useQuery(
    SENTENCE_EXPLAINER.getLatest,
    sentenceId ? { sentenceId, targetLanguage: i18n.language } : 'skip'
  );
  const activeExplanationId = freshExplanation?.explanationId ?? latestExplanation?._id;
  const activePayload = freshExplanation?.data ?? latestExplanation?.payload;
  const vocabularyItems = activePayload?.vocabulary ?? [];
  const vocabularyDrafts = buildVocabularyCardDrafts(vocabularyItems);
  const vocabularyDraftSeedKey = [
    activeExplanationId ?? 'none',
    ...vocabularyItems.map(item => `${getVocabularyItemKey(item)}=${item.meaning?.trim() ?? ''}`),
  ].join('::');
  const selectedVocabularyItems: SentenceVocabularyItem[] = vocabularyDrafts
    .filter(item => !knownWordKeys.has(item.key))
    .map(item => ({
      surface: item.surface,
      lemma: item.lemma,
      partOfSpeech: item.partOfSpeech,
      meaning: (editedVocabularyMeanings[item.key] ?? item.meaning).trim() || undefined,
      difficultyLevel: item.difficultyLevel,
      difficultyScore: item.difficultyScore,
    }));
  const savedState = useQuery(
    SENTENCE_EXPLAINER.getSavedState,
    activeExplanationId ? { explanationId: activeExplanationId } : 'skip'
  );

  const explainSentence = useAction(SENTENCE_EXPLAINER.explainSentence);
  const saveAssets = useMutation(SENTENCE_EXPLAINER.saveAssets);
  const removeSavedVocabularyAsset = useMutation(SENTENCE_EXPLAINER.removeSavedVocabularyAsset);
  const updateReadingProgress = useMutation(READING_PROGRESS.updateProgress);
  const incrementSavedCounts = useMutation(READING_PROGRESS.incrementSavedCounts);

  useEffect(() => {
    setKnownWordKeys(new Set());
    setEditedVocabularyMeanings({});
  }, [vocabularyDraftSeedKey]);

  const setWordKnownState = (key: string, isKnown: boolean) => {
    setKnownWordKeys(previous => {
      const next = new Set(previous);
      if (isKnown) {
        next.add(key);
      } else {
        next.delete(key);
      }
      return next;
    });
  };

  const updateVocabularyDraftMeaning = (key: string, meaning: string) => {
    setEditedVocabularyMeanings(previous => ({
      ...previous,
      [key]: meaning,
    }));
  };

  const sourceRefId = String(sentenceId ?? activeExplanationId ?? '');
  const nextImportedSentence =
    sentence && importedContent
      ? importedContent.sentences.find(item => item.sentenceIndex > sentence.sentenceIndex)
      : undefined;

  const syncGeneratedCardsFromSaveResult = (result: SentenceSaveAssetsResult) => {
    setSavedAssetQuality({
      savedWordCount: result.savedWordCount ?? 0,
      savedGrammarCount: result.savedGrammarCount ?? 0,
      confidence: result.quality?.confidence,
      promptVersion: result.quality?.promptVersion,
      provider: result.quality?.provider,
      reviewStatus: result.quality?.reviewStatus,
      source: result.quality?.source ?? result.source,
      sourceRefId: result.quality?.sourceRefId ?? result.sourceRefId,
    });
    setGeneratedCards(
      (result.recentWords ?? []).map(word => ({
        id: word.id,
        word: word.word,
        meaning: word.meaning,
        reviewStatus: word.reviewStatus ?? result.quality?.reviewStatus ?? 'NEW',
        qualityReviewStatus: word.qualityReviewStatus ?? result.quality?.reviewStatus,
        confidence: word.confidence ?? result.quality?.confidence,
        promptVersion: word.promptVersion ?? result.quality?.promptVersion,
        provider: word.provider ?? result.quality?.provider,
        source: word.source ?? result.quality?.source ?? result.source,
        sourceRefId: word.sourceRefId ?? result.quality?.sourceRefId ?? result.sourceRefId,
      }))
    );
  };

  const syncImportedContentStudyProgress = async (result: SentenceSaveAssetsResult) => {
    if (!sentence || !importedContentId) return;

    const totalSentenceCount = importedContent?.sentences.length ?? importedContent?.sentenceCount;
    await updateReadingProgress({
      contentType: 'imported_content',
      contentId: String(importedContentId),
      lastSentenceId: String(sentence._id),
      lastSentenceIndex: sentence.sentenceIndex,
      completedSentenceCount: sentence.sentenceIndex,
      totalSentenceCount,
    });

    const savedWordsDelta = Math.max(0, result.savedWordCount ?? 0);
    const savedSentencesDelta = alreadySaved ? 0 : 1;
    if (savedWordsDelta > 0 || savedSentencesDelta > 0) {
      await incrementSavedCounts({
        contentType: 'imported_content',
        contentId: String(importedContentId),
        savedWordsDelta: savedWordsDelta > 0 ? savedWordsDelta : undefined,
        savedSentencesDelta: savedSentencesDelta > 0 ? savedSentencesDelta : undefined,
      });
    }
  };

  const handleExplain = async (forceRefresh = false) => {
    if (!sentence || !sentenceId) return;
    setExplaining(true);
    try {
      const result = await explainSentence({
        sentence: sentence.text,
        sentenceId,
        targetLanguage: i18n.language,
        source: 'content_import',
        sourceRefId: sentenceId,
        forceRefresh,
      });
      if (!result.success || !result.data || !result.explanationId) {
        notify.error('句子解析失败，请重试');
        return;
      }
      setFreshExplanation(result);
      notify.success(result.cacheHit ? '已载入缓存解析' : 'AI 句子解析已完成');
    } catch (error) {
      console.error(error);
      notify.error('句子解析失败，请重试');
    } finally {
      setExplaining(false);
    }
  };

  const handleSave = async () => {
    if (!activeExplanationId || !activePayload) return;
    setSaving(true);
    try {
      const result = await saveAssets({
        explanationId: activeExplanationId,
        saveSentence: true,
        selectedWords: selectedVocabularyItems,
        selectedGrammar: activePayload.grammar ?? [],
        createNotePage: true,
        enqueueForReview: true,
        source: 'content_import',
        sourceRefId,
      });
      if (result.success) {
        syncGeneratedCardsFromSaveResult(result);
        await syncImportedContentStudyProgress(result);
        notify.success('已保存到学习资产并加入复习');
      }
    } catch (error) {
      console.error(error);
      notify.error('保存失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  const handleUndoGeneratedCard = async (card: GeneratedVocabularyCard) => {
    try {
      const result = await removeSavedVocabularyAsset({
        wordId: card.id,
        source: 'content_import',
        sourceRefId,
      });
      if (result.removed) {
        setGeneratedCards(previous => previous.filter(item => item.id !== card.id));
        notify.success('已撤销词卡');
      }
    } catch (error) {
      console.error(error);
      notify.error('撤销失败，请稍后重试');
    }
  };

  if (!sentenceId) {
    return (
      <div className="min-h-screen bg-k-bg p-6 md:p-12 font-k-sans">
        <DesktopCard className="mx-auto max-w-xl text-center">
          <h1 className="text-xl font-black text-k-ink">句子不存在</h1>
          <p className="mt-2 text-sm font-medium text-k-sub">请从文本导入页面重新选择分句。</p>
          <Button className="mt-6" onClick={() => navigate('/learning/text-import')}>
            返回文本导入
          </Button>
        </DesktopCard>
      </div>
    );
  }

  if (sentence === undefined) {
    return (
      <div className="min-h-screen bg-k-bg p-6 md:p-12 font-k-sans">
        <div className="mx-auto flex max-w-xl items-center justify-center py-20 text-sm font-bold text-k-sub">
          正在载入句子...
        </div>
      </div>
    );
  }

  if (!sentence) {
    return (
      <div className="min-h-screen bg-k-bg p-6 md:p-12 font-k-sans">
        <DesktopCard className="mx-auto max-w-xl text-center">
          <h1 className="text-xl font-black text-k-ink">无法打开这个句子</h1>
          <p className="mt-2 text-sm font-medium text-k-sub">
            句子可能已删除，或者不属于当前账号。
          </p>
          <Button className="mt-6" onClick={() => navigate('/learning/text-import')}>
            返回文本导入
          </Button>
        </DesktopCard>
      </div>
    );
  }

  const canSave = Boolean(
    activeExplanationId && activePayload && payloadHasLearningAssets(activePayload)
  );
  const alreadySaved = Boolean(savedState?.hasSavedSentence);
  const selectedVocabularyCount = selectedVocabularyItems.length;
  const duplicateVocabularyCount = Math.max(0, vocabularyItems.length - vocabularyDrafts.length);
  const activeQuality =
    latestExplanation && activeExplanationId === latestExplanation._id
      ? {
          confidence: latestExplanation.confidence,
          promptVersion: latestExplanation.promptVersion,
          reviewStatus: latestExplanation.reviewStatus,
          provider: latestExplanation.provider,
        }
      : null;

  return (
    <div className="min-h-screen bg-k-bg p-6 md:p-12 font-k-sans pb-32">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/learning/text-import')}>
            <ArrowLeft size={20} />
          </Button>
          <div className="flex items-center gap-3">
            <HanjaSeal c="句" size={42} bg="var(--color-k-indigo)" round={10} />
            <div>
              <h1 className="text-2xl font-black text-k-ink">句子学习</h1>
              <p className="text-sm font-medium text-k-sub">解析结构 · 保存资产 · 自动进入复习</p>
            </div>
          </div>
        </div>

        <DesktopCard className="space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <DesignChip tone="muted" size="sm">
              SENTENCE {sentence.sentenceIndex}
            </DesignChip>
            <DesignChip tone="muted" size="sm">
              {sentence.language.toUpperCase()}
            </DesignChip>
            {latestExplanation && (
              <DesignChip tone="butter" size="sm">
                已有解析
              </DesignChip>
            )}
            {activeQuality?.reviewStatus && (
              <DesignChip tone="muted" size="sm">
                {activeQuality.reviewStatus}
              </DesignChip>
            )}
          </div>
          <div className="rounded-2xl border border-k-line bg-k-bg2/40 p-5 text-xl font-bold leading-relaxed text-k-ink">
            {sentence.text}
          </div>
          <div className="flex flex-wrap gap-3">
            <Button
              className="gap-2 bg-k-ink text-k-bg hover:bg-k-ink/90"
              loading={explaining}
              loadingText="正在解析..."
              onClick={() => handleExplain(false)}
            >
              <Sparkles size={16} />
              {activePayload ? '重新载入解析' : '开始 AI 解析'}
            </Button>
            <Button
              variant="outline"
              className="gap-2"
              disabled={explaining}
              onClick={() => handleExplain(true)}
            >
              <RefreshCw size={16} />
              强制刷新
            </Button>
            <Button
              variant={alreadySaved ? 'secondary' : 'outline'}
              className="gap-2"
              loading={saving}
              loadingText="正在保存..."
              disabled={!canSave || alreadySaved}
              onClick={handleSave}
            >
              {alreadySaved ? <CheckCircle2 size={16} /> : <Save size={16} />}
              {alreadySaved ? '已保存到复习' : '保存到学习资产'}
            </Button>
          </div>
        </DesktopCard>

        {savedAssetQuality && (
          <DesktopCard className="space-y-3 border-k-indigo/20 bg-k-indigo/5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-black text-k-ink">保存质量追踪</h2>
                <p className="mt-1 text-xs font-bold text-k-sub">
                  本次保存 {savedAssetQuality.savedWordCount} 词卡 ·{' '}
                  {savedAssetQuality.savedGrammarCount} 语法
                </p>
              </div>
              <DesignChip tone="muted" size="sm">
                {savedAssetQuality.reviewStatus ?? 'unreviewed'}
              </DesignChip>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px] font-black text-k-sub md:grid-cols-4">
              <div className="rounded-xl bg-k-card px-3 py-2">
                AI质量 {formatConfidence(savedAssetQuality.confidence)}
              </div>
              <div className="rounded-xl bg-k-card px-3 py-2">
                Prompt {savedAssetQuality.promptVersion ?? 'default'}
              </div>
              <div className="rounded-xl bg-k-card px-3 py-2">
                Source {savedAssetQuality.source ?? 'unknown'}
              </div>
              <div className="rounded-xl bg-k-card px-3 py-2">
                Provider {savedAssetQuality.provider ?? 'auto'}
              </div>
            </div>
            {nextImportedSentence && (
              <div className="flex flex-col gap-3 rounded-2xl border border-k-line bg-k-card p-4 md:flex-row md:items-center md:justify-between">
                <div className="min-w-0">
                  <div className="text-[10px] font-black uppercase text-k-sub">
                    下一句 SENTENCE {nextImportedSentence.sentenceIndex}
                  </div>
                  <p className="mt-1 line-clamp-1 text-sm font-bold text-k-ink">
                    {nextImportedSentence.text}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0 gap-2 font-black"
                  onClick={() => navigate(`/learning/sentence/${nextImportedSentence._id}`)}
                >
                  学习下一句
                  <ChevronRight size={14} />
                </Button>
              </div>
            )}
          </DesktopCard>
        )}

        {generatedCards.length > 0 && (
          <DesktopCard className="space-y-3 border-k-mint/30 bg-k-mint/5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-black text-k-ink">已生成卡片</h2>
                <p className="mt-1 text-xs font-bold text-k-sub">可撤销本次保存生成的单张词卡。</p>
              </div>
              <DesignChip tone="mint" size="sm">
                {generatedCards.length} 张
              </DesignChip>
            </div>
            <div className="grid gap-2">
              {generatedCards.map(card => (
                <div
                  key={String(card.id)}
                  className="grid gap-3 rounded-xl border border-k-line bg-k-card p-3 md:grid-cols-[1fr_auto]"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-black text-k-ink">{card.word}</div>
                    <div className="mt-1 text-xs font-bold text-k-sub">{card.meaning}</div>
                    <div className="mt-2 text-[11px] font-black text-k-indigo">
                      复习状态 {card.reviewStatus}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2 text-[10px] font-black text-k-sub">
                      <span>AI质量 {formatConfidence(card.confidence)}</span>
                      {card.promptVersion && <span>Prompt {card.promptVersion}</span>}
                      {card.source && <span>Source {card.source}</span>}
                      {card.provider && <span>Provider {card.provider}</span>}
                      <span>审核 {card.qualityReviewStatus ?? card.reviewStatus}</span>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="font-black"
                    onClick={() => void handleUndoGeneratedCard(card)}
                  >
                    撤销 {card.word}
                  </Button>
                </div>
              ))}
            </div>
          </DesktopCard>
        )}

        {activePayload && (
          <div className="grid gap-6 md:grid-cols-[1.2fr_1fr]">
            <DesktopCard className="space-y-4">
              <h2 className="flex items-center gap-2 text-lg font-black text-k-ink">
                <BookOpen size={18} className="text-k-indigo" />
                句子解释
              </h2>
              {activePayload.naturalTranslation && (
                <div>
                  <div className="text-[10px] font-black uppercase text-k-sub">自然翻译</div>
                  <p className="mt-1 text-base font-bold leading-relaxed text-k-ink">
                    {activePayload.naturalTranslation}
                  </p>
                </div>
              )}
              {activePayload.overallMeaning && (
                <div>
                  <div className="text-[10px] font-black uppercase text-k-sub">整体含义</div>
                  <p className="mt-1 text-sm font-medium leading-relaxed text-k-ink">
                    {activePayload.overallMeaning}
                  </p>
                </div>
              )}
              {activePayload.notes?.length ? (
                <div className="space-y-2">
                  <div className="text-[10px] font-black uppercase text-k-sub">易错点</div>
                  {activePayload.notes.map(note => (
                    <p
                      key={note}
                      className="rounded-xl bg-k-bg2 p-3 text-sm font-medium text-k-ink"
                    >
                      {note}
                    </p>
                  ))}
                </div>
              ) : null}
            </DesktopCard>

            <div className="space-y-6">
              {activeQuality && (
                <DesktopCard>
                  <h3 className="mb-3 text-sm font-black text-k-ink">AI 质量信息</h3>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="rounded-xl bg-k-bg2/50 p-3">
                      <div className="text-[10px] font-black uppercase text-k-sub">Confidence</div>
                      <div className="mt-1 font-black text-k-ink">
                        {typeof activeQuality.confidence === 'number'
                          ? `${Math.round(activeQuality.confidence * 100)}%`
                          : '待补充'}
                      </div>
                    </div>
                    <div className="rounded-xl bg-k-bg2/50 p-3">
                      <div className="text-[10px] font-black uppercase text-k-sub">Prompt</div>
                      <div className="mt-1 font-black text-k-ink">
                        {activeQuality.promptVersion || 'default'}
                      </div>
                    </div>
                    <div className="rounded-xl bg-k-bg2/50 p-3">
                      <div className="text-[10px] font-black uppercase text-k-sub">Provider</div>
                      <div className="mt-1 font-black text-k-ink">
                        {activeQuality.provider || 'auto'}
                      </div>
                    </div>
                    <div className="rounded-xl bg-k-bg2/50 p-3">
                      <div className="text-[10px] font-black uppercase text-k-sub">Review</div>
                      <div className="mt-1 font-black text-k-ink">
                        {activeQuality.reviewStatus || 'unreviewed'}
                      </div>
                    </div>
                  </div>
                </DesktopCard>
              )}
              <DesktopCard>
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-black text-k-ink">词汇卡片生成</h3>
                    <p className="mt-1 text-xs font-bold text-k-sub">
                      将生成 {selectedVocabularyCount} 张词卡
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {duplicateVocabularyCount > 0 && (
                      <DesignChip tone="butter" size="sm">
                        合并重复 {duplicateVocabularyCount} 项
                      </DesignChip>
                    )}
                    <DesignChip tone={selectedVocabularyCount > 0 ? 'mint' : 'muted'} size="sm">
                      {selectedVocabularyCount}/{vocabularyDrafts.length}
                    </DesignChip>
                  </div>
                </div>
                {vocabularyDrafts.length ? (
                  <div className="space-y-3">
                    {vocabularyDrafts.map(item => {
                      const isKnown = knownWordKeys.has(item.key);
                      return (
                        <div
                          key={item.key}
                          className="rounded-xl border border-k-line bg-k-bg2/30 p-3"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <div className="text-base font-black text-k-ink">{item.surface}</div>
                              <div className="mt-1 text-xs font-medium text-k-sub">
                                {[item.lemma, item.partOfSpeech].filter(Boolean).join(' · ')}
                              </div>
                              <label className="mt-3 block text-[10px] font-black uppercase text-k-sub">
                                {item.surface} 词义
                                <Input
                                  aria-label={`${item.surface} 词义`}
                                  value={editedVocabularyMeanings[item.key] ?? item.meaning}
                                  onChange={event =>
                                    updateVocabularyDraftMeaning(item.key, event.target.value)
                                  }
                                  className="mt-1 h-9 border-k-line text-sm font-bold"
                                />
                              </label>
                            </div>
                            <div className="flex shrink-0 rounded-xl border border-k-line bg-k-card p-1">
                              <button
                                type="button"
                                className={`rounded-lg px-2 py-1 text-[11px] font-black transition-colors ${
                                  isKnown ? 'bg-k-bg2 text-k-sub' : 'bg-k-ink text-k-bg'
                                }`}
                                onClick={() => setWordKnownState(item.key, false)}
                              >
                                {item.surface} 不认识
                              </button>
                              <button
                                type="button"
                                className={`rounded-lg px-2 py-1 text-[11px] font-black transition-colors ${
                                  isKnown ? 'bg-k-mint text-[#2F5847]' : 'text-k-sub'
                                }`}
                                onClick={() => setWordKnownState(item.key, true)}
                              >
                                {item.surface} 已认识
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm font-medium text-k-sub">暂无可保存词汇。</p>
                )}
                {selectedVocabularyItems.length > 0 && (
                  <div className="mt-4 border-t border-k-line pt-4">
                    <h4 className="mb-3 text-xs font-black text-k-ink">卡片预览</h4>
                    <div className="grid gap-2">
                      {selectedVocabularyItems.map(item => (
                        <div
                          key={`${item.surface}-${item.lemma ?? ''}-${item.partOfSpeech ?? ''}`}
                          className="grid grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] overflow-hidden rounded-xl border border-k-line text-xs"
                        >
                          <div className="bg-k-ink px-3 py-2 font-black text-k-bg">
                            {item.surface}
                          </div>
                          <div className="bg-k-bg2/40 px-3 py-2 font-bold text-k-ink">
                            {item.meaning || '待补充释义'}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </DesktopCard>

              <DesktopCard>
                <h3 className="mb-4 text-sm font-black text-k-ink">语法结构</h3>
                {activePayload.grammar?.length ? (
                  <div className="space-y-3">
                    {activePayload.grammar.map(item => (
                      <div
                        key={item.pattern}
                        className="rounded-xl border border-k-line bg-k-bg2/30 p-3"
                      >
                        <div className="text-sm font-black text-k-ink">{item.pattern}</div>
                        <p className="mt-1 text-xs font-medium leading-relaxed text-k-sub">
                          {item.explanation || item.reason || '已识别为句中语法点。'}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm font-medium text-k-sub">暂无可保存语法。</p>
                )}
              </DesktopCard>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SentenceLearningPage;
