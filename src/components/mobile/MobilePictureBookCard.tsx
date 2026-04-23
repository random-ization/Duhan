import React, { useState } from 'react';
import { BookOpen } from 'lucide-react';
import { motion } from 'framer-motion';
import { normalizePublicAssetUrl } from '../../utils/imageSrc';
import { KT } from './ksoft/ksoft';

interface MobilePictureBookCardProps {
  readonly title: string;
  readonly author?: string;
  readonly coverUrl?: string;
  readonly level: string;
  readonly onClick: () => void;
  readonly ariaLabel?: string;
}

export const MobilePictureBookCard: React.FC<MobilePictureBookCardProps> = ({
  title,
  author,
  coverUrl,
  level,
  onClick,
  ariaLabel,
}) => {
  const normalizedCoverUrl = normalizePublicAssetUrl(coverUrl) || '';
  const [failedCoverUrl, setFailedCoverUrl] = useState<string | null>(null);
  const showCoverImage = Boolean(normalizedCoverUrl) && failedCoverUrl !== normalizedCoverUrl;

  return (
    <motion.button
      whileTap={{ scale: 0.96 }}
      onClick={onClick}
      aria-label={ariaLabel || title}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        minWidth: 150,
        maxWidth: 150,
        textAlign: 'left',
        cursor: 'pointer',
        border: 'none',
        background: 'none',
        padding: 0,
        fontFamily: KT.font,
      }}
    >
      {/* Cover */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          aspectRatio: '10/13',
          borderRadius: 22,
          overflow: 'hidden',
          border: `1px solid ${KT.line}`,
          background: KT.bg2,
          boxShadow: KT.sh,
        }}
      >
        {showCoverImage ? (
          <img
            src={normalizedCoverUrl}
            alt={title}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            onError={() => setFailedCoverUrl(normalizedCoverUrl)}
          />
        ) : (
          <div
            style={{
              width: '100%',
              height: '100%',
              background: `linear-gradient(135deg, ${KT.sky}50, ${KT.lilac}50)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <BookOpen size={36} style={{ color: KT.skyDeep, opacity: 0.5 }} />
          </div>
        )}

        {/* Level badge */}
        <div
          style={{
            position: 'absolute',
            top: 10,
            left: 10,
            padding: '3px 8px',
            background: `${KT.card}f0`,
            backdropFilter: 'blur(8px)',
            borderRadius: 8,
            border: `1px solid ${KT.line}`,
            fontSize: 10,
            fontWeight: 700,
            color: KT.crimson,
            letterSpacing: 1,
            textTransform: 'uppercase',
          }}
        >
          {level}
        </div>
      </div>

      {/* Info */}
      <div style={{ paddingLeft: 2 }}>
        <h4
          style={{
            fontSize: 13,
            fontWeight: 800,
            color: KT.ink,
            lineHeight: 1.3,
            letterSpacing: -0.2,
            marginBottom: 3,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {title}
        </h4>
        {author && (
          <p
            style={{
              fontSize: 10,
              fontWeight: 600,
              color: KT.subLight,
              letterSpacing: 0.5,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {author}
          </p>
        )}
      </div>
    </motion.button>
  );
};
