import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Library,
  LogOut,
  Menu,
  X,
  Settings,
  Globe,
  ChevronDown,
  User as UserIcon,
  Home,
  GraduationCap,
  Sparkles
} from 'lucide-react';
import { User as UserType, UserTier, Language } from '../types';
import { getLabels } from '../utils/i18n';
import Footer from './Footer';

interface LayoutProps {
  children: React.ReactNode;
  user: UserType | null;
  onLogout: () => void;
  currentPage: string;
  onNavigate: (page: string) => void;
  language: Language;
  onLanguageChange: (lang: Language) => void;
}

const Layout: React.FC<LayoutProps> = ({
  children,
  user,
  onLogout,
  currentPage,
  onNavigate,
  language,
  onLanguageChange,
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const labels = getLabels(language);
  const location = useLocation();
  const isLandingPage = location.pathname === '/';

  // Handle scroll effect for navbar
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navItems = [
    { id: 'home', label: labels.home, icon: Home },
    { id: 'dashboard', label: labels.textbookLearning, icon: Library },
    { id: 'topik', label: labels.topik, icon: GraduationCap },
  ];

  if (user?.role === 'ADMIN') {
    navItems.push({ id: 'admin', label: labels.admin, icon: Settings });
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans selection:bg-indigo-100 selection:text-indigo-900">
      {/* --- TOP NAVIGATION BAR --- */}
      <header
        className={`fixed top-0 w-full z-40 transition-all duration-300 ${scrolled
          ? 'bg-white/80 backdrop-blur-md border-b border-slate-200 shadow-sm py-2'
          : 'bg-white border-b border-transparent py-4'
          }`}
      >
        <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          {/* Left: Logo & Desktop Nav */}
          <div className="flex items-center gap-8">
            {/* Logo */}
            <div
              className="flex items-center gap-2 cursor-pointer group"
              onClick={() => onNavigate('home')}
            >
              <img src="/logo.jpg" alt="Logo" className="w-10 h-10 rounded-xl shadow-lg group-hover:scale-105 transition-transform" />
              <span className="text-xl font-bold text-slate-900 tracking-tight hidden sm:block group-hover:text-indigo-600 transition-colors">
                {labels.appName || '读韩'}
              </span>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1 bg-slate-100/50 p-1 rounded-xl border border-slate-200/50">
              {navItems.map(item => {
                const isActive = currentPage === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onNavigate(item.id)}
                    className={`flex items-center px-4 py-2 rounded-lg text-sm font-bold transition-all ${isActive
                      ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-slate-200'
                      : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/50'
                      }`}
                  >
                    <item.icon
                      className={`w-4 h-4 mr-2 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`}
                    />
                    {item.label}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-4">
            {/* Language Selector */}
            <div className="hidden sm:flex items-center">
              <div className="relative">
                <button
                  onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
                  className={`flex items-center text-slate-500 hover:text-indigo-600 transition-colors p-2 rounded-lg hover:bg-slate-100 ${isLangMenuOpen ? 'bg-slate-100 text-indigo-600' : ''}`}
                >
                  <Globe className="w-5 h-5" />
                </button>

                {isLangMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setIsLangMenuOpen(false)}
                    ></div>
                    <div className="absolute right-0 mt-2 w-32 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-100">
                      {[
                        { val: 'en', label: 'English' },
                        { val: 'zh', label: '中文' },
                        { val: 'vi', label: 'Tiếng Việt' },
                        { val: 'mn', label: 'Монгол' }
                      ].map((opt) => (
                        <button
                          key={opt.val}
                          onClick={() => {
                            onLanguageChange(opt.val as Language);
                            setIsLangMenuOpen(false);
                          }}
                          className={`w-full text-left px-4 py-2 text-sm hover:bg-indigo-50 ${language === opt.val ? 'text-indigo-600 font-bold' : 'text-slate-600'}`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* User Profile Dropdown */}
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center gap-3 pl-1 pr-2 py-1 rounded-full hover:bg-slate-100 transition-all border border-transparent hover:border-slate-200 group"
                >
                  <div className="relative">
                    {user.avatar ? (
                      <img
                        src={user.avatar}
                        alt="Profile"
                        className="w-9 h-9 rounded-full object-cover border-2 border-white shadow-sm group-hover:border-indigo-100 transition-colors"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-sm border-2 border-white shadow-sm">
                        {user.name.charAt(0)}
                      </div>
                    )}
                    {user.tier === UserTier.PAID && (
                      <div className="absolute -bottom-1 -right-1 bg-amber-400 text-white p-[2px] rounded-full border-2 border-white">
                        <Sparkles className="w-2.5 h-2.5 fill-current" />
                      </div>
                    )}
                  </div>

                  <div className="hidden lg:block text-left">
                    <p className="text-sm font-bold text-slate-700 leading-none group-hover:text-indigo-900">{user.name}</p>
                    <p className="text-[10px] text-slate-500 leading-none mt-1 font-medium">
                      {user.tier === UserTier.PAID ? (labels.premium || 'Premium Plan') : (labels.free || 'Free Plan')}
                    </p>
                  </div>
                  <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-indigo-500 transition-colors" />
                </button>

                {/* Dropdown Menu */}
                {isUserMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setIsUserMenuOpen(false)}
                    ></div>
                    <div className="absolute right-0 mt-3 w-64 bg-white rounded-2xl shadow-2xl border border-slate-100 z-50 py-2 animate-in fade-in zoom-in-95 duration-200 origin-top-right ring-1 ring-slate-200">
                      <div className="px-5 py-4 border-b border-slate-50 bg-slate-50/50">
                        <p className="text-sm font-bold text-slate-900">{user.name}</p>
                        <p className="text-xs text-slate-500 truncate mt-0.5">{user.email}</p>
                      </div>
                      <div className="p-2 space-y-1">
                        <button
                          onClick={() => {
                            onNavigate('profile');
                            setIsUserMenuOpen(false);
                          }}
                          className="flex w-full items-center px-3 py-2.5 text-sm text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors font-medium"
                        >
                          <UserIcon className="w-4 h-4 mr-3" />
                          {labels.profile}
                        </button>
                        {/* Mobile Language Switcher inside menu */}
                        <div className="sm:hidden px-3 py-2 flex items-center justify-between text-sm text-slate-600">
                          <span className="flex items-center"><Globe className="w-4 h-4 mr-3" /> Language</span>
                          <div className="flex gap-1">
                            {['en', 'zh', 'vi', 'mn'].map((lang) => (
                              <button
                                key={lang}
                                onClick={(e) => { e.stopPropagation(); onLanguageChange(lang as Language); }}
                                className={`text-xs px-2 py-1 rounded ${language === lang ? 'bg-indigo-100 text-indigo-700 font-bold' : 'bg-slate-100'}`}
                              >
                                {lang.toUpperCase()}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="border-t border-slate-100 mt-1 p-2">
                        <button
                          onClick={onLogout}
                          className="flex w-full items-center px-3 py-2.5 text-sm text-red-600 hover:bg-red-50 rounded-xl transition-colors font-bold"
                        >
                          <LogOut className="w-4 h-4 mr-3" />
                          {labels.signOut}
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : null}

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 text-slate-500 hover:bg-slate-100 rounded-xl transition-colors"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* --- MOBILE MENU OVERLAY --- */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-slate-200 bg-white absolute w-full shadow-xl z-30 animate-in slide-in-from-top-5 duration-200">
            <div className="p-4 space-y-2">
              {navItems.map(item => (
                <button
                  key={item.id}
                  onClick={() => {
                    onNavigate(item.id);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`flex w-full items-center px-4 py-3.5 rounded-xl text-base font-bold transition-colors ${currentPage === item.id
                    ? 'bg-indigo-50 text-indigo-600'
                    : 'text-slate-600 hover:bg-slate-50'
                    }`}
                >
                  <item.icon className="w-5 h-5 mr-3" />
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </header>

      {/* --- MAIN CONTENT AREA --- */}
      <main className="flex-1 w-full max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-8 mt-20">
        {children}
      </main>

      {/* Footer - Hide on Landing Page */}
      {!isLandingPage && <Footer language={language} onNavigate={onNavigate} />}
    </div>
  );
};

export default Layout;
