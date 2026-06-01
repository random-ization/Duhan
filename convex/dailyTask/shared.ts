import type { Id } from '../_generated/dataModel';
import type { QueryCtx, MutationCtx } from '../_generated/server';
import {
  DEFAULT_CHALLENGE_ROTATION,
  deriveDailyChallengeCurrentCount,
  formatDailyChallengeDateKey,
  getDailyChallengeTemplateForDate,
  normalizeDailyChallengeLanguage,
  type DailyChallengeKind,
  type SupportedLanguage,
} from '../dailyChallenges';
import type { GoalProfileDto } from '../onboarding/index';
import type { WeakGrammarPattern, WeakVocabCategory, WritingErrorSummary } from '../weakPoints';
import type { VocabReviewSummaryDto } from '../vocab';

export const DAILY_TASK_VERSION = 'p0-v1';

export type DailyTaskKind =
  | DailyChallengeKind
  | 'note_review'
  | 'sentence_review'
  | 'grammar_review'
  | 'topik_rewrite';
export type DailyTaskPlanStatus = 'ready' | 'completed';

export type DailyTaskItemDto = {
  taskId: string;
  kind: DailyTaskKind;
  title: string;
  description?: string;
  targetCount?: number;
  currentCount?: number;
  completed: boolean;
  linkPath?: string;
  assetType?: string;
  assetRefId?: string;
  metadata?: Record<string, string | number | boolean | null>;
};

export type DailyTaskReviewSummaryDto = {
  dueVocabCount?: number;
  dueNoteCount?: number;
  dueSentenceCount?: number;
  dueGrammarCount?: number;
  weakPointSummary?: string;
};

export type DailyTaskPlanDto = {
  id?: string;
  date: string;
  status: DailyTaskPlanStatus;
  goalProfileId?: string;
  taskVersion?: string;
  source?: string;
  rationale?: string;
  tasks: DailyTaskItemDto[];
  reviewSummary?: DailyTaskReviewSummaryDto;
  generatedAt: number;
  createdAt?: number;
  updatedAt?: number;
  completedAt?: number;
};

export type DailyTaskBuildSignals = {
  language: SupportedLanguage;
  reviewSummary: VocabReviewSummaryDto;
  dueNoteCount: number;
  dueSentenceCount: number;
  dueGrammarCount: number;
  importedContinuation?: {
    contentTitle: string;
    sentenceId: string;
    sentenceText: string;
    progressPercent: number;
  };
  writingWeaknesses: WritingErrorSummary[];
  weakGrammarPatterns: WeakGrammarPattern[];
  weakVocabCategories: WeakVocabCategory[];
  noteReviewDoneToday: number;
};

function findTemplateByKind(kind: DailyChallengeKind) {
  return (
    DEFAULT_CHALLENGE_ROTATION.find(item => item.kind === kind) ??
    getDailyChallengeTemplateForDate(formatDailyChallengeDateKey(Date.now()))
  );
}

export function resolveDailyTaskPath(kind: DailyTaskKind): string {
  if (kind === 'vocab_20') return '/review/quiz?mode=full';
  if (kind === 'grammar_drill') return '/course/topik-grammar/grammar';
  if (kind === 'listening_10min') return '/media?tab=podcasts';
  if (kind === 'typing_wpm') return '/typing';
  if (kind === 'sentence_review') return '/review/quiz?mode=sentences';
  if (kind === 'grammar_review') return '/review/quiz?mode=grammar';
  if (kind === 'topik_rewrite') return '/topik/writing-coach';
  return '/notebook';
}

function priorityWeightForKind(args: {
  kind: DailyTaskKind;
  primaryKind: DailyChallengeKind;
  profile: GoalProfileDto | null;
  signals: DailyTaskBuildSignals;
}): number {
  let weight = args.kind === args.primaryKind ? 80 : 50;

  if (args.signals.importedContinuation && args.kind === 'grammar_drill') {
    weight += 35;
  }

  if (
    args.profile?.targetExam?.toUpperCase().includes('TOPIK') &&
    args.signals.writingWeaknesses.length > 0 &&
    (args.kind === 'typing_wpm' || args.kind === 'grammar_drill')
  ) {
    weight += 30;
  }

  if (args.kind === 'note_review' && args.signals.dueNoteCount > 0) {
    weight += 15;
  }

  if (args.kind === 'sentence_review' && args.signals.dueSentenceCount > 0) {
    weight += 28;
  }

  if (args.kind === 'grammar_review' && args.signals.dueGrammarCount > 0) {
    weight += 26;
  }

  if (args.kind === 'vocab_20' && (args.signals.reviewSummary.dueNow ?? 0) > 0) {
    weight += 12;
  }

  return weight;
}

