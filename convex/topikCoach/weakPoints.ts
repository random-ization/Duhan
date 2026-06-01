import { query } from '../_generated/server';
import { v } from 'convex/values';
import { getOptionalAuthUserId } from '../utils';
import { KAGAS_ERROR_TYPES, type KagasErrorType } from '../topikWritingValidators';

const MAX_MISTAKES_SCAN = 300;
const MAX_ATTEMPTS_SCAN = 80;

export type TopikCoachWeakPoint = {
  code: string;
  label: string;
  labelZh: string;
  count: number;
  highSeverityCount: number;
  taskTypes: string[];
  latestExplanation: string;
};

export const getWeakPoints = query({
  args: {
    limit: v.optional(v.number()),
    daysBack: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<TopikCoachWeakPoint[]> => {
    const userId = await getOptionalAuthUserId(ctx);
    if (!userId) {
      return [];
    }

    const limit = Math.max(1, Math.min(args.limit ?? 5, 10));
    const daysBack = Math.max(1, Math.min(args.daysBack ?? 45, 365));
    const cutoff = Date.now() - daysBack * 24 * 60 * 60 * 1000;

    const mistakes = (
      await ctx.db
        .query('user_mistakes')
        .withIndex('by_user_source', q => q.eq('userId', userId).eq('sourceType', 'TOPIK_WRITING'))
        .take(MAX_MISTAKES_SCAN)
    ).filter(mistake => mistake.createdAt >= cutoff);

    if (mistakes.length === 0) {
      return [];
    }

    const attempts = await ctx.db
      .query('topik_writing_attempts')
      .withIndex('by_user_createdAt', q => q.eq('userId', userId))
      .order('desc')
      .take(MAX_ATTEMPTS_SCAN);

    const taskTypeByAttemptId = new Map<string, string>();
    attempts.forEach(attempt => {
      taskTypeByAttemptId.set(String(attempt._id), attempt.taskType);
    });

    type WeakPointBucket = {
      code: string;
      count: number;
      highSeverityCount: number;
      latestCreatedAt: number;
      latestExplanation: string;
      taskTypes: Set<string>;
    };

    const buckets = new Map<string, WeakPointBucket>();

    mistakes.forEach(mistake => {
      const code = mistake.errorTypeKagas ?? mistake.errorType;
      const bucket = buckets.get(code) ?? {
        code,
        count: 0,
        highSeverityCount: 0,
        latestCreatedAt: 0,
        latestExplanation: '',
        taskTypes: new Set<string>(),
      };

      bucket.count += 1;
      if (mistake.severity === 'HIGH') {
        bucket.highSeverityCount += 1;
      }
      if (mistake.createdAt >= bucket.latestCreatedAt) {
        bucket.latestCreatedAt = mistake.createdAt;
        bucket.latestExplanation = mistake.explanationZh;
      }
      if (mistake.sourceId) {
        const taskType = taskTypeByAttemptId.get(mistake.sourceId);
        if (taskType) {
          bucket.taskTypes.add(taskType);
        }
      }

      buckets.set(code, bucket);
    });

    return Array.from(buckets.values())
      .sort((left, right) => {
        if (right.highSeverityCount !== left.highSeverityCount) {
          return right.highSeverityCount - left.highSeverityCount;
        }
        return right.count - left.count;
      })
      .slice(0, limit)
      .map(bucket => {
        const info = KAGAS_ERROR_TYPES[bucket.code as KagasErrorType];
        return {
          code: bucket.code,
          label: info?.ko ?? bucket.code,
          labelZh: info?.zh ?? bucket.code,
          count: bucket.count,
          highSeverityCount: bucket.highSeverityCount,
          taskTypes: Array.from(bucket.taskTypes).sort(),
          latestExplanation: bucket.latestExplanation,
        };
      });
  },
});
