import { ConvexError, v } from 'convex/values';
import type { Doc, Id } from './_generated/dataModel';
import { mutation, query, type MutationCtx, type QueryCtx } from './_generated/server';
import { getAuthUserId, getOptionalAuthUserId } from './utils';

const FEED_EVENT_NAMES = new Set([
  'session_completed',
  'review_completed',
  'content_completed',
  'exam_submitted',
  'exam_auto_submitted',
]);

type FeedEventName =
  | 'session_completed'
  | 'review_completed'
  | 'content_completed'
  | 'exam_submitted'
  | 'exam_auto_submitted';

export type CommunityActivityDto = {
  activityId: string;
  kind: 'event' | 'post';
  actorUserId: Id<'users'>;
  actorName: string;
  actorAvatar: string | null;
  module: string;
  eventName: string;
  eventAt: number;
  content: string;
  itemCount: number;
  durationSec: number;
  score: number | null;
  accuracy: number | null;
  likeCount: number;
  likedByMe: boolean;
  commentCount: number;
  images?: string[];
  attachment?: {
    type: string;
    id: string;
    title: string;
    description?: string;
  };
};

type LikeMutationResult = {
  liked: boolean;
  likeCount: number;
};

function isFeedEventName(value: string): value is FeedEventName {
  return FEED_EVENT_NAMES.has(value);
}

function normalizeLimit(limit?: number): number {
  if (!Number.isFinite(limit)) return 20;
  const normalized = Math.floor(limit as number);
  if (normalized < 1) return 1;
  if (normalized > 50) return 50;
  return normalized;
}

async function resolveLikeMeta(
  ctx: QueryCtx | MutationCtx,
  activityId: string,
  kind: 'event' | 'post',
  viewerId: Id<'users'>
): Promise<{ likeCount: number; likedByMe: boolean }> {
  if (kind === 'event') {
    const likes = await ctx.db
      .query('community_activity_likes')
      .withIndex('by_activity', q => q.eq('activityId', activityId as Id<'learning_events'>))
      .collect();
    const likerIds = new Set(likes.map(item => item.userId));
    return {
      likeCount: likerIds.size,
      likedByMe: likerIds.has(viewerId),
    };
  } else {
    const likes = await ctx.db
      .query('community_post_likes')
      .withIndex('by_post', q => q.eq('postId', activityId as Id<'community_posts'>))
      .collect();
    const likerIds = new Set(likes.map(item => item.userId));
    return {
      likeCount: likerIds.size,
      likedByMe: likerIds.has(viewerId),
    };
  }
}

async function countLikes(
  ctx: QueryCtx | MutationCtx,
  activityId: string,
  kind: 'event' | 'post'
): Promise<number> {
  if (kind === 'event') {
    const likes = await ctx.db
      .query('community_activity_likes')
      .withIndex('by_activity', q => q.eq('activityId', activityId as Id<'learning_events'>))
      .collect();
    return new Set(likes.map(item => item.userId)).size;
  } else {
    const likes = await ctx.db
      .query('community_post_likes')
      .withIndex('by_post', q => q.eq('postId', activityId as Id<'community_posts'>))
      .collect();
    return new Set(likes.map(item => item.userId)).size;
  }
}

async function getFollowedUserIds(ctx: QueryCtx | MutationCtx, userId: Id<'users'>) {
  const follows = await ctx.db
    .query('friendships')
    .withIndex('by_follower', q => q.eq('followerId', userId))
    .take(200);
  return follows.map(item => item.followingId);
}

