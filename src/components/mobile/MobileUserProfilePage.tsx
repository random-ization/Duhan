import { useParams } from 'react-router-dom';
import { useQuery } from 'convex/react';
import { Loader2, MessageCircle, Trophy } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Id } from '../../../convex/_generated/dataModel';
import { USER_PROFILE } from '../../utils/convexRefs';
import { useLocalizedNavigate } from '../../hooks/useLocalizedNavigate';
import { Card, KT, PageShell } from './ksoft/ksoft';
import { TopicChip } from '../qa/TopicChip';

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

export default function MobileUserProfilePage() {
  const { t } = useTranslation();
  const navigate = useLocalizedNavigate();
  const { userId } = useParams<{ userId: string }>();
  const profile = useQuery(
    USER_PROFILE.getUserProfile,
    userId ? { userId: userId as Id<'users'> } : 'skip'
  );

  if (profile === undefined) {
    return (
      <PageShell>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="animate-spin" size={22} style={{ color: KT.sub }} />
        </div>
      </PageShell>
    );
  }

  if (profile === null) {
    return (
      <PageShell>
        <div className="px-5 py-14 text-center" style={{ color: KT.sub }}>
          {t('qa.profileNotFound', { defaultValue: 'Profile not found.' })}
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <div style={{ padding: '14px 16px 20px', paddingTop: 'calc(env(safe-area-inset-top) + 14px)' }}>
        <Card pad={20}>
          <div className="flex items-center gap-4">
            <img
              src={profile.user.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${profile.user.name}`}
              alt=""
              className="h-16 w-16 rounded-[20px] object-cover"
            />
            <div>
              <h1 style={{ fontSize: 20, fontWeight: 800, color: KT.ink }}>{profile.user.name}</h1>
              <p style={{ marginTop: 4, fontSize: 12, color: KT.sub }}>
                {t('qa.communityProfile', { defaultValue: 'Community profile' })}
              </p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            {[
              { label: t('qa.questionsAsked', { defaultValue: 'Questions' }), value: profile.questionCount },
              { label: t('qa.answersGiven', { defaultValue: 'Answers' }), value: profile.answerCount },
              { label: t('qa.acceptanceRate', { defaultValue: 'Acceptance' }), value: formatPercent(profile.acceptanceRate) },
              { label: t('qa.totalVotes', { defaultValue: 'Votes' }), value: profile.totalVoteScore },
            ].map(stat => (
              <div
                key={stat.label}
                style={{ background: KT.bg2, borderRadius: 18, padding: 14 }}
              >
                <div style={{ fontSize: 11, fontWeight: 700, color: KT.sub }}>{stat.label}</div>
                <div style={{ marginTop: 4, fontSize: 20, fontWeight: 800, color: KT.ink }}>{stat.value}</div>
              </div>
            ))}
          </div>
        </Card>

        <Card pad={20} className="mt-4">
          <div className="mb-3 flex items-center gap-2">
            <Trophy size={15} style={{ color: KT.crimson }} />
            <span style={{ fontSize: 15, fontWeight: 800, color: KT.ink }}>
              {t('qa.recentQuestions', { defaultValue: 'Recent questions' })}
            </span>
          </div>
          <div className="space-y-3">
            {profile.recentQuestions.length === 0 ? (
              <p style={{ fontSize: 13, color: KT.sub }}>
                {t('qa.noRecentQuestions', { defaultValue: 'No public questions yet.' })}
              </p>
            ) : (
              profile.recentQuestions.map(question => (
                <button
                  key={question._id}
                  type="button"
                  onClick={() => navigate(`/community/qa/${question._id}`)}
                  className="w-full rounded-[20px] px-4 py-3 text-left"
                  style={{ background: `${KT.bg2}` }}
                >
                  <div className="mb-2 flex items-center gap-2">
                    <TopicChip slug={question.topicSlug} />
                    <span style={{ fontSize: 11, color: KT.sub }}>{formatRelativeTime(question.createdAt)}</span>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: KT.ink }}>{question.title}</div>
                </button>
              ))
            )}
          </div>
        </Card>

        <Card pad={20} className="mt-4">
          <div className="mb-3 flex items-center gap-2">
            <MessageCircle size={15} style={{ color: KT.crimson }} />
            <span style={{ fontSize: 15, fontWeight: 800, color: KT.ink }}>
              {t('qa.recentAnswers', { defaultValue: 'Recent answers' })}
            </span>
          </div>
          <div className="space-y-3">
            {profile.recentAnswers.length === 0 ? (
              <p style={{ fontSize: 13, color: KT.sub }}>
                {t('qa.noRecentAnswers', { defaultValue: 'No public answers yet.' })}
              </p>
            ) : (
              profile.recentAnswers.map(answer => (
                <button
                  key={answer._id}
                  type="button"
                  onClick={() => navigate(`/community/qa/${answer.questionId}`)}
                  className="w-full rounded-[20px] px-4 py-3 text-left"
                  style={{ background: `${KT.bg2}` }}
                >
                  <div style={{ fontSize: 14, fontWeight: 700, color: KT.ink }}>{answer.questionTitle}</div>
                  <div style={{ marginTop: 6, fontSize: 11, color: KT.sub }}>
                    {formatRelativeTime(answer.createdAt)}
                    {answer.isAccepted ? ` · ${t('qa.accepted', { defaultValue: 'Accepted' })}` : ''}
                  </div>
                </button>
              ))
            )}
          </div>
        </Card>
      </div>
    </PageShell>
  );
}
