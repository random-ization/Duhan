import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { MobileAchievementsPanel } from '../components/mobile/MobileAchievementsPanel';
import { PageShell, KT } from '../components/mobile/ksoft/ksoft';
import { useLocalizedNavigate } from '../hooks/useLocalizedNavigate';

const AchievementsPage: React.FC = () => {
  const navigate = useLocalizedNavigate();
  const { t } = useTranslation();

  return (
    <PageShell>
      <div style={{ padding: '16px 18px 32px' }}>
        <button
          type="button"
          onClick={() => navigate('/profile')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            minHeight: 40,
            padding: '8px 10px',
            border: 'none',
            background: 'transparent',
            color: KT.sub,
            fontFamily: KT.font,
            fontSize: 13,
            fontWeight: 800,
            cursor: 'pointer',
            marginBottom: 6,
          }}
        >
          <ArrowLeft size={17} />
          {t('common.back', { defaultValue: 'Back' })}
        </button>
        <MobileAchievementsPanel />
      </div>
    </PageShell>
  );
};

export default AchievementsPage;
