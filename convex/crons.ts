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

// Low-frequency baseline polling:
// user feed refresh is now user-scoped, so global ingestion can run much less often.
// For urgent updates, use manual triggers in newsAdmin (triggerSource/triggerAllSources).
crons.interval('news_poll_khan_daily', { minutes: 1440 }, pollSourceAction, {
  sourceKey: 'khan',
});
crons.interval('news_poll_donga_daily', { minutes: 1440 }, pollSourceAction, {
  sourceKey: 'donga',
});
crons.interval('news_poll_hankyung_daily', { minutes: 1440 }, pollSourceAction, {
  sourceKey: 'hankyung',
});
crons.interval('news_poll_mk_daily', { minutes: 1440 }, pollSourceAction, {
  sourceKey: 'mk',
});
crons.interval('news_poll_itdonga_12h', { minutes: 720 }, pollSourceAction, {
  sourceKey: 'itdonga',
});
crons.interval('news_poll_voa_12h', { minutes: 720 }, pollSourceAction, {
  sourceKey: 'voa_ko',
});
crons.interval('news_poll_naver_12h', { minutes: 720 }, pollSourceAction, {
  sourceKey: 'naver_news_search',
});
crons.interval('news_poll_wiki_featured_daily', { minutes: 1440 }, pollSourceAction, {
  sourceKey: 'wiki_ko_featured',
});

// Projection into textbook_units(courseId="news_ko_mvp")
crons.interval('news_project_to_course_daily', { minutes: 1440 }, projectBatchMutation, {
  courseId: 'news_ko_mvp',
  limit: 120,
});

export default crons;