function localizeChallengeText(
  kind: DailyChallengeKind,
  language: SupportedLanguage
): { title: string; description: string; rewardXp: number; targetCount: number } {
  const template = findTemplateByKind(kind);
  return {
    title:
      language === 'zh'
        ? template.titleZh
        : language === 'vi'
          ? template.titleVi
          : language === 'mn'
            ? template.titleMn
            : template.titleEn,
    description:
      language === 'zh'
        ? template.subZh
        : language === 'vi'
          ? template.subVi
          : language === 'mn'
            ? template.subMn
            : template.subEn,
    rewardXp: template.rewardXp,
    targetCount: template.targetCount,
  };
}

function localizeNoteReviewText(language: SupportedLanguage, targetCount: number) {
  if (language === 'zh') {
    return {
      title: `复盘 ${targetCount} 条学习笔记`,
      description: '把今天待回看的重点和错题再过一遍。',
    };
  }
  if (language === 'vi') {
    return {
      title: `Xem lại ${targetCount} ghi chú học tập`,
      description: 'Ôn lại những ghi chú và lỗi sai cần xem hôm nay.',
    };
  }
  if (language === 'mn') {
    return {
      title: `${targetCount} тэмдэглэл давтах`,
      description: 'Өнөөдөр эргэж харах ёстой тэмдэглэл, алдаануудаа дахин үз.',
    };
  }
  return {
    title: `Review ${targetCount} study notes`,
    description: 'Revisit today’s queued notes and key mistakes.',
  };
}

function localizeSavedAssetReviewText(
  language: SupportedLanguage,
  kind: 'sentence_review' | 'grammar_review',
  targetCount: number
) {
  if (kind === 'sentence_review') {
    if (language === 'zh') {
      return {
        title: `复习 ${targetCount} 条保存句子`,
        description: '用间隔复习巩固最近保存的例句和表达。',
      };
    }
    if (language === 'vi') {
      return {
        title: `Ôn ${targetCount} câu đã lưu`,
        description: 'Củng cố các câu và cách diễn đạt đã lưu gần đây.',
      };
    }
    if (language === 'mn') {
      return {
        title: `${targetCount} хадгалсан өгүүлбэр давтах`,
        description: 'Сүүлийн хадгалсан өгүүлбэр, хэллэгээ зайтай давтлагаар бататга.',
      };
    }
    return {
      title: `Review ${targetCount} saved sentences`,
      description: 'Reinforce recently saved example sentences and expressions.',
    };
  }

  if (language === 'zh') {
    return {
      title: `复习 ${targetCount} 个保存语法`,
      description: '优先处理今天到期的语法卡片。',
    };
  }
  if (language === 'vi') {
    return {
      title: `Ôn ${targetCount} ngữ pháp đã lưu`,
      description: 'Ưu tiên các thẻ ngữ pháp đến hạn hôm nay.',
    };
  }
  if (language === 'mn') {
    return {
      title: `${targetCount} хадгалсан дүрэм давтах`,
      description: 'Өнөөдөр хугацаатай дүрмийн картуудаа түрүүлж давт.',
    };
  }
  return {
    title: `Review ${targetCount} saved grammar cards`,
    description: 'Prioritize grammar cards due for review today.',
  };
}

