import { cronJobs, makeFunctionReference } from 'convex/server';
import type { FunctionReference } from 'convex/server';

type PollSourceArgs = {
  sourceKey: string;
};

type ProjectBatchArgs = {
  courseId: string;
  limit: number;
};

const pollSourceAction = makeFunctionReference<'action', PollSourceArgs, unknown>(
  'newsSources:pollSource'
) as unknown as FunctionReference<'action', 'internal', PollSourceArgs, unknown>;

const projectBatchMutation = makeFunctionReference<'mutation', ProjectBatchArgs, unknown>(
  'newsProjection:projectBatch'
) as unknown as FunctionReference<'mutation', 'internal', ProjectBatchArgs, unknown>;

const crons = cronJobs();

crons.interval('news_poll_khan_10m', { minutes: 10 }, pollSourceAction, {
  sourceKey: 'khan',
});
crons.interval('news_poll_donga_10m', { minutes: 10 }, pollSourceAction, {
  sourceKey: 'donga',
});
crons.interval('news_poll_hankyung_10m', { minutes: 10 }, pollSourceAction, {
  sourceKey: 'hankyung',
});
crons.interval('news_poll_mk_10m', { minutes: 10 }, pollSourceAction, {
  sourceKey: 'mk',
});
crons.interval('news_poll_itdonga_20m', { minutes: 20 }, pollSourceAction, {
  sourceKey: 'itdonga',
});
crons.interval('news_poll_voa_20m', { minutes: 20 }, pollSourceAction, {
  sourceKey: 'voa_ko',
});
crons.interval('news_poll_naver_30m', { minutes: 30 }, pollSourceAction, {
  sourceKey: 'naver_news_search',
});

// Projection into textbook_units(courseId="news_ko_mvp")
crons.interval('news_project_to_course_30m', { minutes: 30 }, projectBatchMutation, {
  courseId: 'news_ko_mvp',
  limit: 120,
});

export default crons;
