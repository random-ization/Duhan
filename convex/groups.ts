/**
 * Study groups MVP (community v2).
 *
 * Constraints (frozen for v1):
 *  - Each user can be in at most MAX_GROUPS_PER_USER groups.
 *  - Each group can have at most MAX_MEMBERS_PER_GROUP members.
 *  - You can only invite users who are already your friends (bidirectional
 *    `friendships` edges).
 *  - The owner can't leave; they must delete the group (not in v1) or transfer.
 *    For v1 we just disallow `leave` for the owner.
 */

import { ConvexError, v } from 'convex/values';
import { type FunctionReference, makeFunctionReference } from 'convex/server';
import type { Doc, Id } from './_generated/dataModel';
import { mutation, query, type MutationCtx, type QueryCtx } from './_generated/server';
import { getAuthUserId, getOptionalAuthUserId } from './utils';
import { getCurrentWeekIdentifier } from './xp';

const MAX_GROUPS_PER_USER = 5;
const MAX_MEMBERS_PER_GROUP = 30;
const MAX_GROUP_NAME_LENGTH = 40;
const MAX_GROUP_DESCRIPTION_LENGTH = 200;

type GroupNotificationArgs = {
  userId: Id<'users'>;
  kind: 'group_invite' | 'group_accepted';
  title: string;
  body: string;
  linkPath?: string;
  metadata?: Record<string, unknown>;
  dedupeKey?: string;
};

const enqueueGroupNotification = makeFunctionReference<'mutation', GroupNotificationArgs, unknown>(
  'notifications:enqueueNotification'
) as unknown as FunctionReference<'mutation', 'internal', GroupNotificationArgs, unknown>;

async function scheduleNotification(ctx: MutationCtx, args: GroupNotificationArgs): Promise<void> {
  try {
    await ctx.scheduler.runAfter(0, enqueueGroupNotification, args);
  } catch {
    // best-effort
  }
}

export type StudyGroupMemberDto = {
  userId: Id<'users'>;
  name: string;
  avatarUrl: string | null;
  role: 'owner' | 'member';
  joinedAt: number;
};

export type StudyGroupDto = {
  id: Id<'study_groups'>;
  name: string;
  description: string | null;
  ownerId: Id<'users'>;
  ownerName: string;
  memberCount: number;
  createdAt: number;
  myRole: 'owner' | 'member';
};

export type StudyGroupDetailDto = StudyGroupDto & {
  members: StudyGroupMemberDto[];
};

export type StudyGroupInviteDto = {
  inviteId: Id<'study_group_invites'>;
  groupId: Id<'study_groups'>;
  groupName: string;
  inviterId: Id<'users'>;
  inviterName: string;
  createdAt: number;
};

export type GroupLeaderboardEntry = {
  rank: number;
  userId: Id<'users'>;
  name: string;
  avatarUrl: string | null;
  weeklyXp: number;
  isMe: boolean;
};

export type GroupActivityDto = {
  activityId: Id<'learning_events'>;
  actorUserId: Id<'users'>;
  actorName: string;
  actorAvatar: string | null;
  module: string;
  eventName: string;
  eventAt: number;
  itemCount: number;
  durationSec: number;
};

function pickName(user: Doc<'users'>): string {
  const name = typeof user.name === 'string' ? user.name.trim() : '';
  return name || 'Learner';
}

async function loadUserName(ctx: QueryCtx | MutationCtx, userId: Id<'users'>): Promise<string> {
  const user = await ctx.db.get(userId);
  return user ? pickName(user) : 'Learner';
}

async function areFriends(
  ctx: QueryCtx | MutationCtx,
  a: Id<'users'>,
  b: Id<'users'>
): Promise<boolean> {
  const [forward, reverse] = await Promise.all([
    ctx.db
      .query('friendships')
      .withIndex('by_both', q => q.eq('followerId', a).eq('followingId', b))
      .first(),
    ctx.db
      .query('friendships')
      .withIndex('by_both', q => q.eq('followerId', b).eq('followingId', a))
      .first(),
  ]);
  return Boolean(forward && reverse);
}

async function getMembership(
  ctx: QueryCtx | MutationCtx,
  groupId: Id<'study_groups'>,
  userId: Id<'users'>
) {
  return await ctx.db
    .query('study_group_members')
    .withIndex('by_group_user', q => q.eq('groupId', groupId).eq('userId', userId))
    .first();
}

async function ensureMember(
  ctx: QueryCtx | MutationCtx,
  groupId: Id<'study_groups'>,
  userId: Id<'users'>
) {
  const membership = await getMembership(ctx, groupId, userId);
  if (!membership) throw new ConvexError({ code: 'NOT_A_MEMBER' });
  return membership;
}

