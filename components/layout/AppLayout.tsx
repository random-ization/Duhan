import React from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import Footer from './Footer';
import { LayoutDashboard, BookOpen, Trophy, Youtube, Headphones } from 'lucide-react';

export default function AppLayout() {
    return (
        <div className="flex min-h-screen bg-background overflow-hidden font-sans">
            <Sidebar />
            <main className="flex-1 h-screen overflow-y-auto relative scroll-smooth">
                <div className="min-h-full flex flex-col p-6 md:p-10">
                    <div className="flex-1 w-full max-w-[1400px] mx-auto">
                        <Outlet />
                    </div>
                    <Footer />
                </div>
                {/* Spacer for mobile nav */}
                <div className="h-24 md:h-0" />
            </main>
            <MobileNavBar />
        </div>
    );
}

function MobileNavBar() {
    const navigate = useNavigate();
    const location = useLocation();
    const tabs = [
        { icon: LayoutDashboard, path: '/dashboard' },
        { icon: BookOpen, path: '/courses' },
        { icon: Trophy, path: '/topik' },
        { icon: Youtube, path: '/youtube' },
        { icon: Headphones, path: '/podcasts' },
    ];

    return (
        <div className="md:hidden fixed bottom-4 left-4 right-4 bg-white rounded-[2rem] shadow-2xl border-2 border-slate-900 z-50 h-20 flex justify-around items-center px-2">
            {tabs.map((tab) => {
                const isActive = location.pathname.startsWith(tab.path);
                return (
                    <button
                        key={tab.path}
                        onClick={() => navigate(tab.path)}
                        className={`p-2 transition-all ${isActive ? 'text-indigo-600 scale-110' : 'text-slate-300'}`}
                    >
                        <tab.icon size={28} strokeWidth={isActive ? 3 : 2} />
                    </button>
                )
            })}
        </div>
    )
}
