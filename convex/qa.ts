import { action } from './_generated/server';
import { v, ConvexError } from 'convex/values';
import { makeFunctionReference } from 'convex/server';

type CheckResult = {
  ok: boolean;
  skipped?: boolean;
  error?: string;
  durationMs: number;
  details?: unknown;
};

const viewerQuery = makeFunctionReference<'query', Record<string, never>, unknown>('users:viewer');
const getInstitutesQuery = makeFunctionReference<'query', Record<string, never>, unknown[]>(
  'institutes:getAll'
);
const getTopikExamsQuery = makeFunctionReference<'query', { paginationOpts?: unknown }, unknown[]>(
  'topik:getExams'
);

const saveSavedWordMutation = makeFunctionReference<
  'mutation',
  { korean: string; english: string; exampleSentence?: string; exampleTranslation?: string },
  { success: boolean }
>('user:saveSavedWord');
const getSavedWordsQuery = makeFunctionReference<'query', { limit?: number }, unknown[]>(
  'user:getSavedWords'
);
const removeSavedWordMutation = makeFunctionReference<
  'mutation',
  { savedWordId: unknown },
  { success: boolean }
>('user:removeSavedWord');

const saveMistakeMutation = makeFunctionReference<
  'mutation',
  { wordId?: unknown; korean: string; english: string; context?: string },
  { success: boolean }
>('user:saveMistake');
const getMistakesQuery = makeFunctionReference<'query', { limit?: number }, unknown[]>(
  'user:getMistakes'
);
const removeMistakeMutation = makeFunctionReference<
  'mutation',
  { mistakeId: unknown },
  { success: boolean }
>('user:removeMistake');

const saveAnnotationMutation = makeFunctionReference<
  'mutation',
  {
    contextKey: string;
    text: string;
    note?: string;
    color?: string;
    startOffset?: number;
    endOffset?: number;
  },
  { id: unknown; success: boolean }
>('annotations:save');
const getAnnotationsByContextQuery = makeFunctionReference<
  'query',
  { contextKey: string },
  unknown[]
>('annotations:getByContext');
const removeAnnotationMutation = makeFunctionReference<
  'mutation',
  { annotationId: unknown },
  { success: boolean }
>('annotations:remove');

const saveNotebookMutation = makeFunctionReference<
  'mutation',
  { type: string; title: string; content: unknown; tags?: string[] },
  unknown
>('notebooks:save');
const listNotebooksQuery = makeFunctionReference<'query', { type?: string }, unknown>(
  'notebooks:list'
);
const removeNotebookMutation = makeFunctionReference<'mutation', { notebookId: unknown }, unknown>(
  'notebooks:remove'
);

const saveExamAttemptMutation = makeFunctionReference<
  'mutation',
  {
    examId: string;
    score: number;
    totalQuestions?: number;
    sectionScores?: unknown;
    duration?: number;
    answers?: unknown;
  },
  { success: boolean; attemptId: unknown }
>('user:saveExamAttempt');
const getExamAttemptsQuery = makeFunctionReference<'query', { limit?: number }, unknown[]>(
  'user:getExamAttempts'
);
const deleteExamAttemptMutation = makeFunctionReference<
  'mutation',
  { attemptId: unknown },
  { success: boolean; error?: string }
>('user:deleteExamAttempt');

const getVocabOfCourseQuery = makeFunctionReference<
  'query',
  { courseId: string; limit?: number },
  unknown[]
>('vocab:getOfCourse');
const updateVocabProgressMutation = makeFunctionReference<
  'mutation',
  { wordId: unknown; quality: number },
  unknown
>('vocab:updateProgress');
const resetVocabProgressMutation = makeFunctionReference<'mutation', { wordId: unknown }, unknown>(
  'vocab:resetProgress'
);

const completeUnitMutation = makeFunctionReference<
  'mutation',
  { courseId: string; unitIndex: number },
  unknown
>('progress:completeUnit');
const uncompleteUnitMutation = makeFunctionReference<
  'mutation',
  { courseId: string; unitIndex: number },
  unknown
>('progress:uncompleteUnit');
const getCourseProgressQuery = makeFunctionReference<'query', { courseId: string }, unknown>(
  'progress:getCourseProgress'
);

const recordPodcastHistoryMutation = makeFunctionReference<
  'mutation',
  {
    episodeGuid: string;
    episodeTitle: string;
    episodeUrl: string;
    channelName: string;
    channelImage?: string;
    progress: number;
    duration?: number;
    episodeId?: unknown;
  },
  unknown
>('podcasts:recordHistory');
const getPodcastHistoryQuery = makeFunctionReference<'query', Record<string, never>, unknown[]>(
  'podcasts:getHistory'
);
const removePodcastHistoryMutation = makeFunctionReference<
  'mutation',
  { historyId: unknown },
  unknown
>('podcasts:removeHistoryRecord');

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' ? (value as Record<string, unknown>) : {};

const asArray = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

