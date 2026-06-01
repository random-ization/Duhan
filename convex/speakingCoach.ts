/**
 * Speaking Coach Module
 *
 * Manages speaking practice sessions, stores pronunciation scores,
 * and provides analytics on the user's speaking progress.
 *
 * The actual speech recognition (ASR) happens client-side via the
 * Web Speech API (SpeechRecognition). This module handles:
 * - Session lifecycle (create → record attempts → complete)
 * - Pronunciation accuracy scoring (character-level diff)
 * - Progress tracking and analytics
 */

import { mutation, query } from './_generated/server';
import { v } from 'convex/values';
import { getAuthUserId, getOptionalAuthUserId } from './utils';

// ── Helpers ─────────────────────────────────────────────

/**
 * Compute character-level accuracy between target and recognized text.
 * Uses a simple longest-common-subsequence approach for Korean text.
 */
function computeAccuracy(target: string, recognized: string): number {
  if (!target || !recognized) return 0;

  // Normalize whitespace
  const t = target.replace(/\s+/g, ' ').trim();
  const r = recognized.replace(/\s+/g, ' ').trim();

  if (t === r) return 100;
  if (r.length === 0) return 0;

  // LCS for character-level matching
  const m = t.length;
  const n = r.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (t[i - 1] === r[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  const lcsLen = dp[m][n];
  // Accuracy = proportion of target characters correctly matched
  return Math.round((lcsLen / m) * 100);
}

/**
 * Generate per-syllable feedback by aligning target and recognized text.
 */
function generateSyllableFeedback(
  target: string,
  recognized: string
): Array<{ target: string; recognized: string; correct: boolean }> {
  const tChars = [...target.replace(/\s/g, '')];
  const rChars = [...recognized.replace(/\s/g, '')];
  const feedback: Array<{ target: string; recognized: string; correct: boolean }> = [];

  for (let i = 0; i < tChars.length; i++) {
    const tChar = tChars[i];
    const rChar = i < rChars.length ? rChars[i] : '';
    feedback.push({
      target: tChar,
      recognized: rChar,
      correct: tChar === rChar,
    });
  }

  return feedback;
}

// ── Mutations ───────────────────────────────────────────

/**
 * Create a new speaking practice session.
 */
export const createSession = mutation({
  args: {
    mode: v.string(),
    targetText: v.string(),
    source: v.optional(v.string()),
    sourceRefId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const now = Date.now();

    const sessionId = await ctx.db.insert('speaking_sessions', {
      userId,
      mode: args.mode,
      targetText: args.targetText,
      source: args.source,
      sourceRefId: args.sourceRefId,
      attemptCount: 0,
      status: 'active',
      createdAt: now,
      updatedAt: now,
    });

    return { sessionId };
  },
});

/**
 * Record a pronunciation attempt within a session.
 * The client sends the ASR-recognized text; we compute accuracy server-side.
 */
export const recordAttempt = mutation({
  args: {
    sessionId: v.id('speaking_sessions'),
    recognizedText: v.string(),
    durationSec: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const session = await ctx.db.get(args.sessionId);
    if (!session || session.userId !== userId) {
      throw new Error('Session not found or unauthorized');
    }
    if (session.status !== 'active') {
      throw new Error('Session is no longer active');
    }

    const accuracy = computeAccuracy(session.targetText, args.recognizedText);
    const syllableFeedback = generateSyllableFeedback(session.targetText, args.recognizedText);

    // Detect common pronunciation issues
    const issues: string[] = [];
    const incorrectCount = syllableFeedback.filter(s => !s.correct).length;
    if (incorrectCount > syllableFeedback.length * 0.3) {
      issues.push('overall_low_accuracy');
    }
    if (args.recognizedText.length < session.targetText.length * 0.5) {
      issues.push('incomplete_utterance');
    }

    const scoreId = await ctx.db.insert('pronunciation_scores', {
      userId,
      sessionId: args.sessionId,
      targetText: session.targetText,
      recognizedText: args.recognizedText,
      accuracy,
      syllableFeedback,
      issues: issues.length > 0 ? issues : undefined,
      durationSec: args.durationSec,
      createdAt: Date.now(),
    });

    // Update session
    const newAttemptCount = session.attemptCount + 1;
    const bestAccuracy = Math.max(session.bestAccuracy ?? 0, accuracy);
    await ctx.db.patch(args.sessionId, {
      attemptCount: newAttemptCount,
      bestAccuracy,
      updatedAt: Date.now(),
    });

    return {
      scoreId,
      accuracy,
      bestAccuracy,
      attemptCount: newAttemptCount,
      syllableFeedback,
      issues,
    };
  },
});

/**
 * Complete a speaking session.
 */
export const completeSession = mutation({
  args: {
    sessionId: v.id('speaking_sessions'),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const session = await ctx.db.get(args.sessionId);
    if (!session || session.userId !== userId) {
      throw new Error('Session not found or unauthorized');
    }

    const now = Date.now();
    const durationSec = Math.round((now - session.createdAt) / 1000);

    await ctx.db.patch(args.sessionId, {
      status: 'completed',
      durationSec,
      updatedAt: now,
    });

    return {
      sessionId: args.sessionId,
      attemptCount: session.attemptCount,
      bestAccuracy: session.bestAccuracy,
      durationSec,
    };
  },
});

// ── Queries ─────────────────────────────────────────────

/**
 * Get recent speaking sessions for the current user.
 */
export const getRecentSessions = query({
  args: {
    limit: v.optional(v.number()),
    mode: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getOptionalAuthUserId(ctx);
    if (!userId) return [];

    const limit = args.limit ?? 20;

    if (args.mode) {
      return await ctx.db
        .query('speaking_sessions')
        .withIndex('by_user_mode', q => q.eq('userId', userId).eq('mode', args.mode!))
        .order('desc')
        .take(limit);
    }

    return await ctx.db
      .query('speaking_sessions')
      .withIndex('by_user_createdAt', q => q.eq('userId', userId))
      .order('desc')
      .take(limit);
  },
});

/**
 * Get a session with all its pronunciation attempts.
 */
export const getSessionDetail = query({
  args: {
    sessionId: v.id('speaking_sessions'),
  },
  handler: async (ctx, args) => {
    const userId = await getOptionalAuthUserId(ctx);
    if (!userId) return null;

    const session = await ctx.db.get(args.sessionId);
    if (!session || session.userId !== userId) return null;

    const scores = await ctx.db
      .query('pronunciation_scores')
      .withIndex('by_session', q => q.eq('sessionId', args.sessionId))
      .collect();

    return {
      ...session,
      attempts: scores.sort((a, b) => a.createdAt - b.createdAt),
    };
  },
});

/**
 * Speaking practice progress summary.
 */
export const getProgressSummary = query({
  args: {},
  handler: async ctx => {
    const userId = await getOptionalAuthUserId(ctx);
    if (!userId) return null;

    const sessions = await ctx.db
      .query('speaking_sessions')
      .withIndex('by_user_createdAt', q => q.eq('userId', userId))
      .order('desc')
      .take(100);

    const completed = sessions.filter(s => s.status === 'completed');
    const totalSessions = completed.length;
    const totalMinutes = completed.reduce((sum, s) => sum + (s.durationSec ?? 0) / 60, 0);
    const avgAccuracy =
      totalSessions > 0
        ? Math.round(completed.reduce((sum, s) => sum + (s.bestAccuracy ?? 0), 0) / totalSessions)
        : 0;

    // Recent 7 days trend
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const recentSessions = completed.filter(s => s.createdAt >= sevenDaysAgo);
    const recentAvgAccuracy =
      recentSessions.length > 0
        ? Math.round(
            recentSessions.reduce((sum, s) => sum + (s.bestAccuracy ?? 0), 0) /
              recentSessions.length
          )
        : 0;

    // Mode breakdown
    const modeBreakdown: Record<string, { count: number; avgAccuracy: number }> = {};
    for (const s of completed) {
      const mode = s.mode;
      const entry = modeBreakdown[mode] || { count: 0, avgAccuracy: 0 };
      entry.avgAccuracy =
        (entry.avgAccuracy * entry.count + (s.bestAccuracy ?? 0)) / (entry.count + 1);
      entry.count += 1;
      modeBreakdown[mode] = entry;
    }

    // Round mode averages
    for (const key of Object.keys(modeBreakdown)) {
      modeBreakdown[key].avgAccuracy = Math.round(modeBreakdown[key].avgAccuracy);
    }

    return {
      totalSessions,
      totalMinutes: Math.round(totalMinutes),
      avgAccuracy,
      recentAvgAccuracy,
      recentSessionCount: recentSessions.length,
      modeBreakdown,
    };
  },
});
