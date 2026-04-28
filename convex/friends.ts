import { ConvexError, v } from 'convex/values';
import { type FunctionReference, makeFunctionReference } from 'convex/server';
import type { Doc, Id } from './_generated/dataModel';
import { mutation, query, type MutationCtx, type QueryCtx } from './_generated/server';
import { getAuthUserId, getOptionalAuthUserId } from './utils';

type FriendNotificationArgs = {
  userId: Id<'users'>;
  kind: 'friend_request' | 'friend_accepted';
  title: string;
  body: string;
  linkPath?: string;
  metadata?: Record<string, unknown>;
  dedupeKey?: string;
};

const enqueueFriendNotification = makeFunctionReference<
  'mutation',
  FriendNotificationArgs,
  unknown
>('notifications:enqueueNotification') as unknown as FunctionReference<
  'mutation',
  'internal',
  FriendNotificationArgs,
  unknown
>;

const FRIEND_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const FRIEND_CODE_LENGTH = 8;
const FRIEND_CODE_REGEX = /^[A-Z0-9]{8}$/;
const FRIEND_CODE_PREFIX_REGEX = /^[A-Z0-9]+$/;
const SHARE_LANGUAGES = ['en', 'zh', 'vi', 'mn'] as const;
type ShareLanguage = (typeof SHARE_LANGUAGES)[number];

export type FriendShareLinkDto = {
  code: string;
  url: string;
};

type SendByCodeStatus = 'sent' | 'already_friends' | 'already_requested';
type FriendshipRelation = 'none' | 'already_requested' | 'already_friends';

export type SendByCodeResult = {
  status: SendByCodeStatus;
};

export type FriendSearchItemDto = {
  userId: Id<'users'>;
  name: string;
  avatarUrl: string | null;
  friendCode: string;
  relation: FriendshipRelation;
};

export type FriendSummaryDto = {
  mutualCount: number;
  followingCount: number;
  followerCount: number;
  outgoingPendingCount: number;
  incomingPendingCount: number;
};

export type FriendProfileDto = {
  userId: Id<'users'>;
  name: string;
  avatarUrl: string | null;
  friendCode: string;
  becameFriendsAt: number;
};

export type FriendRequestDto = {
  userId: Id<'users'>;
  name: string;
  avatarUrl: string | null;
  friendCode: string;
  requestedAt: number;
};

export type SendRequestResult = {
  status: 'sent' | 'already_friends' | 'already_requested';
};

export type RespondRequestResult = {
  status: 'accepted' | 'declined' | 'no_request';
};

function normalizeFriendCode(raw: string): string {
  return raw
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
}

function normalizeSearchLimit(limit?: number): number {
  if (!Number.isFinite(limit)) return 8;
  const normalized = Math.floor(limit as number);
  if (normalized < 1) return 1;
  if (normalized > 20) return 20;
  return normalized;
}

function createRandomFriendCode(): string {
  let result = '';
  for (let i = 0; i < FRIEND_CODE_LENGTH; i += 1) {
    const index = Math.floor(Math.random() * FRIEND_CODE_ALPHABET.length);
    result += FRIEND_CODE_ALPHABET[index];
  }
  return result;
}

async function generateUniqueFriendCode(ctx: MutationCtx): Promise<string> {
  for (let attempt = 0; attempt < 32; attempt += 1) {
    const code = createRandomFriendCode();
    const existing = await ctx.db
      .query('users')
      .withIndex('by_friendCode', q => q.eq('friendCode', code))
      .first();
    if (!existing) return code;
  }
  throw new ConvexError({ code: 'FRIEND_CODE_GENERATION_FAILED' });
}

function isShareLanguage(value: string): value is ShareLanguage {
  return SHARE_LANGUAGES.includes(value as ShareLanguage);
}

function resolveAppBaseUrl(): string {
  const candidates = [process.env.VITE_APP_URL, process.env.SITE_URL, 'http://localhost:5173'];
  for (const candidate of candidates) {
    const trimmed = candidate?.trim();
    if (!trimmed) continue;
    try {
      const parsed = new URL(trimmed);
      return parsed.origin;
    } catch {
      continue;
    }
  }
  return 'http://localhost:5173';
}

