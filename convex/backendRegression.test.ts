import { convexTest } from 'convex-test';
import { describe, expect, it } from 'vitest';
import { api } from './_generated/api';
import schema from './schema';

const modules = {
  './_generated/server.ts': () => import('./_generated/server'),
  './annotations.ts': () => import('./annotations'),
  './canvas.ts': () => import('./canvas'),
  './fsrsReview.ts': () => import('./fsrsReview'),
  './topik.ts': () => import('./topik'),
  './paymentStatus.ts': () => import('./paymentStatus'),
  './notePages.ts': () => import('./notePages'),
  './vocab.ts': () => import('./vocab'),
  './grammars.ts': () => import('./grammars'),
  './users.ts': () => import('./users'),
};

async function setup() {
  const t = convexTest(schema, modules);
  const userId = await t.run(ctx =>
    ctx.db.insert('users', { email: 'regression@example.com', name: 'Regression user' })
  );
  return { t, userId, asUser: t.withIdentity({ subject: userId }) };
}

describe('Backend user data regressions', () => {
  it('supports the notebook create, edit, search, and reload contract used by the UI', async () => {
    const { asUser } = await setup();
    const notebook = await asUser.mutation(api.notePages.createNotebook, {
      name: 'Study notes',
      sourceModule: 'READING_ARTICLE',
    });
    const created = await asUser.mutation(api.notePages.createPage, {
      parentPageId: notebook.id,
      title: 'First note',
      tags: ['reading'],
    });
    expect(await asUser.mutation(api.notePages.saveEditorDoc, {
      pageId: created.id,
      doc: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'hello' }] }] },
    })).toMatchObject({ success: true });

    const detail = await asUser.query(api.notePages.getPage, { pageId: created.id });
    expect(detail).toMatchObject({ page: { id: created.id, title: 'First note' } });
    expect(detail?.editorDoc).toMatchObject({ type: 'doc' });
    expect(await asUser.query(api.notePages.listNotebooks, {})).toMatchObject({
      notebooks: [{ id: notebook.id, noteCount: 1 }],
      totals: { notebooks: 1, notes: 1, unassigned: 0 },
    });
    expect(await asUser.query(api.notePages.search, { query: 'hello' })).toMatchObject({
      items: [{ id: created.id }],
    });
  });

  it('provides idempotent, administrator-only grammar assignment', async () => {
    const { t, userId } = await setup();
    await t.run(ctx => ctx.db.patch(userId, { role: 'ADMIN' }));
    const admin = t.withIdentity({ subject: userId });
    const grammar = await admin.mutation(api.grammars.create, {
      title: '-아요', summary: 'polite ending', explanation: '...', type: 'ENDING', level: 'A1',
    });
    const first = await admin.mutation(api.grammars.assignToUnit, {
      courseId: 'course-1', unitId: 1, grammarId: grammar.id,
    });
    const second = await admin.mutation(api.grammars.assignToUnit, {
      courseId: 'course-1', unitId: 1, grammarId: grammar.id,
    });
    expect(first).toMatchObject({ success: true, created: true });
    expect(second).toMatchObject({ success: true, created: false, id: first.id });
    expect(await t.run(ctx => ctx.db.query('course_grammars').collect())).toHaveLength(1);
  });

  it('returns the vocabulary page contract to administrators', async () => {
    const { t, userId } = await setup();
    await t.run(ctx => ctx.db.patch(userId, { role: 'ADMIN' }));
    const wordId = await t.run(ctx => ctx.db.insert('words', {
      word: '사과', meaning: '苹果', meaningEn: 'apple', partOfSpeech: 'noun', createdAt: Date.now(),
    }));
    await t.run(ctx => ctx.db.insert('vocabulary_appearances', {
      wordId, courseId: 'course-1', unitId: 2, meaning: '苹果', createdAt: Date.now(),
    }));
    const admin = t.withIdentity({ subject: userId });
    const page = await admin.query(api.vocab.getAllPaginated, {
      paginationOpts: { numItems: 10, cursor: null }, courseId: 'course-1',
    });
    expect(page.page).toMatchObject([{ _id: wordId, word: '사과', unitId: 2, courseId: 'course-1' }]);
  });

  it('keeps legacy annotation notes and anchor metadata when only the highlight changes', async () => {
    const { t, asUser } = await setup();
    const original = await asUser.mutation(api.annotations.save, {
      contextKey: 'course:1',
      text: '한국어',
      note: 'My explanation',
      color: 'yellow',
      startOffset: 4,
      endOffset: 7,
      scopeType: 'course',
      scopeId: '1',
      blockId: 'paragraph-2',
    });
    const updated = await asUser.mutation(api.annotations.save, {
      contextKey: 'course:1',
      text: '한국어',
      color: 'blue',
    });
    expect(updated.id).toBe(original.id);
    expect(await t.run(ctx => ctx.db.get(original.id))).toMatchObject({
      note: 'My explanation',
      color: 'blue',
      startOffset: 4,
      endOffset: 7,
      scopeId: '1',
      blockId: 'paragraph-2',
    });
    await asUser.mutation(api.annotations.save, {
      contextKey: 'course:1', text: '한국어', note: '', color: '__none__',
    });
    expect(await t.run(ctx => ctx.db.get(original.id))).toMatchObject({ note: '', color: '' });
  });

  it('keeps scoped notes when recoloring and keeps highlight color when editing only a note', async () => {
    const { t, asUser } = await setup();
    const anchor = { scopeType: 'reading', scopeId: 'article', blockId: 'p1', start: 0, end: 3, quote: '한국어' };
    const original = await asUser.mutation(api.annotations.upsertByAnchor, {
      ...anchor, note: 'Keep this note', color: 'yellow', contextKey: 'legacy-context', targetType: 'READING',
    });
    await asUser.mutation(api.annotations.upsertByAnchor, { ...anchor, color: 'blue' });
    expect(await t.run(ctx => ctx.db.get(original.id))).toMatchObject({
      note: 'Keep this note', color: 'blue', contextKey: 'legacy-context', targetType: 'READING',
    });
    await asUser.mutation(api.annotations.upsertByAnchor, { ...anchor, note: 'Edited note' });
    expect(await t.run(ctx => ctx.db.get(original.id))).toMatchObject({ note: 'Edited note', color: 'blue' });
    await asUser.mutation(api.annotations.upsertByAnchor, { ...anchor, note: '', color: '__none__' });
    expect(await t.run(ctx => ctx.db.get(original.id))).toMatchObject({ note: '', color: '' });
  });

  it('isolates canvas drawings by target type and user even when target IDs match', async () => {
    const { t, asUser } = await setup();
    const textbook = { targetId: '1', targetType: 'TEXTBOOK', pageIndex: 0 };
    const exam = { ...textbook, targetType: 'EXAM' };
    await asUser.mutation(api.canvas.saveCanvas, { ...textbook, data: { lines: [], version: 1 } });
    await asUser.mutation(api.canvas.saveCanvas, { ...exam, data: { lines: [], version: 2 } });
    expect(await asUser.query(api.canvas.getCanvas, textbook)).toEqual({ data: { lines: [], version: 1 } });
    expect(await asUser.query(api.canvas.getCanvas, exam)).toEqual({ data: { lines: [], version: 2 } });
    expect(await t.query(api.canvas.getCanvas, textbook)).toBeNull();
  });

  it.each(['sentence', 'grammar'] as const)('does not let legacy %s rows hide due review items', async kind => {
    const { t, userId, asUser } = await setup();
    const dueId = await t.run(async ctx => {
      const common = { userId, createdAt: Date.now() - 1000 };
      if (kind === 'sentence') {
        await ctx.db.insert('user_saved_sentences', { ...common, text: 'Legacy sentence' });
        return ctx.db.insert('user_saved_sentences', { ...common, text: 'Due sentence', fsrsState: 0, fsrsDue: Date.now() - 100 });
      }
      await ctx.db.insert('user_grammar_saved', { ...common, grammarKey: 'legacy', pattern: 'Legacy grammar' });
      return ctx.db.insert('user_grammar_saved', { ...common, grammarKey: 'due', pattern: 'Due grammar', fsrsState: 0, fsrsDue: Date.now() - 100 });
    });
    const due = await asUser.query(api.fsrsReview.getDueItems, { kind, limit: 1 });
    expect(due).toHaveLength(1);
    expect(due[0]._id).toBe(dueId);
  });

  it('resumes the active TOPIK retake instead of returning the first completed attempt', async () => {
    const { t, userId, asUser } = await setup();
    const activeId = await t.run(async ctx => {
      const now = Date.now();
      const examId = await ctx.db.insert('topik_exams', {
        legacyId: 'retake-exam', title: 'TOPIK I', round: 1, type: 'READING', timeLimit: 60,
        isPaid: false, accessLevel: 'FREE_SAMPLE', createdAt: now,
      });
      await ctx.db.insert('exam_sessions', {
        userId, examId, status: 'COMPLETED', startTime: now - 10000, endTime: now - 1000,
        createdAt: now - 10000, score: 50,
      });
      return ctx.db.insert('exam_sessions', {
        userId, examId, status: 'IN_PROGRESS', startTime: now, endTime: now + 60000,
        createdAt: now, answers: { '1': 2 },
      });
    });
    expect(await asUser.query(api.topik.getSession, { examId: 'retake-exam' })).toMatchObject({ sessionId: activeId, answers: { '1': 2 } });
    expect(await asUser.mutation(api.topik.startExam, { examId: 'retake-exam' })).toMatchObject({ sessionId: activeId, resuming: true, answers: { '1': 2 } });
    expect(await t.run(ctx => ctx.db.query('exam_sessions').collect())).toHaveLength(2);
  });

  it.each([
    { tier: 'PREMIUM', subscriptionType: 'MONTHLY', subscriptionExpiry: '2020-01-01T00:00:00.000Z', isActive: false },
    { tier: 'PAID', subscriptionType: 'ANNUAL', subscriptionExpiry: '1577836800', isActive: false },
    { tier: 'PREMIUM', subscriptionType: 'ANNUAL', subscriptionExpiry: '2100-01-01T00:00:00.000Z', isActive: true },
    { tier: 'PREMIUM', subscriptionType: 'LIFETIME', subscriptionExpiry: undefined, isActive: true },
    { tier: 'PAID', subscriptionType: undefined, subscriptionExpiry: undefined, isActive: true },
  ])('reports activation consistently with feature entitlement for $subscriptionType / $subscriptionExpiry', async ({ isActive, ...subscription }) => {
    const { t, userId, asUser } = await setup();
    await t.run(ctx => ctx.db.patch(userId, subscription));
    expect(await asUser.action(api.paymentStatus.getSubscriptionActivationStatus, {})).toMatchObject({
      isActive, status: isActive ? 'ACTIVE' : 'PENDING',
    });
  });
});
