import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Globe, Check } from 'lucide-react';
import { isValidLanguage } from '../LanguageRouter';

export const LanguageSwitcher = () => {
  const { i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const languages = [
    { code: 'en', label: 'English' },
    { code: 'zh', label: '中文' },
    { code: 'vi', label: 'Tiếng Việt' },
    { code: 'mn', label: 'Монгол' },
  ];

  const firstSegment = location.pathname.split('/').find(Boolean);
  const activeLang =
    firstSegment && isValidLanguage(firstSegment) ? firstSegment : i18n.language;
  const currentLang = languages.find(l => l.code === activeLang) || languages[0];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Language"
        className="inline-flex items-center justify-center w-10 h-10 bg-white border-2 border-black rounded-xl shadow-pop hover:shadow-pop-hover hover:-translate-y-0.5 transition-all text-slate-900"
      >
        <Globe size={18} />
        <span className="sr-only">{currentLang.label}</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-48 bg-white border-2 border-black rounded-xl shadow-pop-card z-50 overflow-hidden">
          {languages.map(lang => (
            <button
              key={lang.code}
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
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-indigo-50 transition-colors text-left font-bold text-sm border-b border-slate-100 last:border-0 text-slate-900"
            >
              <span>{lang.label}</span>
              {i18n.language === lang.code && <Check size={16} className="text-indigo-600" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