function normalizeGroupName(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) throw new ConvexError({ code: 'NAME_REQUIRED' });
  if (trimmed.length > MAX_GROUP_NAME_LENGTH) {
    throw new ConvexError({ code: 'NAME_TOO_LONG' });
  }
  return trimmed;
}

function normalizeGroupDescription(raw: string | undefined): string | undefined {
  if (raw === undefined) return undefined;
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  if (trimmed.length > MAX_GROUP_DESCRIPTION_LENGTH) {
    throw new ConvexError({ code: 'DESCRIPTION_TOO_LONG' });
  }
  return trimmed;
}

async function buildGroupDto(
  ctx: QueryCtx | MutationCtx,
  group: Doc<'study_groups'>,
  membership: Doc<'study_group_members'>
): Promise<StudyGroupDto> {
  const ownerName = await loadUserName(ctx, group.ownerId);
  return {
    id: group._id,
    name: group.name,
    description: group.description ?? null,
    ownerId: group.ownerId,
    ownerName,
    memberCount: group.memberCount,
    createdAt: group.createdAt,
    myRole: membership.role,
  };
}

export const create = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{ groupId: Id<'study_groups'> }> => {
    const userId = await getAuthUserId(ctx);
    const name = normalizeGroupName(args.name);
    const description = normalizeGroupDescription(args.description);

    const myMemberships = await ctx.db
      .query('study_group_members')
      .withIndex('by_user', q => q.eq('userId', userId))
      .collect();
    if (myMemberships.length >= MAX_GROUPS_PER_USER) {
      throw new ConvexError({ code: 'GROUP_LIMIT_REACHED' });
    }

    const now = Date.now();
    const groupId = await ctx.db.insert('study_groups', {
      name,
      ownerId: userId,
      description,
      memberCount: 1,
      createdAt: now,
    });
    await ctx.db.insert('study_group_members', {
      groupId,
      userId,
      role: 'owner',
      joinedAt: now,
    });
    return { groupId };
  },
});

