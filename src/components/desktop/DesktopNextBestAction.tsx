import { useMemo } from 'react';
import { useQuery } from 'convex/react';
import { useTranslation } from 'react-i18next';
import { RECOMMENDATIONS } from '../../utils/convexRefs';
import { useLocalizedNavigate } from '../../hooks/useLocalizedNavigate';
import { KT } from '../mobile/ksoft/ksoft';

export function DesktopNextBestAction() {
  const { t } = useTranslation();
  const navigate = useLocalizedNavigate();
  const localHour = useMemo(() => new Date().getHours(), []);
  const action = useQuery(RECOMMENDATIONS.getNextBestAction, { localHour });

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
        {t('dashboard.recommendation.title', { defaultValue: 'Next best action' })}
      </p>
      {action === undefined ? (
        <div style={{ marginTop: 10, fontSize: 12, color: KT.sub }}>
          {t('common.loading', { defaultValue: 'Loading…' })}
        </div>
      ) : action === null ? (
        <div style={{ marginTop: 10, fontSize: 12, color: KT.sub }}>
          {t('dashboard.recommendation.empty', { defaultValue: 'No recommendation right now.' })}
        </div>
      ) : (
        <div style={{ marginTop: 10 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: KT.ink }}>{action.kind}</div>
          <div style={{ fontSize: 12, color: KT.sub, marginTop: 3 }}>{action.reasonCode}</div>
          <button
            type="button"
            onClick={() => navigate(action.path)}
            style={{
              marginTop: 10,
              border: `1px solid ${KT.line}`,
              background: KT.bg2,
              color: KT.ink,
              borderRadius: 10,
              padding: '7px 12px',
              fontSize: 12,
              fontWeight: 800,
              cursor: 'pointer',
            }}
          >
            {t('dashboard.recommendation.open', { defaultValue: 'Open' })}
          </button>
        </div>
      )}
    </section>
  );
}
