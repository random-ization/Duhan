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
import type { WeakGrammarPattern, WeakVocabCategory } from '../weakPoints';
import type { VocabReviewSummaryDto } from '../vocab';

export const DAILY_TASK_VERSION = 'p0-v1';

export type DailyTaskKind = DailyChallengeKind | 'note_review';
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
  weakPointSummary?: string;
};

export type DailyTaskPlanDto = {
  id?: string;
  date: string;
  status: DailyTaskPlanStatus;
  goalProfileId?: string;
  taskVersion?: string;
  source?: string;
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
  if (kind === 'vocab_20') return '/review';
  if (kind === 'grammar_drill') return '/course/topik-grammar/grammar';
  if (kind === 'listening_10min') return '/media?tab=podcasts';
  if (kind === 'typing_wpm') return '/typing';
  return '/notebook';
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
  if (args.signals.dueNoteCount > 0) {
    kinds.push('note_review');
  }

  const uniqueKinds = Array.from(new Set(kinds)).slice(0, 3);
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

    const localized = localizeChallengeText(kind, language);
    const currentCount = Math.max(
      await deriveDailyTaskCurrentCount(args.ctx, args.userId, kind, todayStart, args.signals),
      persistedTask?.currentCount ?? 0
    );
    const targetCount = localized.targetCount;
    const completed = !!persistedTask?.completed || currentCount >= targetCount;
    tasks.push({
      taskId,
      kind,
      title: localized.title,
      description: localized.description,
      targetCount,
      currentCount,
      completed,
      linkPath: resolveDailyTaskPath(kind),
      metadata: { rewardXp: localized.rewardXp },
    });
  }

  const allCompleted = tasks.length > 0 && tasks.every(task => task.completed);
  return {
    id: args.persistedPlan?.id,
    date,
    status: allCompleted ? 'completed' : 'ready',
    goalProfileId: args.profile?.id,
    taskVersion: DAILY_TASK_VERSION,
    source: args.profile ? 'user_goal_profile' : 'fallback',
    tasks,
    reviewSummary: {
      dueVocabCount: args.signals.reviewSummary.dueNow,
      dueNoteCount: args.signals.dueNoteCount,
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
