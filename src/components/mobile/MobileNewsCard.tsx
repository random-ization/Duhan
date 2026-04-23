import React from 'react';
import { ChevronRight, Globe, Zap } from 'lucide-react';
import { motion } from 'framer-motion';
import { KT } from './ksoft/ksoft';

interface MobileNewsCardProps {
  readonly title: string;
  readonly source: string;
  readonly summary?: string;
  readonly difficulty: 'L1' | 'L2' | 'L3';
  readonly wordCount: number;
  readonly dateLabel: string;
  readonly onClick: () => void;
  readonly ariaLabel?: string;
}

const DIFFICULTY_COLORS: Record<string, { bg: string; color: string; border: string }> = {
  L1: { bg: `${KT.mint}80`, color: KT.mintDeep, border: `${KT.mintDeep}30` },
  L2: { bg: `${KT.sky}80`, color: KT.skyDeep, border: `${KT.skyDeep}30` },
  L3: { bg: `${KT.lilac}80`, color: KT.lilacDeep, border: `${KT.lilacDeep}30` },
};

const DIFFICULTY_LABELS: Record<string, string> = {
  L1: 'Beginner',
  L2: 'Intermediate',
  L3: 'Advanced',
};

export const MobileNewsCard: React.FC<MobileNewsCardProps> = ({
  title,
  source,
  summary,
  difficulty,
  wordCount,
  dateLabel,
  onClick,
  ariaLabel,
}) => {
  const diff = DIFFICULTY_COLORS[difficulty] ?? DIFFICULTY_COLORS.L3;

  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      aria-label={ariaLabel || title}
      style={{
        width: '100%',
        background: KT.card,
        borderRadius: 24,
        padding: '18px 20px',
        border: `1px solid ${KT.line}`,
        boxShadow: KT.shSm,
        textAlign: 'left',
        cursor: 'pointer',
        fontFamily: KT.font,
      }}
    >
      {/* Top row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          marginBottom: 14,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 11,
              background: KT.bg2,
              border: `1px solid ${KT.line}`,
              display: 'grid',
              placeItems: 'center',
              color: KT.sub,
            }}
          >
            <Globe size={16} />
          </div>
          <div>
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: KT.sub,
                letterSpacing: 1.5,
                textTransform: 'uppercase',
              }}
            >
              {source}
            </div>
            <div
              style={{
                fontSize: 10,
                fontWeight: 600,
                color: KT.subLight,
                marginTop: 1,
              }}
            >
              {dateLabel}
            </div>
          </div>
        </div>

        <div
          style={{
            padding: '4px 10px',
            borderRadius: 10,
            border: `1px solid ${diff.border}`,
            background: diff.bg,
            fontSize: 10,
            fontWeight: 700,
            color: diff.color,
            letterSpacing: 1,
            textTransform: 'uppercase',
          }}
        >
          {DIFFICULTY_LABELS[difficulty] ?? difficulty}
        </div>
      </div>

      {/* Title */}
      <h3
        style={{
          fontSize: 16,
          fontWeight: 800,
          color: KT.ink,
          lineHeight: 1.3,
          letterSpacing: -0.3,
          marginBottom: summary ? 8 : 16,
        }}
      >
        {title}
      </h3>

      {summary && (
        <p
          style={{
            fontSize: 12,
            color: KT.sub,
            fontWeight: 500,
            lineHeight: 1.5,
            marginBottom: 16,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {summary}
        </p>
      )}

      {/* Footer */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderTop: `1px solid ${KT.line}`,
          paddingTop: 12,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 10,
            fontWeight: 700,
            color: KT.subLight,
            letterSpacing: 0.5,
          }}
        >
          <Zap size={12} style={{ color: KT.butterDeep, fill: KT.butterDeep }} />
          <span>{wordCount} words</span>
        </div>

        <div
          style={{
            width: 30,
            height: 30,
            borderRadius: '50%',
            background: KT.ink,
            display: 'grid',
            placeItems: 'center',
            color: KT.bg,
          }}
        >
          <ChevronRight size={15} />
        </div>
      </div>
    </motion.button>
  );
};
