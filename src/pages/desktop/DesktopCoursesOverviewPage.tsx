import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { 
  Search, 
  ChevronRight, 
  BookMarked, 
  Sparkles, 
  BookOpen, 
  Award,
  LucideIcon,
  Eye,
  EyeOff,
  Lightbulb,
  HelpCircle,
  AlertTriangle,
  CheckCircle2,
  LayoutGrid,
  Type,
  Library
} from 'lucide-react';
import { RedEyeBlock, MarkdownRenderer } from './DesktopGrammarModulePage';
import { useQuery, useMutation } from 'convex/react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { NoArgs, qRef, GRAMMARS, TYPING, TOPIK, USER_STATS, USERS, VOCAB } from '../../utils/convexRefs';
import { useLocalizedNavigate } from '../../hooks/useLocalizedNavigate';
import { Button } from '../../components/ui';
import { HanjaSeal } from '../../components/desktop/ui/HanjaSeal';
import { DesktopCard } from '../../components/desktop/ui/DesktopCard';
import { SectionHead } from '../../components/desktop/ui/SectionHead';
import { DesktopLearningHubHeader } from '../../components/desktop/DesktopLearningHubHeader';
import { useLearningActions, useLearningSelection } from '../../contexts/LearningContext';
import {
  TOPIK_GRAMMAR_COURSE_ID,
} from '../../utils/learningFlow';
import { cn } from '../../lib/utils';
import BackButton from '../../components/ui/BackButton';
import type { Institute } from '../../types';


// import type { LearnerStatsDto, CourseDashboardDto } from '../../../convex/learningStats';

import type { UnitGrammarDto, GrammarItemDto } from '../../../convex/grammars';

// --- Types & Constants ---


type Course = Institute & { _id?: string };

type LearnTabKey = 'mine' | 'grammar' | 'vocabulary' | 'typing' | 'topik';

interface TextbookUnit {
  _id: string;
  courseId: string;
  unitIndex: number;
  articleIndex: number;
  title: string;
  readingText: string;
  translation?: string;
  audioUrl?: string;
}

interface TypingStats {
  totalTests: number;
  averageWpm: number;
  averageAccuracy: number;
  highestWpm: number;
  totalTime: number;
  recentWpm: Array<{ wpm: number; date: number }>;
  sessionsThisWeek: number;
}

interface TopikAttempt {
  id: string;
  examId: string;
  examTitle: string;
  score: number;
  submittedAt: number;
  status: string;
}


interface Publisher {
  _id: string;
  name: string;
  nameKo?: string;
  nameZh?: string;
  nameEn?: string;
  nameVi?: string;
  nameMn?: string;
  imageUrl?: string;
}

interface PublisherTheme { 
  bg: string; 
  text: string; 
  accent: string; 
  border: string; 
  light: string 
}

const PUBLISHER_THEMES: Record<string, PublisherTheme> = {
  oer: { bg: 'bg-k-butter/50', text: 'text-k-ink', accent: 'bg-k-butter-deep', border: 'border-k-ink', light: 'bg-k-butter/20' },
  yonsei: { bg: 'bg-k-mint/50', text: 'text-k-ink', accent: 'bg-k-mint-deep', border: 'border-k-ink', light: 'bg-k-mint/20' },
  seoulNational: { bg: 'bg-k-pink/50', text: 'text-k-ink', accent: 'bg-k-pink-deep', border: 'border-k-ink', light: 'bg-k-pink/20' },
  chungAng: { bg: 'bg-k-lilac/50', text: 'text-k-ink', accent: 'bg-k-lilac-deep', border: 'border-k-ink', light: 'bg-k-lilac/20' },
  topikGrammar: { bg: 'bg-k-indigo/50', text: 'text-k-bg', accent: 'bg-k-indigo-deep', border: 'border-k-ink', light: 'bg-k-indigo/20' },
  default: { bg: 'bg-k-card', text: 'text-k-ink', accent: 'bg-k-line2', border: 'border-k-ink', light: 'bg-k-bg2' },
};

const UNIT_HANJA = ['挨', '時', '若', '過', '傳', '使'];
const BEAD_TONES = ['mint', 'butter', 'pink', 'lilac', 'sky', 'ink'] as const;

const TAB_HANJA: Record<LearnTabKey, string> = {
  mine: '學',
  grammar: '文',
  vocabulary: '詞',
  typing: '寫',
  topik: '考',
};

// const PRIORITY_COURSE_ID = TOPIK_GRAMMAR_COURSE_ID;

// --- Helper Functions ---

function resolvePublisherKey(publisher: string): string {
  const p = publisher.toLowerCase();
  if (p.includes('oer') || p.includes('open')) return 'oer';
  if (p.includes('yonsei')) return 'yonsei';
  if (p.includes('seoul')) return 'seoulNational';
  if (p.includes('chung')) return 'chungAng';
  if (p.includes('topik')) return 'topikGrammar';
  return 'default';
}

// --- Main Component ---

