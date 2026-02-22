import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Globe, Check } from 'lucide-react';
import { isValidLanguage } from '../LanguageRouter';
import { Button } from '../ui';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '../ui';

export const LanguageSwitcher = () => {
  const { i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const menuId = 'language-switcher-menu';

  const languages = [
    { code: 'en', label: 'English' },
    { code: 'zh', label: 'Chinese' },
    { code: 'vi', label: 'Tiếng Việt' },
    { code: 'mn', label: 'Монгол' },
  ];

  const firstSegment = location.pathname.split('/').find(Boolean);
  const activeLang = firstSegment && isValidLanguage(firstSegment) ? firstSegment : i18n.language;
  const normalizedActiveLang = (activeLang || 'en').split('-')[0];
  const currentLang = languages.find(l => l.code === normalizedActiveLang) || languages[0];

  return (
    <div className="relative">
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="auto"
            aria-label="Language"
            aria-haspopup="menu"
            aria-expanded={isOpen}
            aria-controls={menuId}
            title={currentLang.label}
            className="inline-flex items-center justify-center w-10 h-10 bg-card border-2 border-foreground rounded-xl shadow-pop hover:shadow-pop-hover hover:-translate-y-0.5 transition-all text-foreground"
          >
            <Globe size={18} />
            <span className="sr-only">{currentLang.label}</span>
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          id={menuId}
          unstyled
          className="absolute right-0 top-full mt-2 w-48 bg-card border-2 border-foreground rounded-xl shadow-pop-card z-50 overflow-hidden"
        >
          {languages.map(lang => (
            <Button
              key={lang.code}
              type="button"
              variant="ghost"
              size="auto"
              onClick={() => {
                const nextLang = lang.code;
                const segments = location.pathname.split('/').filter(Boolean);
                if (segments[0] && isValidLanguage(segments[0])) {
                  segments[0] = nextLang;
                } else {
                  segments.unshift(nextLang);
                }
                const nextPath = `/${segments.join('/')}${location.search}${location.hash}`;
                localStorage.setItem('preferredLanguage', nextLang);
                localStorage.setItem('preferredLanguageSource', 'user');
                i18n.changeLanguage(nextLang);
                navigate(nextPath);
                setIsOpen(false);
              }}
              aria-pressed={normalizedActiveLang === lang.code}
              title={lang.label}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-indigo-50 transition-colors text-left font-bold text-sm border-b border-border last:border-0 text-foreground"
            >
              <span>{lang.label}</span>
              {normalizedActiveLang === lang.code && (
                <Check size={16} className="text-indigo-600" />
              )}
            </Button>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
