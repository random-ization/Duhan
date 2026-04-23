import React, { useEffect, useMemo, useState } from 'react';
import {
  PieChart,
  Search,
  ChevronLeft,
  ChevronRight,
  Clock,
  ShieldAlert,
} from 'lucide-react';
import { useLocalizedNavigate } from '../../hooks/useLocalizedNavigate';
import { useAuth } from '../../contexts/AuthContext';
import { useQuery } from 'convex/react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { qRef } from '../../utils/convexRefs';
import { ExamAttempt, TopikExam } from '../../types';
import { clsx } from 'clsx';
import { hasSafeReturnTo, resolveSafeReturnTo } from '../../utils/navigation';
import { safeGetLocalStorageItem, safeSetLocalStorageItem } from '../../utils/browserStorage';
import { m as motion } from 'framer-motion';

const TACTILE_V3_STYLES = `
::-webkit-scrollbar { display: none; }
body {
    background-color: #E6E7E9;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.045'/%3E%3C/svg%3E");
    -webkit-font-smoothing: antialiased;
}
.header-glass {
    background: rgba(230, 231, 233, 0.85);
    backdrop-filter: blur(32px) saturate(180%);
    -webkit-backdrop-filter: blur(32px) saturate(180%);
    border-bottom: 1px solid rgba(255,255,255,0.4);
}
.card-taupe-hero {
    background: linear-gradient(135deg, #A8A096 0%, #8A8177 100%);
    box-shadow: 0 24px 48px -12px rgba(138, 129, 119, 0.4), inset 0 1px 1px rgba(255,255,255,0.2);
    border: 1px solid rgba(0,0,0,0.05);
    color: #ffffff;
    transition: transform 0.15s;
    cursor: pointer;
}
.card-taupe-hero:active { transform: scale(0.98); }
.search-slot {
    background: #F8F9FA;
    box-shadow: inset 0 2px 4px rgba(0,0,0,0.05), inset 0 1px 2px rgba(0,0,0,0.05), 0 1px 0 rgba(255,255,255,1);
    border: 1px solid rgba(0,0,0,0.06);
}
.tactile-segment {
    background: #E4E4E7;
    box-shadow: inset 0 2px 4px rgba(0,0,0,0.1), 0 1px 0 rgba(255,255,255,0.8);
    border-radius: 12px;
    padding: 4px;
    position: relative;
    display: flex;
}
.segment-btn {
    position: relative;
    z-index: 10;
    flex: 1;
    transition: color 0.3s;
}
.vault-row {
    background: #FCFCFA;
    border-bottom: 1px solid rgba(0,0,0,0.05);
    transition: background 0.15s;
    cursor: pointer;
}
.vault-row:first-child { border-top-left-radius: 1.5rem; border-top-right-radius: 1.5rem; }
.vault-row:last-child { border-bottom-left-radius: 1.5rem; border-bottom-right-radius: 1.5rem; border-bottom: none; }
.vault-row:active {
    background: #F1F5F9;
    box-shadow: inset 0 2px 4px rgba(0,0,0,0.04);
}
.status-dot {
    box-shadow: 0 0 4px currentColor;
}
`;

type FilterType = 'ALL' | 'READING' | 'LISTENING' | 'WRITING';

const FILTER_TABS: { id: FilterType; labelKey: string }[] = [
  { id: 'ALL', labelKey: 'dashboard.topik.all' },
  { id: 'READING', labelKey: 'dashboard.topik.reading' },
  { id: 'LISTENING', labelKey: 'dashboard.topik.listening' },
  { id: 'WRITING', labelKey: 'dashboard.topik.writing' },
];

interface MobileTopikPageProps {
  onSelectExam: (examId: string) => void;
  topikExams: TopikExam[];
}

