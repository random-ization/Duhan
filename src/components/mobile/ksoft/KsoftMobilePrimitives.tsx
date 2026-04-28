import React from 'react';
import { ArrowLeft, ChevronRight } from 'lucide-react';
import { Card, HanjaSeal, KT } from './ksoft';

type HeaderAction = {
  label: string;
  onClick: () => void;
  ariaLabel?: string;
};

export function KsoftImmersiveHeader({
  eyebrow,
  title,
  subtitle,
  seal,
  onBack,
  action,
}: Readonly<{
  eyebrow: string;
  title: string;
  subtitle?: string;
  seal?: string;
  onBack?: () => void;
  action?: HeaderAction;
}>) {
  return (
    <header style={{ padding: '18px 20px 12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            aria-label="Back"
            style={{
              width: 44,
              height: 44,
              borderRadius: 16,
              border: `1px solid ${KT.line}`,
              background: KT.card,
              boxShadow: KT.shSm,
              display: 'grid',
              placeItems: 'center',
              color: KT.ink,
            }}
          >
            <ArrowLeft size={22} strokeWidth={2.4} />
          </button>
        ) : (
          <div style={{ width: 44 }} />
        )}
        {action ? (
          <button
            type="button"
            onClick={action.onClick}
            aria-label={action.ariaLabel || action.label}
            style={{
              minHeight: 40,
              borderRadius: 999,
              border: `1px solid ${KT.line}`,
              background: KT.card,
              boxShadow: KT.shSm,
              padding: '0 14px',
              color: KT.ink,
              fontSize: 12,
              fontWeight: 800,
              fontFamily: KT.font,
            }}
          >
            {action.label}
          </button>
        ) : seal ? (
          <HanjaSeal c={seal} size={44} bg={KT.crimson} />
        ) : (
          <div style={{ width: 44 }} />
        )}
      </div>
      <div style={{ marginTop: 22 }}>
        <div
          style={{
            fontFamily: KT.serif,
            fontSize: 13,
            letterSpacing: 3.6,
            color: KT.crimson,
            fontWeight: 600,
          }}
        >
          {eyebrow}
        </div>
        <h1
          style={{
            margin: '8px 0 0',
            fontSize: 42,
            lineHeight: 1.02,
            fontWeight: 900,
            color: KT.ink,
          }}
        >
          {title}
        </h1>
        {subtitle ? (
          <p
            style={{
              margin: '10px 0 0',
              fontSize: 15,
              lineHeight: 1.55,
              fontWeight: 700,
              color: KT.sub,
            }}
          >
            {subtitle}
          </p>
        ) : null}
      </div>
    </header>
  );
}

export function KsoftEmptyState({
  title,
  description,
  actionLabel,
  onAction,
}: Readonly<{
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}>) {
  return (
    <Card pad={22} tone="bg2" style={{ border: `1px dashed ${KT.line2}`, boxShadow: 'none' }}>
      <div style={{ display: 'grid', gap: 8 }}>
        <div style={{ fontSize: 18, fontWeight: 900, color: KT.ink }}>{title}</div>
        {description ? (
          <div style={{ fontSize: 13, lineHeight: 1.55, fontWeight: 700, color: KT.sub }}>
            {description}
          </div>
        ) : null}
        {actionLabel && onAction ? (
          <button
            type="button"
            onClick={onAction}
            style={{
              justifySelf: 'start',
              marginTop: 8,
              borderRadius: 999,
              border: `1px solid ${KT.line2}`,
              background: KT.card,
              padding: '9px 14px',
              color: KT.crimson,
              fontSize: 12,
              fontWeight: 900,
              fontFamily: KT.font,
            }}
          >
            {actionLabel}
          </button>
        ) : null}
      </div>
    </Card>
  );
}

export function KsoftListRow({
  seal,
  title,
  subtitle,
  meta,
  onClick,
}: Readonly<{
  seal?: string;
  title: string;
  subtitle?: string;
  meta?: string;
  onClick?: () => void;
}>) {
  const content = (
    <>
      {seal ? <HanjaSeal c={seal} size={42} bg={KT.bg2} color={KT.crimson} /> : null}
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ color: KT.ink, fontSize: 15, fontWeight: 900, lineHeight: 1.25 }}>
          {title}
        </div>
        {subtitle ? (
          <div
            style={{
              marginTop: 4,
              color: KT.sub,
              fontSize: 12,
              fontWeight: 700,
              lineHeight: 1.35,
              overflow: 'hidden',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
            }}
          >
            {subtitle}
          </div>
        ) : null}
      </div>
      {meta ? (
        <div style={{ color: KT.sub, fontSize: 12, fontWeight: 800, whiteSpace: 'nowrap' }}>
          {meta}
        </div>
      ) : null}
      {onClick ? <ChevronRight size={17} color={KT.subLight} /> : null}
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          border: `1px solid ${KT.line}`,
          background: KT.card,
          borderRadius: 18,
          boxShadow: KT.shSm,
          padding: 12,
          textAlign: 'left',
          fontFamily: KT.font,
        }}
      >
        {content}
      </button>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        border: `1px solid ${KT.line}`,
        background: KT.card,
        borderRadius: 18,
        boxShadow: KT.shSm,
        padding: 12,
        fontFamily: KT.font,
      }}
    >
      {content}
    </div>
  );
}

export function KsoftBottomActionBar({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 'var(--mobile-nav-height, 0px)',
        zIndex: 30,
        padding: '10px 16px calc(env(safe-area-inset-bottom) + 10px)',
        background: 'rgba(251,248,243,0.88)',
        borderTop: `1px solid ${KT.line}`,
        backdropFilter: 'blur(18px)',
      }}
    >
      {children}
    </div>
  );
}
