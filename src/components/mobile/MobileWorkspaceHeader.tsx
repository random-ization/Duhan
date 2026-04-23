import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { KT } from './ksoft/ksoft';

interface MobileWorkspaceHeaderProps {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  onBack: () => void;
  backLabel: string;
  actions?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

export function MobileWorkspaceHeader({
  title,
  subtitle,
  eyebrow,
  onBack,
  backLabel,
  actions,
  children,
}: Readonly<MobileWorkspaceHeaderProps>) {
  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 30,
        borderBottom: `1px solid ${KT.line}`,
        background: KT.bg,
        padding: '0 18px 20px',
        paddingTop: 'calc(var(--mobile-safe-top, env(safe-area-inset-top)) + 12px)',
        boxShadow: KT.shSm,
        fontFamily: KT.font,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 14,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, minWidth: 0 }}>
          {/* Back button */}
          <button
            type="button"
            onClick={onBack}
            aria-label={backLabel}
            style={{
              width: 44,
              height: 44,
              borderRadius: 14,
              border: `1px solid ${KT.line}`,
              background: KT.card,
              color: KT.ink,
              display: 'grid',
              placeItems: 'center',
              cursor: 'pointer',
              flexShrink: 0,
              marginTop: 2,
              boxShadow: KT.shSm,
            }}
          >
            <ArrowLeft size={18} />
          </button>

          {/* Text */}
          <div style={{ minWidth: 0, paddingTop: 2 }}>
            {eyebrow && (
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: KT.crimson,
                  letterSpacing: 3,
                  textTransform: 'uppercase',
                  fontFamily: KT.serif,
                  marginBottom: 4,
                }}
              >
                {eyebrow}
              </div>
            )}
            <h1
              style={{
                fontSize: 22,
                fontWeight: 800,
                color: KT.ink,
                letterSpacing: -0.5,
                lineHeight: 1.2,
                marginTop: eyebrow ? 0 : 4,
              }}
            >
              {title}
            </h1>
            {subtitle && (
              <p
                style={{
                  marginTop: 6,
                  fontSize: 12,
                  fontWeight: 500,
                  color: KT.sub,
                  lineHeight: 1.5,
                }}
              >
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {actions && (
          <div
            style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, paddingTop: 4 }}
          >
            {actions}
          </div>
        )}
      </div>

      {children && <div style={{ marginTop: 18 }}>{children}</div>}
    </header>
  );
}
