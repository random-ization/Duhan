import React, { useMemo, useState } from 'react';
import { useQuery } from 'convex/react';
import { useTranslation } from 'react-i18next';
import { LEADERBOARD } from '../../utils/convexRefs';
import { DesktopCard } from '../../components/desktop/ui/DesktopCard';
import { HanjaSeal } from '../../components/desktop/ui/HanjaSeal';
import { DesignChip } from '../../components/desktop/ui/DesignChip';
import { DRail } from '../../components/desktop/ui/DRail';

const LEAGUE_COLORS: Record<string, string> = {
  bronze: '#CD7F32',
  silver: '#B8B8B8',
  gold: 'var(--color-k-gold)',
  diamond: '#B9F2FF',
};

export default function DesktopLeaderboardPage() {
  const { t } = useTranslation('public');
  // One combined query — same data, ~1/2 the server work vs the prior two-query setup.
  const snapshot = useQuery(LEADERBOARD.getSnapshot, { topLimit: 30 });

  const leagueTier = snapshot?.leagueTierKey?.toLowerCase() || 'gold';
  const leagueName = t(`leaderboard.desktop.leagueNames.${leagueTier}`, {
    defaultValue: 'Gold League',
  });
  const leagueColor = LEAGUE_COLORS[leagueTier] || LEAGUE_COLORS.gold;
  const leagueSeal = snapshot?.leagueSeal?.trim() || '金';
  const seasonWeek = snapshot?.weekIdentifier.split('-W')[1] || '1';
  const totalSeasonWeeks = 52;

  const promotionCutoff = snapshot?.promotionCutoffRank ?? 10;

  const [now] = useState(() => Date.now());

  const countdownLabel = useMemo(() => {
    const weekEndsAt = snapshot?.weekEndsAt;
    if (!weekEndsAt) return 'Loading...';
    const remaining = Math.max(0, Math.floor((weekEndsAt - now) / 1000));
    const days = Math.floor(remaining / 86400);
    const hours = Math.floor((remaining % 86400) / 3600);
    return t('leaderboard.desktop.weekLeft', { days, hours });
  }, [snapshot?.weekEndsAt, now, t]);

  const myRank = snapshot?.myEntry?.rank ?? null;
  const weeklyTop = snapshot?.top;

  const ranks = useMemo(() => {
    if (!weeklyTop || weeklyTop.length === 0) {
      return [];
    }

    return weeklyTop.map(entry => ({
      r: entry.rank,
      n: entry.name || 'Learner',
      xp: entry.currentWeekXp,
      me: entry.isMe,
    }));
  }, [weeklyTop]);

  // 加载状态
  if (snapshot === undefined) {
    return (
      <div className="flex items-center justify-center p-[80px]">
        <div className="text-center">
          <div className="text-[18px] font-extrabold text-k-ink">
            {t('common.loading', 'Loading...')}
          </div>
          <div className="mt-2 text-[12px] text-k-sub">{t('leaderboard.desktop.fetchingData')}</div>
        </div>
      </div>
    );
  }

  const top3 = ranks.slice(0, 3);
  const rest = ranks.slice(3);

  const content = (
    <div>
      {/* League header */}
      <DesktopCard
        pad={24}
        style={{
          background: `linear-gradient(135deg, ${leagueColor}55 0%, var(--color-k-butter)80 100%)`,
          marginBottom: 20,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            right: -10,
            top: -16,
            fontFamily: 'var(--font-k-serif)',
            fontSize: 130,
            color: 'rgba(31,27,23,0.07)',
            fontWeight: 500,
            lineHeight: 1,
          }}
        >
          {leagueSeal}
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 20 }}>
          <HanjaSeal c={leagueSeal} size={64} bg={leagueColor} round={14} />
          <div style={{ flex: 1 }}>
            <DesignChip tone="ink" size="sm">
              {countdownLabel}
            </DesignChip>
            <div
              style={{
                fontSize: 28,
                fontWeight: 800,
                color: 'var(--color-k-ink)',
                letterSpacing: -0.6,
                marginTop: 8,
              }}
            >
              {leagueName}
            </div>
            <div
              style={{ fontSize: 12, color: 'var(--color-k-ink2)', marginTop: 4, fontWeight: 600 }}
            >
              {t('leaderboard.desktop.promotionCutoff', { count: promotionCutoff })} ·{' '}
              {t('leaderboard.desktop.relegationZone')}
            </div>
          </div>
          {myRank && (
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 11, color: 'var(--color-k-sub)', fontWeight: 800 }}>
                {t('leaderboard.desktop.myRank')}
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-k-serif)',
                  fontSize: 40,
                  fontWeight: 500,
                  color: 'var(--color-k-crimson)',
                  letterSpacing: -1,
                  lineHeight: 1,
                }}
              >
                #{myRank}
              </div>
            </div>
          )}
        </div>
      </DesktopCard>

      {/* Top 3 podium */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1.2fr 1fr',
          gap: 14,
          marginBottom: 22,
          alignItems: 'flex-end',
        }}
      >
        {[top3[1], top3[0], top3[2]].map((p, i) => {
          if (!p) return null;
          const pos = [2, 1, 3][i];
          const h = pos === 1 ? 200 : pos === 2 ? 170 : 150;
          const tone =
            pos === 1
              ? LEAGUE_COLORS.gold
              : pos === 2
                ? LEAGUE_COLORS.silver
                : LEAGUE_COLORS.bronze;
          const emoji = ['🥈', '🥇', '🥉'][i];

          return (
            <div key={pos} style={{ textAlign: 'center' }}>
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 32,
                  background: tone,
                  color: 'var(--color-k-card)',
                  display: 'grid',
                  placeItems: 'center',
                  margin: '0 auto',
                  fontSize: 24,
                  fontFamily: 'var(--font-k-serif)',
                  fontWeight: 500,
                  boxShadow: 'var(--shadow-k-sh)',
                }}
              >
                {emoji}
              </div>
              <div
                style={{ fontSize: 14, fontWeight: 800, color: 'var(--color-k-ink)', marginTop: 8 }}
              >
                {p.n}
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-k-serif)',
                  fontSize: 16,
                  color: 'var(--color-k-crimson)',
                  fontWeight: 500,
                  marginTop: 2,
                }}
              >
                {p.xp.toLocaleString()} XP
              </div>
              <DesktopCard
                pad={0}
                style={{
                  height: h,
                  marginTop: 12,
                  background: `linear-gradient(180deg, ${tone}40 0%, transparent 100%)`,
                  display: 'grid',
                  placeItems: 'center',
                  boxShadow: 'none',
                }}
              >
                <span
                  style={{
                    fontFamily: 'var(--font-k-serif)',
                    fontSize: 80,
                    color: 'var(--color-k-ink)',
                    fontWeight: 500,
                    letterSpacing: -3,
                    opacity: 0.85,
                  }}
                >
                  {pos}
                </span>
              </DesktopCard>
            </div>
          );
        })}
      </div>

      {/* Full table */}

      <DesktopCard pad={0}>
        {rest.map((p, i) => {
          if (!p) return null;
          const isPromotion = p.r <= promotionCutoff;
          return (
            <div
              key={p.r}
              style={{
                padding: '12px 20px',
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                borderBottom: i < rest.length - 1 ? '1px solid var(--color-k-line)' : 'none',
                background: p.me ? 'var(--color-k-butter)40' : 'transparent',
              }}
            >
              <div
                style={{
                  width: 36,
                  fontSize: 13,
                  fontWeight: 800,
                  color: p.me ? 'var(--color-k-crimson)' : 'var(--color-k-sub)',
                  fontFamily: 'var(--font-k-serif)',
                }}
              >
                #{p.r}
              </div>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 12,
                  background: 'var(--color-k-bg2)',
                  display: 'grid',
                  placeItems: 'center',
                  fontSize: 16,
                  fontFamily: 'var(--font-k-serif)',
                  fontWeight: 500,
                  color: 'var(--color-k-ink)',
                }}
              >
                {p.n.charAt(0)}
              </div>
              <div
                style={{
                  flex: 1,
                  fontSize: 13,
                  fontWeight: p.me ? 800 : 700,
                  color: 'var(--color-k-ink)',
                }}
              >
                {p.n}
              </div>
              <DesignChip tone={isPromotion ? 'mint' : 'muted'} size="sm">
                {isPromotion ? t('leaderboard.desktop.promote') : t('leaderboard.desktop.stay')}
              </DesignChip>
              <div
                style={{
                  width: 80,
                  textAlign: 'right',
                  fontFamily: 'var(--font-k-serif)',
                  fontSize: 14,
                  color: 'var(--color-k-crimson)',
                  fontWeight: 500,
                }}
              >
                {p.xp.toLocaleString()}
              </div>
            </div>
          );
        })}
      </DesktopCard>
    </div>
  );

  const right = (
    <div className="w-[320px] shrink-0 pl-[22px]">
      <DRail kanji="季" title={t('leaderboard.desktop.seasonProgress')} pad={14}>
        <div
          style={{ fontSize: 11, color: 'var(--color-k-sub)', fontWeight: 700, marginBottom: 10 }}
        >
          {t('leaderboard.desktop.weekLabel', { count: Number(seasonWeek) })} · {seasonWeek}/
          {totalSeasonWeeks}
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {Array.from({ length: totalSeasonWeeks }).map((_, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                height: 8,
                borderRadius: 4,
                background:
                  i < Number(seasonWeek) ? 'var(--color-k-crimson)' : 'var(--color-k-line2)',
              }}
            />
          ))}
        </div>
      </DRail>

      <DRail kanji="禮" title={t('leaderboard.desktop.rewards')} pad={14}>
        <div
          style={{ fontSize: 12, color: 'var(--color-k-ink2)', fontWeight: 600, lineHeight: 1.6 }}
        >
          <div>🥇 {t('leaderboard.desktop.rewardsList.firstPlace')}</div>
          <div style={{ marginTop: 6 }}>🥈 {t('leaderboard.desktop.rewardsList.topThree')}</div>
          <div style={{ marginTop: 6 }}>
            ⬆ {t('leaderboard.desktop.rewardsList.promotion', { count: promotionCutoff })}
          </div>
        </div>
      </DRail>
    </div>
  );

  return (
    <div className="flex font-sans">
      <div className="flex-1">{content}</div>
      {right}
    </div>
  );
}