export const listMine = query({
  args: {},
  handler: async (ctx): Promise<StudyGroupDto[]> => {
    const userId = await getOptionalAuthUserId(ctx);
    if (!userId) return [];

    const memberships = await ctx.db
      .query('study_group_members')
      .withIndex('by_user', q => q.eq('userId', userId))
      .collect();

    const dtos = await Promise.all(
      memberships.map(async membership => {
        const group = await ctx.db.get(membership.groupId);
        if (!group) return null;
        return buildGroupDto(ctx, group, membership);
      })
    );

    return dtos
      .filter((item): item is StudyGroupDto => item !== null)
      .sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const getDetail = query({
  args: {
    groupId: v.id('study_groups'),
  },
  handler: async (ctx, args): Promise<StudyGroupDetailDto | null> => {
    const userId = await getOptionalAuthUserId(ctx);
    if (!userId) return null;

    const membership = await getMembership(ctx, args.groupId, userId);
    if (!membership) return null;

    const group = await ctx.db.get(args.groupId);
    if (!group) return null;

    const members = await ctx.db
      .query('study_group_members')
      .withIndex('by_group', q => q.eq('groupId', args.groupId))
      .collect();

    const memberDtos = await Promise.all(
      members.map(async member => {
        const user = await ctx.db.get(member.userId);
        if (!user) return null;
        return {
          userId: member.userId,
          name: pickName(user),
          avatarUrl: user.avatar || user.image || null,
          role: member.role,
          joinedAt: member.joinedAt,
        } satisfies StudyGroupMemberDto;
      })
    );

    const dto = await buildGroupDto(ctx, group, membership);
    return {
      ...dto,
      members: memberDtos
        .filter((item): item is StudyGroupMemberDto => item !== null)
        .sort((a, b) => {
          if (a.role === 'owner' && b.role !== 'owner') return -1;
          if (b.role === 'owner' && a.role !== 'owner') return 1;
          return a.joinedAt - b.joinedAt;
        }),
    };
  },
});

export const invite = mutation({
  args: {
    groupId: v.id('study_groups'),
    targetUserId: v.id('users'),
  },
  handler: async (
    ctx,
    args
  ): Promise<{
    inviteId: Id<'study_group_invites'> | null;
    status: 'sent' | 'already_member' | 'already_invited';
  }> => {
    const userId = await getAuthUserId(ctx);
    if (args.targetUserId === userId) {
      throw new ConvexError({ code: 'SELF_INVITE_NOT_ALLOWED' });
    }
    await ensureMember(ctx, args.groupId, userId);

    const friends = await areFriends(ctx, userId, args.targetUserId);
    if (!friends) throw new ConvexError({ code: 'NOT_FRIENDS' });

    const group = await ctx.db.get(args.groupId);
    if (!group) throw new ConvexError({ code: 'GROUP_NOT_FOUND' });
    if (group.memberCount >= MAX_MEMBERS_PER_GROUP) {
      throw new ConvexError({ code: 'GROUP_FULL' });
    }

    const existingMembership = await getMembership(ctx, args.groupId, args.targetUserId);
    if (existingMembership) return { inviteId: null, status: 'already_member' };

    const existingInvite = await ctx.db
      .query('study_group_invites')
      .withIndex('by_group_invitee', q =>
        q.eq('groupId', args.groupId).eq('inviteeId', args.targetUserId)
      )
      .filter(q => q.eq(q.field('status'), 'pending'))
      .first();
    if (existingInvite) return { inviteId: existingInvite._id, status: 'already_invited' };

    const now = Date.now();
    const inviteId = await ctx.db.insert('study_group_invites', {
      groupId: args.groupId,
      inviterId: userId,
      inviteeId: args.targetUserId,
      status: 'pending',
      createdAt: now,
    });

    const inviterName = await loadUserName(ctx, userId);
    await scheduleNotification(ctx, {
      userId: args.targetUserId,
      kind: 'group_invite',
      title: '학습 모임 초대',
      body: `${inviterName} 님이 “${group.name}” 모임에 초대했습니다.`,
      linkPath: '/community',
      metadata: { groupId: args.groupId, inviteId },
    });

    return { inviteId, status: 'sent' };
  },
});

export const respondInvite = mutation({
  args: {
    inviteId: v.id('study_group_invites'),
    action: v.union(v.literal('accept'), v.literal('decline')),
  },
  handler: async (
    ctx,
    args
  ): Promise<{ status: 'accepted' | 'declined' | 'not_found' | 'group_full' }> => {
    const userId = await getAuthUserId(ctx);
    const invite = await ctx.db.get(args.inviteId);
    if (!invite) return { status: 'not_found' };
    if (invite.inviteeId !== userId) throw new ConvexError({ code: 'FORBIDDEN' });
    if (invite.status !== 'pending') return { status: 'not_found' };

    if (args.action === 'decline') {
      await ctx.db.patch(invite._id, { status: 'declined', respondedAt: Date.now() });
      return { status: 'declined' };
    }

    const myMemberships = await ctx.db
      .query('study_group_members')
      .withIndex('by_user', q => q.eq('userId', userId))
      .collect();
    if (myMemberships.length >= MAX_GROUPS_PER_USER) {
      throw new ConvexError({ code: 'GROUP_LIMIT_REACHED' });
    }

    const group = await ctx.db.get(invite.groupId);
    if (!group) {
      await ctx.db.patch(invite._id, { status: 'declined', respondedAt: Date.now() });
      return { status: 'not_found' };
    }
    if (group.memberCount >= MAX_MEMBERS_PER_GROUP) {
      return { status: 'group_full' };
    }

    const existing = await getMembership(ctx, invite.groupId, userId);
    if (!existing) {
      await ctx.db.insert('study_group_members', {
        groupId: invite.groupId,
        userId,
        role: 'member',
        joinedAt: Date.now(),
      });
      await ctx.db.patch(group._id, { memberCount: group.memberCount + 1 });
    }
    await ctx.db.patch(invite._id, { status: 'accepted', respondedAt: Date.now() });

    const accepterName = await loadUserName(ctx, userId);
    await scheduleNotification(ctx, {
      userId: invite.inviterId,
      kind: 'group_accepted',
      title: '모임 초대 수락',
      body: `${accepterName} 님이 “${group.name}” 모임에 참여했습니다.`,
      linkPath: '/community',
      metadata: { groupId: invite.groupId },
    });

    return { status: 'accepted' };
  },
});

export const leave = mutation({
  args: {
    groupId: v.id('study_groups'),
  },
  handler: async (ctx, args): Promise<{ ok: boolean }> => {
    const userId = await getAuthUserId(ctx);
    const membership = await getMembership(ctx, args.groupId, userId);
    if (!membership) return { ok: false };
    if (membership.role === 'owner') {
      throw new ConvexError({ code: 'OWNER_CANNOT_LEAVE' });
    }
    await ctx.db.delete(membership._id);
    const group = await ctx.db.get(args.groupId);
    if (group) {
      await ctx.db.patch(group._id, { memberCount: Math.max(0, group.memberCount - 1) });
    }
    return { ok: true };
  },
});

export const listIncomingInvites = query({
  args: {},
  handler: async (ctx): Promise<StudyGroupInviteDto[]> => {
    const userId = await getOptionalAuthUserId(ctx);
    if (!userId) return [];

    const invites = await ctx.db
      .query('study_group_invites')
      .withIndex('by_invitee_status', q => q.eq('inviteeId', userId).eq('status', 'pending'))
      .order('desc')
      .take(40);

    const dtos = await Promise.all(
      invites.map(async invite => {
        const [group, inviter] = await Promise.all([
          ctx.db.get(invite.groupId),
          ctx.db.get(invite.inviterId),
        ]);
        if (!group) return null;
        return {
          inviteId: invite._id,
          groupId: invite.groupId,
          groupName: group.name,
          inviterId: invite.inviterId,
          inviterName: inviter ? pickName(inviter) : 'Learner',
          createdAt: invite.createdAt,
        } satisfies StudyGroupInviteDto;
      })
    );

    return dtos.filter((item): item is StudyGroupInviteDto => item !== null);
  },
});

export const getWeeklyLeaderboard = query({
  args: {
    groupId: v.id('study_groups'),
  },
  handler: async (ctx, args): Promise<GroupLeaderboardEntry[]> => {
    const userId = await getOptionalAuthUserId(ctx);
    if (!userId) return [];
    const membership = await getMembership(ctx, args.groupId, userId);
    if (!membership) return [];

    const members = await ctx.db
      .query('study_group_members')
      .withIndex('by_group', q => q.eq('groupId', args.groupId))
      .collect();

    const weekIdentifier = getCurrentWeekIdentifier();
    const memberStats = await Promise.all(
      members.map(async member => {
        const stat = await ctx.db
          .query('user_xp_stats')
          .withIndex('by_user_week', q =>
            q.eq('userId', member.userId).eq('weekIdentifier', weekIdentifier)
          )
          .first();
        const user = await ctx.db.get(member.userId);
        return {
          member,
          user,
          weeklyXp: stat?.currentWeekXp ?? 0,
        };
      })
    );

    const sorted = memberStats
      .filter(
        (
          item
        ): item is { member: Doc<'study_group_members'>; user: Doc<'users'>; weeklyXp: number } =>
          item.user !== null
      )
      .sort((a, b) => b.weeklyXp - a.weeklyXp);

    return sorted.map((item, idx) => ({
      rank: idx + 1,
      userId: item.member.userId,
      name: pickName(item.user),
      avatarUrl: item.user.avatar || item.user.image || null,
      weeklyXp: item.weeklyXp,
      isMe: item.member.userId === userId,
    }));
  },
});

export const getRecentActivity = query({
  args: {
    groupId: v.id('study_groups'),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<GroupActivityDto[]> => {
    const userId = await getOptionalAuthUserId(ctx);
    if (!userId) return [];
    const membership = await getMembership(ctx, args.groupId, userId);
    if (!membership) return [];

    const limit = Math.max(1, Math.min(20, Math.floor(args.limit ?? 12)));
    const members = await ctx.db
      .query('study_group_members')
      .withIndex('by_group', q => q.eq('groupId', args.groupId))
      .collect();

    const perMember = Math.max(2, Math.ceil((limit * 2) / Math.max(members.length, 1)));
    const events = await Promise.all(
      members.map(async member => {
        return await ctx.db
          .query('learning_events')
          .withIndex('by_user_eventAt', q => q.eq('userId', member.userId))
          .order('desc')
          .take(perMember);
      })
    );

    const merged = events
      .flat()
      .sort((a, b) => b.eventAt - a.eventAt)
      .slice(0, limit);

    if (merged.length === 0) return [];

    const actorIds = [...new Set(merged.map(event => event.userId))];
    const actorEntries = await Promise.all(actorIds.map(actorId => ctx.db.get(actorId)));
    const actorMap = new Map(
      actorEntries
        .filter((actor): actor is Doc<'users'> => actor !== null)
        .map(actor => [actor._id, actor])
    );

    const dtos: GroupActivityDto[] = [];
    for (const event of merged) {
      const actor = actorMap.get(event.userId);
      if (!actor) continue;
      dtos.push({
        activityId: event._id,
        actorUserId: event.userId,
        actorName: pickName(actor),
        actorAvatar: actor.avatar || actor.image || null,
        module: event.module,
        eventName: event.eventName,
        eventAt: event.eventAt,
        itemCount: Math.max(0, event.itemCount ?? 0),
        durationSec: Math.max(0, event.durationSec ?? 0),
      });
    }
    return dtos;
  },
});
