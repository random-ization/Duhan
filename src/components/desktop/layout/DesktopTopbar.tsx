import React from 'react';
import { useLocation } from 'react-router-dom';
import { getPathWithoutLang } from '../../../utils/pathname';
import { getRouteUiConfig } from '../../../config/routes.config';
import { useTranslation } from 'react-i18next';
import { Search, Bell, User, Command } from 'lucide-react';

export default function DesktopTopbar() {
  const location = useLocation();
  const pathWithoutLang = getPathWithoutLang(location.pathname);
  const routeUiConfig = getRouteUiConfig(pathWithoutLang);
  const { t } = useTranslation();
  
  // Format the page title - convert path to readable title
  const formatTitle = (path: string) => {
    if (!path) return t('common.appName', 'Duhan');
    // Remove leading slash and split by hyphen
    const segments = path.replace(/^\//, '').split('/');
    const mainSegment = segments[0] || path;
    return mainSegment
      .replace(/-/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase());
  };
  
  const pageTitle = routeUiConfig.headerTitle || formatTitle(pathWithoutLang);

  return (
    <header className="h-16 px-6 flex items-center justify-between border-b border-[rgba(31,27,23,0.08)] bg-[#FFFFFF]/90 backdrop-blur-xl shrink-0 shadow-[0_1px_3px_rgba(31,27,23,0.03)]">
      <div className="flex items-center gap-4">
        <h1 className="text-lg font-bold text-[#1F1B17] tracking-tight font-['Pretendard']">
          {pageTitle}
        </h1>
      </div>
      
      <div className="flex items-center gap-2">
        {/* Search hint - Command+K style */}
        <button 
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[rgba(31,27,23,0.08)] bg-[#F5EFE5] text-[#8C8377] hover:text-[#1F1B17] hover:border-[rgba(31,27,23,0.14)] transition-colors text-sm font-medium"
          title="Search (⌘K)"
        >
          <Search size={16} />
          <span className="text-xs">Search</span>
          <div className="flex items-center gap-0.5 ml-1">
            <kbd className="px-1.5 py-0.5 text-[10px] bg-white rounded border border-[rgba(31,27,23,0.1)]">⌘</kbd>
            <kbd className="px-1.5 py-0.5 text-[10px] bg-white rounded border border-[rgba(31,27,23,0.1)]">K</kbd>
          </div>
        </button>
        
        <div className="w-px h-6 bg-[rgba(31,27,23,0.08)] mx-2" />
        
        <button className="p-2 rounded-lg text-[#8C8377] hover:text-[#1F1B17] hover:bg-[rgba(31,27,23,0.04)] transition-colors">
          <Bell size={20} />
          <span className="absolute top-2 right-2 w-2 h-2 bg-[#A23B2E] rounded-full" />
        </button>
        <button className="p-2 rounded-lg text-[#8C8377] hover:text-[#1F1B17] hover:bg-[rgba(31,27,23,0.04)] transition-colors">
          <User size={20} />
        </button>
      </div>
    </header>
  );
}