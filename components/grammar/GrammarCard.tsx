import React from 'react';
import { ArrowRight } from 'lucide-react';
import { GrammarPointData } from '../../types';

interface GrammarCardProps {
    grammar: GrammarPointData;
    index: number;
    onClick: () => void;
    onToggleStatus: (e: React.MouseEvent) => void;
}

const GrammarCard: React.FC<GrammarCardProps> = ({ grammar, index, onClick, onToggleStatus }) => {
    const isMastered = grammar.status === 'MASTERED';

    // Determine colors based on type
    const typeConfig: Record<string, { barColor: string; bgColor: string; textColor: string; label: string; hoverColor: string }> = {
        'ENDING': {
            barColor: 'bg-blue-500',
            bgColor: 'bg-blue-100',
            textColor: 'text-blue-700',
            label: '终结词尾',
            hoverColor: 'group-hover:text-blue-600'
        },
        'PARTICLE': {
            barColor: 'bg-purple-500',
            bgColor: 'bg-purple-100',
            textColor: 'text-purple-700',
            label: '助词',
            hoverColor: 'group-hover:text-purple-600'
        }
    };
    const config = typeConfig[grammar.type] || {
        barColor: 'bg-slate-500',
        bgColor: 'bg-slate-100',
        textColor: 'text-slate-700',
        label: grammar.type,
        hoverColor: 'group-hover:text-slate-600'
    };

    // Card number like 01-01, 01-02
    const cardNumber = `${String(grammar.unitId).padStart(2, '0')}-${String(index + 1).padStart(2, '0')}`;

    return (
        <div
            onClick={onClick}
            className="group bg-white border-2 border-slate-900 rounded-xl p-0 shadow-[4px_4px_0px_0px_#0f172a] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all cursor-pointer overflow-hidden flex flex-col h-48 relative"
        >
            {/* Top Colored Bar */}
            <div className={`h-1.5 w-full ${config.barColor} border-b-2 border-slate-900`}></div>

            <div className="p-4 flex flex-col h-full">
                {/* Top Row: Tag + Number */}
                <div className="flex justify-between items-start mb-2">
                    <span className={`px-1.5 py-0.5 ${config.bgColor} ${config.textColor} border border-slate-900 rounded text-[10px] font-black uppercase tracking-tight`}>
                        {config.label}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400">{cardNumber}</span>
                </div>

                {/* Title */}
                <h3 className={`text-lg font-black text-slate-900 leading-tight mb-1 ${config.hoverColor} transition-colors`}>
                    {grammar.title}
                </h3>

                {/* Summary */}
                <p className="text-xs text-slate-500 font-bold line-clamp-2">
                    {grammar.summary}
                </p>

                {/* Bottom Row: Status + Action */}
                <div className="mt-auto flex justify-between items-end pt-2">
                    <button
                        onClick={onToggleStatus}
                        className="flex items-center gap-1.5"
                    >
                        <div className={`w-1.5 h-1.5 rounded-full border border-slate-900 ${isMastered ? 'bg-green-500' : 'bg-slate-300'}`}></div>
                        <span className="text-[10px] font-bold text-slate-500">
                            {isMastered ? '已掌握' : '未学习'}
                        </span>
                    </button>
                    <button className="w-6 h-6 rounded border-2 border-slate-900 bg-white hover:bg-slate-900 hover:text-white flex items-center justify-center transition-colors">
                        <ArrowRight className="w-3 h-3" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default GrammarCard;
