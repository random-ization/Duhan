import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface TypingLobbyProps {
    onBack: () => void;
    onStartWord: () => void;
    onStartSentence: () => void;
    onStartParagraph: () => void;
}

export const TypingLobby: React.FC<TypingLobbyProps> = ({
    onBack,
    onStartWord,
    onStartSentence,
    onStartParagraph,
}) => {
    const { t } = useTranslation();

    return (
        <div className="h-screen w-screen overflow-hidden bg-slate-50 flex flex-col items-center justify-center relative font-sans">
            {/* Ambient Background */}
            <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-blue-100/50 rounded-full blur-[120px] animate-float-slow"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-indigo-50/60 rounded-full blur-[120px] animate-float-slower"></div>
            </div>

            <style>{`
  .animate-float-slow { animation: float 8s ease-in-out infinite; }
  .animate-float-slower { animation: float 12s ease-in-out infinite reverse; }
@keyframes float {
  0% { transform: translate(0, 0); }
  50% { transform: translate(10px, -10px); }
  100% { transform: translate(0, 0); }
}
`}</style>

            <main className="relative z-10 w-full max-w-6xl px-8 flex flex-col items-center">
                {/* Header */}
                <div className="text-center mb-16 space-y-3 relative w-full">
                    {/* Back Button */}
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 hidden md:block">
                        <button
                            onClick={onBack}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all font-medium text-sm group"
                        >
                            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                            {t('typingLobby.back')}
                        </button>
                    </div>

                    <div className="md:hidden absolute left-0 top-0">
                        <button onClick={onBack} className="p-2 text-slate-400">
                            <ArrowLeft className="w-6 h-6" />
                        </button>
                    </div>

                    <h1 className="text-5xl lg:text-7xl font-extrabold text-slate-800 tracking-tight">
                        Duhan<span className="text-blue-500">.</span>
                    </h1>
                    <p className="text-slate-400 font-medium text-xl lg:text-2xl tracking-wide">
                        {t('typingLobby.subtitle')}
                    </p>
                </div>

                {/* Mode Selection Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full">
                    {/* WORD MODE */}
                    <button
                        onClick={onStartWord}
                        className="mode-card bg-white rounded-[2.5rem] p-8 lg:p-12 border border-slate-100 shadow-xl shadow-slate-200/50 flex flex-col items-center text-center group relative overflow-hidden transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl"
                    >
                        <div className="absolute inset-0 bg-gradient-to-br from-orange-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                        <div className="w-20 h-20 rounded-3xl bg-orange-100 text-4xl flex items-center justify-center mb-8 shadow-sm group-hover:scale-110 transition-transform duration-300 relative z-10">
                            🍎
                        </div>
                        <h2 className="text-3xl font-bold text-slate-800 mb-3 relative z-10">
                            {t('typingLobby.word.title')}
                        </h2>
                        <div className="text-slate-400 font-medium leading-relaxed relative z-10 whitespace-pre-wrap">
                            {t('typingLobby.word.desc')}
                        </div>
                        <div className="mt-8 py-3 px-8 rounded-full bg-slate-50 text-slate-600 font-bold text-sm group-hover:bg-orange-500 group-hover:text-white transition-colors relative z-10">
                            {t('typingLobby.word.tag')}
                        </div>
                    </button>

                    {/* SENTENCE MODE */}
                    <button
                        onClick={onStartSentence}
                        className="mode-card bg-white rounded-[2.5rem] p-8 lg:p-12 border border-slate-100 shadow-xl shadow-slate-200/50 flex flex-col items-center text-center group relative overflow-hidden transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl ring-4 ring-blue-50/50"
                    >
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                        <div className="w-24 h-24 rounded-3xl bg-blue-500 text-white text-5xl flex items-center justify-center mb-8 shadow-lg shadow-blue-500/30 group-hover:scale-110 transition-transform duration-300 relative z-10">
                            📝
                        </div>
                        <h2 className="text-4xl font-extrabold text-slate-800 mb-3 relative z-10">
                            {t('typingLobby.sentence.title')}
                        </h2>
                        <div className="text-slate-400 font-medium leading-relaxed relative z-10 whitespace-pre-wrap">
                            {t('typingLobby.sentence.desc')}
                        </div>
                        <div className="mt-8 py-3 px-8 rounded-full bg-slate-50 text-slate-600 font-bold text-sm group-hover:bg-blue-600 group-hover:text-white transition-colors relative z-10">
                            {t('typingLobby.sentence.tag')}
                        </div>
                    </button>

                    {/* PARAGRAPH MODE */}
                    <button
                        onClick={onStartParagraph}
                        className="mode-card bg-white rounded-[2.5rem] p-8 lg:p-12 border border-slate-100 shadow-xl shadow-slate-200/50 flex flex-col items-center text-center group relative overflow-hidden transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl"
                    >
                        <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                        <div className="w-20 h-20 rounded-3xl bg-indigo-100 text-4xl flex items-center justify-center mb-8 shadow-sm group-hover:scale-110 transition-transform duration-300 relative z-10">
                            📜
                        </div>
                        <h2 className="text-3xl font-bold text-slate-800 mb-3 relative z-10">
                            {t('typingLobby.paragraph.title')}
                        </h2>
                        <div className="text-slate-400 font-medium leading-relaxed relative z-10 whitespace-pre-wrap">
                            {t('typingLobby.paragraph.desc')}
                        </div>
                        <div className="mt-8 py-3 px-8 rounded-full bg-slate-50 text-slate-600 font-bold text-sm group-hover:bg-indigo-600 group-hover:text-white transition-colors relative z-10">
                            {t('typingLobby.paragraph.tag')}
                        </div>
                    </button>
                </div>

                {/* Footer */}
                <div className="mt-16 flex items-center gap-2 text-slate-300 text-sm font-medium">
                    <span>{t('typingLobby.footer.press')}</span>
                    <kbd className="px-2 py-0.5 rounded bg-white border border-slate-200 text-xs font-bold text-slate-500">
                        TAB
                    </kbd>
                    <span>{t('typingLobby.footer.switch')}</span>
                </div>
            </main>
        </div>
    );
};
