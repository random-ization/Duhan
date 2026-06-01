import { useParams } from 'react-router-dom';
import { useQuery } from 'convex/react';
import { Loader2, MessageCircle, Trophy } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Id } from '../../../convex/_generated/dataModel';
import { USER_PROFILE } from '../../utils/convexRefs';
import { useLocalizedNavigate } from '../../hooks/useLocalizedNavigate';
import { DesktopCard } from '../../components/desktop/ui/DesktopCard';
import { TopicChip } from '../../components/qa/TopicChip';

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function formatRelativeTime(timestamp: number): string {
  const diffSec = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (diffSec < 60) return 'just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}h`;
  const diffDay = Math.floor(diffHour / 24);
  return `${diffDay}d`;
}

export default function DesktopCommunityProfilePage() {
  const { t } = useTranslation();
  const navigate = useLocalizedNavigate();
  const { userId } = useParams<{ userId: string }>();
  const profile = useQuery(
    USER_PROFILE.getUserProfile,
    userId ? { userId: userId as Id<'users'> } : 'skip'
  );

  if (profile === undefined) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-k-sub" size={24} />
      </div>
    );
  }

  if (profile === null) {
    return (
      <div className="mx-auto max-w-[860px] px-6 py-12 text-center text-k-sub">
        {t('qa.profileNotFound', { defaultValue: 'Profile not found.' })}
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-[1120px] gap-6 px-6 py-6">
      <div className="w-[320px] shrink-0">
        <DesktopCard pad={24}>
          <div className="flex items-center gap-4">
            <img
              src={
                profile.user.avatar ||
                `https://api.dicebear.com/7.x/initials/svg?seed=${profile.user.name}`
              }
              alt=""
              className="h-16 w-16 rounded-[20px] bg-k-bg2 object-cover"
            />
            <div>
              <h1 className="text-[22px] font-extrabold text-k-ink">{profile.user.name}</h1>
              <p className="mt-1 text-[12px] text-k-sub">
                {t('qa.communityProfile', { defaultValue: 'Community profile' })}
              </p>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <DesktopCard pad={16} className="bg-k-bg2/60">
              <div className="text-[11px] font-bold uppercase tracking-wider text-k-sub">
                {t('qa.questionsAsked', { defaultValue: 'Questions' })}
              </div>
              <div className="mt-1 text-[22px] font-extrabold text-k-ink">
                {profile.questionCount}
              </div>
            </DesktopCard>
            <DesktopCard pad={16} className="bg-k-bg2/60">
              <div className="text-[11px] font-bold uppercase tracking-wider text-k-sub">
                {t('qa.answersGiven', { defaultValue: 'Answers' })}
              </div>
              <div className="mt-1 text-[22px] font-extrabold text-k-ink">
                {profile.answerCount}
              </div>
            </DesktopCard>
            <DesktopCard pad={16} className="bg-k-bg2/60">
              <div className="text-[11px] font-bold uppercase tracking-wider text-k-sub">
                {t('qa.acceptanceRate', { defaultValue: 'Acceptance' })}
              </div>
              <div className="mt-1 text-[22px] font-extrabold text-k-ink">
                {formatPercent(profile.acceptanceRate)}
              </div>
            </DesktopCard>
            <DesktopCard pad={16} className="bg-k-bg2/60">
              <div className="text-[11px] font-bold uppercase tracking-wider text-k-sub">
                {t('qa.totalVotes', { defaultValue: 'Votes' })}
              </div>
              <div className="mt-1 text-[22px] font-extrabold text-k-ink">
                {profile.totalVoteScore}
              </div>
            </DesktopCard>
          </div>
        </DesktopCard>
      </div>

      <div className="min-w-0 flex-1 space-y-6">
        <DesktopCard pad={24}>
          <div className="mb-4 flex items-center gap-2">
            <Trophy size={16} className="text-k-crimson" />
            <h2 className="text-[16px] font-extrabold text-k-ink">
              {t('qa.recentQuestions', { defaultValue: 'Recent questions' })}
            </h2>
          </div>
          <div className="space-y-3">
            {profile.recentQuestions.length === 0 ? (
              <p className="text-[13px] text-k-sub">
                {t('qa.noRecentQuestions', { defaultValue: 'No public questions yet.' })}
              </p>
            ) : (
              profile.recentQuestions.map(question => (
                <button
                  key={question._id}
                  type="button"
                  onClick={() => navigate(`/community/qa/${question._id}`)}
                  className="w-full rounded-[22px] border border-k-line bg-k-bg2/40 px-4 py-3 text-left transition-colors hover:bg-k-bg2"
                >
                  <div className="mb-2 flex items-center gap-2">
                    <TopicChip slug={question.topicSlug} />
                    <span className="text-[11px] text-k-sub">
                      {formatRelativeTime(question.createdAt)}
                    </span>
                  </div>
                  <div className="text-[14px] font-bold text-k-ink">{question.title}</div>
                  <div className="mt-2 flex items-center gap-3 text-[11px] text-k-sub">
                    <span>
                      {question.answerCount} {t('qa.answersOne', { defaultValue: 'answers' })}
                    </span>
                    <span>
                      {question.voteScore} {t('qa.totalVotes', { defaultValue: 'votes' })}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        </DesktopCard>

        <DesktopCard pad={24}>
          <div className="mb-4 flex items-center gap-2">
            <MessageCircle size={16} className="text-k-crimson" />
            <h2 className="text-[16px] font-extrabold text-k-ink">
              {t('qa.recentAnswers', { defaultValue: 'Recent answers' })}
            </h2>
          </div>
          <div className="space-y-3">
            {profile.recentAnswers.length === 0 ? (
              <p className="text-[13px] text-k-sub">
                {t('qa.noRecentAnswers', { defaultValue: 'No public answers yet.' })}
              </p>
            ) : (
              profile.recentAnswers.map(answer => (
                <button
                  key={answer._id}
                  type="button"
                  onClick={() => navigate(`/community/qa/${answer.questionId}`)}
                  className="w-full rounded-[22px] border border-k-line bg-k-bg2/40 px-4 py-3 text-left transition-colors hover:bg-k-bg2"
                >
                  <div className="text-[14px] font-bold text-k-ink">{answer.questionTitle}</div>
                  <div className="mt-2 flex items-center gap-3 text-[11px] text-k-sub">
                    <span>{formatRelativeTime(answer.createdAt)}</span>
                    <span>
                      {answer.voteScore} {t('qa.totalVotes', { defaultValue: 'votes' })}
                    </span>
                    {answer.isAccepted ? (
                      <span className="font-bold text-[#2F5847]">
                        {t('qa.accepted', { defaultValue: 'Accepted' })}
                      </span>
                    ) : null}
                  </div>
                </button>
              ))
            )}
          </div>
        </DesktopCard>
      </div>
    </div>
  );
}
