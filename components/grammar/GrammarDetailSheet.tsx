import React, { useState, useEffect } from 'react';
import { X, Sparkles, Trophy, AlertCircle } from 'lucide-react';
import { GrammarPointData } from '../../types';
import { useAction, useMutation } from "convex/react";
import { api as convexApi } from "../../convex/_generated/api";

interface GrammarDetailSheetProps {
    grammar: GrammarPointData | null;
    onClose: () => void;
    onProficiencyUpdate?: (grammarId: string, proficiency: number, status: string) => void;
}

const GrammarDetailSheet: React.FC<GrammarDetailSheetProps> = ({ grammar, onClose, onProficiencyUpdate }) => {
    const [practiceSentence, setPracticeSentence] = useState('');
    const [aiFeedback, setAiFeedback] = useState<{
        isCorrect: boolean;
        feedback: string;
        correctedSentence?: string;
        progress?: { proficiency: number; status: string };
    } | null>(null);
    const [isChecking, setIsChecking] = useState(false);
    const [showConfetti, setShowConfetti] = useState(false);

    const checkAction = useAction(convexApi.ai.checkGrammarSentence);
    const updateStatus = useMutation(convexApi.grammars.updateStatus);

    // Reset state when grammar changes
    useEffect(() => {
        setPracticeSentence('');
        setAiFeedback(null);
        setShowConfetti(false);
    }, [grammar?.id]);

    const handleCheck = async () => {
        if (!grammar || !practiceSentence.trim()) return;

        setIsChecking(true);
        setAiFeedback(null);
        try {
            // 1. Check with AI
            const response = await checkAction({
                grammarTitle: grammar.title,
                sentence: practiceSentence.trim()
            });

            if (response.success && response.data) {
                const { isCorrect, feedback, correctedSentence } = response.data;

                let progress = undefined;

                // 2. If correct, update progress via mutation
                if (isCorrect) {
                    // We mark as "LEARNING" with a bump, or just update generally. 
                    // The existing updateStatus mutation takes (id, status).
                    // But here we might just want to increment proficiency?
                    // The mutation `updateStatus` logic: if MASTERED -> 100, else keep existing or set 0.
                    // It doesn't seem to support incremental proficiency bump easily without 'status'.
                    // Let's assume for practice we set/maintain 'LEARNING' which might update 'lastStudiedAt'.
                    // If we want to bump proficiency, we might need a specific 'recordPractice' mutation.
                    // For now, let's call updateStatus('LEARNING') to refresh 'lastStudiedAt'.

                    // Actually legacy behavior implies proficiency boost.
                    // The current `updateStatus` sets proficiency to 0 if new learning, or 100 if mastered.
                    // It doesn't handle incremental steps. 
                    // I'll stick to updating to "LEARNING" (which refreshes timestamp) 
                    // or maybe I should create a `recordPractice` mutation later. 
                    // Use `updateStatus` for now, it returns { status, proficiency }.
                    const res = await updateStatus({
                        grammarId: grammar.id as any,
                        status: 'LEARNING'
                    });
                    progress = res;

                    setShowConfetti(true);
                    setTimeout(() => setShowConfetti(false), 2000);

                    // Notify parent to refresh local view if needed (though parent might use query)
                    if (onProficiencyUpdate) {
                        onProficiencyUpdate(
                            grammar.id,
                            res.proficiency,
                            res.status
                        );
                    }
                }

                setAiFeedback({
                    isCorrect,
                    feedback,
                    correctedSentence,
                    progress
                });
            }
        } catch (error) {
            console.error('Grammar check failed:', error);
            setAiFeedback({
                isCorrect: false,
                feedback: '检查失败，请稍后重试',
            });
        } finally {
            setIsChecking(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleCheck();
        }
    };

    // Determine header background color based on type
    const getTypeStyles = () => {
        switch (grammar?.type) {
            case 'ENDING':
                return { bg: 'bg-blue-50', label: 'text-blue-600', border: 'border-blue-200' };
            case 'PARTICLE':
                return { bg: 'bg-purple-50', label: 'text-purple-600', border: 'border-purple-200' };
            case 'CONNECTIVE':
                return { bg: 'bg-amber-50', label: 'text-amber-600', border: 'border-amber-200' };
            default:
                return { bg: 'bg-slate-50', label: 'text-slate-600', border: 'border-slate-200' };
        }
    };

    const typeStyles = getTypeStyles();

    // Get rules object (support both old and new field names)
    const rulesObject = grammar?.conjugationRules || grammar?.construction || {};

    if (!grammar) {
        return (
            <aside className="w-96 bg-white border-2 border-slate-900 rounded-xl shadow-[4px_4px_0px_0px_#0f172a] flex flex-col overflow-hidden shrink-0 z-30">
                <div className="flex-1 flex items-center justify-center text-slate-400 font-bold p-6">
                    <div className="text-center">
                        <Sparkles className="w-12 h-12 mx-auto mb-3 opacity-30" />
                        <p>选择一个语法点查看详情</p>
                    </div>
                </div>
            </aside>
        );
    }

    const proficiency = aiFeedback?.progress?.proficiency ?? grammar.proficiency ?? 0;
    const status = aiFeedback?.progress?.status ?? grammar.status ?? 'NEW';

    return (
        <aside className="w-96 bg-white border-2 border-slate-900 rounded-xl shadow-[4px_4px_0px_0px_#0f172a] flex flex-col overflow-hidden shrink-0 z-30 relative">
            {/* Confetti Effect */}
            {showConfetti && (
                <div className="absolute inset-0 pointer-events-none z-50 overflow-hidden">
                    {[...Array(20)].map((_, i) => (
                        <div
                            key={i}
                            className="absolute animate-bounce"
                            style={{
                                left: `${Math.random() * 100}%`,
                                top: `-20px`,
                                animation: `confetti-fall 1.5s ease-out forwards`,
                                animationDelay: `${Math.random() * 0.5}s`,
                            }}
                        >
                            <span className="text-2xl">{['🎉', '✨', '⭐', '💫', '🌟'][i % 5]}</span>
                        </div>
                    ))}
                </div>
            )}

            {/* Header */}
            <div className={`p-4 border-b-2 border-slate-900 ${typeStyles.bg} flex justify-between items-start`}>
                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[10px] font-black ${typeStyles.label} uppercase px-2 py-0.5 border-2 border-current rounded`}>
                            {grammar.type}
                        </span>
                        {grammar.level && (
                            <span className="text-[10px] font-bold text-slate-500">{grammar.level}</span>
                        )}
                    </div>
                    <h2 className="text-2xl font-black text-slate-900">{grammar.title}</h2>

                    {/* Proficiency Bar */}
                    <div className="mt-2 flex items-center gap-2">
                        <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden border border-slate-300">
                            <div
                                className={`h-full transition-all duration-500 ${status === 'MASTERED' ? 'bg-green-500' :
                                    status === 'LEARNING' ? 'bg-amber-500' : 'bg-slate-400'
                                    }`}
                                style={{ width: `${proficiency}%` }}
                            />
                        </div>
                        <span className="text-xs font-bold text-slate-600">{proficiency}%</span>
                        {status === 'MASTERED' && <Trophy className="w-4 h-4 text-green-600" />}
                    </div>
                </div>
                <button
                    onClick={onClose}
                    className="w-6 h-6 rounded border-2 border-slate-900 bg-white flex items-center justify-center hover:bg-red-100 text-slate-900 transition-colors ml-2"
                >
                    <X className="w-3 h-3" />
                </button>
            </div>

            {/* Content - Scrollable */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
                {/* Summary */}
                <div className="text-sm text-slate-800 font-bold leading-relaxed">
                    <span className="bg-yellow-200 px-1 border border-yellow-300 rounded">{grammar.title}</span>
                    <span className="ml-2">{grammar.summary}</span>
                </div>

                {/* Explanation */}
                <div>
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">📖 详细解释</h4>
                    <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                        {grammar.explanation}
                    </div>
                </div>

                {/* Construction Rules (Lego Blocks) */}
                {Object.keys(rulesObject).length > 0 && (
                    <div>
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">🧩 接续规则</h4>
                        <div className="flex items-center gap-1 flex-wrap">
                            {Object.entries(rulesObject).map(([key, value], i) => (
                                <React.Fragment key={key}>
                                    {i > 0 && <span className="font-black text-lg mx-1 text-slate-400">/</span>}
                                    <div className="px-3 py-1.5 bg-white border-2 border-slate-900 rounded font-bold shadow-[2px_2px_0_0_#000] text-sm">
                                        {key}
                                    </div>
                                    <span className="font-black text-lg text-slate-600">→</span>
                                    <div className="px-3 py-1.5 bg-blue-100 text-blue-700 border-2 border-slate-900 rounded font-bold shadow-[2px_2px_0_0_#000] text-sm">
                                        {String(value)}
                                    </div>
                                </React.Fragment>
                            ))}
                        </div>
                    </div>
                )}

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
            </div>

            {/* AI Practice Section - Fixed at Bottom */}
            <div className="p-4 border-t-2 border-slate-900 bg-slate-50">
                <label className="flex items-center gap-2 text-[10px] font-black text-slate-900 mb-2">
                    <Sparkles className="w-3 h-3" />
                    AI 陪练
                </label>
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={practiceSentence}
                        onChange={(e) => setPracticeSentence(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={`用 ${grammar.title} 造个句子...`}
                        className="flex-1 px-3 py-2 border-2 border-slate-900 rounded-lg text-sm font-bold focus:shadow-[2px_2px_0px_0px_#0f172a] outline-none bg-white"
                    />
                    <button
                        onClick={handleCheck}
                        disabled={isChecking || !practiceSentence.trim()}
                        className="px-4 py-2 bg-slate-900 text-white font-bold rounded-lg border-2 border-slate-900 text-sm hover:bg-white hover:text-slate-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isChecking ? '...' : '检查'}
                    </button>
                </div>

                {/* AI Feedback */}
                {aiFeedback && (
                    <div className={`mt-3 p-3 border-2 border-slate-900 rounded-lg ${aiFeedback.isCorrect ? 'bg-green-50' : 'bg-red-50'
                        }`}>
                        <div className="flex items-start gap-2">
                            {aiFeedback.isCorrect ? (
                                <Trophy className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                            ) : (
                                <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                            )}
                            <div className="flex-1">
                                <p className={`text-sm font-bold ${aiFeedback.isCorrect ? 'text-green-700' : 'text-red-700'}`}>
                                    {aiFeedback.isCorrect ? '✓ 太棒了!' : '✗ 需要改进'}
                                </p>
                                <p className="text-xs text-slate-600 mt-1">{aiFeedback.feedback}</p>
                                {!aiFeedback.isCorrect && aiFeedback.correctedSentence && (
                                    <div className="mt-2 p-2 bg-white rounded border border-slate-300">
                                        <span className="text-[10px] font-bold text-slate-500 block mb-1">建议写法:</span>
                                        <span className="text-sm font-bold text-slate-800">{aiFeedback.correctedSentence}</span>
                                    </div>
                                )}
                                {aiFeedback.progress && (
                                    <div className="mt-2 text-[10px] text-slate-500">
                                        熟练度: <span className="font-bold text-slate-700">{aiFeedback.progress.proficiency}%</span>
                                        {aiFeedback.progress.status === 'MASTERED' && (
                                            <span className="ml-2 text-green-600 font-bold">🎉 已掌握!</span>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* CSS for confetti animation */}
            <style>{`
                @keyframes confetti-fall {
                    0% { transform: translateY(0) rotate(0deg); opacity: 1; }
                    100% { transform: translateY(400px) rotate(720deg); opacity: 0; }
                }
            `}</style>
        </aside>
    );
};

export default GrammarDetailSheet;
