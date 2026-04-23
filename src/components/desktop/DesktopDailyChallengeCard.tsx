import { useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { useTranslation } from 'react-i18next';
import { DAILY_CHALLENGES } from '../../utils/convexRefs';
import { useLocalizedNavigate } from '../../hooks/useLocalizedNavigate';
import { KT } from '../mobile/ksoft/ksoft';

function resolveChallengePath(kind: string): string {
  if (kind === 'vocab_20') return '/review';
  if (kind === 'grammar_drill') return '/courses';
  if (kind === 'listening_10min') return '/media?tab=podcasts';
  if (kind === 'typing_wpm') return '/typing';
  return '/dashboard';
}

export function DesktopDailyChallengeCard({
  language,
}: Readonly<{
  language: string;
}>) {
  const { t } = useTranslation();
  const navigate = useLocalizedNavigate();
  const [claiming, setClaiming] = useState(false);
  const challenge = useQuery(DAILY_CHALLENGES.getTodayChallenge, { language });
  const claimReward = useMutation(DAILY_CHALLENGES.claimReward);

  const handleAction = async () => {
    if (!challenge || claiming) return;
    if (challenge.isCompleted && !challenge.isClaimed) {
      setClaiming(true);
      try {
        await claimReward({});
      } finally {
        setClaiming(false);
      }
      return;
    }
    if (!challenge.isCompleted) {
      navigate(resolveChallengePath(challenge.kind));
    }
  };

  return (
    <section
      style={{
        border: `1px solid ${KT.line}`,
        background: KT.card,
        borderRadius: 18,
        padding: 16,
        boxShadow: KT.shSm,
      }}
    >
      <p
        style={{
          fontSize: 11,
          fontWeight: 800,
          color: KT.sub,
          letterSpacing: 1.2,
          textTransform: 'uppercase',
        }}
      >
        {t('dailyChallenge.label', { defaultValue: 'Daily challenge' })}
      </p>
      <h3 style={{ fontSize: 16, fontWeight: 800, color: KT.ink, marginTop: 6 }}>
        {challenge?.title ?? t('common.loading', { defaultValue: 'Loading…' })}
      </h3>
      <p style={{ fontSize: 12, color: KT.sub, marginTop: 4 }}>{challenge?.subtitle ?? ''}</p>
      <div style={{ marginTop: 10, fontSize: 12, color: KT.ink2, fontWeight: 700 }}>
        {challenge
          ? `${String(Math.min(challenge.currentCount, challenge.targetCount))}/${String(challenge.targetCount)}`
          : '—'}
      </div>
      <button
        type="button"
        disabled={!challenge || challenge.isClaimed || claiming}
        onClick={() => void handleAction()}
        style={{
          marginTop: 12,
          width: '100%',
          height: 36,
          borderRadius: 10,
          border: `1px solid ${KT.line}`,
          background: challenge?.isCompleted && !challenge.isClaimed ? KT.crimson : KT.bg2,
          color: challenge?.isCompleted && !challenge.isClaimed ? KT.card : KT.ink,
          fontSize: 12,
          fontWeight: 800,
          cursor: 'pointer',
          opacity: challenge?.isClaimed ? 0.65 : 1,
        }}
      >
        {challenge?.isClaimed
          ? t('dailyChallenge.claimed', { defaultValue: 'Reward claimed' })
          : challenge?.isCompleted
            ? t('dailyChallenge.claim', { defaultValue: 'Claim reward' })
            : t('dailyChallenge.continue', { defaultValue: 'Continue' })}
      </button>
    </section>
  );
}