export const DesktopCoursesOverviewPage: React.FC = () => {
  const navigate = useLocalizedNavigate();
  const { t, i18n } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const language = i18n.resolvedLanguage || i18n.language || 'en';
  
  const activeTab = (searchParams.get('tab') as LearnTabKey) || 'mine';
  const [searchQuery, setSearchQuery] = useState('');
  const [_expandedPublisher, _setExpandedPublisher] = useState<string | null>(null);

  const { recentMaterials, selectedInstitute } = useLearningSelection();
  const { setRecentMaterial: _, setSelectedInstitute, setSelectedLevel: _2 } = useLearningActions();
  const [manualActiveCourseId, setActiveCourseId] = useState<string | null>(() => {
    return localStorage.getItem('last_selected_course_id');
  });
  
  useEffect(() => {
    if (manualActiveCourseId) {
      localStorage.setItem('last_selected_course_id', manualActiveCourseId);
    }
  }, [manualActiveCourseId]);

  const [vocabCategory, setVocabCategory] = useState<'DUE' | 'UNLEARNED' | 'ALL' | 'MASTERED'>(() => {
    return (localStorage.getItem('last_selected_vocab_category') as any) || 'DUE';
  });

  useEffect(() => {
    localStorage.setItem('last_selected_vocab_category', vocabCategory);
  }, [vocabCategory]);

  // --- Data Fetching ---
  const courses = useQuery(qRef<NoArgs, Course[]>('institutes:getAll'));
  const stats = useQuery(USER_STATS.getStats);
  const dashboard = useQuery(USER_STATS.getCourseDashboard);
  const forecast = useQuery(VOCAB.getForecast);

  const activeCourseId = useMemo(
    () =>
      manualActiveCourseId ??
      selectedInstitute ??
      dashboard?.currentCourse?.id ??
      stats?.courseProgress?.[0]?.courseId ??
      null,
    [dashboard?.currentCourse?.id, manualActiveCourseId, selectedInstitute, stats?.courseProgress]
  );

  const formatLevel = useCallback((level: string) => {
    if (!level) return '';
    // If it's a pure number, prefix with "Level "
    if (/^\d+$/.test(level)) {
      return `Level ${level}`;
    }
    return level;
  }, []);
  const _publishersData = useQuery(qRef<NoArgs, Publisher[]>('publishers:getAll'));
  
  // Typing 数据
  const typingStats = useQuery(TYPING.getUserStats) as TypingStats | null;
  const typingTexts = useQuery(TYPING.listTexts, { 
    type: 'SENTENCE', 
    paginationOpts: { numItems: 1, cursor: null } 
  });
  const sampleTypingText = typingTexts?.page?.[0];

  // TOPIK 数据
  const topikHistory = useQuery(qRef<{ limit?: number }, TopikAttempt[]>('topik:getMyHistory'), { limit: 5 });
  const topikExams = useQuery(TOPIK.getExams, { limit: 1 });
  
  const updateCurrentCourseMutation = useMutation(USERS.updateCurrentCourse);
  
  const featuredTopikExam = useMemo(() => {
    if (!topikExams) return null;
    if (Array.isArray(topikExams)) return topikExams[0];
    return topikExams.page?.[0];
  }, [topikExams]);

  const _isLoading = courses === undefined;


  // --- Logic ---
  
  const currentCourse = useMemo<Course | null>(() => {
    if (!courses || courses.length === 0) return null;
    
    // 1. If Grammar tab, prioritize TOPIK Grammar
    if (activeTab === 'grammar') {
      return courses.find(c => c.id === TOPIK_GRAMMAR_COURSE_ID) || courses[0];
    }
    
    // 2. If selected institute exists
    if (selectedInstitute) {
      return courses.find(c => c.id === selectedInstitute) || courses[0];
    }
    
    // 3. Explicitly selected course
    if (activeCourseId) {
      return courses.find(c => c.id === activeCourseId) || courses[0];
    }

    // 4. Last recent material
    const recentId = recentMaterials?.vocabulary?.instituteId || recentMaterials?.grammar?.instituteId;
    if (recentId) {
      return courses.find(c => c.id === recentId) || courses[0];
    }

    // 5. Fallback to stats progress
    const currentProgress = stats?.currentProgress;
    if (currentProgress?.instituteId) {
      return courses.find(c => c.id === currentProgress.instituteId) || courses[0];
    }
    
    return courses[0];
  }, [activeCourseId, activeTab, courses, selectedInstitute, recentMaterials, stats]);

  // 获取当前课程的单元列表
  const _currentCourseUnits = useQuery(
    qRef<{ courseId: string }, TextbookUnit[]>('units:getByCourse'),
    currentCourse ? { courseId: currentCourse.id } : 'skip'
  );


  // 获取当前课程的语法点列表
  const grammarPoints = useQuery(
    GRAMMARS.getByCourse,
    currentCourse ? { courseId: currentCourse.id } : 'skip'
  );

  const [selectedGrammarId, setSelectedGrammarId] = useState<string | null>(null);
  const [redEyeMode, setRedEyeMode] = useState(false);
  const effectiveSelectedGrammarId = useMemo(() => {
    if (!grammarPoints || grammarPoints.length === 0) return null;
    return grammarPoints.some(p => p.id === selectedGrammarId) ? selectedGrammarId : grammarPoints[0].id;
  }, [grammarPoints, selectedGrammarId]);
  
  const selectedGrammarPoint = useMemo(() => {
    if (!grammarPoints || !effectiveSelectedGrammarId) return null;
    return grammarPoints.find(p => p.id === effectiveSelectedGrammarId);
  }, [effectiveSelectedGrammarId, grammarPoints]);

  // 获取选中语法点的详情 (通过 UnitGrammar 获取，因为它包含例句和规则)
  const unitGrammars = useQuery(
    GRAMMARS.getUnitGrammar,
    currentCourse && selectedGrammarPoint 
      ? { courseId: currentCourse.id, unitId: selectedGrammarPoint.unitId, language } 
      : 'skip'
  );

  const selectedGrammarDetail = useMemo<UnitGrammarDto | null>(() => {
    if (!unitGrammars || !effectiveSelectedGrammarId) return null;
    return unitGrammars.find(g => g.id === effectiveSelectedGrammarId) || null;
  }, [effectiveSelectedGrammarId, unitGrammars]);

  const groupedGrammars = useMemo(() => {
    if (!grammarPoints) return [];
    const groups: Record<number, GrammarItemDto[]> = {};
    grammarPoints.forEach(p => {
      if (!groups[p.unitId]) groups[p.unitId] = [];
      groups[p.unitId].push(p);
    });
    return Object.entries(groups).sort(([a], [b]) => Number(a) - Number(b));
  }, [grammarPoints]);

  const filteredCourses = useMemo(() => {


    if (!courses) return [];
    return courses.filter(course => {
      const q = searchQuery.toLowerCase();
      if (!q) return true;
      return (
        course.name.toLowerCase().includes(q) ||
        (course.publisher || '').toLowerCase().includes(q) ||
        (course.displayLevel || '').toLowerCase().includes(q)
      );
    });
  }, [courses, searchQuery]);

  const groupedCourses = useMemo(() => {
    const groups: Record<string, Course[]> = {};
    filteredCourses.forEach(course => {
      const pub = course.publisher || t('coursesLibrary.otherPublisher');
      if (!groups[pub]) groups[pub] = [];
      groups[pub].push(course);
    });
    return Object.entries(groups).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filteredCourses, t]);

  const handleTabChange = (tab: LearnTabKey) => {
    setSearchParams({ tab });
  };

  const handleCourseOpen = async (course: Course) => {
    setSelectedInstitute(course.id);
    try {
      await updateCurrentCourseMutation({ courseId: course.id });
    } catch (e) {
      console.error('Failed to update current course on backend', e);
    }

    if (course.id === TOPIK_GRAMMAR_COURSE_ID) {
      navigate(`/course/${course.id}/grammar`);
    } else {
      navigate(`/course/${course.id}`);
    }
  };

  const dateStr = useMemo(() => {
    const d = new Date();
    if (i18n.language.startsWith('zh')) {
      const map = ['日', '一', '二', '三', '四', '五', '六'];
      return `${d.getMonth() + 1}月 ${d.getDate()}日 · 星期${map[d.getDay()]}`;
    }
    const map = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[d.getMonth()]} ${d.getDate()} · ${map[d.getDay()]}`;
  }, [i18n.language]);

  const _courseProgress = useMemo(() => {
    if (!stats?.courseProgress || !currentCourse) return null;
    return stats.courseProgress.find((p) => p.courseId === currentCourse.id);
  }, [stats?.courseProgress, currentCourse]);

  // --- Sub-components for Tabs ---

  const renderMineTab = () => {
    if (!dashboard) return <div className="p-20 text-center text-k-sub font-bold">{t('common.loading')}</div>;

    const { currentCourse: current, enrolledCourses, journeyUnits } = dashboard;

    return (
      <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* 1. Active Journey Hero */}
        {current && (
          <section>
            <SectionHead kanji="程" title={t('coursesOverview.desktop.currentJourney')} />
            <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-6">
              <DesktopCard 
                pad={0} 
                className="relative overflow-hidden group"
                style={{ background: 'linear-gradient(135deg, rgba(247,232,184,0.3) 0%, rgba(162,59,46,0.05) 100%)' }}
              >
                {/* Large Background Hanja - Use Course Initial */}
                <div className="absolute -right-4 -top-8 font-k-serif text-[120px] text-k-ink/5 font-medium pointer-events-none select-none">
                  {current.name.charAt(0)}
                </div>
                
                <div className="p-8 relative z-10 h-full flex flex-col">
                  <div className="flex items-center gap-3 mb-6">
                    <span className="px-2 py-0.5 bg-k-ink text-white text-[10px] font-black rounded uppercase tracking-widest">
                      {t('status.inProgress')} · {Math.round((current.completedUnitsCount / (current.totalUnits || 1)) * 100)}%
                    </span>
                  </div>
                  
                  <div className="flex-1">
                    <h2 className="text-2xl font-black text-k-ink mb-2 leading-tight tracking-tight">
                      {current.name}
                    </h2>
                    <div className="text-[12px] font-bold text-k-ink2/60 uppercase tracking-wide">
                      {current.displayLevel} · {t('common.unit')} {current.currentUnitIndex} / {current.totalUnits} · {current.totalStudyMinutes} {t('common.minutes')}
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="mt-4 h-1.5 w-full bg-k-ink/10 rounded-full overflow-hidden">
                      <div className="h-full bg-k-ink" style={{ width: `${(current.completedUnitsCount / (current.totalUnits || 1)) * 100}%` }} />
                    </div>
                  </div>

                  <div className="flex gap-3 mt-8">
                    <Button 
                      onClick={() => handleCourseOpen({ id: current.id } as Course)}
                      className="rounded-xl bg-k-ink px-6 py-2.5 text-[12px] font-black text-k-bg hover:bg-k-ink/90 transition-all shadow-lg shadow-k-ink/10"
                    >
                      {t('resumeLearning')} →
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={() => navigate(`/course/${current.id}`)}
                      className="rounded-xl border-k-ink/20 px-6 py-2.5 text-[12px] font-bold text-k-ink hover:bg-k-ink/5"
                    >
                      {t('button.courseSyllabus')}
                    </Button>
                  </div>
                </div>
              </DesktopCard>

              {/* 1.1 Other Courses */}
              <DesktopCard className="p-6">
                <div className="flex items-baseline mb-4">
                  <span className="font-k-serif text-lg text-k-crimson font-medium mr-2 leading-none">群</span>
                  <span className="text-[13px] font-black text-k-ink">{t('coursesLibrary.myOtherCourses')}</span>
                  <button 
                    onClick={() => setSearchParams({ tab: 'library' })}
                    className="ml-auto text-[10px] font-bold text-k-sub hover:text-k-crimson"
                  >
                    + {t('add')}
                  </button>
                </div>
                <div className="space-y-4">
                  {enrolledCourses
                    .filter((c) => c.id !== current.id)
                    .slice(0, 3)
                    .map((c, i) => {
                      const percentage = Math.round((c.completedUnitsCount / (c.totalUnits || 1)) * 100);
                      return (
                        <div key={i} className="flex gap-4 items-center group cursor-pointer" onClick={() => handleCourseOpen({ id: c.id } as Course)}>
                          <HanjaSeal c={c.name.charAt(0)} size={40} bg={BEAD_TONES[i % BEAD_TONES.length]} round={10} className="shrink-0" />
                          <div className="flex-1">
                            <div className="text-[13px] font-black text-k-ink group-hover:text-k-crimson transition-colors line-clamp-1">{c.name}</div>
                            <div className="mt-2 h-1 w-full bg-k-line rounded-full overflow-hidden">
                              <div className="h-full bg-k-crimson" style={{ width: `${percentage}%` }} />
                            </div>
                          </div>
                          <span className="text-[11px] font-black text-k-sub">{percentage}%</span>
                        </div>
                      );
                    })}
                  {enrolledCourses.filter(c => c.id !== current.id).length === 0 && (
                    <div className="py-8 text-center text-k-sub/60 text-xs font-bold italic">
                      {t('coursesOverview.desktop.noOtherCourses', 'No other active courses')}
                    </div>
                  )}
                </div>
              </DesktopCard>
            </div>
          </section>
        )}

        {/* 2. Unit Journey — Horizontal Beads */}
        {current && journeyUnits.length > 0 && (
          <section>
            <DesktopCard className="p-8">
              <div className="flex items-baseline mb-8">
                <span className="font-k-serif text-lg text-k-crimson font-medium mr-2 leading-none">路</span>
                <span className="text-[14px] font-black text-k-ink uppercase tracking-wider">{t('coursesOverview.desktop.learningJourney')}</span>
                <button 
                  onClick={() => navigate(`/course/${current.id}`)}
                  className="ml-auto text-[11px] font-bold text-k-sub hover:text-k-crimson"
                >
                  {t('viewAll')} →
                </button>
              </div>
              
              <div className="relative flex justify-between overflow-x-auto pb-4 hide-scrollbar">
                {/* Connecting Line */}
                <div className="absolute top-[25px] left-8 right-8 h-0.5 bg-k-line2 z-0" />
                
                {journeyUnits.map((unit, i) => {
                  const unitIdx = unit.unitIndex;
                  const isDone = unit.isCompleted;
                  const isCurrent = unit.isCurrent;
                  const isStarted = isDone || isCurrent;
                  const hanja = UNIT_HANJA[unitIdx % UNIT_HANJA.length] || '記';

                  return (
                    <div key={i} className="relative z-10 flex flex-col items-center flex-1 min-w-[120px]">
                      <div 
                        className={cn(
                          "w-[50px] h-[50px] rounded-full grid place-items-center relative transition-all duration-300",
                          isDone ? "bg-k-mint-deep" : isCurrent ? "bg-k-crimson" : isStarted ? "bg-k-pink-deep" : "bg-k-bg2",
                          isCurrent && "shadow-[0_0_0_4px_white,0_0_0_5px_#A23B2E]"
                        )}
                      >
                        <span className={cn(
                          "font-k-serif text-[20px] font-medium leading-none",
                          isStarted || isCurrent ? "text-white" : "text-k-sub"
                        )}>
                          {hanja}
                        </span>
                      </div>
                      <div className="text-[9px] font-black text-k-sub mt-3 tracking-widest uppercase">
                        UNIT {String(unitIdx).padStart(2, '0')}
                      </div>
                      <div className={cn(
                        "text-[12px] font-black mt-1 text-center leading-tight tracking-tight px-2 line-clamp-2 min-h-[32px]",
                        isStarted || isCurrent ? "text-k-ink" : "text-k-sub/60"
                      )}>
                        {unit.title || `Unit ${unitIdx}`}
                      </div>
                      {isCurrent && (
                        <div className="mt-3 px-2 py-0.5 bg-k-crimson text-white text-[9px] font-black rounded uppercase">
                          NOW
                        </div>
                      )}
                      {isDone && (
                        <div className="mt-2 text-[10px] font-black text-k-mint-deep flex items-center gap-1">
                          ✓ {t('completed')}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </DesktopCard>
          </section>
        )}

      {/* 3. Learning Tools Grid */}
      <section>
        <div className="flex items-baseline mb-4 px-1">
          <span className="font-k-serif text-lg text-k-crimson font-medium mr-2 leading-none">具</span>
          <span className="text-[14px] font-black text-k-ink">{t('coursesOverview.desktop.learningTools.title')}</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { k: '詞', l: t('coursesOverview.desktop.learningTools.flashcards'), s: stats ? t('coursesOverview.desktop.learningTools.reviewStatus', { count: stats.vocabStats?.dueReviews || 0 }) : t('common.loading'), tone: 'pink', path: '/vocab-book' },
            { k: '文', l: t('coursesOverview.desktop.learningTools.grammar'), s: stats ? t('coursesOverview.desktop.learningTools.masteredStatus', { count: stats.grammarStats?.mastered || 0 }) : t('common.loading'), tone: 'mint', path: '/grammar' },
            { k: '寫', l: t('coursesOverview.desktop.learningTools.typing'), s: t('common.challengeMode', { defaultValue: 'Challenge' }), tone: 'butter', path: '/typing' },
            { k: '記', l: t('coursesOverview.desktop.learningTools.notebook'), s: t('common.notes', { defaultValue: 'Notes' }), tone: 'lilac', path: '/notebook' },
          ].map((m, i) => (
            <DesktopCard key={i} className="p-5 hover:border-k-ink/20 transition-all hover:-translate-y-1 cursor-pointer" onClick={() => navigate(m.path)}>
              <HanjaSeal c={m.k} size={36} bg={`var(--color-k-${m.tone}-deep)`} round={9} />
              <div className="text-[13px] font-black text-k-ink mt-3 tracking-tight">{m.l}</div>
              <div className="text-[11px] font-bold text-k-sub mt-1 opacity-80">{m.s}</div>
            </DesktopCard>
          ))}
        </div>
      </section>

      {/* 4. Course Library */}
      <section>
        <SectionHead kanji="庫" title={t('coursesLibrary.title', { defaultValue: 'COURSE LIBRARY' })} />
        <div className="space-y-10">
          {groupedCourses.map(([publisher, items]) => {
            const theme = PUBLISHER_THEMES[resolvePublisherKey(publisher)] || PUBLISHER_THEMES.default;
            return (
              <div key={publisher} className="space-y-5">
                <div className="flex items-center gap-3">
                  <div className={cn("h-4 w-1.5 rounded-full", theme.accent)} />
                  <h3 className="text-sm font-black text-k-ink uppercase tracking-widest">
                    {publisher}
                  </h3>
                  <div className="h-px flex-1 bg-k-line" />
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {items.map((course) => (
                    <DesktopCard 
                      key={course.id}
                      pad={0}
                      className={cn(
                        "group cursor-pointer border-transparent hover:border-k-ink/10 transition-all hover:shadow-xl",
                      )}
                      onClick={() => handleCourseOpen(course)}
                    >
                      <div className={cn("p-4 h-24 flex gap-4 items-center", theme.bg)}>
                        <div className="w-12 h-16 bg-white/40 rounded-lg shadow-sm shrink-0 border border-black/5 overflow-hidden group-hover:scale-105 transition-transform">
                          {course.coverUrl && (
                            <img src={course.coverUrl} className="w-full h-full object-cover" alt="" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className={cn("text-[10px] font-black uppercase tracking-widest opacity-60", theme.text)}>
                            {course.displayLevel || 'Level 1'}
                          </div>
                          <h4 className={cn("text-[13px] font-black leading-tight mt-1 line-clamp-2", theme.text)}>
                            {course.name}
                          </h4>
                        </div>
                      </div>
                      <div className="px-4 py-3 flex items-center justify-between bg-white">
                        <div className="text-[10px] font-bold text-k-sub uppercase tracking-wider">
                          {course.totalUnits} {t('coursesLibrary.units', { defaultValue: 'Units' })}
                        </div>
                        <ChevronRight size={14} className="text-k-sub-light group-hover:text-k-crimson transition-colors" />
                      </div>
                    </DesktopCard>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Tools and Community section */}
      <section>
        <div className="grid grid-cols-3 gap-4">
          <DesktopCard className="p-6 bg-k-crimson/10 border-k-crimson/20 group relative overflow-hidden">
            <div className="absolute -right-6 -bottom-6 font-k-serif text-[120px] font-black opacity-10 group-hover:rotate-12 transition-transform duration-700">記</div>
            <div className="relative z-10">
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-k-crimson text-[10px] font-black tracking-widest uppercase mb-4">
                Tool
              </div>
              <h3 className="text-xl font-black mb-2">{t('coursesOverview.desktop.vocabulary.center')}</h3>
              <p className="text-sm opacity-70 mb-6 font-medium leading-relaxed">
                {t('coursesOverview.desktop.vocabulary.description')}
              </p>
              <Button onClick={() => navigate('/vocab-book')} className="w-full rounded-xl bg-k-card text-k-ink text-[12px] font-black hover:bg-white transition-colors">
                {t('coursesOverview.desktop.vocabulary.startReview')} →
              </Button>
            </div>
          </DesktopCard>

          <DesktopCard pad={6} className="bg-k-mint/20 border-k-mint-deep/10">
             <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-black text-k-mint-deep tracking-widest uppercase">Community</span>
                <Award size={16} className="text-k-mint-deep" />
             </div>
             <p className="text-[13px] font-bold text-k-ink leading-relaxed">
                {t('coursesOverview.desktop.streakMessage', { count: stats?.streak || 0, percent: Math.min(99, 50 + (stats?.streak || 0) * 2) })}
             </p>
          </DesktopCard>
        </div>
      </section>

      {/* 2. Library */}
      <section>
        <div className="flex items-center justify-between mb-6 px-1">
          <SectionHead kanji="庫" title="COURSE LIBRARY" className="mb-0" />
          <div className="relative w-[280px]">
             <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-k-sub-light" />
             <input 
                type="text" 
                placeholder={t('coursesOverview.desktop.searchCourses')}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full h-9 pl-10 pr-4 rounded-full bg-k-card border border-k-line text-[12px] font-bold text-k-ink focus:outline-none focus:ring-2 focus:ring-k-ink/5 transition-all"
             />
          </div>
        </div>

        <div className="space-y-8">
          {groupedCourses.map(([publisher, pCourses]) => {
            const pubKey = resolvePublisherKey(publisher);
            const theme = PUBLISHER_THEMES[pubKey];
            
            return (
              <div key={publisher}>
                <div className="flex items-center gap-3 mb-4 px-2">
                   <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center border border-k-line/10", theme.bg)}>
                      <span className={cn("text-xs font-black", theme.text)}>{publisher.charAt(0)}</span>
                   </div>
                   <h3 className="text-sm font-black text-k-ink uppercase tracking-widest">
                     {publisher}
                   </h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 px-1">
                  {pCourses.map(course => (
                    <button
                      key={course.id}
                      onClick={() => handleCourseOpen(course)}
                      className="group text-left bg-k-card border border-k-line rounded-2xl p-5 shadow-k-sh-sm hover:shadow-k-sh hover:-translate-y-1 transition-all flex items-center gap-5"
                    >
                      <div className="w-16 h-24 rounded-lg bg-k-bg2 shadow-sm overflow-hidden shrink-0 border border-k-line/5">
                        {course.coverUrl ? (
                          <img src={course.coverUrl} className="w-full h-full object-cover" alt="" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <BookMarked size={20} className="text-k-sub-light" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5">
                           <span className={cn("px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider", theme.bg, theme.text)}>
                               {formatLevel(course.displayLevel || '1')}
                           </span>
                           <span className="text-[10px] font-bold text-k-sub-light">UNIT {course.totalUnits}</span>
                        </div>
                        <h4 className="text-[16px] font-black text-k-ink leading-snug line-clamp-2 group-hover:text-k-crimson transition-colors">
                          {course.name}
                        </h4>
                      </div>
                      <ChevronRight size={18} className="text-k-line2 group-hover:text-k-ink transition-colors" />
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
    );
  };

  const renderGrammarTab = () => (
    <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* 1. Category Sidebar */}
      <aside className="space-y-6">
        <DesktopCard pad={0} className="overflow-hidden">
          <div className="p-4 border-b border-k-line flex items-center gap-2">
            <span className="font-k-serif text-sm text-k-crimson font-medium">表</span>
            <span className="text-[12px] font-black text-k-ink uppercase tracking-wider">{t('grammarModule.catalog', { defaultValue: 'Grammar Catalog' })}</span>
          </div>
          <div className="divide-y divide-k-line max-h-[600px] overflow-y-auto hide-scrollbar">
            {groupedGrammars.map(([unitId, points]) => (
              <div key={unitId}>
                <div className="px-4 py-2 bg-k-bg2/50 text-[10px] font-black text-k-sub uppercase tracking-widest border-y border-k-line/10">
                  {t(`coursesOverview.desktop.grammar.categories.${unitId}`, { defaultValue: `Unit ${unitId}` })}
                </div>
                {points.map((g) => (
                  <div 
                    key={g.id} 
                    onClick={() => setSelectedGrammarId(g.id)}
                    className={cn(
                      "px-4 py-3.5 cursor-pointer border-l-[3px] transition-all",
                      effectiveSelectedGrammarId === g.id ? "bg-k-crimson/5 border-k-crimson" : "border-transparent hover:bg-k-bg2/30"
                    )}
                  >
                    <div className={cn("text-[13px] font-black", effectiveSelectedGrammarId === g.id ? "text-k-ink" : "text-k-ink2/80")}>{g.title}</div>
                    <div className="text-[10px] font-bold text-k-sub mt-1">{g.status === 'MASTERED' ? t('status.mastered', { defaultValue: 'Mastered' }) : t('status.learning', { defaultValue: 'Learning' })}</div>
                  </div>
                ))}
              </div>
            ))}
            {grammarPoints?.length === 0 && (
              <div className="p-8 text-center text-k-sub text-xs italic font-bold">
                No grammar points found for this course.
              </div>
            )}
          </div>
        </DesktopCard>

        {/* Stats card */}
        <DesktopCard className="bg-k-ink text-k-bg p-5">
           <div className="text-[10px] font-black tracking-widest uppercase opacity-60 mb-2">{t('coursesOverview.desktop.grammar.myProgress', { defaultValue: 'My Progress' })}</div>
           <div className="text-2xl font-black mb-1">{stats?.grammarStats?.mastered || 0} / {stats?.grammarStats?.total || 0}</div>
           <div className="text-[11px] font-bold opacity-70">{t('coursesOverview.desktop.grammar.masteryRate', { defaultValue: 'Mastery Rate' })} {stats?.grammarStats?.total ? Math.round((stats.grammarStats.mastered / stats.grammarStats.total) * 100) : 0}%</div>
        </DesktopCard>
      </aside>

      {/* 2. Detail Content */}
      <div className="space-y-6">
        {selectedGrammarDetail ? (
          <DesktopCard className="p-8">
            <div className="flex items-center justify-between mb-2">
              <span className="px-2 py-0.5 bg-k-crimson text-white text-[10px] font-black rounded uppercase tracking-widest">
                Unit {selectedGrammarDetail.unitId} · {formatLevel(selectedGrammarDetail.level)}
              </span>
              <Button variant="ghost" size="sm" className="h-8 text-k-sub font-bold text-[11px]">
                {t('community.desktop.share', 'Share')} ↗
              </Button>
            </div>
            
            <h2 className="font-k-serif text-[48px] font-medium text-k-ink leading-tight tracking-tight mb-2">
              {selectedGrammarDetail.title}
            </h2>
            <p className="text-[15px] font-bold text-k-sub mb-8">
              {selectedGrammarDetail.summary}
            </p>

            {/* Multi-language summaries */}
            {(selectedGrammarDetail.summaryEn || selectedGrammarDetail.summaryVi || selectedGrammarDetail.summaryMn) && (
              <div className="mt-2 space-y-1 mb-8">
                {selectedGrammarDetail.summaryEn && (
                  <RedEyeBlock enabled={redEyeMode}>
                    <div className="text-[12px]" style={{ color: '#bbb' }}>EN: {selectedGrammarDetail.summaryEn}</div>
                  </RedEyeBlock>
                )}
                {selectedGrammarDetail.summaryVi && (
                  <RedEyeBlock enabled={redEyeMode}>
                    <div className="text-[12px]" style={{ color: '#bbb' }}>VI: {selectedGrammarDetail.summaryVi}</div>
                  </RedEyeBlock>
                )}
                {selectedGrammarDetail.summaryMn && (
                  <RedEyeBlock enabled={redEyeMode}>
                    <div className="text-[12px]" style={{ color: '#bbb' }}>MN: {selectedGrammarDetail.summaryMn}</div>
                  </RedEyeBlock>
                )}
              </div>
            )}

            {/* Controls */}
            <div className="mb-8 flex items-center gap-3">
              <button
                className="cursor-pointer rounded-[8px] border px-[12px] py-[6px] text-[11px] font-bold transition-all"
                style={{ 
                  background: redEyeMode ? '#c41230' : '#faf8f5',
                  borderColor: redEyeMode ? '#c41230' : '#e8e5e0',
                  color: redEyeMode ? '#fff' : '#999'
                }}
                onClick={() => setRedEyeMode(!redEyeMode)}
              >
                {redEyeMode ? <EyeOff size={14} className="mr-1 inline" /> : <Eye size={14} className="mr-1 inline" />}
                {redEyeMode ? t('coursesOverview.desktop.grammar.redEyeOff') : t('coursesOverview.desktop.grammar.redEyeMode')}
              </button>
            </div>

            {/* Sections */}
            {selectedGrammarDetail.sections && (
              <div className="space-y-[24px] mb-8">
                {selectedGrammarDetail.sections.introduction?.zh && (
                  <div className="rounded-[14px] border px-[24px] py-[18px]" style={{ borderColor: '#eee' }}>
                    <div className="mb-3 flex items-center gap-2">
                      <Lightbulb size={16} style={{ color: '#c41230' }} />
                      <span className="text-[12px] font-extrabold tracking-[1px]" style={{ color: '#1f1b17' }}>
                        {t('coursesOverview.desktop.grammar.introduction')} · INTRODUCTION
                      </span>
                    </div>
                    <MarkdownRenderer content={selectedGrammarDetail.sections.introduction.zh} redEyeEnabled={redEyeMode} t={t} />
                    {selectedGrammarDetail.sections.introduction.en && (
                      <RedEyeBlock enabled={redEyeMode}>
                        <div className="mt-6 pt-6 border-t border-dashed border-[#f0ede8]">
                          <MarkdownRenderer content={`EN: ${selectedGrammarDetail.sections.introduction.en}`} redEyeEnabled={redEyeMode} t={t} />
                        </div>
                      </RedEyeBlock>
                    )}
                  </div>
                )}

                {selectedGrammarDetail.sections.core?.zh && (
                  <div className="rounded-[14px] border px-[24px] py-[18px]" style={{ borderColor: '#eee' }}>
                    <div className="mb-3 flex items-center gap-2">
                      <BookOpen size={16} style={{ color: '#c41230' }} />
                      <span className="text-[12px] font-extrabold tracking-[1px]" style={{ color: '#1f1b17' }}>
                        {t('coursesOverview.desktop.grammar.coreUsage')} · CORE USAGE
                      </span>
                    </div>
                    <MarkdownRenderer content={selectedGrammarDetail.sections.core.zh} redEyeEnabled={redEyeMode} t={t} />
                    {selectedGrammarDetail.sections.core.en && (
                      <RedEyeBlock enabled={redEyeMode}>
                        <div className="mt-6 pt-6 border-t border-dashed border-[#f0ede8]">
                          <MarkdownRenderer content={`EN: ${selectedGrammarDetail.sections.core.en}`} redEyeEnabled={redEyeMode} t={t} />
                        </div>
                      </RedEyeBlock>
                    )}
                  </div>
                )}

                {selectedGrammarDetail.sections.comparative?.zh && (
                  <div className="rounded-[14px] border px-[24px] py-[18px]" style={{ borderColor: '#eee' }}>
                    <div className="mb-3 flex items-center gap-2">
                      <Sparkles size={16} style={{ color: '#c41230' }} />
                      <span className="text-[12px] font-extrabold tracking-[1px]" style={{ color: '#1f1b17' }}>
                        {t('coursesOverview.desktop.grammar.comparative')} · COMPARATIVE
                      </span>
                    </div>
                    <MarkdownRenderer content={selectedGrammarDetail.sections.comparative.zh} redEyeEnabled={redEyeMode} t={t} />
                    {selectedGrammarDetail.sections.comparative?.en && (
                      <RedEyeBlock enabled={redEyeMode}>
                        <div className="mt-6 pt-6 border-t border-dashed border-[#f0ede8]">
                          <MarkdownRenderer content={`EN: ${selectedGrammarDetail.sections.comparative.en}`} redEyeEnabled={redEyeMode} t={t} />
                        </div>
                      </RedEyeBlock>
                    )}
                  </div>
                )}

                {selectedGrammarDetail.sections.cultural?.zh && (
                  <div className="rounded-[14px] border px-[24px] py-[18px]" style={{ borderColor: '#eee' }}>
                    <div className="mb-3 flex items-center gap-2">
                      <HelpCircle size={16} style={{ color: '#c41230' }} />
                      <span className="text-[12px] font-extrabold tracking-[1px]" style={{ color: '#1f1b17' }}>
                        {t('coursesOverview.desktop.grammar.culturalNotes')} · CULTURAL NOTES
                      </span>
                    </div>
                    <MarkdownRenderer content={selectedGrammarDetail.sections.cultural.zh} redEyeEnabled={redEyeMode} t={t} />
                    {selectedGrammarDetail.sections.cultural?.en && (
                      <RedEyeBlock enabled={redEyeMode}>
                        <div className="mt-6 pt-6 border-t border-dashed border-[#f0ede8]">
                          <MarkdownRenderer content={`EN: ${selectedGrammarDetail.sections.cultural.en}`} redEyeEnabled={redEyeMode} t={t} />
                        </div>
                      </RedEyeBlock>
                    )}
                  </div>
                )}

                {selectedGrammarDetail.sections.commonMistakes?.zh && (
                  <div className="rounded-[14px] border px-[24px] py-[18px]" style={{ borderColor: '#eee' }}>
                    <div className="mb-3 flex items-center gap-2">
                      <AlertTriangle size={16} style={{ color: '#c41230' }} />
                      <span className="text-[12px] font-extrabold tracking-[1px]" style={{ color: '#1f1b17' }}>
                        {t('coursesOverview.desktop.grammar.commonMistakes')} · COMMON MISTAKES
                      </span>
                    </div>
                    <MarkdownRenderer content={selectedGrammarDetail.sections.commonMistakes.zh} redEyeEnabled={redEyeMode} t={t} />
                    {selectedGrammarDetail.sections.commonMistakes?.en && (
                      <RedEyeBlock enabled={redEyeMode}>
                        <div className="mt-6 pt-6 border-t border-dashed border-[#f0ede8]">
                          <MarkdownRenderer content={`EN: ${selectedGrammarDetail.sections.commonMistakes.en}`} redEyeEnabled={redEyeMode} t={t} />
                        </div>
                      </RedEyeBlock>
                    )}
                  </div>
                )}

                {selectedGrammarDetail.sections.review?.zh && (
                  <div className="rounded-[14px] border px-[24px] py-[18px]" style={{ borderColor: '#eee' }}>
                    <div className="mb-3 flex items-center gap-2">
                      <CheckCircle2 size={16} style={{ color: '#c41230' }} />
                      <span className="text-[12px] font-extrabold tracking-[1px]" style={{ color: '#1f1b17' }}>
                        {t('coursesOverview.desktop.grammar.review')} · REVIEW
                      </span>
                    </div>
                    <MarkdownRenderer content={selectedGrammarDetail.sections.review.zh} redEyeEnabled={redEyeMode} t={t} />
                    {selectedGrammarDetail.sections.review?.en && (
                      <RedEyeBlock enabled={redEyeMode}>
                        <div className="mt-6 pt-6 border-t border-dashed border-[#f0ede8]">
                          <MarkdownRenderer content={`EN: ${selectedGrammarDetail.sections.review.en}`} redEyeEnabled={redEyeMode} t={t} />
                        </div>
                      </RedEyeBlock>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Explanation */}
            {selectedGrammarDetail.explanation && (
              <div className="mb-8">
                <div className="mb-2 text-[11px] font-extrabold tracking-[2px]" style={{ color: '#999' }}>
                  {t('coursesOverview.desktop.grammar.explanation')} · EXPLANATION
                </div>
                <div className="rounded-[14px] px-[24px] py-[18px]" style={{ background: '#faf8f5' }}>
                  <MarkdownRenderer content={selectedGrammarDetail.explanation} redEyeEnabled={redEyeMode} t={t} />
                </div>
                {selectedGrammarDetail.explanationEn && (
                  <RedEyeBlock enabled={redEyeMode}>
                    <div className="mt-4 rounded-[14px] px-[24px] py-[18px]" style={{ background: '#faf8f5' }}>
                      <div className="mb-4 text-[11px] font-extrabold uppercase tracking-[0.15em] text-k-sub">ENGLISH EXPLANATION</div>
                      <MarkdownRenderer content={selectedGrammarDetail.explanationEn} redEyeEnabled={redEyeMode} t={t} />
                    </div>
                  </RedEyeBlock>
                )}
              </div>
            )}

            {/* Rules Grid */}
            {selectedGrammarDetail.conjugationRules && (
              <div className="bg-k-bg2/40 rounded-2xl p-6 border border-k-line/20 mb-8">
                <div className="text-[11px] font-black text-k-sub uppercase tracking-[2px] mb-4">{t('coursesOverview.desktop.grammar.conjugationRules', { defaultValue: 'CONSTRUCTIONS' })}</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {Object.entries(selectedGrammarDetail.conjugationRules).map(([key, val], idx) => (
                    <div key={idx}>
                      <div className="text-[11px] font-black text-k-sub mb-2 opacity-60">{key}</div>
                      <div className="font-k-serif text-2xl text-k-ink">
                        {String(val)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Examples */}
            {selectedGrammarDetail.examples && selectedGrammarDetail.examples.length > 0 && (
              <div className="space-y-3 mb-8">
                <div className="text-[11px] font-black text-k-sub uppercase tracking-[2px] mb-3">{t('coursesOverview.desktop.grammar.examples', { defaultValue: 'EXAMPLES' })}</div>
                {selectedGrammarDetail.examples.map((e, i) => (
                  <div key={i} className="group p-5 rounded-xl border border-k-line hover:border-k-ink/10 bg-white transition-all">
                    <div className="font-k-serif text-lg text-k-ink leading-relaxed">
                      {e.kr}
                    </div>
                    {e.cn && (
                      <RedEyeBlock enabled={redEyeMode}>
                        <div className="text-[12px] font-bold text-k-sub mt-2">{e.cn}</div>
                      </RedEyeBlock>
                    )}
                    {e.en && (
                      <RedEyeBlock enabled={redEyeMode}>
                        <div className="mt-1 text-[11px] text-k-sub/70">EN: {e.en}</div>
                      </RedEyeBlock>
                    )}
                  </div>
                ))}
              </div>
            )}

          </DesktopCard>
        ) : unitGrammars === undefined ? (
          <div className="flex h-64 items-center justify-center text-k-sub font-bold">
            {t('common.loading', 'Loading...')}
          </div>
        ) : (
          <div className="flex h-64 flex-col items-center justify-center text-k-sub font-bold gap-4">
            <div className="text-4xl opacity-20">📭</div>
            <div>{t('coursesOverview.desktop.grammar.noDetail', { defaultValue: 'Grammar detail not available for this language.' })}</div>
            <Button variant="outline" size="sm" onClick={() => setSelectedGrammarId(null)}>
              {t('common.back', 'Back')}
            </Button>
          </div>
        )}


      </div>
    </div>
  );


  const renderVocabularyTab = () => (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* 1. Primary Actions: Review & Learn */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <DesktopCard 
          className="relative overflow-hidden bg-k-crimson text-white group cursor-pointer h-[180px] flex flex-col justify-between p-6"
          onClick={() => navigate(`/vocab-book/review?${activeCourseId ? `courseId=${activeCourseId}&` : ''}category=DUE`)}
        >
          <div className="absolute -right-2 -top-4 font-k-serif text-[100px] text-white/10 pointer-events-none">復</div>
          <div>
            <div className="px-2 py-0.5 bg-k-ink text-white text-[9px] font-black rounded uppercase tracking-widest w-fit mb-2">
              FSRS · {t('coursesOverview.desktop.vocabulary.dueToday')}
            </div>
            <div className="text-4xl font-black">{stats?.vocabStats?.dueReviews || 0} <span className="text-lg opacity-80">{t('cards', { defaultValue: 'Cards' })}</span></div>
          </div>
          <Button className="w-full bg-white text-k-crimson hover:bg-white/90 text-[12px] font-black rounded-xl h-10">
            {t('coursesOverview.desktop.vocabulary.startReview')} →
          </Button>
        </DesktopCard>

        <DesktopCard 
          className="relative overflow-hidden bg-k-ink text-white group cursor-pointer h-[180px] flex flex-col justify-between p-6"
          onClick={() => navigate(`/vocab-book/immerse?${activeCourseId ? `courseId=${activeCourseId}&` : 'all=true&'}category=UNLEARNED`)}
        >
          <div className="absolute -right-2 -top-4 font-k-serif text-[100px] text-white/10 pointer-events-none">新</div>
          <div>
            <div className="px-2 py-0.5 bg-k-crimson text-white text-[9px] font-black rounded uppercase tracking-widest w-fit mb-2">
              NEW · {t('coursesOverview.desktop.vocabulary.availableToLearn', { defaultValue: 'Available to Learn' })}
            </div>
            <div className="text-4xl font-black">{stats?.vocabStats?.unlearned || 0} <span className="text-lg opacity-80">{t('words', { defaultValue: 'Words' })}</span></div>
          </div>
          <Button className="w-full bg-k-crimson text-white hover:bg-k-crimson/90 text-[12px] font-black rounded-xl h-10 border-none">
            {t('coursesOverview.desktop.vocabulary.startLearning', { defaultValue: 'Start Learning' })} →
          </Button>
        </DesktopCard>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { k: '學', n: stats?.todayWordsStudied || '0', l: t('coursesOverview.desktop.vocabulary.studiedToday', { defaultValue: 'Studied Today' }), tone: 'mint' },
          { k: '通', n: stats?.vocabStats?.mastered || '0', l: t('coursesOverview.desktop.vocabulary.mastered'), tone: 'butter' },
          { k: '新', n: stats?.vocabStats?.unlearned || '0', l: t('coursesOverview.desktop.vocabulary.toLearn', { defaultValue: 'To Learn' }), tone: 'pink' },
          { k: '全', n: stats?.vocabStats?.total || '0', l: t('common.all', { defaultValue: 'All Content' }), tone: 'lilac' },
        ].map((s, i) => (
          <DesktopCard key={i} className="p-5 flex items-center gap-4">
            <HanjaSeal c={s.k} size={40} bg={`var(--color-k-${s.tone}-deep)`} round={10} />
            <div>
              <div className="text-2xl font-black text-k-ink tracking-tight">{s.n}</div>
              <div className="text-[11px] font-bold text-k-sub">{s.l}</div>
            </div>
          </DesktopCard>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <section>
            <div className="flex items-baseline mb-4">
              <span className="font-k-serif text-lg text-k-crimson font-medium mr-2 leading-none">冊</span>
              <span className="text-[14px] font-black text-k-ink uppercase tracking-wider">{t('coursesOverview.desktop.vocabulary.myWordbooks', { defaultValue: 'My Wordbooks' })}</span>
              <button className="ml-auto text-[11px] font-bold text-k-sub hover:text-k-crimson" onClick={() => navigate('/vocab-book')}>+ {t('coursesOverview.desktop.vocabulary.create', { defaultValue: 'Create' })}</button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <DesktopCard 
                className={cn(
                  "p-4 relative overflow-hidden group cursor-pointer transition-all border-2",
                  activeCourseId === null ? "border-k-crimson shadow-md bg-k-crimson/5" : "border-transparent"
                )} 
                onClick={() => setActiveCourseId(null)}
              >
                <div className="flex items-center gap-4">
                  <HanjaSeal c="全" size={32} bg="var(--color-k-ink)" round={8} />
                  <div>
                    <div className="text-[14px] font-black text-k-ink tracking-tight">{t('common.allWordbooks', { defaultValue: 'All Wordbooks' })}</div>
                    <div className="text-[10px] font-bold text-k-sub mt-0.5">{stats?.vocabStats?.total || 0} {t('words', { defaultValue: 'Words' })}</div>
                  </div>
                </div>
              </DesktopCard>

              {(() => {
                const sortedCourses = [...(stats?.courseProgress || [])].sort((a, b) => {
                  // Sort by name (which often includes the level number)
                  return a.courseName.localeCompare(b.courseName, undefined, { numeric: true, sensitivity: 'base' });
                });

                return sortedCourses.map((d, i) => {
                  const tone = BEAD_TONES[i % BEAD_TONES.length];
                  const isActive = activeCourseId === d.courseId;
                  const progress = d.totalUnits ? Math.round((d.completedUnits / d.totalUnits) * 100) : 0;
                  
                  return (
                    <DesktopCard 
                      key={d.courseId} 
                      className={cn(
                        "p-4 relative overflow-hidden group cursor-pointer transition-all border-2",
                        isActive ? "border-k-crimson shadow-md bg-k-crimson/5" : "border-transparent hover:border-k-line"
                      )} 
                      onClick={() => setActiveCourseId(d.courseId)}
                    >
                      <div className="flex items-center gap-4">
                        <div className="relative">
                          <HanjaSeal c={d.courseName.charAt(0)} size={40} bg={`var(--color-k-${tone}-deep)`} round={10} />
                          {progress === 100 && (
                            <div className="absolute -right-1 -top-1 bg-k-crimson text-white rounded-full p-0.5 border-2 border-white">
                              <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" />
                              </svg>
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-0.5">
                            <div className="text-[14px] font-black text-k-ink tracking-tight line-clamp-1">{d.courseName}</div>
                            <div className="text-[10px] font-black text-k-crimson px-1.5 py-0.5 bg-k-crimson/10 rounded-md">
                              {d.displayLevel ? (isNaN(Number(d.displayLevel)) ? d.displayLevel : `${d.displayLevel}级`) : 'Book'}
                            </div>
                          </div>
                          <div className="flex items-center justify-between text-[10px] font-bold text-k-sub">
                             <span>{d.completedUnits} / {d.totalUnits || 0} Units</span>
                             <span>{progress}%</span>
                          </div>
                          <div className="mt-2 h-1 w-full bg-k-line rounded-full overflow-hidden">
                             <div 
                               className={cn("h-full transition-all duration-700", isActive ? "bg-k-crimson" : `bg-k-${tone}-deep`)} 
                               style={{ width: `${progress}%` }} 
                             />
                          </div>
                        </div>
                      </div>
                    </DesktopCard>
                  );
                });
              })()}
            </div>
          </section>

          <section>
            <div className="flex items-baseline mb-4">
              <span className="font-k-serif text-lg text-k-crimson font-medium mr-2 leading-none">練</span>
              <span className="text-[14px] font-black text-k-ink uppercase tracking-wider">{t('coursesOverview.desktop.vocabulary.modes.title', { defaultValue: 'Practice Modes' })}</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { id: 'flashcard', k: '閃', l: t('coursesOverview.desktop.vocabulary.modes.flashcard', { defaultValue: '闪卡' }), s: 'SRS' },
                { id: 'learn', k: '習', l: t('coursesOverview.desktop.vocabulary.modes.learn', { defaultValue: '学习' }), s: 'Learn' },
                { id: 'test', k: '考', l: t('coursesOverview.desktop.vocabulary.modes.test', { defaultValue: '考试' }), s: 'Test' },
                { id: 'match', k: '图', l: t('coursesOverview.desktop.vocabulary.modes.match', { defaultValue: '拼图' }), s: 'Match' },
              ].map((m) => (
                <DesktopCard 
                  key={m.id} 
                  className="p-4 hover:border-k-ink/20 transition-all cursor-pointer group"
                  onClick={() => {
                    const params = new URLSearchParams();
                    if (activeCourseId) params.set('courseId', activeCourseId);
                    params.set('category', vocabCategory);
                    params.set('mode', m.id);
                    navigate(`/vocab-book/practice?${params.toString()}`);
                  }}
                >
                  <div className="flex items-center justify-between mb-4">
                    <HanjaSeal c={m.k} size={32} bg="var(--color-k-bg2)" round={8} />
                    <ChevronRight className="w-4 h-4 text-k-sub opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <h4 className="text-[14px] font-black text-k-ink mb-1">{m.l}</h4>
                  <div className="text-[10px] font-bold text-k-sub uppercase tracking-wider">{m.s}</div>
                </DesktopCard>
              ))}
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <DesktopCard className="p-6">
            <div className="flex items-baseline mb-6">
              <span className="font-k-serif text-lg text-k-crimson font-medium mr-2 leading-none">豫</span>
              <span className="text-[14px] font-black text-k-ink uppercase tracking-wider">{t('coursesOverview.desktop.vocabulary.forecast')}</span>
            </div>
            <div className="flex items-end justify-between gap-2 h-[120px] px-2">
              {(forecast || [0, 0, 0, 0, 0, 0, 0]).map((v, i) => {
                const maxVal = Math.max(...(forecast || [1]));
                const height = maxVal > 0 ? (v / maxVal) * 100 : 0;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
                    <div 
                      className={cn(
                        "w-full rounded-t-lg transition-all duration-500",
                        i === 0 ? "bg-k-crimson" : "bg-k-lilac/40 group-hover:bg-k-lilac"
                      )} 
                      style={{ height: `${Math.max(4, height)}%` }} 
                    />
                    <div className="text-[10px] font-bold text-k-sub">{['T','+1','+2','+3','+4','+5','+6'][i]}</div>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 pt-4 border-t border-k-line/10 text-center">
              <div className="text-[11px] font-bold text-k-sub tracking-wider uppercase">{t('coursesOverview.desktop.vocabulary.totalProgress', { defaultValue: 'Total Progress' })}</div>
              <div className="text-2xl font-black text-k-ink mt-1">
                {Math.round(((stats?.vocabStats?.mastered || 0) / (stats?.vocabStats?.total || 1)) * 100)}%
              </div>
            </div>
          </DesktopCard>

          <DesktopCard className="p-4">
             <div className="text-[11px] font-black text-k-sub uppercase tracking-widest mb-3">{t('common.filter', { defaultValue: 'Filter Content' })}</div>
             <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'DUE', label: t('vocab.due', 'Review') },
                  { id: 'UNLEARNED', label: t('vocab.unlearned', 'New') },
                  { id: 'ALL', label: t('common.all', 'All') },
                  { id: 'MASTERED', label: t('vocab.mastered', 'Mastered') },
                ].map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setVocabCategory(cat.id as any)}
                    className={cn(
                      "px-3 py-2 rounded-xl text-[11px] font-black transition-all border",
                      vocabCategory === cat.id 
                        ? "bg-k-ink text-k-bg border-k-ink" 
                        : "bg-k-bg2/40 text-k-sub border-transparent hover:border-k-line"
                    )}
                  >
                    {cat.label}
                  </button>
                ))}
             </div>
          </DesktopCard>
        </div>
      </div>
    </div>
  );

  const renderTypingTab = () => (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* 1. Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { l: t('coursesOverview.desktop.typing.avgSpeed'), v: typingStats?.averageWpm || '0', u: 'WPM', tone: 'mint' },
          { l: t('coursesOverview.desktop.typing.accuracy'), v: typingStats?.averageAccuracy || '0', u: '%', tone: 'butter' },
          { l: t('coursesOverview.desktop.typing.totalTests'), v: typingStats?.totalTests || '0', u: 'tests', tone: 'pink' },
          { l: t('coursesOverview.desktop.typing.highestSpeed'), v: typingStats?.highestWpm || '0', u: 'WPM', tone: 'lilac' },
        ].map((s, i) => (
          <DesktopCard key={i} className="p-5">
            <div className="text-[10px] font-black text-k-sub uppercase tracking-widest mb-2">{s.l}</div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-black text-k-ink tracking-tighter">{s.v}</span>
              <span className="text-[11px] font-bold text-k-sub">{s.u}</span>
            </div>
          </DesktopCard>
        ))}
      </div>

      {/* 2. Typing Area */}
      <DesktopCard className="p-10 relative">
        <div className="absolute top-6 left-8">
           <span className="px-2 py-0.5 bg-k-ink text-white text-[10px] font-black rounded uppercase tracking-widest">
             {sampleTypingText?.category || t('coursesOverview.desktop.typing.commonPhrases', { defaultValue: 'Common Phrases' })} · {t('common.intermediate', 'Intermediate')}
           </span>
        </div>
        
        <div className="mt-8 p-8 bg-k-bg2/40 rounded-2xl border border-k-line/20">
          <div className="font-k-serif text-3xl text-k-ink/30 leading-relaxed tracking-wide select-none">
            {sampleTypingText?.content || '벚꽃이 피는 봄날에 친구와 함께 한강 공원을 산책했어요.'}
          </div>
          <div className="absolute inset-x-0 top-32 px-18 font-k-serif text-3xl text-k-ink leading-relaxed tracking-wide text-center">
            {sampleTypingText?.title || '벚꽃이 피는 봄날에...'}
            <span className="inline-block w-1 h-8 bg-k-crimson ml-1 animate-pulse vertical-middle" />
          </div>
        </div>

        <div className="mt-12 flex justify-center gap-2">
           {['ㅂ','ㅈ','ㄷ','ㄱ','ㅅ','ㅛ','ㅕ','ㅑ','ㅐ','ㅔ'].map((k, i) => (
             <div key={i} className={cn(
               "w-12 h-14 rounded-xl flex items-center justify-center font-k-serif text-xl font-medium shadow-sm transition-all",
               k === 'ㄱ' ? "bg-k-crimson text-white scale-110 shadow-lg" : "bg-white text-k-ink border border-k-line"
             )}>
               {k}
             </div>
           ))}
        </div>
        <div className="text-center mt-6 text-[11px] font-bold text-k-sub">
          {t('coursesOverview.desktop.typing.practicePrompt')}
        </div>
        <div className="flex justify-center mt-8">
          <Button 
            className="bg-k-ink text-white hover:bg-k-ink/90 px-8 py-3 rounded-2xl text-[13px] font-black"
            onClick={() => navigate('/typing')}
          >
            {t('coursesOverview.desktop.typing.fullMode')} →
          </Button>
        </div>
      </DesktopCard>
    </div>
  );


  const renderTopikTab = () => (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* 1. Hero Card */}
      <DesktopCard 
        pad={24} 
        className="relative overflow-hidden bg-k-indigo text-white p-8"
      >
        <div className="absolute -right-6 -top-8 font-k-serif text-[160px] text-white/5 pointer-events-none">試</div>
        <div className="px-2 py-0.5 bg-white/20 text-white text-[10px] font-black rounded uppercase tracking-widest w-fit mb-4">
          TOPIK {featuredTopikExam?.level || 'II'} · {t('coursesOverview.desktop.topik.mockExam', { defaultValue: 'Mock Exam' })}
        </div>
        <h2 className="text-3xl font-black mb-2 tracking-tight">
          {featuredTopikExam?.title || t('coursesOverview.desktop.topik.examTitlePlaceholder', { defaultValue: 'Session 88 · Full Mock Exam' })}
        </h2>
        <p className="text-[13px] font-bold opacity-70 mb-8">
          {featuredTopikExam?.description || t('coursesOverview.desktop.topik.examInfo', { defaultValue: 'Listening 50 · Writing 4 · Reading 50 · 180 min' })}
        </p>
        
        <div className="flex items-center gap-12">
          <div>
            <div className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-1">{t('coursesOverview.desktop.topik.predictedScore', { defaultValue: 'Predicted Score' })}</div>
            <div className="font-k-serif text-3xl font-medium">{(stats as any)?.examAttempts?.[0]?.score || '---'} / 300</div>
          </div>
          <div className="w-px h-10 bg-white/20" />
          <div>
            <div className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-1">{t('coursesOverview.desktop.topik.targetLevel', { defaultValue: 'Target Level' })}</div>
            <div className="font-k-serif text-3xl font-medium">{featuredTopikExam?.level === 1 ? '2' : '4'} {t('dashboard.desktop.level', { defaultValue: 'Level' })}</div>
          </div>
          <div className="flex-1" />
          <Button 
            className="bg-k-crimson text-white hover:bg-k-crimson/90 px-8 py-4 rounded-2xl text-[14px] font-black shadow-xl shadow-k-crimson/20 h-fit"
            onClick={() => featuredTopikExam && navigate(`/topik/${featuredTopikExam.id}`)}
          >
            {t('coursesOverview.desktop.topik.startExam', { defaultValue: 'Start Exam' })} →
          </Button>
        </div>
      </DesktopCard>

      {/* 2. Sections */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { k: '聽', l: t('courseDashboard.modules.listening'), n: 50, t: '60 min', p: 78, tone: 'mint' },
          { k: '寫', l: t('courseDashboard.modules.grammar'), n: 4, t: '50 min', p: 54, tone: 'pink' },
          { k: '讀', l: t('courseDashboard.modules.reading'), n: 50, t: '70 min', p: 82, tone: 'butter' },
        ].map((s, i) => (
          <DesktopCard key={i} className="p-6">
            <div className="flex items-center justify-between mb-6">
              <HanjaSeal c={s.k} size={48} bg={`var(--color-k-${s.tone}-deep)`} round={12} />
              <div className="text-right">
                 <div className="text-2xl font-black text-k-ink leading-none">{s.p}%</div>
                 <div className="text-[10px] font-bold text-k-sub mt-1">Accuracy</div>
              </div>
            </div>
            <h4 className="text-[16px] font-black text-k-ink mb-1">{s.l}</h4>
            <div className="text-[11px] font-bold text-k-sub mb-4">{s.n} {t('coursesOverview.desktop.topik.questions', { defaultValue: 'Questions' })} · {s.t}</div>
            <div className="h-1.5 w-full bg-k-line rounded-full overflow-hidden">
              <div className={cn("h-full", `bg-k-${s.tone}-deep`)} style={{ width: `${s.p}%` }} />
            </div>
          </DesktopCard>
        ))}
      </div>

      {/* 3. Recent Attempts */}
      <section>
        <DesktopCard pad={0}>
          <div className="p-5 border-b border-k-line flex items-baseline">
            <span className="font-k-serif text-lg text-k-crimson font-medium mr-2 leading-none">錄</span>
            <span className="text-[14px] font-black text-k-ink uppercase tracking-wider">{t('coursesOverview.desktop.topik.recentAttempts', { defaultValue: 'Recent Mock Exam Records' })}</span>
          </div>
          <div className="divide-y divide-k-line">
            {topikHistory && topikHistory.length > 0 ? (
              topikHistory.map((r) => {
                const dateObj = new Date(r.submittedAt);
                return (
                  <div key={r.id} className="p-5 flex items-center gap-6 hover:bg-k-bg2/30 transition-colors cursor-pointer">
                    <div className="w-12 h-12 bg-k-bg2 rounded-xl flex flex-col items-center justify-center shrink-0">
                      <div className="text-[9px] font-black text-k-sub uppercase">{t('months', { defaultValue: 'Month' }) + ' ' + (dateObj.getMonth() + 1)}</div>
                      <div className="text-[18px] font-black text-k-ink leading-none">{dateObj.getDate()}</div>
                    </div>
                    <div className="flex-1">
                      <div className="text-[14px] font-black text-k-ink mb-1">{r.examTitle}</div>
                      <div className="text-[11px] font-bold text-k-sub">{r.status}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-k-serif text-2xl font-medium text-k-crimson">{r.score}</div>
                      <div className="text-[10px] font-bold text-k-sub">Score</div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-10 text-center text-k-sub font-bold text-sm">
                {t('topik.noHistory', { defaultValue: 'No exam history' })}
              </div>
            )}
          </div>
        </DesktopCard>
      </section>
    </div>
  );


  const renderSidebar = () => {
    if (activeTab !== 'mine') return null;
    
    const streakCount = dashboard?.stats?.streak ?? stats?.streak ?? 0;
    const weeklyActivity = dashboard?.stats?.weeklyActivity ?? stats?.weeklyActivity ?? [];

    return (
      <div className="space-y-6">
        {/* Streak / Fire */}
        <DesktopCard className="p-4">
          <div className="flex items-baseline gap-2 mb-3">
             <span className="font-k-serif text-sm text-k-crimson font-medium">火</span>
             <span className="text-[11px] font-black text-k-ink uppercase tracking-wider">{t('dashboard.desktop.streak')}</span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-black text-k-ink tracking-tighter">{streakCount}</span>
            <span className="text-[11px] font-bold text-k-sub">{t('dashboard.desktop.consecutiveDays')}</span>
            <span className="ml-auto text-lg">🔥</span>
          </div>
          <div className="grid grid-cols-7 gap-1 mt-3">
            {['一', '二', '三', '四', '五', '六', '日'].map((day, i) => {
              const activity = weeklyActivity[i];
              const hasActivity = activity && activity.minutes > 0;
              return (
                <div key={i} className="flex flex-col items-center gap-1.5">
                  <div 
                    title={hasActivity ? `${activity.minutes} min` : 'No activity'}
                    className={cn(
                      "w-full aspect-square rounded-[4px] transition-colors", 
                      hasActivity ? "bg-k-mint-deep shadow-sm" : "bg-k-bg2"
                    )} 
                  />
                  <span className="text-[9px] font-bold text-k-sub/60">{day}</span>
                </div>
              );
            })}
          </div>
        </DesktopCard>
      </div>
    );
  };

  return (
    <div className="w-full min-h-screen bg-k-bg pb-20 pt-8">
      <div className="mx-auto w-full max-w-6xl px-6">
        {/* --- Header --- */}
        <div className="flex items-center gap-4 mb-6">
           <BackButton onClick={() => navigate('/dashboard')} />
           <div className="w-px h-6 bg-k-line mx-2" />
           <div className="text-[11px] font-black text-k-sub uppercase tracking-widest opacity-60">
              LEARN · {activeTab === 'mine' ? t('tabs.mine', 'My Courses') : activeTab.toUpperCase()}
           </div>
        </div>

        <DesktopLearningHubHeader 
          title={activeTab === 'mine' ? '배우다' : t(`tabs.${activeTab}`)} 
          subtitle={activeTab === 'mine' ? t('learnHub.subtitle', '系统化掌握韩语') : undefined}
          hanja={TAB_HANJA[activeTab]}
          dateStr={dateStr}
        />

        {/* --- Tabs --- */}
        <div className="flex items-center gap-1 mb-10 p-1.5 bg-k-bg2/40 rounded-2xl w-fit border border-k-line/10">
          {[
            { id: 'mine', label: t('coursesOverview.desktop.tabs.mine'), icon: LayoutGrid },
            { id: 'grammar', label: t('coursesOverview.desktop.tabs.grammar'), icon: BookOpen },
            { id: 'vocabulary', label: t('coursesOverview.desktop.tabs.vocabulary'), icon: Type },
            { id: 'typing', label: t('coursesOverview.desktop.tabs.typing'), icon: Award },
            { id: 'topik', label: t('coursesOverview.desktop.tabs.topik'), icon: Library },
          ].map((tab) => {
            const on = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id as LearnTabKey)}
                className={cn(
                  "flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-[13px] font-black transition-all",
                  on 
                    ? "bg-k-ink text-k-bg shadow-lg shadow-k-ink/10" 
                    : "text-k-sub hover:bg-k-card hover:text-k-ink"
                )}
              >
                <tab.icon size={16} className={on ? "text-k-mint" : "opacity-60"} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* --- Layout Content --- */}
        <div className={cn("grid gap-8", activeTab === 'mine' ? "grid-cols-1 lg:grid-cols-[1fr_280px]" : "grid-cols-1")}>
          {/* Main Content */}
          <div className="min-h-[600px]">
            {activeTab === 'mine' && renderMineTab()}
            {activeTab === 'grammar' && renderGrammarTab()}
            {activeTab === 'vocabulary' && renderVocabularyTab()}
            {activeTab === 'typing' && renderTypingTab()}
            {activeTab === 'topik' && renderTopikTab()}
          </div>

          {/* Right Sidebar */}
          {activeTab === 'mine' && (
            <aside>
              {renderSidebar()}
            </aside>
          )}
        </div>
      </div>
    </div>
  );
};

export default DesktopCoursesOverviewPage;
