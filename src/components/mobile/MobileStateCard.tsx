import React from 'react';
import { KT } from './ksoft/ksoft';

interface MobileStateCardProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function MobileStateCard({
  icon,
  title,
  description,
  action,
}: Readonly<MobileStateCardProps>) {
  return (
    <div
      style={{
        borderRadius: 28,
        border: `1.5px dashed ${KT.line2}`,
        background: KT.card,
        padding: '56px 24px',
        textAlign: 'center',
        boxShadow: KT.shSm,
        fontFamily: KT.font,
      }}
    >
      {icon && (
        <div
          style={{
            margin: '0 auto 16px',
            width: 60,
            height: 60,
            borderRadius: 18,
            background: KT.bg2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: KT.subLight,
          }}
        >
          {icon}
        </div>
      )}
      <p
        style={{
          fontSize: 15,
          fontWeight: 800,
          color: KT.ink,
          marginTop: icon ? 0 : 0,
        }}
      >
        {title}
      </p>
      {description && (
        <p
          style={{
            marginTop: 8,
            fontSize: 13,
            fontWeight: 500,
            color: KT.sub,
            lineHeight: 1.6,
          }}
        >
          {description}
        </p>
      )}
      {action && (
        <div
          style={{
            marginTop: 20,
            display: 'flex',
            justifyContent: 'center',
          }}
        >
          {action}
        </div>
      )}
    </div>
  );
}
