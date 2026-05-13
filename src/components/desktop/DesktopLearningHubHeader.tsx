import React from 'react';
import { useTranslation } from 'react-i18next';
import { HanjaSeal } from './ui/HanjaSeal';
import { useAuth } from '../../contexts/AuthContext';

interface DesktopLearningHubHeaderProps {
  title?: string;
  subtitle?: string;
  dateStr?: string;
  hanja?: string;
}

export const DesktopLearningHubHeader: React.FC<DesktopLearningHubHeaderProps> = ({
  title,
  subtitle,
  dateStr,
  hanja = '學',
}) => {
  const { t } = useTranslation();
  const { user } = useAuth();

  const finalTitle = title || t('coursesLibrary.title', { defaultValue: 'Study Hub' });
  const finalSubtitle = subtitle || t('learnHub.subtitle', { defaultValue: 'Systematically master Korean' });

  return (
    <div className="flex items-end gap-6 mb-10">
      <div className="flex-1">
        <div className="flex items-center gap-3 mb-2">
          <HanjaSeal c={hanja} size={42} bg="var(--color-k-crimson)" round={10} />
          <div>
            <div className="font-k-serif text-[12px] tracking-[4px] text-k-crimson font-medium uppercase leading-none mb-1">
              {hanja} · STUDY
            </div>
            <h1 className="text-4xl font-extrabold text-k-ink tracking-tight leading-none">
              {finalTitle}
            </h1>
          </div>
        </div>
        <p className="text-[15px] font-medium text-k-sub mt-2 opacity-80">
          {finalSubtitle}
        </p>
      </div>
      
      {dateStr && (
        <div className="hidden lg:block text-right">
          <div className="font-k-serif text-[13px] tracking-[3px] text-k-crimson mb-1 uppercase">
            {dateStr}
          </div>
          <div className="text-[13px] font-bold text-k-ink opacity-60 uppercase tracking-widest">
            {t('dashboard.desktop.welcomeBack', { name: user?.name?.split(' ')[0] || 'Learner' })}
          </div>
        </div>
      )}
    </div>
  );
};