const getStringField = (record: Record<string, unknown>, key: string): string | undefined => {
  const v = record[key];
  return typeof v === 'string' ? v : undefined;
};

const runCheck = async (fn: () => Promise<unknown>): Promise<CheckResult> => {
  const start = Date.now();
  try {
    const details = await fn();
    return { ok: true, durationMs: Date.now() - start, details };
  } catch (e: unknown) {
    return {
      ok: false,
      durationMs: Date.now() - start,
      error: e instanceof Error ? e.message : String(e),
    };
  }
};

export const runRouteAudit = action({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const viewer = await ctx.runQuery(viewerQuery, {});
    const viewerRec = asRecord(viewer);
    if (!viewer || getStringField(viewerRec, 'role') !== 'ADMIN')
      throw new ConvexError({ code: 'FORBIDDEN' });

    const limit = args.limit ?? 200;
    const now = Date.now();

    const savedWords = await runCheck(async () => {
      const korean = `QA_${now}`;
      await ctx.runMutation(saveSavedWordMutation, {
        korean,
        english: 'qa',
        exampleSentence: 'qa',
        exampleTranslation: 'qa',
      });
      const afterWrite = await ctx.runQuery(getSavedWordsQuery, { limit: 50 });
      const rows = asArray(afterWrite).map(asRecord);
      const found = rows.find(r => getStringField(r, 'korean') === korean);
      if (!found) throw new Error('Saved word not readable after write');
      await ctx.runMutation(removeSavedWordMutation, { savedWordId: found.id });
      const afterDelete = await ctx.runQuery(getSavedWordsQuery, { limit: 50 });
      const rowsAfter = asArray(afterDelete).map(asRecord);
      if (rowsAfter.some(r => getStringField(r, 'korean') === korean))
        throw new Error('Saved word not deleted');
      return { wrote: true, deleted: true };
    });

    const mistakes = await runCheck(async () => {
      const korean = `QA_${now}`;
      await ctx.runMutation(saveMistakeMutation, { korean, english: 'qa', context: 'QA' });
      const afterWrite = await ctx.runQuery(getMistakesQuery, { limit: 50 });
      const rows = asArray(afterWrite).map(asRecord);
      const found = rows.find(r => getStringField(r, 'korean') === korean);
      if (!found) throw new Error('Mistake not readable after write');
      await ctx.runMutation(removeMistakeMutation, { mistakeId: found.id });
      const afterDelete = await ctx.runQuery(getMistakesQuery, { limit: 50 });
      const rowsAfter = asArray(afterDelete).map(asRecord);
      if (rowsAfter.some(r => getStringField(r, 'korean') === korean))
        throw new Error('Mistake not deleted');
      return { wrote: true, deleted: true };
    });

    const annotations = await runCheck(async () => {
      const contextKey = `QA_CONTEXT_${now}`;
      const res = await ctx.runMutation(saveAnnotationMutation, {
        contextKey,
        text: 'qa',
        note: 'qa',
        color: 'yellow',
        startOffset: 0,
        endOffset: 2,
      });
      const afterWrite = await ctx.runQuery(getAnnotationsByContextQuery, { contextKey });
      const resRec = asRecord(res);
      const newId = resRec.id;
      const rows = asArray(afterWrite).map(asRecord);
      const found = rows.find(r => String(r.id) === String(newId));
      if (!found) throw new Error('Annotation not readable after write');
      await ctx.runMutation(removeAnnotationMutation, { annotationId: newId });
      const afterDelete = await ctx.runQuery(getAnnotationsByContextQuery, { contextKey });
      const rowsAfter = asArray(afterDelete).map(asRecord);
      if (rowsAfter.some(r => String(r.id) === String(newId)))
        throw new Error('Annotation not deleted');
      return { wrote: true, deleted: true };
    });

    const notebooks = await runCheck(async () => {
      const title = `QA_${now}`;
      const res = await ctx.runMutation(saveNotebookMutation, {
        type: 'NOTE',
        title,
        content: { text: 'qa' },
        tags: ['qa'],
      });
      const list = await ctx.runQuery(listNotebooksQuery, { type: 'NOTE' });
      const resRec = asRecord(res);
      const resData = asRecord(resRec.data);
      const notebookId = resData.id;
      const listRec = asRecord(list);
      const rows = asArray(listRec.data).map(asRecord);
      const found = rows.find(r => String(r.id) === String(notebookId));
      if (!found) throw new Error('Notebook not readable after write');
      await ctx.runMutation(removeNotebookMutation, { notebookId });
      const listAfter = await ctx.runQuery(listNotebooksQuery, { type: 'NOTE' });
      const listAfterRec = asRecord(listAfter);
      const rowsAfter = asArray(listAfterRec.data).map(asRecord);
      if (rowsAfter.some(r => String(r.id) === String(notebookId)))
        throw new Error('Notebook not deleted');
      return { wrote: true, deleted: true };
    });

    const topikExamAttempts = await runCheck(async () => {
      const exams = await ctx.runQuery(getTopikExamsQuery, {});
      const exam = asArray(exams).map(asRecord)[0];
      const legacyId = exam ? getStringField(exam, 'id') : undefined;
      if (!legacyId) return { skipped: true };
      const res = await ctx.runMutation(saveExamAttemptMutation, {
        examId: legacyId,
        score: 0,
        answers: {},
      });
      const resRec = asRecord(res);
      const attemptId = resRec.attemptId;
      const attempts = await ctx.runQuery(getExamAttemptsQuery, { limit: 50 });
      const attemptRows = asArray(attempts).map(asRecord);
      const found = attemptRows.find(a => String(a.id) === String(attemptId));
      if (!found) throw new Error('Exam attempt not readable after write');
      const del = await ctx.runMutation(deleteExamAttemptMutation, { attemptId });
      const delRec = asRecord(del);
      if (delRec.success !== true)
        throw new Error(getStringField(delRec, 'error') || 'Exam attempt delete failed');
      const afterDelete = await ctx.runQuery(getExamAttemptsQuery, { limit: 50 });
      const afterRows = asArray(afterDelete).map(asRecord);
      if (afterRows.some(a => String(a.id) === String(attemptId)))
        throw new Error('Exam attempt not deleted');
      return { wrote: true, deleted: true };
    });

    const vocabProgress = await runCheck(async () => {
      const institutes = await ctx.runQuery(getInstitutesQuery, {});
      const courseId = getStringField(asRecord(asArray(institutes).map(asRecord)[0]), 'id');
      if (!courseId) return { skipped: true };
      const words = await ctx.runQuery(getVocabOfCourseQuery, { courseId, limit: 1 });
      const word = asRecord(asArray(words).map(asRecord)[0]);
      const wordId = word._id;
      if (!wordId) return { skipped: true };

      await ctx.runMutation(updateVocabProgressMutation, { wordId, quality: 5 });
      const afterWrite = await ctx.runQuery(getVocabOfCourseQuery, { courseId, limit: 1 });
      const afterWord = asRecord(asArray(afterWrite).map(asRecord)[0]);
      if (!afterWord.progress) throw new Error('Vocab progress not readable after write');
      await ctx.runMutation(resetVocabProgressMutation, { wordId });
      const afterDelete = await ctx.runQuery(getVocabOfCourseQuery, { courseId, limit: 1 });
      const afterDelWord = asRecord(asArray(afterDelete).map(asRecord)[0]);
      if (afterDelWord.progress) throw new Error('Vocab progress not reset');
      return { wrote: true, deleted: true };
    });

    const courseProgress = await runCheck(async () => {
      const institutes = await ctx.runQuery(getInstitutesQuery, {});
      const courseId = getStringField(asRecord(asArray(institutes).map(asRecord)[0]), 'id');
      if (!courseId) return { skipped: true };
      const unitIndex = 9999;
      await ctx.runMutation(completeUnitMutation, { courseId, unitIndex });
      const afterWrite = await ctx.runQuery(getCourseProgressQuery, { courseId });
      const afterWriteRec = asRecord(afterWrite);
      const completed1 = asArray(afterWriteRec.completedUnits).map(v => Number(v));
      if (!completed1.includes(unitIndex))
        throw new Error('Course progress not readable after write');
      await ctx.runMutation(uncompleteUnitMutation, { courseId, unitIndex });
      const afterDelete = await ctx.runQuery(getCourseProgressQuery, { courseId });
      const afterDeleteRec = asRecord(afterDelete);
      const completed2 = asArray(afterDeleteRec.completedUnits).map(v => Number(v));
      if (completed2.includes(unitIndex)) throw new Error('Course progress not reverted');
      return { wrote: true, deleted: true };
    });

    const podcastHistory = await runCheck(async () => {
      const episodeGuid = `qa_${now}`;
      await ctx.runMutation(recordPodcastHistoryMutation, {
        episodeGuid,
        episodeTitle: 'qa',
        episodeUrl: 'https://example.com/qa.mp3',
        channelName: 'qa',
        progress: 12,
        duration: 34,
      });
      const afterWrite = await ctx.runQuery(getPodcastHistoryQuery, {});
      const rows = asArray(afterWrite).map(asRecord);
      const found = rows.find(h => getStringField(h, 'episodeGuid') === episodeGuid);
      if (!found) throw new Error('Podcast history not readable after write');
      await ctx.runMutation(removePodcastHistoryMutation, { historyId: found.id });
      const afterDelete = await ctx.runQuery(getPodcastHistoryQuery, {});
      const rowsAfter = asArray(afterDelete).map(asRecord);
      if (rowsAfter.some(h => getStringField(h, 'episodeGuid') === episodeGuid))
        throw new Error('Podcast history not deleted');
      return { wrote: true, deleted: true };
    });

    return {
      createdAt: now,
      limit,
      checks: {
        savedWords,
        mistakes,
        annotations,
        notebooks,
        topikExamAttempts,
        vocabProgress,
        courseProgress,
        podcastHistory,
      },
    };
  },
});
