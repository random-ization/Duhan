import React, { useState, useRef, useEffect } from 'react';
import { Globe, Check } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { getLanguageLabel } from '../../utils/languageUtils';
import { Language } from '../../types';

interface LanguageSelectorProps {
    collapsed?: boolean;
    upwards?: boolean; // If true, menu opens upwards (good for bottom sidebar)
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({ collapsed = false, upwards = true }) => {
    const { language, setLanguage } = useApp();
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const languages: Language[] = ['zh', 'en', 'vi', 'mn'];

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (lang: Language) => {
        setLanguage(lang);
        setIsOpen(false);
    };

    return (
        <div className="relative" ref={containerRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                title="选择语言 (Select Language)"
                className={`${collapsed ? 'w-full' : 'flex-1 w-full'} flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-slate-500 hover:bg-slate-50 transition border-2 border-transparent hover:border-slate-100 ${isOpen ? 'bg-slate-50 border-slate-100' : ''}`}
            >
                <Globe size={20} />
                {!collapsed && <span className="truncate">{getLanguageLabel(language)}</span>}
            </button>

            {isOpen && (
                <div 
                    className={`
                        absolute ${upwards ? 'bottom-full mb-2' : 'top-full mt-2'} 
                        ${collapsed ? 'left-0 w-48' : 'left-0 w-full'} 
                        bg-white border-2 border-slate-100 rounded-2xl shadow-xl overflow-hidden z-20 p-1
                        animate-in fade-in zoom-in-95 duration-200
                    `}
                >
                    {languages.map((lang) => (
                        <button
                            key={lang}
                            onClick={() => handleSelect(lang)}
                            className={`
                                w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm font-bold transition
                                ${language === lang 
                                    ? 'bg-indigo-50 text-indigo-600' 
                                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}
                            `}
                        >
                            <span>{getLanguageLabel(lang)}</span>
                            {language === lang && <Check size={16} />}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};
