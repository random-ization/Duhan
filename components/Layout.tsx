import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  BookOpen,
  NotebookPen,
  Settings,
  Library,
  Home,
  GraduationCap,
  Headphones
} from 'lucide-react';
import { User as UserType, Language } from '../types';
import Sidebar from './layout/Sidebar';
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

function MobileNavBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const tabs = [
    { icon: LayoutDashboard, path: '/dashboard' },
    { icon: BookOpen, path: '/courses' },
    { icon: Headphones, path: '/podcasts' },
    { icon: NotebookPen, path: '/notebook' },
    { icon: Settings, path: '/profile' },
  ];

  return (
    <div className="md:hidden fixed bottom-6 left-4 right-4 bg-white rounded-[2rem] border-2 border-slate-900 shadow-pop z-50 h-20 flex justify-around items-center px-2 animate-in slide-in-from-bottom-5 duration-300">
      {tabs.map((tab) => {
        const isActive = location.pathname.startsWith(tab.path);
        return (
          <button
            key={tab.path}
            onClick={() => navigate(tab.path)}
            className={`p-3 rounded-2xl transition-all ${isActive ? 'bg-indigo-100 text-indigo-700' : 'text-slate-300'}`}
          >
            <tab.icon size={26} strokeWidth={isActive ? 3 : 2} />
          </button>
        )
      })}
    </div>
  )
}

const Layout: React.FC<LayoutProps> = ({
  children,
  language,
  onNavigate,
}) => {
  const location = useLocation();
  const isLandingPage = location.pathname === '/';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans selection:bg-indigo-100 selection:text-indigo-900 relative">
      <Sidebar />
      <MobileNavBar />

      <main className="flex-1 w-full max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-8 mt-4 md:ml-80 md:mt-0 mb-24 md:mb-0 transition-all duration-300">
        {children}

        {/* Footer - Hide on Landing Page */}
        {!isLandingPage && <div className="mt-20"><Footer language={language} onNavigate={onNavigate} /></div>}
      </main>
    </div>
  );
};

export default Layout;
