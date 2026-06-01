import React, { useMemo, useState } from 'react';
import { useQuery } from 'convex/react';
import { useTranslation } from 'react-i18next';
import { Crown, Trophy, Medal } from 'lucide-react';
import { LEADERBOARD } from '../../utils/convexRefs';
import { KT } from './ksoft/ksoft';

const RankIcon: React.FC<{ rank: number }> = ({ rank }) => {
  if (rank === 1) return <Crown size={16} style={{ color: '#D4AF37' }} />;
  if (rank === 2) return <Trophy size={16} style={{ color: '#B8B8B8' }} />;
  if (rank === 3) return <Medal size={16} style={{ color: '#CD7F32' }} />;
  return (
    <span
      style={{
        fontSize: 12,
        fontWeight: 800,
        color: KT.sub,
        fontFamily: KT.font,
        minWidth: 18,
        textAlign: 'center',
      }}
    >
      {rank}
    </span>
  );
};

export default function MobileLeaderboardPage() {
  const { t } = useTranslation('public');
  // One combined query instead of three — same data, ~1/3 the server work.
  const snapshot = useQuery(LEADERBOARD.getSnapshot, { topLimit: 50 });

  const [now] = useState(() => Date.now());

  const countdownLabel = useMemo(() => {
    const weekEndsAt = snapshot?.weekEndsAt;
    if (!weekEndsAt) return '';
    const remaining = Math.max(0, Math.floor((weekEndsAt - now) / 1000));
    const days = Math.floor(remaining / 86400);
    const hours = Math.floor((remaining % 86400) / 3600);
    return t('leaderboard.desktop.weekLeft', {
      days,
      hours,
      defaultValue: `${days}d ${hours}h left`,
    });
  }, [snapshot?.weekEndsAt, now, t]);

  const promotionCutoff = snapshot?.promotionCutoffRank ?? 10;
  const weeklyTop = snapshot?.top ?? [];
  const myEntry = snapshot?.myEntry ?? null;
  const isLoading = snapshot === undefined;

  if (isLoading) {
    return (
      <div
        style={{
          padding: 24,
          textAlign: 'center',
          color: KT.sub,
          fontFamily: KT.font,
        }}
      >
        {t('common.loading', { defaultValue: 'Loading...' })}
      </div>
    );
  }

  return (
    <div
      style={{
        padding: '16px 16px 80px',
        fontFamily: KT.font,
        background: KT.bg,
        minHeight: '100vh',
      }}
    >
      {/* League header */}
      <div
        style={{
          borderRadius: 18,
          padding: '14px 16px',
          background:
            'linear-gradient(135deg, rgba(212,175,55,0.18) 0%, rgba(255,236,189,0.5) 100%)',
          border: `1px solid ${KT.line}`,
          marginBottom: 12,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 6,
          }}
        >
          <div style={{ fontSize: 16, fontWeight: 900, color: KT.ink }}>
            {t('leaderboard.desktop.leagueNames.gold', { defaultValue: 'Gold League' })}
          </div>
          <div style={{ fontSize: 11, fontWeight: 700, color: KT.sub }}>{countdownLabel}</div>
        </div>
        <div style={{ fontSize: 12, fontWeight: 700, color: KT.sub }}>
          {t('leaderboard.desktop.promotionCutoff', {
            count: promotionCutoff,
            defaultValue: `Top ${promotionCutoff} promote`,
          })}
        </div>
      </div>

      {/* My rank summary */}
      {myEntry && (
        <div
          style={{
            borderRadius: 16,
            padding: '12px 14px',
            background: KT.card,
            border: `1px solid ${KT.line}`,
            marginBottom: 14,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, color: KT.sub, marginBottom: 2 }}>
              {t('leaderboard.desktop.myRank', { defaultValue: 'My rank' })}
            </div>
            <div style={{ fontSize: 18, fontWeight: 900, color: KT.ink }}>#{myEntry.rank}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: KT.sub, marginBottom: 2 }}>XP</div>
            <div style={{ fontSize: 18, fontWeight: 900, color: KT.crimson }}>
              {myEntry.currentWeekXp}
            </div>
          </div>
        </div>
      )}

      {/* Ranks list */}
      <div
        style={{
          borderRadius: 16,
          background: KT.card,
          border: `1px solid ${KT.line}`,
          overflow: 'hidden',
        }}
      >
        {weeklyTop.length === 0 ? (
          <div
            style={{
              padding: 24,
              textAlign: 'center',
              color: KT.sub,
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            {t('leaderboard.desktop.fetchingData', { defaultValue: 'No data yet this week.' })}
          </div>
        ) : (
          weeklyTop.map(entry => {
            const isPromotionZone = entry.rank <= promotionCutoff;
            return (
              <div
                key={entry.userId}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '10px 14px',
                  borderBottom: `1px solid ${KT.line}`,
                  background: entry.isMe ? 'rgba(162,59,46,0.06)' : 'transparent',
                }}
              >
                <div style={{ width: 26, display: 'flex', justifyContent: 'center' }}>
                  <RankIcon rank={entry.rank} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 800,
                      color: entry.isMe ? KT.crimson : KT.ink,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {entry.name ?? t('leaderboard.anonymous', { defaultValue: 'Learner' })}
                  </div>
                  {isPromotionZone && (
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#0F8B5E' }}>
                      {t('leaderboard.desktop.promote', { defaultValue: 'Promotion zone' })}
                    </div>
                  )}
                </div>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 900,
                    color: entry.isMe ? KT.crimson : KT.ink,
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {entry.currentWeekXp} XP
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