async function resolveShareLanguage(
  ctx: QueryCtx | MutationCtx,
  userId: Id<'users'>
): Promise<ShareLanguage> {
  const settings = await ctx.db
    .query('user_settings')
    .withIndex('by_user', q => q.eq('userId', userId))
    .first();
  const language = settings?.displayLanguage;
  if (typeof language === 'string' && isShareLanguage(language)) {
    return language;
  }
  return 'en';
}

function buildShareUrl(baseUrl: string, language: ShareLanguage, code: string): string {
  if (!code) return '';
  const url = new URL(`/${language}/community/add`, baseUrl);
  url.searchParams.set('code', code);
  return url.toString();
}

export const getMyShareLink = query({
  args: {},
  handler: async (ctx): Promise<FriendShareLinkDto> => {
    const userId = await getAuthUserId(ctx);
    const user = await ctx.db.get(userId);
    if (!user) throw new ConvexError({ code: 'USER_NOT_FOUND' });

    const code = typeof user.friendCode === 'string' ? normalizeFriendCode(user.friendCode) : '';
    const appBaseUrl = resolveAppBaseUrl();
    const language = await resolveShareLanguage(ctx, userId);
    return {
      code,
      url: buildShareUrl(appBaseUrl, language, code),
    };
  },
});

export const regenerateMyFriendCode = mutation({
  args: {},
  handler: async (ctx): Promise<FriendShareLinkDto> => {
    const userId = await getAuthUserId(ctx);
    const user = await ctx.db.get(userId);
    if (!user) throw new ConvexError({ code: 'USER_NOT_FOUND' });

    const code = await generateUniqueFriendCode(ctx);
    await ctx.db.patch(userId, { friendCode: code });

    const appBaseUrl = resolveAppBaseUrl();
    const language = await resolveShareLanguage(ctx, userId);
    return {
      code,
      url: buildShareUrl(appBaseUrl, language, code),
    };
  },
});

async function findFriendshipEdge(
  ctx: MutationCtx,
  followerId: Id<'users'>,
  followingId: Id<'users'>
) {
  return await ctx.db
    .query('friendships')
    .withIndex('by_both', q => q.eq('followerId', followerId).eq('followingId', followingId))
    .first();
}

function pickName(user: Doc<'users'>): string {
  const name = typeof user.name === 'string' ? user.name.trim() : '';
  return name || 'Learner';
}