function inferAdditionalKinds(profile: GoalProfileDto | null): DailyChallengeKind[] {
  const focus = (profile?.studyFocus ?? []).map(item => item.toLowerCase());
  const additional: DailyChallengeKind[] = [];

  const includesAny = (...keywords: string[]) =>
    focus.some(item => keywords.some(key => item.includes(key)));

  if (includesAny('grammar', '문법', '语法', 'ngữ pháp', 'дүрэм')) {
    additional.push('grammar_drill');
  }
  if (includesAny('listen', 'podcast', 'hearing', '听', 'nghe', 'сонс')) {
    additional.push('listening_10min');
  }
  if (includesAny('typing', 'write', 'exam', 'topik', '打字', '写作', 'gõ', 'бич')) {
    additional.push('typing_wpm');
  }

  if (additional.length === 0) {
    if ((profile?.targetExam ?? '').toUpperCase().includes('TOPIK')) {
      additional.push('grammar_drill');
    }
    additional.push('listening_10min');
  }

  return Array.from(new Set(additional));
}

function buildDailyTaskRationale(args: {
  language: SupportedLanguage;
  profile: GoalProfileDto | null;
}): string | undefined {
  if (!args.profile) {
    return undefined;
  }

  const focusText =
    args.profile.studyFocus.length > 0 ? args.profile.studyFocus.join(' / ') : undefined;
  const levelText =
    args.profile.currentLevel ?? args.profile.targetLevel ?? args.profile.targetExam;
  const diagnosisSummary = args.profile.diagnosisSummary;

  if (args.language === 'zh') {
    if (diagnosisSummary && focusText) {
      return `今日任务依据你的目标（${focusText}）和诊断结果生成：${diagnosisSummary}`;
    }
    if (diagnosisSummary) {
      return `今日任务依据你的诊断结果生成：${diagnosisSummary}`;
    }
    return levelText ? `今日任务会优先匹配你的 ${levelText} 学习目标。` : undefined;
  }

  if (diagnosisSummary && focusText) {
    return `Today's tasks are based on your goals (${focusText}) and diagnosis: ${diagnosisSummary}`;
  }
  if (diagnosisSummary) {
    return `Today's tasks are based on your diagnosis: ${diagnosisSummary}`;
  }
  return levelText ? `Today's tasks are tuned to your ${levelText} goal.` : undefined;
}

export function summarizeWeakPoints(args: {
  language: SupportedLanguage;
  weakGrammarPatterns: WeakGrammarPattern[];
  weakVocabCategories: WeakVocabCategory[];
}): string | undefined {
  const grammarTitle = args.weakGrammarPatterns[0]?.title;
  const vocabCategory = args.weakVocabCategories[0]?.partOfSpeech;

  if (!grammarTitle && !vocabCategory) return undefined;

  if (args.language === 'zh') {
    if (grammarTitle && vocabCategory) {
      return `薄弱点集中在 ${grammarTitle} 和 ${vocabCategory} 词类。`;
    }
    return grammarTitle
      ? `当前更需要巩固 ${grammarTitle}。`
      : `当前更需要强化 ${vocabCategory} 词类。`;
  }
  if (args.language === 'vi') {
    if (grammarTitle && vocabCategory) {
      return `Điểm yếu hiện tại nằm ở ${grammarTitle} và nhóm từ ${vocabCategory}.`;
    }
    return grammarTitle
      ? `Bạn nên ưu tiên củng cố ${grammarTitle}.`
      : `Bạn nên ưu tiên nhóm từ ${vocabCategory}.`;
  }
  if (args.language === 'mn') {
    if (grammarTitle && vocabCategory) {
      return `Таны сул тал ${grammarTitle} болон ${vocabCategory} ангилал дээр төвлөрч байна.`;
    }
    return grammarTitle
      ? `${grammarTitle}-ийг түрүүнд бататгаарай.`
      : `${vocabCategory} ангиллыг түрүүнд давтаарай.`;
  }
  if (grammarTitle && vocabCategory) {
    return `Your weak points are concentrated in ${grammarTitle} and ${vocabCategory}.`;
  }
  return grammarTitle
    ? `You should reinforce ${grammarTitle} next.`
    : `You should drill ${vocabCategory} vocabulary next.`;
}

export async function deriveDailyTaskCurrentCount(
  ctx: QueryCtx | MutationCtx,
  userId: Id<'users'>,
  kind: DailyTaskKind,
  todayStart: number,
  signals: DailyTaskBuildSignals
): Promise<number> {
  if (kind === 'note_review') {
    return signals.noteReviewDoneToday;
  }
  if (kind === 'sentence_review' || kind === 'grammar_review' || kind === 'topik_rewrite') {
    return 0;
  }
  return deriveDailyChallengeCurrentCount(ctx, userId, kind, todayStart);
}