// Internal implementation to avoid potential export/circular issues
async function fetchCommunityFeed(ctx: QueryCtx, limit: number, filter: string): Promise<CommunityActivityDto[]> {
  const viewerId = await getOptionalAuthUserId(ctx);
  if (!viewerId) return [];

  let userIds: Id<'users'>[] = [];
  // Restrict feed to following only as per user request (even for 'all' filter)
  if (filter === 'following' || filter === 'all' || filter === 'milestones') {
    userIds = await getFollowedUserIds(ctx, viewerId);
    if (userIds.length === 0) return [];
  }

  // Fetch learning events
  let events: Doc<'learning_events'>[] = [];
  if (filter === 'all' || filter === 'milestones' || filter === 'following') {
    // We always use the userIds (following list) if populated
    const perUser = await Promise.all(userIds.map(id => 
      ctx.db.query('learning_events')
        .withIndex('by_user_eventAt', q => q.eq('userId', id))
        .order('desc')
        .take(20)
    ));
    events = perUser.flat();
  }

  // Fetch posts
  let posts: Doc<'community_posts'>[] = [];
  if (filter !== 'milestones') {
    if (filter === 'following' || filter === 'all') {
      const perUser = await Promise.all(userIds.map(id => 
        ctx.db.query('community_posts')
          .withIndex('by_user_createdAt', q => q.eq('userId', id))
          .order('desc')
          .take(20)
      ));
      posts = perUser.flat();
    } else {
      // For specific category filters (not 'all' or 'following'), still respect userIds
      const perUser = await Promise.all(userIds.map(_id => 
        ctx.db.query('community_posts')
          .withIndex('by_type_createdAt', q => q.eq('type', filter as 'all' | 'following' | 'milestones' | 'qa' | 'resources'))
          .order('desc')
          .take(limit)
      ));
      // Note: This logic assumes we want to filter category by following too
      posts = perUser.flat().filter(p => userIds.includes(p.userId));
    }
  }

  // Merge and sort
  const combined = [
    ...events.map(e => ({ kind: 'event' as const, data: e, time: e.eventAt })),
    ...posts.map(p => ({ kind: 'post' as const, data: p, time: p.createdAt }))
  ]
  .filter(item => item.data.userId !== viewerId) // Do not show own activities in community feed
  .sort((a, b) => b.time - a.time)
  .slice(0, limit);

  const actorIds = [...new Set(combined.map(item => item.data.userId))];
  const actorMap = new Map();
  await Promise.all(actorIds.map(async id => {
    const user = await ctx.db.get(id);
    if (user) actorMap.set(id, user);
  }));

  const hydrated = await Promise.all(combined.map(async item => {
    const actor = actorMap.get(item.data.userId);
    if (!actor) return null;

    // Filter out unnamed users with 0 score or placeholder posts (likely test data)
    const isUnnamed = !actor.name;
    const score = 'score' in item.data ? (item.data as { score?: number }).score : undefined;
    const isZeroOrEmptyScore = score === 0 || score === null || score === undefined;
    if (isUnnamed && isZeroOrEmptyScore) return null;
    if (isUnnamed && item.kind === 'post' && (item.data.content || '').includes('shared a post')) return null;

    const activityId = item.data._id;
    const likeMeta = await resolveLikeMeta(ctx, activityId, item.kind, viewerId);
    
    let commentCount = 0;
    if (item.kind === 'post') {
      const comments = await ctx.db.query('community_comments')
        .withIndex('by_post_createdAt', q => q.eq('postId', activityId as Id<'community_posts'>))
        .collect();
      commentCount = comments.length;
    }

    if (item.kind === 'event') {
      const e = item.data as Doc<'learning_events'>;
      
      // Filter out unrelated/low-value events
      if (!isFeedEventName(e.eventName)) return null;

      // Noise reduction for "All" feed: Only show high-value events if not following
      if (filter === 'all' && (e.eventName === 'session_completed' || e.eventName === 'review_completed')) {
         // Optionally keep them, but if user says "unrelated", maybe they want only bigger stuff in 'All'
         // For now, let's keep them but ensure they are valid
      }

      return {
        activityId,
        kind: 'event',
        actorUserId: e.userId,
        actorName: actor.name || 'Learner',
        actorAvatar: actor.avatar || actor.image || null,
        module: e.module,
        eventName: e.eventName,
        eventAt: e.eventAt,
        content: '',
        itemCount: e.itemCount ?? 0,
        durationSec: e.durationSec ?? 0,
        score: e.score ?? null,
        accuracy: e.accuracy ?? null,
        likeCount: likeMeta.likeCount,
        likedByMe: likeMeta.likedByMe,
        commentCount,
      } as CommunityActivityDto;
    } else {
      const p = item.data as Doc<'community_posts'>;
      return {
        activityId,
        kind: 'post',
        actorUserId: p.userId,
        actorName: actor.name || 'Learner',
        actorAvatar: actor.avatar || actor.image || null,
        module: p.type,
        eventName: 'user_post',
        eventAt: p.createdAt,
        content: p.content,
        itemCount: 0,
        durationSec: 0,
        score: null,
        accuracy: null,
        likeCount: likeMeta.likeCount,
        likedByMe: likeMeta.likedByMe,
        commentCount,
        images: p.images,
        attachment: p.attachment,
      } as CommunityActivityDto;
    }
  }));

  return hydrated.filter(Boolean) as CommunityActivityDto[];
}

export const getViewer = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getOptionalAuthUserId(ctx);
    if (!userId) return null;
    const user = await ctx.db.get(userId);
    if (!user) return null;
    return {
      _id: user._id,
      name: user.name,
      avatar: user.avatar || user.image || null,
    };
  }
});

export const getCommunityFeed = query({
  args: {
    limit: v.optional(v.number()),
    filter: v.optional(v.union(v.literal('all'), v.literal('following'), v.literal('milestones'), v.literal('qa'), v.literal('resources'))),
  },
  handler: async (ctx, args) => {
    const limit = normalizeLimit(args.limit);
    const filter = args.filter || 'all';
    return await fetchCommunityFeed(ctx, limit, filter);
  }
});