export const searchUsers = query({
  args: {
    query: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<FriendSearchItemDto[]> => {
    const viewerId = await getAuthUserId(ctx);
    const limit = normalizeSearchLimit(args.limit);
    const raw = args.query.trim();
    if (!raw) return [];

    const normalizedCode = normalizeFriendCode(raw);
    const term = raw.toLowerCase();

    const outgoing = await ctx.db
      .query('friendships')
      .withIndex('by_follower', q => q.eq('followerId', viewerId))
      .take(600);
    const incoming = await ctx.db
      .query('friendships')
      .withIndex('by_following', q => q.eq('followingId', viewerId))
      .take(600);

    const outgoingSet = new Set(outgoing.map(item => String(item.followingId)));
    const incomingSet = new Set(incoming.map(item => String(item.followerId)));

    const toDto = (user: Doc<'users'>): FriendSearchItemDto | null => {
      if (user._id === viewerId) return null;
      const friendCode =
        typeof user.friendCode === 'string' ? normalizeFriendCode(user.friendCode) : '';
      if (!FRIEND_CODE_REGEX.test(friendCode)) return null;

      const userKey = String(user._id);
      const relation: FriendshipRelation =
        outgoingSet.has(userKey) && incomingSet.has(userKey)
          ? 'already_friends'
          : outgoingSet.has(userKey)
            ? 'already_requested'
            : 'none';

      return {
        userId: user._id,
        name: pickName(user),
        avatarUrl: user.avatar || user.image || null,
        friendCode,
        relation,
      };
    };

    if (FRIEND_CODE_REGEX.test(normalizedCode)) {
      const target = await ctx.db
        .query('users')
        .withIndex('by_friendCode', q => q.eq('friendCode', normalizedCode))
        .first();
      if (!target) return [];
      const dto = toDto(target);
      return dto ? [dto] : [];
    }

    if (term.length < 2) return [];

    const resultWindow = Math.max(limit * 4, 24);
    const candidateMap = new Map<string, Doc<'users'>>();
    const pushCandidate = (user: Doc<'users'>) => {
      if (user._id === viewerId) return;
      candidateMap.set(String(user._id), user);
    };

    if (FRIEND_CODE_PREFIX_REGEX.test(normalizedCode)) {
      const codeMatches = await ctx.db
        .query('users')
        .withIndex('by_friendCode', q =>
          q.gte('friendCode', normalizedCode).lt('friendCode', `${normalizedCode}\uffff`)
        )
        .take(resultWindow);
      for (const user of codeMatches) {
        pushCandidate(user);
      }
    }

    const nameMatches = await ctx.db
      .query('users')
      .withSearchIndex('search_name', q => q.search('name', raw))
      .take(resultWindow);
    for (const user of nameMatches) {
      pushCandidate(user);
    }

    const scoredUsers = [...candidateMap.values()]
      .map(user => {
        const lowerName = typeof user.name === 'string' ? user.name.trim().toLowerCase() : '';
        const lowerCode =
          typeof user.friendCode === 'string'
            ? normalizeFriendCode(user.friendCode).toLowerCase()
            : '';

        let score = 0;
        if (lowerName === term) score += 120;
        else if (lowerName.startsWith(term)) score += 95;
        else if (lowerName.includes(term)) score += 70;

        if (lowerCode === normalizedCode.toLowerCase()) score += 110;
        else if (normalizedCode.length >= 2 && lowerCode.startsWith(normalizedCode.toLowerCase()))
          score += 85;
        else if (normalizedCode.length >= 2 && lowerCode.includes(normalizedCode.toLowerCase()))
          score += 50;

        return {
          user,
          score,
          lastActivityAt: typeof user.lastActivityAt === 'number' ? user.lastActivityAt : 0,
        };
      })
      .sort((a, b) => b.score - a.score || b.lastActivityAt - a.lastActivityAt);

    const results: FriendSearchItemDto[] = [];
    for (const { user } of scoredUsers) {
      const dto = toDto(user);
      if (!dto) continue;
      results.push(dto);
      if (results.length >= limit) break;
    }

    return results;
  },
});

export const getMyFriendSummary = query({
  args: {},
  handler: async (ctx): Promise<FriendSummaryDto> => {
    const viewerId = await getOptionalAuthUserId(ctx);
    if (!viewerId) {
      return {
        mutualCount: 0,
        followingCount: 0,
        followerCount: 0,
        outgoingPendingCount: 0,
        incomingPendingCount: 0,
      };
    }

    const [outgoing, incoming] = await Promise.all([
      ctx.db
        .query('friendships')
        .withIndex('by_follower', q => q.eq('followerId', viewerId))
        .take(2000),
      ctx.db
        .query('friendships')
        .withIndex('by_following', q => q.eq('followingId', viewerId))
        .take(2000),
    ]);

    const followingIds = new Set(outgoing.map(item => String(item.followingId)));
    const followerIds = new Set(incoming.map(item => String(item.followerId)));

    let mutualCount = 0;
    let outgoingPendingCount = 0;
    for (const followingId of followingIds) {
      if (followerIds.has(followingId)) mutualCount += 1;
      else outgoingPendingCount += 1;
    }

    let incomingPendingCount = 0;
    for (const followerId of followerIds) {
      if (!followingIds.has(followerId)) incomingPendingCount += 1;
    }

    return {
      mutualCount,
      followingCount: followingIds.size,
      followerCount: followerIds.size,
      outgoingPendingCount,
      incomingPendingCount,
    };
  },
});

export const sendRequestByCode = mutation({
  args: {
    code: v.string(),
  },
  handler: async (ctx, args): Promise<SendByCodeResult> => {
    const viewerId = await getAuthUserId(ctx);
    const code = normalizeFriendCode(args.code);

    if (!FRIEND_CODE_REGEX.test(code)) {
      throw new ConvexError({ code: 'INVALID_CODE' });
    }

    const target = await ctx.db
      .query('users')
      .withIndex('by_friendCode', q => q.eq('friendCode', code))
      .first();

    if (!target) {
      throw new ConvexError({ code: 'TARGET_NOT_FOUND' });
    }

    if (target._id === viewerId) {
      throw new ConvexError({ code: 'SELF_ADD_NOT_ALLOWED' });
    }

    const [forward, reverse] = await Promise.all([
      findFriendshipEdge(ctx, viewerId, target._id),
      findFriendshipEdge(ctx, target._id, viewerId),
    ]);

    if (forward && reverse) {
      return { status: 'already_friends' };
    }

    if (forward && !reverse) {
      return { status: 'already_requested' };
    }

    if (!forward) {
      await ctx.db.insert('friendships', {
        followerId: viewerId,
        followingId: target._id,
        createdAt: Date.now(),
      });
      const inviterName = await loadActorName(ctx, viewerId);
      if (reverse) {
        // Reverse exists → this completes the bidirectional friendship.
        await scheduleNotification(ctx, {
          userId: target._id,
          kind: 'friend_accepted',
          title: '친구 추가됨',
          body: `${inviterName} 와(과) 친구가 되었습니다.`,
          linkPath: '/community',
          metadata: { friendId: viewerId },
        });
      } else {
        await scheduleNotification(ctx, {
          userId: target._id,
          kind: 'friend_request',
          title: '친구 요청',
          body: `${inviterName} 님이 친구 요청을 보냈습니다.`,
          linkPath: '/community',
          metadata: { friendId: viewerId },
        });
      }
    }

    return { status: reverse ? 'already_friends' : 'sent' };
  },
});

// ──────────────────────────────────────────────────────────────────────────
// Friend lifecycle (community v2)
// ──────────────────────────────────────────────────────────────────────────

async function loadActorName(ctx: QueryCtx | MutationCtx, userId: Id<'users'>): Promise<string> {
  const actor = await ctx.db.get(userId);
  if (!actor) return 'Learner';
  return pickName(actor);
}

async function scheduleNotification(ctx: MutationCtx, args: FriendNotificationArgs): Promise<void> {
  try {
    await ctx.scheduler.runAfter(0, enqueueFriendNotification, args);
  } catch {
    // Best-effort — never fail the originating mutation on notification errors.
  }
}

async function findEdge(
  ctx: QueryCtx | MutationCtx,
  followerId: Id<'users'>,
  followingId: Id<'users'>
) {
  return await ctx.db
    .query('friendships')
    .withIndex('by_both', q => q.eq('followerId', followerId).eq('followingId', followingId))
    .first();
}

function toFriendProfileDto(user: Doc<'users'>, becameFriendsAt: number): FriendProfileDto {
  const friendCode =
    typeof user.friendCode === 'string' ? normalizeFriendCode(user.friendCode) : '';
  return {
    userId: user._id,
    name: pickName(user),
    avatarUrl: user.avatar || user.image || null,
    friendCode,
    becameFriendsAt,
  };
}

function toFriendRequestDto(user: Doc<'users'>, requestedAt: number): FriendRequestDto {
  const friendCode =
    typeof user.friendCode === 'string' ? normalizeFriendCode(user.friendCode) : '';
  return {
    userId: user._id,
    name: pickName(user),
    avatarUrl: user.avatar || user.image || null,
    friendCode,
    requestedAt,
  };
}

export const listFriends = query({
  args: {},
  handler: async (ctx): Promise<FriendProfileDto[]> => {
    const viewerId = await getOptionalAuthUserId(ctx);
    if (!viewerId) return [];

    const [outgoing, incoming] = await Promise.all([
      ctx.db
        .query('friendships')
        .withIndex('by_follower', q => q.eq('followerId', viewerId))
        .take(2000),
      ctx.db
        .query('friendships')
        .withIndex('by_following', q => q.eq('followingId', viewerId))
        .take(2000),
    ]);

    const outgoingMap = new Map<string, number>();
    for (const edge of outgoing) {
      outgoingMap.set(String(edge.followingId), edge.createdAt);
    }
    const mutual: { otherId: Id<'users'>; becameFriendsAt: number }[] = [];
    for (const edge of incoming) {
      const otherKey = String(edge.followerId);
      const outgoingAt = outgoingMap.get(otherKey);
      if (outgoingAt === undefined) continue;
      mutual.push({
        otherId: edge.followerId,
        becameFriendsAt: Math.max(outgoingAt, edge.createdAt),
      });
    }

    mutual.sort((a, b) => b.becameFriendsAt - a.becameFriendsAt);

    const userDocs = await Promise.all(mutual.map(item => ctx.db.get(item.otherId)));
    const result: FriendProfileDto[] = [];
    for (let i = 0; i < mutual.length; i += 1) {
      const user = userDocs[i];
      if (!user) continue;
      result.push(toFriendProfileDto(user, mutual[i].becameFriendsAt));
    }
    return result;
  },
});

export const listIncomingRequests = query({
  args: {},
  handler: async (ctx): Promise<FriendRequestDto[]> => {
    const viewerId = await getOptionalAuthUserId(ctx);
    if (!viewerId) return [];

    const [outgoing, incoming] = await Promise.all([
      ctx.db
        .query('friendships')
        .withIndex('by_follower', q => q.eq('followerId', viewerId))
        .take(2000),
      ctx.db
        .query('friendships')
        .withIndex('by_following', q => q.eq('followingId', viewerId))
        .take(2000),
    ]);

    const outgoingSet = new Set(outgoing.map(item => String(item.followingId)));
    const pending = incoming.filter(item => !outgoingSet.has(String(item.followerId)));
    pending.sort((a, b) => b.createdAt - a.createdAt);

    const userDocs = await Promise.all(pending.map(item => ctx.db.get(item.followerId)));
    const result: FriendRequestDto[] = [];
    for (let i = 0; i < pending.length; i += 1) {
      const user = userDocs[i];
      if (!user) continue;
      result.push(toFriendRequestDto(user, pending[i].createdAt));
    }
    return result;
  },
});

export const listOutgoingRequests = query({
  args: {},
  handler: async (ctx): Promise<FriendRequestDto[]> => {
    const viewerId = await getOptionalAuthUserId(ctx);
    if (!viewerId) return [];

    const [outgoing, incoming] = await Promise.all([
      ctx.db
        .query('friendships')
        .withIndex('by_follower', q => q.eq('followerId', viewerId))
        .take(2000),
      ctx.db
        .query('friendships')
        .withIndex('by_following', q => q.eq('followingId', viewerId))
        .take(2000),
    ]);

    const incomingSet = new Set(incoming.map(item => String(item.followerId)));
    const pending = outgoing.filter(item => !incomingSet.has(String(item.followingId)));
    pending.sort((a, b) => b.createdAt - a.createdAt);

    const userDocs = await Promise.all(pending.map(item => ctx.db.get(item.followingId)));
    const result: FriendRequestDto[] = [];
    for (let i = 0; i < pending.length; i += 1) {
      const user = userDocs[i];
      if (!user) continue;
      result.push(toFriendRequestDto(user, pending[i].createdAt));
    }
    return result;
  },
});

export const sendRequest = mutation({
  args: {
    targetUserId: v.id('users'),
  },
  handler: async (ctx, args): Promise<SendRequestResult> => {
    const viewerId = await getAuthUserId(ctx);
    if (args.targetUserId === viewerId) {
      throw new ConvexError({ code: 'SELF_ADD_NOT_ALLOWED' });
    }

    const target = await ctx.db.get(args.targetUserId);
    if (!target) throw new ConvexError({ code: 'TARGET_NOT_FOUND' });

    const [forward, reverse] = await Promise.all([
      findEdge(ctx, viewerId, args.targetUserId),
      findEdge(ctx, args.targetUserId, viewerId),
    ]);

    if (forward && reverse) return { status: 'already_friends' };
    if (forward && !reverse) return { status: 'already_requested' };

    await ctx.db.insert('friendships', {
      followerId: viewerId,
      followingId: args.targetUserId,
      createdAt: Date.now(),
    });

    const inviterName = await loadActorName(ctx, viewerId);
    if (reverse) {
      await scheduleNotification(ctx, {
        userId: args.targetUserId,
        kind: 'friend_accepted',
        title: '친구 추가됨',
        body: `${inviterName} 와(과) 친구가 되었습니다.`,
        linkPath: '/community',
        metadata: { friendId: viewerId },
      });
      return { status: 'already_friends' };
    }
    await scheduleNotification(ctx, {
      userId: args.targetUserId,
      kind: 'friend_request',
      title: '친구 요청',
      body: `${inviterName} 님이 친구 요청을 보냈습니다.`,
      linkPath: '/community',
      metadata: { friendId: viewerId },
    });
    return { status: 'sent' };
  },
});

export const respondRequest = mutation({
  args: {
    targetUserId: v.id('users'),
    action: v.union(v.literal('accept'), v.literal('decline')),
  },
  handler: async (ctx, args): Promise<RespondRequestResult> => {
    const viewerId = await getAuthUserId(ctx);
    if (args.targetUserId === viewerId) {
      throw new ConvexError({ code: 'SELF_ACTION_NOT_ALLOWED' });
    }

    // Inbound edge: the other user follows me → that's their pending request.
    const inbound = await findEdge(ctx, args.targetUserId, viewerId);
    if (!inbound) return { status: 'no_request' };

    const myEdgeBack = await findEdge(ctx, viewerId, args.targetUserId);

    if (args.action === 'accept') {
      if (!myEdgeBack) {
        await ctx.db.insert('friendships', {
          followerId: viewerId,
          followingId: args.targetUserId,
          createdAt: Date.now(),
        });
      }
      const accepterName = await loadActorName(ctx, viewerId);
      await scheduleNotification(ctx, {
        userId: args.targetUserId,
        kind: 'friend_accepted',
        title: '친구 요청 수락됨',
        body: `${accepterName} 님이 친구 요청을 수락했습니다.`,
        linkPath: '/community',
        metadata: { friendId: viewerId },
      });
      return { status: 'accepted' };
    }

    // decline → remove inbound edge
    await ctx.db.delete(inbound._id);
    return { status: 'declined' };
  },
});

export const cancelRequest = mutation({
  args: {
    targetUserId: v.id('users'),
  },
  handler: async (ctx, args): Promise<{ ok: boolean }> => {
    const viewerId = await getAuthUserId(ctx);
    const myEdge = await findEdge(ctx, viewerId, args.targetUserId);
    const reverse = await findEdge(ctx, args.targetUserId, viewerId);
    // Cancelable only if outgoing pending (no reverse edge yet).
    if (!myEdge || reverse) return { ok: false };
    await ctx.db.delete(myEdge._id);
    return { ok: true };
  },
});

export const removeFriend = mutation({
  args: {
    targetUserId: v.id('users'),
  },
  handler: async (ctx, args): Promise<{ ok: boolean }> => {
    const viewerId = await getAuthUserId(ctx);
    const [forward, reverse] = await Promise.all([
      findEdge(ctx, viewerId, args.targetUserId),
      findEdge(ctx, args.targetUserId, viewerId),
    ]);
    if (!forward && !reverse) return { ok: false };
    if (forward) await ctx.db.delete(forward._id);
    if (reverse) await ctx.db.delete(reverse._id);
    return { ok: true };
  },
});
