import React from 'react';
export { KT, CHIP_TONES, type ChipTone } from '../../../theme/ksoftTokens';
import { CHIP_TONES, KT, type ChipTone } from '../../../theme/ksoftTokens';

export const Chip: React.FC<{
  children: React.ReactNode;
  tone?: ChipTone;
  size?: 'sm' | 'md';
}> = ({ children, tone = 'muted', size = 'sm' }) => {
  const tc = CHIP_TONES[tone];
  const s = size === 'sm' ? { p: '4px 10px', fs: 10 } : { p: '6px 13px', fs: 11 };
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: s.p,
        background: tc.bg,
        color: tc.fg,
        borderRadius: 999,
        fontSize: s.fs,
        fontWeight: 700,
        letterSpacing: 0.4,
        fontFamily: KT.font,
        lineHeight: 1.2,
      }}
    >
      {children}
    </span>
  );
};

export const HanjaSeal: React.FC<{
  c: string;
  size?: number;
  bg?: string;
  color?: string;
  round?: number;
}> = ({ c, size = 40, bg, color, round = 8 }) => (
  <div
    style={{
      width: size,
      height: size,
      background: bg || KT.crimson,
      color: color || KT.card,
      fontFamily: KT.serif,
      fontSize: size * 0.5,
      fontWeight: 500,
      display: 'grid',
      placeItems: 'center',
      borderRadius: round,
      boxShadow: `inset 0 0 0 ${Math.max(1, size / 20)}px rgba(255,255,255,0.15)`,
      letterSpacing: -1,
      lineHeight: 1,
      flexShrink: 0,
    }}
  >
    {c}
  </div>
);

export const SectionHead: React.FC<{
  kanji?: string;
  title: string;
  action?: string;
  onAction?: () => void;
}> = ({ kanji, title, action, onAction }) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'baseline',
      justifyContent: 'space-between',
      padding: '0 4px',
      marginBottom: 12,
    }}
  >
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
      {kanji && (
        <span
          style={{
            fontFamily: KT.serif,
            fontSize: 16,
            fontWeight: 500,
            color: KT.crimson,
            opacity: 0.85,
          }}
        >
          {kanji}
        </span>
      )}
      <span
        style={{
          fontSize: 13,
          fontWeight: 800,
          letterSpacing: 0.4,
          color: KT.ink,
        }}
      >
        {title}
      </span>
    </div>
    {action && (
      <button
        type="button"
        onClick={onAction}
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: KT.sub,
          background: 'transparent',
          border: 'none',
          padding: 0,
          cursor: 'pointer',
          fontFamily: KT.font,
        }}
      >
        {action} →
      </button>
    )}
  </div>
);

export const Card: React.FC<{
  children: React.ReactNode;
  pad?: number;
  tone?: 'card' | 'bg2' | string;
  style?: React.CSSProperties;
}> = ({ children, pad = 20, tone = 'card', style }) => {
  const bg = tone === 'card' ? KT.card : tone === 'bg2' ? KT.bg2 : tone;
  return (
    <div
      style={{
        background: bg,
        borderRadius: 28,
        boxShadow: KT.sh,
        padding: pad,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

export const StreakRow: React.FC<{ done: number; labels?: string[] }> = ({ done, labels }) => {
  const days = labels || ['월', '화', '수', '목', '금', '토', '일'];
  return (
    <div style={{ display: 'flex', gap: 6 }}>
      {days.map((d, i) => (
        <div
          key={i}
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <div
            style={{
              width: '100%',
              aspectRatio: '1/1',
              borderRadius: 12,
              background: i < done ? KT.mint : 'rgba(31,27,23,0.05)',
              display: 'grid',
              placeItems: 'center',
              fontSize: 13,
              fontWeight: 700,
              color: i < done ? '#2F5847' : KT.sub,
              position: 'relative',
            }}
          >
            {i < done ? '✓' : ''}
            {i === done - 1 && (
              <div
                style={{
                  position: 'absolute',
                  top: -4,
                  right: -4,
                  fontSize: 12,
                }}
              >
                🔥
              </div>
            )}
          </div>
          <div
            style={{
              fontSize: 10,
              color: KT.sub,
              fontWeight: 600,
              fontFamily: KT.font,
            }}
          >
            {d}
          </div>
        </div>
      ))}
    </div>
  );
};

export const PageShell: React.FC<{
  children: React.ReactNode;
  bg?: string;
}> = ({ children, bg }) => (
  <div
    className="min-h-[100dvh] pb-mobile-nav"
    style={{
      background: bg || `radial-gradient(ellipse at 20% 0%, ${KT.bg2} 0%, ${KT.bg} 60%)`,
      color: KT.ink,
      fontFamily: KT.font,
      WebkitFontSmoothing: 'antialiased',
    }}
  >
    {children}
  </div>
);

export const PageIntro: React.FC<{
  hanja: string;
  latin: string;
  title: string;
  subtitle: string;
}> = ({ hanja, latin, title, subtitle }) => (
  <div style={{ padding: '14px 22px 20px', paddingTop: 'calc(env(safe-area-inset-top) + 14px)' }}>
    <div
      style={{
        fontFamily: KT.serif,
        fontSize: 13,
        color: KT.crimson,
        letterSpacing: 4,
        marginBottom: 4,
        fontWeight: 500,
      }}
    >
      {hanja} · {latin}
    </div>
    <div
      style={{
        fontSize: 30,
        fontWeight: 800,
        color: KT.ink,
        letterSpacing: -0.8,
      }}
    >
      {title}
    </div>
    <div style={{ fontSize: 13, color: KT.sub, marginTop: 4 }}>{subtitle}</div>
  </div>
);
