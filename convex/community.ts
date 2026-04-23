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
  activityId: Id<'learning_events'>;
  actorUserId: Id<'users'>;
  actorName: string;
  actorAvatar: string | null;
  module: string;
  eventName: FeedEventName;
  eventAt: number;
  itemCount: number;
  durationSec: number;
  score: number | null;
  accuracy: number | null;
  likeCount: number;
  likedByMe: boolean;
};

type LikeMutationResult = {
  liked: boolean;
  likeCount: number;
};

function isFeedEventName(value: string): value is FeedEventName {
  return FEED_EVENT_NAMES.has(value);
}

function normalizeLimit(limit?: number): number {
  if (!Number.isFinite(limit)) return 3;
  const normalized = Math.floor(limit as number);
  if (normalized < 1) return 1;
  if (normalized > 12) return 12;
  return normalized;
}

async function resolveLikeMeta(
  ctx: QueryCtx | MutationCtx,
  activityId: Id<'learning_events'>,
  viewerId: Id<'users'>
): Promise<{ likeCount: number; likedByMe: boolean }> {
  const likes = await ctx.db
    .query('community_activity_likes')
    .withIndex('by_activity', q => q.eq('activityId', activityId))
    .collect();

  const likerIds = new Set(likes.map(item => item.userId));
  return {
    likeCount: likerIds.size,
    likedByMe: likerIds.has(viewerId),
  };
}

async function countLikes(
  ctx: QueryCtx | MutationCtx,
  activityId: Id<'learning_events'>
): Promise<number> {
  const likes = await ctx.db
    .query('community_activity_likes')
    .withIndex('by_activity', q => q.eq('activityId', activityId))
    .collect();
  return new Set(likes.map(item => item.userId)).size;
}

async function getFollowedUserIds(ctx: QueryCtx | MutationCtx, userId: Id<'users'>) {
  const follows = await ctx.db
    .query('friendships')
    .withIndex('by_follower', q => q.eq('followerId', userId))
    .take(80);
  return follows.map(item => item.followingId);
}

export const getRecentFriendActivity = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<CommunityActivityDto[]> => {
    const viewerId = await getOptionalAuthUserId(ctx);
    if (!viewerId) return [];

    const limit = normalizeLimit(args.limit);
    const followedUserIds = (await getFollowedUserIds(ctx, viewerId)).filter(
      followedUserId => followedUserId !== viewerId
    );
    if (followedUserIds.length === 0) return [];

    const perUserTake = Math.max(6, limit * 2);
    const followedEvents = await Promise.all(
      followedUserIds.map(async followedUserId => {
        return await ctx.db
          .query('learning_events')
          .withIndex('by_user_eventAt', q => q.eq('userId', followedUserId))
          .order('desc')
          .take(perUserTake);
      })
    );

    const merged = followedEvents
      .flat()
      .filter((event): event is Doc<'learning_events'> & { eventName: FeedEventName } =>
        isFeedEventName(event.eventName)
      )
      .sort((a, b) => b.eventAt - a.eventAt)
      .slice(0, limit * 6);

    if (merged.length === 0) return [];

    const actorIds = [...new Set(merged.map(event => event.userId))];
    const actorEntries = await Promise.all(actorIds.map(actorId => ctx.db.get(actorId)));
    const actorMap = new Map(
      actorEntries
        .filter((actor): actor is Doc<'users'> => actor !== null)
        .map(actor => [actor._id, actor])
    );

    const hydrated = await Promise.all(
      merged.map(async event => {
        const actor = actorMap.get(event.userId);
        if (!actor) return null;

        const likeMeta = await resolveLikeMeta(ctx, event._id, viewerId);
        return {
          activityId: event._id,
          actorUserId: event.userId,
          actorName: actor.name?.trim() || 'Learner',
          actorAvatar: actor.avatar || actor.image || null,
          module: event.module,
          eventName: event.eventName,
          eventAt: event.eventAt,
          itemCount: Math.max(0, event.itemCount ?? 0),
          durationSec: Math.max(0, event.durationSec ?? 0),
          score: typeof event.score === 'number' ? event.score : null,
          accuracy: typeof event.accuracy === 'number' ? event.accuracy : null,
          likeCount: likeMeta.likeCount,
          likedByMe: likeMeta.likedByMe,
        } satisfies CommunityActivityDto;
      })
    );

    return hydrated.filter((item): item is CommunityActivityDto => item !== null).slice(0, limit);
  },
});

export const likeActivity = mutation({
  args: {
    activityId: v.id('learning_events'),
  },
  handler: async (ctx, args): Promise<LikeMutationResult> => {
    const userId = await getAuthUserId(ctx);
    const activity = await ctx.db.get(args.activityId);
    if (!activity) {
      throw new ConvexError({ code: 'ACTIVITY_NOT_FOUND' });
    }

    const existing = await ctx.db
      .query('community_activity_likes')
      .withIndex('by_user_activity', q => q.eq('userId', userId).eq('activityId', args.activityId))
      .first();

    if (!existing) {
      await ctx.db.insert('community_activity_likes', {
        activityId: args.activityId,
        userId,
        createdAt: Date.now(),
      });
    }

    return {
      liked: true,
      likeCount: await countLikes(ctx, args.activityId),
    };
  },
});

export const unlikeActivity = mutation({
  args: {
    activityId: v.id('learning_events'),
  },
  handler: async (ctx, args): Promise<LikeMutationResult> => {
    const userId = await getAuthUserId(ctx);
    const existingLikes = await ctx.db
      .query('community_activity_likes')
      .withIndex('by_user_activity', q => q.eq('userId', userId).eq('activityId', args.activityId))
      .collect();

    await Promise.all(existingLikes.map(item => ctx.db.delete(item._id)));

    return {
      liked: false,
      likeCount: await countLikes(ctx, args.activityId),
    };
  },
});