export const createPost = mutation({
  args: {
    content: v.string(),
    type: v.optional(v.union(v.literal('all'), v.literal('following'), v.literal('milestones'), v.literal('qa'), v.literal('resources'))),
    images: v.optional(v.array(v.string())),
    attachment: v.optional(v.object({
      type: v.string(),
      id: v.string(),
      title: v.string(),
      description: v.optional(v.string()),
    })),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const postId = await ctx.db.insert('community_posts', {
      userId,
      content: args.content,
      type: args.type || 'all',
      images: args.images,
      attachment: args.attachment,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    return postId;
  }
});

export const likeActivity = mutation({
  args: {
    activityId: v.string(),
    kind: v.union(v.literal('event'), v.literal('post')),
  },
  handler: async (ctx, args): Promise<LikeMutationResult> => {
    const userId = await getAuthUserId(ctx);
    
    if (args.kind === 'event') {
      const activityId = args.activityId as Id<'learning_events'>;
      const existing = await ctx.db
        .query('community_activity_likes')
        .withIndex('by_user_activity', q => q.eq('userId', userId).eq('activityId', activityId))
        .first();
      if (!existing) {
        await ctx.db.insert('community_activity_likes', { activityId, userId, createdAt: Date.now() });
      }
    } else {
      const postId = args.activityId as Id<'community_posts'>;
      const existing = await ctx.db
        .query('community_post_likes')
        .withIndex('by_user_post', q => q.eq('userId', userId).eq('postId', postId))
        .first();
      if (!existing) {
        await ctx.db.insert('community_post_likes', { postId, userId, createdAt: Date.now() });
      }
    }

    return {
      liked: true,
      likeCount: await countLikes(ctx, args.activityId, args.kind),
    };
  },
});

export const unlikeActivity = mutation({
  args: {
    activityId: v.string(),
    kind: v.union(v.literal('event'), v.literal('post')),
  },
  handler: async (ctx, args): Promise<LikeMutationResult> => {
    const userId = await getAuthUserId(ctx);
    
    if (args.kind === 'event') {
      const activityId = args.activityId as Id<'learning_events'>;
      const existing = await ctx.db
        .query('community_activity_likes')
        .withIndex('by_user_activity', q => q.eq('userId', userId).eq('activityId', activityId))
        .first();
      if (existing) await ctx.db.delete(existing._id);
    } else {
      const postId = args.activityId as Id<'community_posts'>;
      const existing = await ctx.db
        .query('community_post_likes')
        .withIndex('by_user_post', q => q.eq('userId', userId).eq('postId', postId))
        .first();
      if (existing) await ctx.db.delete(existing._id);
    }

    return {
      liked: false,
      likeCount: await countLikes(ctx, args.activityId, args.kind),
    };
  },
});

export const addComment = mutation({
  args: {
    postId: v.id('community_posts'),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const commentId = await ctx.db.insert('community_comments', {
      postId: args.postId,
      userId,
      content: args.content,
      createdAt: Date.now(),
    });
    return commentId;
  }
});

export const getComments = query({
  args: {
    postId: v.id('community_posts'),
  },
  handler: async (ctx, args) => {
    const comments = await ctx.db
      .query('community_comments')
      .withIndex('by_post_createdAt', q => q.eq('postId', args.postId))
      .collect();

    const userIds = [...new Set(comments.map(c => c.userId))];
    const userMap = new Map();
    await Promise.all(userIds.map(async id => {
      const user = await ctx.db.get(id);
      if (user) userMap.set(id, user);
    }));

    return comments.map(c => {
      const user = userMap.get(c.userId);
      return {
        ...c,
        userName: user?.name || 'Learner',
        userAvatar: user?.avatar || user?.image || null,
      };
    });
  }
});

// Backward compatibility or internal usage
export const getRecentFriendActivity = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = normalizeLimit(args.limit);
    return await fetchCommunityFeed(ctx, limit, 'all');
  },
});

export const cleanupFakeData = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    const user = await ctx.db.get(userId);
    if (!user || user.role !== 'ADMIN') {
      throw new ConvexError({ code: 'UNAUTHORIZED', message: 'Only admins can cleanup data' });
    }

    const events = await ctx.db.query('learning_events').collect();
    let deletedCount = 0;
    for (const e of events) {
      const actor = await ctx.db.get(e.userId);
      // If actor has no name and score is 0, it's likely fake/test data
      if (!actor?.name && (e.score === 0 || e.score === null)) {
        await ctx.db.delete(e._id);
        deletedCount++;
      }
    }

    const posts = await ctx.db.query('community_posts').collect();
    for (const p of posts) {
      const actor = await ctx.db.get(p.userId);
      if (!actor?.name && p.content.includes('shared a post')) {
        await ctx.db.delete(p._id);
        deletedCount++;
      }
    }

    return { deletedCount };
  },
});
