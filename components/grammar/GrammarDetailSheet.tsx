import React, { useState } from 'react';
import { X } from 'lucide-react';
import { GrammarPointData } from '../../types';
import { api } from '../../services/api';

interface GrammarDetailSheetProps {
    grammar: GrammarPointData | null;
    onClose: () => void;
}

const GrammarDetailSheet: React.FC<GrammarDetailSheetProps> = ({ grammar, onClose }) => {
    const [practiceSentence, setPracticeSentence] = useState('');
    const [aiFeedback, setAiFeedback] = useState<any>(null);
    const [isChecking, setIsChecking] = useState(false);

    const handleCheck = async () => {
        if (!grammar || !practiceSentence.trim()) return;

        setIsChecking(true);
        try {
            const feedback = await api.checkGrammar(practiceSentence, grammar.id);
            setAiFeedback(feedback);
        } catch (error) {
            console.error(error);
        } finally {
            setIsChecking(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleCheck();
    };

    // Determine header background color based on type
    const headerBg = grammar?.type === 'ENDING' ? 'bg-blue-50' : 'bg-purple-50';
    const labelColor = grammar?.type === 'ENDING' ? 'text-blue-600' : 'text-purple-600';

    if (!grammar) {
        return (
            <aside className="w-96 bg-white border-2 border-slate-900 rounded-xl shadow-[4px_4px_0px_0px_#0f172a] flex flex-col overflow-hidden shrink-0 z-30">
                <div className="flex-1 flex items-center justify-center text-slate-400 font-bold">
                    选择一个语法点查看详情
                </div>
            </aside>
        );
    }

    return (
        <aside className="w-96 bg-white border-2 border-slate-900 rounded-xl shadow-[4px_4px_0px_0px_#0f172a] flex flex-col overflow-hidden shrink-0 z-30">
            {/* Header */}
            <div className={`p-4 border-b-2 border-slate-900 ${headerBg} flex justify-between items-start`}>
                <div>
                    <span className={`text-[10px] font-black ${labelColor} uppercase mb-1 block`}>Grammar Point</span>
                    <h2 className="text-2xl font-black text-slate-900">{grammar.title}</h2>
                </div>
                <button
                    onClick={onClose}
                    className="w-6 h-6 rounded border-2 border-slate-900 bg-white flex items-center justify-center hover:bg-red-100 text-slate-900 transition-colors"
                >
                    <X className="w-3 h-3" />
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
                {/* Explanation with Yellow Highlight */}
                <div className="text-sm text-slate-800 font-bold leading-relaxed">
                    <span className="bg-yellow-200 px-1 border border-transparent rounded">是...</span> {grammar.explanation}
                </div>

                {/* Construction (Lego Blocks) */}
                <div>
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">🧩 接续规则</h4>
                    <div className="flex items-center gap-1 flex-wrap">
                        {Object.entries(grammar.construction || {}).map(([key, value], i) => (
                            <React.Fragment key={key}>
                                {i > 0 && <span className="font-black text-lg mx-1">+</span>}
                                <div className="px-3 py-1.5 bg-white border-2 border-slate-900 rounded font-bold shadow-[2px_2px_0_0_#000] text-sm">
                                    {key}
                                </div>
                                <span className="font-black text-lg">+</span>
                                <div className="px-3 py-1.5 bg-blue-100 text-blue-700 border-2 border-slate-900 rounded font-bold shadow-[2px_2px_0_0_#000] text-sm">
                                    {String(value)}
                                </div>
                            </React.Fragment>
                        ))}
                    </div>
                </div>

                {/* Examples */}
                <div>
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">💬 场景例句</h4>
                    <div className="space-y-2">
                        {(grammar.examples as any[])?.map((ex, i) => (
                            <div key={i} className="p-2.5 bg-slate-50 border-2 border-slate-900 rounded-lg relative group cursor-pointer hover:bg-white transition-colors">
                                <div className="font-bold text-slate-900 text-sm">{ex.kr}</div>
                                <div className="text-[10px] text-slate-500 mt-0.5">{ex.cn}</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* AI Practice */}
                <div className="mt-auto pt-4 border-t-2 border-slate-900">
                    <label className="block text-[10px] font-black text-slate-900 mb-2">🤖 AI 陪练</label>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={practiceSentence}
                            onChange={(e) => setPracticeSentence(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="造个句..."
                            className="flex-1 px-3 py-1.5 border-2 border-slate-900 rounded-lg text-xs font-bold focus:shadow-[2px_2px_0px_0px_#0f172a] outline-none"
                        />
                        <button
                            onClick={handleCheck}
                            disabled={isChecking}
                            className="px-3 py-1.5 bg-slate-900 text-white font-bold rounded-lg border-2 border-slate-900 text-xs hover:bg-white hover:text-slate-900 transition-colors disabled:opacity-50"
                        >
                            {isChecking ? '...' : 'GO'}
                        </button>
                    </div>

                    {aiFeedback && (
                        <div className={`mt-3 p-2.5 border-2 border-slate-900 rounded-lg ${aiFeedback.isCorrect ? 'bg-green-50' : 'bg-red-50'}`}>
                            <p className={`text-xs font-bold ${aiFeedback.isCorrect ? 'text-green-700' : 'text-red-700'}`}>
                                {aiFeedback.isCorrect ? '✓ 正确!' : '✗ 需要改进'}
                            </p>
                            <p className="text-[10px] text-slate-600 mt-1">{aiFeedback.feedback}</p>
                            {!aiFeedback.isCorrect && aiFeedback.correctedSentence && (
                                <p className="text-[10px] mt-1">
                                    <span className="font-bold text-slate-500">建议: </span>
                                    <span className="text-slate-800">{aiFeedback.correctedSentence}</span>
                                </p>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </aside>
    );
};

export default GrammarDetailSheet;
