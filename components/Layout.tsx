import React, { useState } from 'react';
import {
  BookOpen,
  GraduationCap,
  Library,
  LogOut,
  Menu,
  X,
  Crown,
  Settings,
  Globe,
  ChevronDown,
  User as UserIcon,
  Home,
} from 'lucide-react';
import { User as UserType, UserTier, Language } from '../types';
import { getLabels } from '../utils/i18n';

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
  const labels = getLabels(language);

  const navItems = [
    { id: 'home', label: labels.home, icon: Home },
    { id: 'dashboard', label: labels.textbookLearning, icon: Library },
    { id: 'topik', label: labels.topik, icon: GraduationCap },
  ];

  if (user?.role === 'ADMIN') {
    navItems.push({ id: 'admin', label: labels.admin, icon: Settings });
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* --- TOP NAVIGATION BAR --- */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm h-16">
        <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center justify-between">
          {/* Left: Logo & Desktop Nav */}
          <div className="flex items-center gap-8">
            {/* Logo */}
            <div
              className="flex items-center space-x-2 cursor-pointer"
              onClick={() => onNavigate('home')}
            >
              <div className="bg-indigo-600 text-white w-8 h-8 rounded-lg flex items-center justify-center font-bold text-lg shadow-indigo-200 shadow-md">
                한
              </div>
              <span className="text-xl font-bold text-slate-800 tracking-tight hidden sm:block">
                HanGyeol
              </span>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex space-x-1">
              {navItems.map(item => (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    currentPage === item.id
                      ? 'bg-indigo-50 text-indigo-600'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <item.icon
                    className={`w-4 h-4 mr-2 ${currentPage === item.id ? 'text-indigo-600' : 'text-slate-400'}`}
                  />
                  {item.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center space-x-3 sm:space-x-4">
            {/* Language Selector */}
            <div className="hidden sm:flex items-center bg-slate-100 rounded-full px-3 py-1.5 border border-slate-200">
              <Globe className="w-3.5 h-3.5 text-slate-500 mr-2" />
              <select
                value={language}
                onChange={e => onLanguageChange(e.target.value as Language)}
                className="bg-transparent border-none text-xs font-semibold text-slate-600 focus:ring-0 p-0 cursor-pointer outline-none"
              >
                <option value="en">English</option>
                <option value="zh">中文</option>
                <option value="vi">Tiếng Việt</option>
                <option value="mn">Монгол</option>
              </select>
            </div>

            {/* User Profile Dropdown */}
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center space-x-2 pl-2 pr-1 py-1 rounded-full hover:bg-slate-100 transition-colors border border-transparent hover:border-slate-200"
                >
                  {user.avatar ? (
                    <img
                      src={user.avatar}
                      alt="Profile"
                      className="w-8 h-8 rounded-full object-cover border border-slate-200"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-sm">
                      {user.name.charAt(0)}
                    </div>
                  )}
                  <div className="hidden lg:block text-left mr-2">
                    <p className="text-xs font-bold text-slate-700 leading-none">{user.name}</p>
                    <p className="text-[10px] text-slate-500 leading-none mt-1">
                      {user.tier === UserTier.PAID ? 'Premium' : 'Free Plan'}
                    </p>
                  </div>
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                </button>

                {/* Dropdown Menu */}
                {isUserMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setIsUserMenuOpen(false)}
                    ></div>
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-200 z-50 py-2 animate-in fade-in zoom-in-95 duration-100 origin-top-right">
                      <div className="px-4 py-3 border-b border-slate-100">
                        <p className="text-sm font-bold text-slate-800">{user.name}</p>
                        <p className="text-xs text-slate-500 truncate">{user.email}</p>
                      </div>
                      <div className="py-1">
                        <button
                          onClick={() => {
                            onNavigate('profile');
                            setIsUserMenuOpen(false);
                          }}
                          className="flex w-full items-center px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                        >
                          <UserIcon className="w-4 h-4 mr-2 text-slate-400" />
                          {labels.profile}
                        </button>
                        <div className="sm:hidden px-4 py-2 flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-500">Language</span>
                          <select
                            value={language}
                            onChange={e => onLanguageChange(e.target.value as Language)}
                            className="text-xs border border-slate-200 rounded p-1"
                          >
                            <option value="en">EN</option>
                            <option value="zh">ZH</option>
                            <option value="vi">VI</option>
                            <option value="mn">MN</option>
                          </select>
                        </div>
                      </div>
                      <div className="border-t border-slate-100 mt-1 pt-1">
                        <button
                          onClick={onLogout}
                          className="flex w-full items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50 font-medium"
                        >
                          <LogOut className="w-4 h-4 mr-2" />
                          {labels.signOut}
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="text-sm text-slate-500 font-medium">{labels.guest}</div>
            )}

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 text-slate-500 hover:bg-slate-100 rounded-lg"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* --- MOBILE MENU OVERLAY --- */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-slate-200 bg-white absolute w-full shadow-lg z-30">
            <div className="px-4 pt-2 pb-4 space-y-1">
              {navItems.map(item => (
                <button
                  key={item.id}
                  onClick={() => {
                    onNavigate(item.id);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`flex w-full items-center px-4 py-3 rounded-lg text-base font-medium ${
                    currentPage === item.id
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
      {/* Removed strict max-w-5xl to allow full width for Admin/Dashboard */}
      <main className="flex-1 w-full max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
};

export default Layout;
