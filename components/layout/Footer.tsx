import React from 'react';
import { Link } from 'react-router-dom';

export default function Footer() {
    return (
        <footer className="mt-auto py-8 text-center text-slate-400">
            <div className="flex justify-center gap-6 text-xs font-bold uppercase tracking-wider mb-2">
                <Link to="/privacy" className="hover:text-indigo-600 transition">隐私协议</Link>
                <Link to="/terms" className="hover:text-indigo-600 transition">服务条款</Link>
                <Link to="/refund" className="hover:text-indigo-600 transition">退款政策</Link>
            </div>
            <p className="text-[10px] opacity-60">© 2026 DuHan Inc. All rights reserved.</p>
        </footer>
    );
}
