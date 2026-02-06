import React from 'react';
import { Menu } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useApp } from '../../contexts/AppContext';
import { Button } from '../ui/button';

export function MobileHeader() {
  const { toggleMobileMenu } = useApp();
  const { t } = useTranslation();

  return (
    <div className="md:hidden sticky top-0 z-30 px-4 pt-[calc(env(safe-area-inset-top)+14px)] pb-2 bg-gradient-to-b from-background/95 via-background/85 to-background/0 backdrop-blur-md">
      <div className="flex items-center justify-between gap-2">
        <Button
          type="button"
          variant="outline"
          size="auto"
          onClick={toggleMobileMenu}
          className="w-11 h-11 rounded-[14px] border-2 border-slate-900 bg-white shadow-pop-sm grid place-items-center select-none active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition"
          aria-label={t('common.menu', 'Menu')}
        >
          <Menu size={20} />
        </Button>

        <div className="flex-1 min-w-0 flex items-center justify-center gap-2">
          <img
            src="/logo.png"
            alt={t('common.alt.logo')}
            className="w-9 h-9 rounded-xl border-2 border-slate-900 bg-white shadow-pop-sm object-contain"
          />
          <div className="font-black text-lg text-slate-900 tracking-tight truncate">
            {t('common.appName', 'DuHan')}
          </div>
        </div>

        <div className="w-11" />
      </div>
    </div>
  );
}
