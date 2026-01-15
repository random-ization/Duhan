import React from 'react';
import { X, BookOpen, MessageSquare, Lightbulb } from 'lucide-react';

interface VocabularyItem {
    word: string;
    root: string;
    meaning: string;
    type: string;
}

interface GrammarItem {
    structure: string;
    explanation: string;
}

interface AnalysisData {
    vocabulary: VocabularyItem[];
    grammar: GrammarItem[];
    nuance: string;
    cached?: boolean;
}

interface AnalysisSheetProps {
    isOpen: boolean;
    onClose: () => void;
    sentence: string;
    analysis: AnalysisData | null;
    loading: boolean;
}

const AnalysisSheet: React.FC<AnalysisSheetProps> = ({
    isOpen,
    onClose,
    sentence,
    analysis,
    loading
}) => {
    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/50 z-40 transition-opacity"
                onClick={onClose}
            />

            {/* Bottom Sheet */}
            <div className="fixed bottom-0 left-0 right-0 z-50 transform transition-transform duration-300 ease-out">
                <div className="bg-white rounded-t-3xl shadow-2xl max-h-[85vh] overflow-hidden">
                    {/* Handle */}
                    <div className="flex justify-center py-3">
                        <div className="w-10 h-1 bg-slate-300 rounded-full" />
                    </div>

                    {/* Header */}
                    <div className="px-6 pb-4 border-b border-slate-100">
                        <div className="flex items-start justify-between">
                            <div className="flex-1">
                                <p className="text-xs font-semibold text-indigo-600 mb-1 uppercase tracking-wider flex items-center gap-1">
                                    <Lightbulb className="w-3 h-3" />
                                    AI 句子分析
                                </p>
                                <p className="text-lg font-bold text-slate-800 leading-relaxed">
                                    {sentence}
                                </p>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-slate-100 rounded-full transition-colors -mr-2"
                            >
                                <X className="w-5 h-5 text-slate-400" />
                            </button>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="overflow-y-auto max-h-[calc(85vh-120px)] p-6 space-y-6">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-12 space-y-4">
                                <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
                                <p className="text-slate-500 text-sm">AI 正在分析句子...</p>
                            </div>
                        ) : analysis ? (
                            <>
                                {/* Section 1: Vocabulary Grid */}
                                <section>
                                    <div className="flex items-center gap-2 mb-3">
                                        <BookOpen className="w-4 h-4 text-amber-500" />
                                        <h3 className="font-bold text-slate-700">词汇 Vocabulary</h3>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        {analysis.vocabulary.map((item, idx) => (
                                            <div
                                                key={idx}
                                                className="bg-gradient-to-br from-slate-50 to-white border border-slate-200 rounded-xl p-3 hover:shadow-md transition-shadow"
                                            >
                                                <p className="font-bold text-slate-800 mb-1">{item.word}</p>
                                                <p className="text-xs text-slate-400 mb-1">
                                                    {item.root} · <span className="text-indigo-500">{item.type}</span>
                                                </p>
                                                <p className="text-sm text-slate-600">{item.meaning}</p>
                                            </div>
                                        ))}
                                    </div>
                                </section>

                                {/* Section 2: Grammar List */}
                                <section>
                                    <div className="flex items-center gap-2 mb-3">
                                        <MessageSquare className="w-4 h-4 text-emerald-500" />
                                        <h3 className="font-bold text-slate-700">语法 Grammar</h3>
                                    </div>
                                    <div className="space-y-3">
                                        {analysis.grammar.map((item, idx) => (
                                            <div
                                                key={idx}
                                                className="bg-emerald-50 border border-emerald-100 rounded-xl p-4"
                                            >
                                                <p className="font-bold text-emerald-700 mb-1">
                                                    {item.structure}
                                                </p>
                                                <p className="text-sm text-slate-600 leading-relaxed">
                                                    {item.explanation}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                </section>

                                {/* Section 3: Nuance Box */}
                                <section>
                                    <div className="flex items-center gap-2 mb-3">
                                        <Lightbulb className="w-4 h-4 text-purple-500" />
                                        <h3 className="font-bold text-slate-700">语感 Nuance</h3>
                                    </div>
                                    <div className="bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-100 rounded-xl p-4">
                                        <p className="text-sm text-slate-700 leading-relaxed">
                                            {analysis.nuance}
                                        </p>
                                    </div>
                                </section>

                                {/* Cache indicator */}
                                {analysis.cached && (
                                    <p className="text-xs text-center text-slate-400">
                                        ✨ 已缓存结果
                                    </p>
                                )}
                            </>
                        ) : (
                            <div className="text-center py-12 text-slate-400">
                                <p>分析结果将显示在这里</p>
                            </div>
                        )}
                    </div>

                    {/* Safe area padding for mobile */}
                    <div className="h-6" />
                </div>
            </div>
        </>
    );
};

export default AnalysisSheet;