const MobileTopikPage: React.FC<MobileTopikPageProps> = ({ onSelectExam, topikExams }) => {
  const filterStorageKey = 'mobileTopikFilterType';
  const { user } = useAuth();
  const navigate = useLocalizedNavigate();
  const [searchParams] = useSearchParams();
  const { t } = useTranslation();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<FilterType>(() => {
    if (globalThis.window === undefined) return 'ALL';
    const saved = safeGetLocalStorageItem(filterStorageKey);
    if (saved === 'READING' || saved === 'LISTENING' || saved === 'WRITING') return saved;
    return 'ALL';
  });

  useEffect(() => {
    if (globalThis.window === undefined) return;
    safeSetLocalStorageItem(filterStorageKey, filterType);
  }, [filterType]);

  const examAttempts = useQuery(
    qRef<{ limit?: number }, ExamAttempt[]>('user:getExamAttempts'),
    user ? {} : 'skip'
  );
  const examHistory = examAttempts ?? [];

  // Sort latest exams first for upcoming
  const sortedExams = useMemo(() => {
    return [...topikExams].sort((a, b) => b.round - a.round);
  }, [topikExams]);

  const upcomingExam = sortedExams[0] || null;

  // Filter exams by tab AND search query
  const filteredExams = sortedExams.filter(exam => {
    const matchesTab = filterType === 'ALL' || exam.type === filterType;
    const matchesSearch = 
      exam.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      exam.round.toString().includes(searchQuery);
    return matchesTab && matchesSearch;
  });

  // Get best score for an exam
  const getBestScore = (examId: string) => {
    const attempts = examHistory.filter(a => a.examId === examId);
    if (attempts.length === 0) return null;
    return Math.max(
      ...attempts.map(a => {
        const maxScore = a.maxScore || a.totalScore || 100;
        return maxScore > 0 ? Math.round(((a.score || 0) / maxScore) * 100) : 0;
      })
    );
  };

  const handleBack = () => {
    const returnTo = searchParams.get('returnTo');
    if (hasSafeReturnTo(returnTo)) {
      navigate(resolveSafeReturnTo(returnTo, '/courses'));
      return;
    }
    navigate('/courses');
  };

  return (
    <div className="min-h-[100dvh] bg-[#E6E7E9] overflow-x-hidden">
      <style>{TACTILE_V3_STYLES}</style>

      {/* Header Glass */}
      <header className="fixed top-0 left-0 right-0 px-5 pt-14 pb-4 header-glass flex items-center justify-between z-50">
        <button 
          onClick={handleBack}
          className="w-10 h-10 rounded-[12px] bg-slate-900 text-white shadow-[0_4px_12px_rgba(0,0,0,0.15),inset_0_1px_1px_rgba(255,255,255,0.1)] flex items-center justify-center active:scale-95 transition-transform"
        >
          <ChevronLeft className="w-5 h-5 text-current -ml-0.5" />
        </button>
        <div className="flex flex-col items-center">
          <span className="text-[10px] font-black tracking-[0.2em] text-slate-500 uppercase">
            {t('dashboard.topik.examCenter', { defaultValue: 'Topik Vault' })}
          </span>
          <span className="text-[11px] font-bold text-slate-800">
            {t('dashboard.topik.mobile.totalArchived', { count: topikExams.length, defaultValue: `Archived ${topikExams.length}` })}
          </span>
        </div>
        <button 
          onClick={() => navigate('/topik/history')}
          className="w-10 h-10 rounded-[12px] bg-white text-slate-600 shadow-sm border border-slate-200 flex items-center justify-center active:scale-95 transition-transform"
        >
          <PieChart className="w-4 h-4" />
        </button>
      </header>

      <div className="h-28"></div>

      <main className="px-5 pb-24 max-w-[440px] mx-auto space-y-6">
        
        {/* Next Up Hero Card */}
        {upcomingExam && (
          <section>
            <div className="flex items-center justify-between mb-3 px-1">
              <h2 className="text-[11px] font-black text-slate-400 tracking-[0.2em] uppercase">Next Up</h2>
            </div>
            <div 
               className="card-taupe-hero w-full rounded-[2rem] p-6 relative overflow-hidden"
               onClick={() => onSelectExam(upcomingExam.id)}
            >
              <div className="absolute -bottom-6 -right-4 opacity-[0.04] pointer-events-none">
                <ShieldAlert className="w-48 h-48" />
              </div>
              <div className="flex justify-between items-start mb-4 relative z-10">
                <span className="bg-slate-900 text-white px-2.5 py-1 rounded-[6px] text-[9px] font-black tracking-[0.2em] uppercase shadow-md border border-slate-700">
                  TOPIK
                </span>
                <span className="text-[10px] font-bold text-white/60 tracking-wider flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {upcomingExam.timeLimit} Min
                </span>
              </div>
              <div className="relative z-10">
                <h3 className="text-2xl font-black tracking-tight mb-1 text-white">R{upcomingExam.round} {upcomingExam.title}</h3>
                <p className="text-[11px] font-bold text-white/60 tracking-wider mb-5">
                  {upcomingExam.questions?.length || 50} Questions
                </p>
              </div>
              <div className="flex justify-between items-center pt-4 border-t border-white/10 relative z-10">
                <div className="flex-1 mr-4"></div>
                <div className="flex items-center space-x-1 text-[11px] font-black text-white bg-white/10 px-4 py-2 rounded-xl border border-white/20 backdrop-blur-sm active:scale-95 transition-transform">
                  <span>Start Engine</span>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Sticky Search & Segment */}
        <section className="sticky top-[88px] z-40 bg-[#E6E7E9] py-2">
          {/* Search Slot */}
          <div className="search-slot rounded-2xl p-2.5 flex items-center mb-3">
            <Search className="w-4 h-4 text-slate-400 ml-2 mr-3" />
            <input 
              type="text" 
              placeholder={t('dashboard.topik.mobile.searchPlaceholder', { defaultValue: 'Search round (e.g. 60)' })}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none outline-none text-sm font-bold text-slate-800 placeholder-slate-400 w-full"
            />
          </div>

          {/* Tactile Segment Control - 4 Tabs */}
          <div className="tactile-segment relative flex">
            {FILTER_TABS.map((tab) => {
              const isActive = filterType === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setFilterType(tab.id)}
                  className={clsx(
                    'segment-btn flex-1 py-1.5 text-[11px] font-black tracking-widest uppercase transition-colors',
                    isActive ? 'text-slate-800' : 'text-slate-400'
                  )}
                >
                  {t(tab.labelKey, { 
                    defaultValue: tab.id === 'ALL' ? 'ALL' : tab.id.substring(0, 4) 
                  })}
                  {isActive && (
                    <motion.div
                      layoutId="tactile-segment-active"
                      className="absolute top-0 left-0 right-0 bottom-0 bg-white shadow-[0_2px_4px_rgba(0,0,0,0.1),0_1px_1px_rgba(0,0,0,0.05)] rounded-[8px] -z-10"
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </section>

        {/* Vault Rows List */}
        <section>
          {filteredExams.length > 0 ? (
            <div className="bg-[#FCFCFA] rounded-[1.5rem] shadow-[0_8px_24px_-12px_rgba(0,0,0,0.06),0_1px_1px_rgba(255,255,255,1)] border border-black/5 flex flex-col">
              {filteredExams.map((exam) => {
                const bestScore = getBestScore(exam.id);
                // Simple assumption: >= 60% is green, else red.
                const isPassed = bestScore !== null && bestScore >= 60;
                
                const isReading = exam.type === 'READING';
                const isWriting = exam.type === 'WRITING';
                return (
                  <div 
                    key={exam.id}
                    onClick={() => onSelectExam(exam.id)}
                    className="vault-row p-4 flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-4">
                      {/* Round Number */}
                      <div className="w-10 text-center">
                        <span className="text-2xl font-black text-slate-300 tracking-tighter">
                          {exam.round}
                        </span>
                      </div>
                      
                      {/* Details */}
                      <div>
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className={clsx(
                            "px-1.5 py-0.5 rounded text-[8px] font-black tracking-widest uppercase border",
                            isReading ? "bg-blue-50 text-blue-600 border-blue-100" :
                            isWriting ? "bg-rose-50 text-rose-600 border-rose-100" :
                            "bg-violet-50 text-violet-600 border-violet-100"
                          )}>
                            {isReading 
                              ? t('dashboard.topik.mobile.typeReadingShort', { defaultValue: 'READ' })
                              : isWriting 
                              ? t('dashboard.topik.mobile.typeWritingShort', { defaultValue: 'WRITE' })
                              : t('dashboard.topik.mobile.typeListeningShort', { defaultValue: 'LIST' })
                            }
                          </span>
                          <span className="text-[13px] font-black text-slate-800 line-clamp-1 break-all mr-2">
                            {exam.title.replace(`Round ${exam.round}`, '').trim()}
                          </span>
                        </div>
                        
                        {/* Status Label */}
                        <div className="flex items-center space-x-1.5">
                          {bestScore === null ? (
                            <>
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
                              <span className="text-[10px] font-bold text-slate-400 tracking-widest">
                                {t('dashboard.topik.mobile.statusUnopened', { defaultValue: '未启封' })}
                              </span>
                            </>
                          ) : (
                            <>
                              <span className={clsx(
                                "w-1.5 h-1.5 rounded-full status-dot",
                                isPassed ? "bg-emerald-400 text-emerald-400" : "bg-rose-400 text-rose-400"
                              )}></span>
                              <span className={clsx(
                                "text-[10px] font-black tracking-widest",
                                isPassed ? "text-emerald-500" : "text-rose-500"
                              )}>
                                {t('dashboard.topik.mobile.statusScore', { score: bestScore, defaultValue: '得 {{score}} 分' })}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <ChevronRight className="w-3 h-3 text-slate-300 stroke-[3px]" />
                  </div>
                );
              })}
            </div>
          ) : (
             <div className="text-center py-10 opacity-50">
               <ShieldAlert className="w-8 h-8 mx-auto text-slate-400 mb-2" />
               <p className="text-sm font-bold text-slate-500">No exams match your criteria</p>
             </div>
          )}
          
          <p className="text-center text-[10px] font-bold text-slate-400 tracking-[0.2em] uppercase py-6">
             {t('dashboard.topik.mobile.totalArchivedBelow', { count: filteredExams.length, defaultValue: `Viewing ${filteredExams.length} Archives` })}
          </p>
        </section>
      </main>
    </div>
  );
};

export default MobileTopikPage;
