import { useQuery } from 'convex/react';
import { useTranslation } from 'react-i18next';
import { LEADERBOARD } from '../../utils/convexRefs';
import { KT } from '../mobile/ksoft/ksoft';

export function DesktopLeaderboardWidget() {
  const { t } = useTranslation();
  const top = useQuery(LEADERBOARD.getWeeklyTop, { limit: 5 });
  const myRank = useQuery(LEADERBOARD.getMyRank, {});

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
        {t('leaderboard.weeklyTitle', { defaultValue: 'Weekly leaderboard' })}
      </p>
      <div style={{ marginTop: 10, display: 'grid', gap: 8 }}>
        {top === undefined ? (
          <div style={{ fontSize: 12, color: KT.sub }}>
            {t('common.loading', { defaultValue: 'Loading…' })}
          </div>
        ) : top.length === 0 ? (
          <div style={{ fontSize: 12, color: KT.sub }}>
            {t('leaderboard.empty', { defaultValue: 'No one is ranked yet. Be the first!' })}
          </div>
        ) : (
          top.map(entry => (
            <div
              key={entry.userId}
              style={{
                display: 'grid',
                gridTemplateColumns: '24px 1fr auto',
                alignItems: 'center',
                gap: 8,
                fontSize: 13,
              }}
            >
              <span style={{ fontWeight: 800, color: KT.sub }}>#{entry.rank}</span>
              <span
                style={{
                  color: entry.isMe ? KT.crimson : KT.ink,
                  fontWeight: entry.isMe ? 800 : 700,
                }}
              >
                {entry.name ?? t('common.learner', { defaultValue: 'Learner' })}
              </span>
              <span style={{ color: KT.ink2, fontWeight: 700 }}>{entry.currentWeekXp} XP</span>
            </div>
          ))
        )}
      </div>
      {myRank?.myEntry ? (
        <div
          style={{
            marginTop: 10,
            paddingTop: 10,
            borderTop: `1px solid ${KT.line}`,
            fontSize: 12,
            color: KT.sub,
            fontWeight: 700,
          }}
        >
          {t('leaderboard.meTag', { defaultValue: '(Me)' })} #{myRank.myEntry.rank}
        </div>
      ) : null}
    </section>
  );
}
