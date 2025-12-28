import React, { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Settings, LogOut, ChevronLeft, ChevronRight, Check, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useApp } from '../../contexts/AppContext';

// Helper for 3D Icons
const EmojiIcon = ({ src, grayscale = false }: { src: string, grayscale?: boolean }) => (
    <img src={src} alt="icon" className={`w-6 h-6 transition shrink-0 ${grayscale ? 'grayscale group-hover:grayscale-0' : ''}`} />
);

export default function Sidebar() {
    const { logout, user } = useAuth();
    const { isEditing, toggleEditMode, isMobileMenuOpen, toggleMobileMenu } = useApp(); // Get layout context
    const location = useLocation();
    const navigate = useNavigate();
    const [collapsed, setCollapsed] = useState(true);

    // Get user initials for avatar fallback
    const getInitials = (name?: string) => {
        if (!name) return 'U';
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    };

    const navItems = [
        {
            path: '/dashboard', label: '学习主页',
            icon: <EmojiIcon src="https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Objects/Spiral%20Calendar.png" />,
            activeClass: 'bg-indigo-100 text-indigo-700 border-indigo-100'
        },
        {
            path: '/courses', label: '教材学习',
            icon: <EmojiIcon src="https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Objects/Books.png" grayscale />,
            activeClass: 'bg-blue-100 text-blue-700 border-blue-100'
        },
        {
            path: '/topik', label: '模拟考试',
            icon: <EmojiIcon src="https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Activities/Trophy.png" grayscale />,
            activeClass: 'bg-yellow-100 text-yellow-700 border-yellow-100'
        },
        {
            path: '/videos', label: '沉浸视频',
            icon: <EmojiIcon src="https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Objects/Clapper%20Board.png" grayscale />,
            activeClass: 'bg-red-100 text-red-700 border-red-100'
        },
        {
            path: '/podcasts', label: '韩语播客',
            icon: <EmojiIcon src="https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Objects/Headphone.png" grayscale />,
            activeClass: 'bg-purple-100 text-purple-700 border-purple-100'
        },
    ];

    return (
        <>
            {/* Mobile Overlay */}
            {isMobileMenuOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm md:hidden animate-in fade-in duration-200"
                    onClick={toggleMobileMenu}
                />
            )}

            {/* Sidebar (Desktop + Mobile Drawer) */}
            <aside className={`
                flex flex-col bg-white border-slate-900 transition-all duration-300 z-50
                
                /* Mobile Styles (Drawer) */
                fixed inset-y-0 left-0 h-full w-64 border-r-2 shadow-2xl transform ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 md:shadow-pop md:static md:h-[95vh] md:m-5 md:rounded-[2.5rem] md:border-2 md:sticky md:top-5
                
                /* Desktop Width Toggle */
                md:${collapsed ? 'w-24' : 'w-72'}
            `}>

                {/* Mobile Close Button */}
                <button
                    onClick={toggleMobileMenu}
                    className="md:hidden absolute top-4 right-4 p-2 text-zinc-400 hover:text-zinc-900"
                >
                    <X size={20} />
                </button>

                {/* User Profile Header */}
                <div
                    className={`p-6 flex items-center cursor-pointer hover:bg-slate-50 rounded-t-[2.3rem] transition ${collapsed ? 'justify-center' : 'gap-4'}`}
                    onClick={() => navigate('/profile')}
                    title="个人资料"
                >
                    {/* Avatar */}
                    <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center text-white font-black text-lg border-2 border-slate-900 shadow-pop-sm hover:scale-110 transition shrink-0 overflow-hidden">
                        {user?.avatar ? (
                            <img src={user.avatar} alt="avatar" className="w-full h-full object-cover" />
                        ) : (
                            getInitials(user?.name)
                        )}
                    </div>
                    {!collapsed && (
                        <div className="overflow-hidden">
                            <p className="font-black text-slate-900 truncate">{user?.name || '探险家'}</p>
                            <p className="text-xs text-slate-400 truncate">{user?.email || '点击查看资料'}</p>
                        </div>
                    )}
                </div>

                {/* Collapse Toggle Button */}
                <button
                    onClick={() => setCollapsed(!collapsed)}
                    className="absolute -right-3 top-20 w-6 h-6 bg-white border-2 border-slate-900 rounded-full flex items-center justify-center text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition shadow-sm z-30"
                >
                    {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
                </button>

                {/* Nav */}
                <nav className="flex-1 px-3 space-y-2 py-2 overflow-y-auto scrollbar-hide">
                    {navItems.map((item) => {
                        const isActive = location.pathname.startsWith(item.path);
                        return (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                title={collapsed ? item.label : undefined}
                                className={`flex items-center ${collapsed ? 'justify-center px-3' : 'gap-4 px-5'} py-4 rounded-[1.5rem] font-bold transition-all border-2 group ${isActive
                                    ? `${item.activeClass}`
                                    : 'border-transparent text-slate-500 hover:bg-slate-50 hover:border-slate-200'
                                    }`}
                            >
                                {item.icon}
                                {!collapsed && <span className="whitespace-nowrap">{item.label}</span>}
                            </NavLink>
                        );
                    })}
                </nav>

                {/* Bottom Actions */}
                <div className={`p-4 border-t-2 border-slate-100 flex ${collapsed ? 'flex-col' : ''} gap-2`}>
                    <button
                        onClick={() => {
                            if (location.pathname === '/dashboard') {
                                toggleEditMode();
                            } else {
                                navigate('/profile');
                            }
                        }}
                        title={location.pathname === '/dashboard' && isEditing ? "完成编辑" : "设置"}
                        className={`${collapsed ? 'w-full' : 'flex-1'} flex items-center justify-center gap-2 py-3 rounded-2xl font-bold ${location.pathname === '/dashboard' && isEditing
                            ? 'bg-green-100 text-green-600 border-green-200 hover:bg-green-200'
                            : 'text-slate-500 hover:bg-slate-50 border-transparent hover:border-slate-100'
                            } transition border-2`}
                    >
                        {location.pathname === '/dashboard' && isEditing ? <Check size={20} /> : <Settings size={20} />}
                    </button>
                    <button
                        onClick={logout}
                        title="退出"
                        className={`${collapsed ? 'w-full' : 'flex-1'} flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-red-400 hover:bg-red-50 transition border-2 border-transparent hover:border-red-100`}
                    >
                        <LogOut size={20} />
                    </button>
                </div>
            </aside>
        </>
    );
}
