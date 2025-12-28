import React from 'react';
import { clsx } from 'clsx';

export function StatBadge({ icon, label, value, colorClass, borderClass }: any) {
    return (
        <div className={clsx(
            "bg-white px-3 py-2 pr-4 md:pr-6 rounded-full flex items-center gap-3 shadow-pop border-2 hover:scale-105 transition cursor-pointer",
            borderClass || "border-slate-900"
        )}>
            <div className={clsx("w-10 h-10 rounded-full flex items-center justify-center border-2", colorClass || "bg-slate-100 border-slate-200")}>
                <img src={icon} className="w-6 h-6" alt="icon" />
            </div>
            <div>
                <div className="text-[10px] font-black text-slate-400 uppercase">{label}</div>
                <div className="font-black text-slate-900">{value}</div>
            </div>
        </div>
    );
}
