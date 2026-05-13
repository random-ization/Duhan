import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { MobileAchievementsPanel } from '../components/mobile/MobileAchievementsPanel';
import { PageShell, KT } from '../components/mobile/ksoft/ksoft';
import { useLocalizedNavigate } from '../hooks/useLocalizedNavigate';
import { useIsMobile } from '../hooks/useIsMobile';

const AchievementsPage: React.FC = () => {
  const navigate = useLocalizedNavigate();
  const { t } = useTranslation();
  const isMobile = useIsMobile();

  if (!isMobile) {
    return (
      <div className="p-6">
        <div className="mb-4 text-[12px] font-bold text-k-sub uppercase tracking-wider">
          ACHIEVEMENTS · 成就与徽章
        </div>
        <div className="rounded-[28px] bg-k-card p-8 shadow-k-sh-sm border border-k-line">
          <MobileAchievementsPanel />
        </div>
      </div>
    );
  }

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
