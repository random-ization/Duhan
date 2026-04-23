import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { KT } from './ksoft/ksoft';

interface MobileImmersiveHeaderProps {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  onBack: () => void;
  backLabel: string;
  backIcon?: React.ReactNode;
  status?: React.ReactNode;
  actions?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  tone?: 'default' | 'inverse';
}

export function MobileImmersiveHeader({
  title,
  subtitle,
  eyebrow,
  onBack,
  backLabel,
  backIcon,
  status,
  actions,
  children,
  tone = 'default',
}: Readonly<MobileImmersiveHeaderProps>) {
  const isInverse = tone === 'inverse';

  return (
    <header
      style={{
        flexShrink: 0,
        borderBottom: isInverse ? '1px solid rgba(255,255,255,0.1)' : `1px solid ${KT.line}`,
        background: isInverse ? 'rgba(31,27,23,0.88)' : `${KT.bg}ee`,
        padding: '0 18px 12px',
        paddingTop: 'calc(var(--mobile-safe-top, env(safe-area-inset-top)) + 10px)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        fontFamily: KT.font,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        {/* Back button */}
        <button
          type="button"
          onClick={onBack}
          aria-label={backLabel}
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            border: isInverse ? '1px solid rgba(255,255,255,0.15)' : `1px solid ${KT.line}`,
            background: isInverse ? 'rgba(255,255,255,0.1)' : KT.card,
            color: isInverse ? '#fff' : KT.ink,
            display: 'grid',
            placeItems: 'center',
            cursor: 'pointer',
            flexShrink: 0,
            boxShadow: isInverse ? 'none' : KT.shSm,
          }}
        >
          {backIcon ?? <ArrowLeft size={16} />}
        </button>

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {eyebrow && (
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: 2,
                textTransform: 'uppercase',
                color: isInverse ? 'rgba(255,255,255,0.6)' : KT.sub,
                marginBottom: 2,
              }}
            >
              {eyebrow}
            </div>
          )}

          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: 12,
              marginTop: 4,
            }}
          >
            <div style={{ minWidth: 0 }}>
              <h1
                style={{
                  fontSize: 15,
                  fontWeight: 800,
                  letterSpacing: -0.3,
                  color: isInverse ? '#fff' : KT.ink,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {title}
              </h1>
              {subtitle && (
                <p
                  style={{
                    marginTop: 4,
                    fontSize: 13,
                    fontWeight: 500,
                    lineHeight: 1.4,
                    color: isInverse ? 'rgba(255,255,255,0.7)' : KT.sub,
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}
                >
                  {subtitle}
                </p>
              )}
            </div>

            {status && <div style={{ flexShrink: 0 }}>{status}</div>}
          </div>
        </div>

        {actions && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            {actions}
          </div>
        )}
      </div>

      {children && <div style={{ marginTop: 14 }}>{children}</div>}
    </header>
  );
}