export async function buildDailyTaskPlan(args: {
  ctx: QueryCtx | MutationCtx;
  userId: Id<'users'>;
  now: number;
  language?: string;
  profile: GoalProfileDto | null;
  persistedPlan?: DailyTaskPlanDto | null;
  signals: DailyTaskBuildSignals;
}): Promise<DailyTaskPlanDto> {
  const date = formatDailyChallengeDateKey(args.now);
  const todayStart = new Date(`${date}T00:00:00`).getTime();
  const language = normalizeDailyChallengeLanguage(
    args.language ?? args.profile?.preferredLanguage
  );
  const primaryKind = getDailyChallengeTemplateForDate(date).kind;
  const additionalKinds = inferAdditionalKinds(args.profile).filter(kind => kind !== primaryKind);

  const kinds: DailyTaskKind[] = [primaryKind, ...additionalKinds];
  const hasTopikWeakness =
    (args.profile?.targetExam ?? '').toUpperCase().includes('TOPIK') &&
    args.signals.writingWeaknesses.length > 0;
  if (args.signals.importedContinuation) {
    kinds.push('grammar_drill');
  }
  if (hasTopikWeakness) {
    kinds.push('typing_wpm');
  }
  if (args.signals.dueNoteCount > 0) {
    kinds.push('note_review');
  }
  if (args.signals.dueSentenceCount > 0) {
    kinds.push('sentence_review');
  }
  if (args.signals.dueGrammarCount > 0) {
    kinds.push('grammar_review');
  }

  const uniqueKinds = Array.from(new Set(kinds))
    .sort((left, right) => {
      const leftWeight = priorityWeightForKind({
        kind: left,
        primaryKind,
        profile: args.profile,
        signals: args.signals,
      });
      const rightWeight = priorityWeightForKind({
        kind: right,
        primaryKind,
        profile: args.profile,
        signals: args.signals,
      });
      return rightWeight - leftWeight;
    })
    .slice(0, 4);
  const persistedTasks = new Map(
    (args.persistedPlan?.tasks ?? []).map(task => [task.taskId, task] as const)
  );

  const tasks: DailyTaskItemDto[] = [];
  for (const kind of uniqueKinds) {
    const taskId = kind === primaryKind ? `primary:${kind}` : `focus:${kind}`;
    const persistedTask = persistedTasks.get(taskId);

    if (kind === 'note_review') {
      const targetCount = Math.max(1, Math.min(3, args.signals.dueNoteCount));
      const currentCount = Math.max(
        args.signals.noteReviewDoneToday,
        persistedTask?.currentCount ?? 0
      );
      const completed = !!persistedTask?.completed || currentCount >= targetCount;
      const copy = localizeNoteReviewText(language, targetCount);
      tasks.push({
        taskId,
        kind,
        title: copy.title,
        description: copy.description,
        targetCount,
        currentCount,
        completed,
        linkPath: resolveDailyTaskPath(kind),
        metadata: { rewardXp: 15 },
      });
      continue;
    }

    if (kind === 'sentence_review' || kind === 'grammar_review') {
      const dueCount =
        kind === 'sentence_review' ? args.signals.dueSentenceCount : args.signals.dueGrammarCount;
      const targetCount = Math.max(1, Math.min(3, dueCount));
      const currentCount = Math.max(persistedTask?.currentCount ?? 0, 0);
      const completed = !!persistedTask?.completed || currentCount >= targetCount;
      const copy = localizeSavedAssetReviewText(language, kind, targetCount);
      tasks.push({
        taskId,
        kind,
        title: copy.title,
        description: copy.description,
        targetCount,
        currentCount,
        completed,
        linkPath: resolveDailyTaskPath(kind),
        assetType: kind === 'sentence_review' ? 'saved_sentence' : 'saved_grammar',
        metadata: { rewardXp: kind === 'sentence_review' ? 18 : 16 },
      });
      continue;
    }

    if (kind === 'topik_rewrite') {
      continue;
    }

    const localized = localizeChallengeText(kind, language);
    const topWeakness = args.signals.writingWeaknesses[0];
    if (hasTopikWeakness && topWeakness && kind === 'typing_wpm') {
      const currentCount = Math.max(persistedTask?.currentCount ?? 0, 0);
      const targetCount = 1;
      tasks.push({
        taskId,
        kind,
        title:
          language === 'zh'
            ? `TOPIK 写作弱点修复 · ${topWeakness.labelZh}`
            : `TOPIK Writing Fix · ${topWeakness.labelKo}`,
        description:
          language === 'zh'
            ? `最近高频错误：${topWeakness.labelZh}，进入写作教练做定向修正。`
            : `Most frequent weakness: ${topWeakness.labelKo}. Open writing coach for focused fixes.`,
        targetCount,
        currentCount,
        completed: !!persistedTask?.completed || currentCount >= targetCount,
        linkPath: '/topik/writing-coach',
        assetType: 'topik_weakness',
        assetRefId: topWeakness.kagasType,
        metadata: {
          rewardXp: localized.rewardXp,
          weaknessCount: topWeakness.count,
          highSeverityCount: topWeakness.highSeverityCount,
        },
      });
      continue;
    }

    const taskTitle =
      args.signals.importedContinuation && kind === 'grammar_drill'
        ? language === 'zh'
          ? '继续句子解释与保存'
          : 'Continue Sentence Explainer'
        : localized.title;
    const taskDescription =
      args.signals.importedContinuation && kind === 'grammar_drill'
        ? language === 'zh'
          ? `继续《${args.signals.importedContinuation.contentTitle}》并处理下一句：${args.signals.importedContinuation.sentenceText}`
          : `Continue imported content and process the next sentence.`
        : localized.description;
    const taskLinkPath =
      args.signals.importedContinuation && kind === 'grammar_drill'
        ? `/learning/sentence/${args.signals.importedContinuation.sentenceId}`
        : resolveDailyTaskPath(kind);
    const taskAssetType =
      args.signals.importedContinuation && kind === 'grammar_drill'
        ? 'content_sentence'
        : undefined;
    const taskAssetRefId =
      args.signals.importedContinuation && kind === 'grammar_drill'
        ? args.signals.importedContinuation.sentenceId
        : undefined;
    const currentCount = Math.max(
      await deriveDailyTaskCurrentCount(args.ctx, args.userId, kind, todayStart, args.signals),
      persistedTask?.currentCount ?? 0
    );
    const targetCount = localized.targetCount;
    const completed = !!persistedTask?.completed || currentCount >= targetCount;
    tasks.push({
      taskId,
      kind,
      title: taskTitle,
      description: taskDescription,
      targetCount,
      currentCount,
      completed,
      linkPath: taskLinkPath,
      assetType: taskAssetType,
      assetRefId: taskAssetRefId,
      metadata: { rewardXp: localized.rewardXp },
    });
  }

  const existingTaskIds = new Set(tasks.map(task => task.taskId));
  const manualTasks = (args.persistedPlan?.tasks ?? []).filter(
    task => task.metadata?.manual === true && !existingTaskIds.has(task.taskId)
  );
  tasks.push(...manualTasks);

  const allCompleted = tasks.length > 0 && tasks.every(task => task.completed);
  return {
    id: args.persistedPlan?.id,
    date,
    status: allCompleted ? 'completed' : 'ready',
    goalProfileId: args.profile?.id,
    taskVersion: DAILY_TASK_VERSION,
    source: args.profile ? 'user_goal_profile' : 'fallback',
    rationale: buildDailyTaskRationale({ language, profile: args.profile }),
    tasks,
    reviewSummary: {
      dueVocabCount: args.signals.reviewSummary.dueNow,
      dueNoteCount: args.signals.dueNoteCount,
      dueSentenceCount: args.signals.dueSentenceCount,
      dueGrammarCount: args.signals.dueGrammarCount,
      weakPointSummary: summarizeWeakPoints({
        language,
        weakGrammarPatterns: args.signals.weakGrammarPatterns,
        weakVocabCategories: args.signals.weakVocabCategories,
      }),
    },
    generatedAt: args.now,
    createdAt: args.persistedPlan?.createdAt ?? args.now,
    updatedAt: args.now,
    completedAt: allCompleted ? (args.persistedPlan?.completedAt ?? args.now) : undefined,
  };
}
