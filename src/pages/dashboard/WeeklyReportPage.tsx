import React, { useState, useMemo } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { Button } from '../../components/ui';
import { DesktopCard } from '../../components/desktop/ui/DesktopCard';
import { HanjaSeal } from '../../components/desktop/ui/HanjaSeal';
import { DesignChip } from '../../components/desktop/ui/DesignChip';
import { WEAK_POINTS, WEEKLY_REPORT } from '../../utils/convexRefs';
import { useAuth } from '../../contexts/AuthContext';
import { notify } from '../../utils/notify';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Clock,
  BookOpen,
  Target,
  AlertTriangle,
  Lightbulb,
  Trophy,
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react';
import { useLocalizedNavigate } from '../../hooks/useLocalizedNavigate';
import { appendReturnToPath } from '../../utils/navigation';
import type {
  WeeklyFocusApplyResult,
  WeeklyReportKagasItem,
  WeeklyReportMistakeItem,
} from '../../../convex/weeklyReport';

const DeltaIndicator: React.FC<{ delta: number; unit?: string }> = ({ delta, unit = '' }) => {
  if (delta > 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-600">
        <TrendingUp size={12} /> +{delta}
        {unit}
      </span>
    );
  }
  if (delta < 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-rose-500">
        <TrendingDown size={12} /> {delta}
        {unit}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-k-sub">
      <Minus size={12} /> 0{unit}
    </span>
  );
};

const formatSignedNumber = (value: number): string => (value > 0 ? `+${value}` : `${value}`);

const WeeklyReportPage: React.FC = () => {
  const navigate = useLocalizedNavigate();
  const { user } = useAuth();
  const [weekOffset, setWeekOffset] = useState(0);
  const [isApplyingFocus, setIsApplyingFocus] = useState(false);
  const [weeklyFocusResult, setWeeklyFocusResult] = useState<Extract<
    WeeklyFocusApplyResult,
    { success: true }
  > | null>(null);
  const feedbackReturnPath = '/dashboard/weekly-report';

  const report = useQuery(WEEKLY_REPORT.getWeeklyReport, { weekOffset });
  const prevReport = useQuery(WEEKLY_REPORT.getWeeklyReport, { weekOffset: weekOffset + 1 });
  const applyWeeklyFocus = useMutation(WEEKLY_REPORT.applyWeeklyFocusToTodayPlan);

  // Weak points detail
  const weakGrammar = useQuery(WEAK_POINTS.getWeakGrammarPatterns, user ? { limit: 5 } : 'skip');
  const weakVocab = useQuery(WEAK_POINTS.getWeakVocabCategories, user ? { limit: 5 } : 'skip');

  const formatDateRange = (start: number, end: number) => {
    const s = new Date(start);
    const e = new Date(end);
    return `${s.getMonth() + 1}月${s.getDate()}日 - ${e.getMonth() + 1}月${e.getDate()}日`;
  };

  // Week-over-week comparison helpers
  const comparison = useMemo(() => {
    if (!report?.stats || !prevReport?.stats) return null;
    const cur = report.stats;
    const prev = prevReport.stats;
    return {
      minutes: cur.totalMinutes - prev.totalMinutes,
      words: cur.wordsMastered - prev.wordsMastered,
      grammar: cur.grammarMastered - prev.grammarMastered,
      writing:
        cur.writingAttemptsCount > 0 && prev.writingAttemptsCount > 0
          ? cur.avgWritingScore - prev.avgWritingScore
          : null,
    };
  }, [report, prevReport]);

  const crossWeekFeedback = useMemo(() => {
    if (!report || !prevReport || !comparison) return null;
    const currentAssetCount =
      report.assetSummary.wordsSaved +
      report.assetSummary.sentencesSaved +
      report.assetSummary.grammarSaved;
    const previousAssetCount =
      prevReport.assetSummary.wordsSaved +
      prevReport.assetSummary.sentencesSaved +
      prevReport.assetSummary.grammarSaved;
    const assetDelta = currentAssetCount - previousAssetCount;
    const nextPriority =
      report.assetSummary.sentenceReviewDue > 0
        ? `完成 ${report.assetSummary.sentenceReviewDue} 句句子复习`
        : report.assetSummary.grammarReviewDue > 0
          ? `完成 ${report.assetSummary.grammarReviewDue} 条语法复习`
          : report.suggestions.nextWeekGoal;

    return {
      minutesDelta: Math.round(comparison.minutes),
      wordsDelta: comparison.words,
      grammarDelta: comparison.grammar,
      assetDelta,
      nextPriority,
    };
  }, [comparison, report, prevReport]);

  const weeklyExecutionChecklist = useMemo(() => {
    if (!report) return [];
    const tasks: string[] = [];
    if (report.assetSummary.sentenceReviewDue > 0) {
      tasks.push(`完成 ${report.assetSummary.sentenceReviewDue} 句句子复习`);
    }
    if (report.assetSummary.grammarReviewDue > 0) {
      tasks.push(`完成 ${report.assetSummary.grammarReviewDue} 条语法复习`);
    }
    if (report.weakPoints.kagasRanked.length > 0) {
      tasks.push(`针对 ${report.weakPoints.kagasRanked[0].labelZh} 做 1 轮写作修正`);
    }
    if (report.assetSummary.wordsSaved > 0) {
      tasks.push('复习本周新增词汇至少 10 个');
    }
    return tasks.slice(0, 4);
  }, [report]);

  const handleApplyWeeklyFocus = async () => {
    setIsApplyingFocus(true);
    try {
      const result = await applyWeeklyFocus({ weekOffset });
      if (!result.success) {
        notify.info('周报暂不可写回，请稍后再试');
        return;
      }
      setWeeklyFocusResult(result);
      notify.success('已写回今日任务');
    } catch (error) {
      console.error(error);
      notify.error('写回失败，请稍后重试');
    } finally {
      setIsApplyingFocus(false);
    }
  };

  return (
    <div className="min-h-screen bg-k-bg p-6 md:p-12 font-k-sans pb-32">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-10 flex flex-wrap items-end justify-between gap-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
              <ArrowLeft size={20} />
            </Button>
            <div className="flex items-center gap-3">
              <HanjaSeal c="馈" size={48} bg="var(--color-k-ink)" round={12} />
              <div>
                <h1 className="text-3xl font-black text-k-ink">学习反馈</h1>
                <p className="text-sm text-k-sub font-medium">周报 · 能力画像 · 复习资产</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-k-card p-1 rounded-xl border border-k-line">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setWeekOffset(v => v + 1)}
              className="h-8 w-8"
            >
              <ChevronLeft size={16} />
            </Button>
            <span className="px-3 text-xs font-black text-k-ink">
              {report ? formatDateRange(report.weekStart, report.weekEnd) : '加载中...'}
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setWeekOffset(v => Math.max(0, v - 1))}
              className="h-8 w-8"
              disabled={weekOffset === 0}
            >
              <ChevronRight size={16} />
            </Button>
          </div>
        </div>

        {!report ? (
          <div className="flex flex-col items-center justify-center py-20 animate-pulse">
            <div className="w-12 h-12 rounded-full border-4 border-k-ink border-t-transparent animate-spin mb-4" />
            <p className="font-bold text-k-sub">正在生成你的周报...</p>
          </div>
        ) : (
          <div className="space-y-8 animate-in fade-in duration-700">
            <section className="grid grid-cols-1 gap-3 md:grid-cols-3">
              {[
                {
                  k: '报',
                  title: '周报概览',
                  detail: '本周投入、词汇、语法和写作表现。',
                },
                {
                  k: '能',
                  title: '能力画像',
                  detail: '从弱点和跨周变化判断下周优先级。',
                },
                {
                  k: '复',
                  title: '复习资产',
                  detail: '把保存的词、句子和语法转成复练任务。',
                },
              ].map(item => (
                <DesktopCard key={item.title} className="p-4">
                  <div className="flex items-start gap-3">
                    <HanjaSeal c={item.k} size={34} bg="var(--color-k-ink)" round={8} />
                    <div className="min-w-0">
                      <div className="text-sm font-black text-k-ink">{item.title}</div>
                      <div className="mt-1 text-xs font-semibold leading-relaxed text-k-sub">
                        {item.detail}
                      </div>
                    </div>
                  </div>
                </DesktopCard>
              ))}
            </section>

            <section className="rounded-2xl border border-k-line bg-k-card p-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-black text-k-ink">反馈后的下一步</h2>
                  <p className="text-xs font-semibold text-k-sub">
                    把报告里的资产和薄弱点直接带回练习，不停留在只看数据。
                  </p>
                </div>
                <DesignChip tone="mint" size="sm">
                  Actionable
                </DesignChip>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <button
                  type="button"
                  aria-label="复练句子资产"
                  onClick={() =>
                    navigate(appendReturnToPath('/review/quiz?mode=sentences', feedbackReturnPath))
                  }
                  className="rounded-xl border border-k-line bg-k-bg2/50 px-4 py-3 text-left transition-colors hover:bg-k-bg2"
                >
                  <div className="text-sm font-black text-k-ink">复练句子资产</div>
                  <div className="mt-1 text-xs font-semibold text-k-sub">
                    {report.assetSummary.sentenceReviewDue} 句待复习
                  </div>
                </button>
                <button
                  type="button"
                  aria-label="复练语法资产"
                  onClick={() =>
                    navigate(appendReturnToPath('/review/quiz?mode=grammar', feedbackReturnPath))
                  }
                  className="rounded-xl border border-k-line bg-k-bg2/50 px-4 py-3 text-left transition-colors hover:bg-k-bg2"
                >
                  <div className="text-sm font-black text-k-ink">复练语法资产</div>
                  <div className="mt-1 text-xs font-semibold text-k-sub">
                    {report.assetSummary.grammarReviewDue} 条待复习
                  </div>
                </button>
                <button
                  type="button"
                  aria-label="修正写作弱点"
                  onClick={() =>
                    navigate(appendReturnToPath('/topik/writing-coach', feedbackReturnPath))
                  }
                  className="rounded-xl border border-k-line bg-k-bg2/50 px-4 py-3 text-left transition-colors hover:bg-k-bg2"
                >
                  <div className="text-sm font-black text-k-ink">修正写作弱点</div>
                  <div className="mt-1 text-xs font-semibold text-k-sub">
                    用写作教练复盘 KAGAS 错误
                  </div>
                </button>
              </div>
            </section>

            {/* Top Summary Cards with week comparison */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <DesktopCard className="text-center p-6 bg-k-ink text-k-bg">
                <Clock size={20} className="mx-auto mb-2 text-k-butter" />
                <div className="text-[10px] font-black opacity-60 uppercase">总学时长</div>
                <div className="text-3xl font-black font-k-serif">{report.stats.totalMinutes}</div>
                <div className="text-[10px] font-bold">分钟</div>
                {comparison && (
                  <div className="mt-2">
                    <DeltaIndicator delta={comparison.minutes} unit=" min" />
                  </div>
                )}
              </DesktopCard>
              <DesktopCard className="text-center p-6">
                <Target size={20} className="mx-auto mb-2 text-k-mint" />
                <div className="text-[10px] font-black text-k-sub uppercase">掌握单词</div>
                <div className="text-3xl font-black font-k-serif text-k-ink">
                  {report.stats.wordsMastered}
                </div>
                <div className="text-[10px] font-bold text-k-sub">个新词汇</div>
                {comparison && (
                  <div className="mt-2">
                    <DeltaIndicator delta={comparison.words} />
                  </div>
                )}
              </DesktopCard>
              <DesktopCard className="text-center p-6">
                <BookOpen size={20} className="mx-auto mb-2 text-k-indigo" />
                <div className="text-[10px] font-black text-k-sub uppercase">语法进展</div>
                <div className="text-3xl font-black font-k-serif text-k-ink">
                  {report.stats.grammarMastered}
                </div>
                <div className="text-[10px] font-bold text-k-sub">项新语法</div>
                {comparison && (
                  <div className="mt-2">
                    <DeltaIndicator delta={comparison.grammar} />
                  </div>
                )}
              </DesktopCard>
              <DesktopCard className="text-center p-6">
                <Trophy size={20} className="mx-auto mb-2 text-k-crimson" />
                <div className="text-[10px] font-black text-k-sub uppercase">写作均分</div>
                <div className="text-3xl font-black font-k-serif text-k-ink">
                  {report.stats.writingAttemptsCount > 0 ? report.stats.avgWritingScore : '--'}
                </div>
                <div className="text-[10px] font-bold text-k-sub">分 (TOPIK)</div>
                {comparison?.writing != null && (
                  <div className="mt-2">
                    <DeltaIndicator delta={comparison.writing} unit=" 分" />
                  </div>
                )}
              </DesktopCard>
            </div>

            {crossWeekFeedback && (
              <section className="rounded-2xl border border-k-line bg-k-card p-5 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-black text-k-ink">跨周反馈</h2>
                    <p className="text-xs font-semibold text-k-sub">
                      对比上周表现，明确下周最该推进的动作。
                    </p>
                  </div>
                  <DesignChip tone="muted" size="sm">
                    Week over week
                  </DesignChip>
                </div>
                <div className="mt-4 grid gap-2 text-xs font-black text-k-sub md:grid-cols-4">
                  <span className="rounded-xl bg-k-bg2/55 px-3 py-2">
                    学习时长 {formatSignedNumber(crossWeekFeedback.minutesDelta)} 分钟
                  </span>
                  <span className="rounded-xl bg-k-bg2/55 px-3 py-2">
                    词汇 {formatSignedNumber(crossWeekFeedback.wordsDelta)}
                  </span>
                  <span className="rounded-xl bg-k-bg2/55 px-3 py-2">
                    语法 {formatSignedNumber(crossWeekFeedback.grammarDelta)}
                  </span>
                  <span className="rounded-xl bg-k-bg2/55 px-3 py-2">
                    资产沉淀 {formatSignedNumber(crossWeekFeedback.assetDelta)}
                  </span>
                </div>
                <div className="mt-3 rounded-xl border border-k-line bg-k-bg2/40 px-3 py-2 text-sm font-black text-k-ink">
                  下周优先：{crossWeekFeedback.nextPriority}
                </div>
              </section>
            )}

            {/* Analysis & Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Module Breakdown */}
              <DesktopCard className="md:col-span-1">
                <h3 className="text-lg font-black text-k-ink mb-6 flex items-center gap-2">
                  <BarChart3Icon size={18} className="text-k-indigo" />
                  模块分布
                </h3>
                <div className="space-y-4">
                  {Object.entries(report.moduleBreakdown).map(([mod, mins]) => {
                    const percentage =
                      report.stats.totalMinutes > 0
                        ? ((mins as number) / report.stats.totalMinutes) * 100
                        : 0;
                    return (
                      <div key={mod} className="space-y-1.5">
                        <div className="flex justify-between text-[11px] font-bold">
                          <span className="text-k-ink">{mod}</span>
                          <span className="text-k-sub">{Math.round(mins as number)} min</span>
                        </div>
                        <div className="h-2 w-full bg-k-bg rounded-full overflow-hidden">
                          <div
                            className="h-full bg-k-ink transition-all duration-1000"
                            style={{ width: `${Math.max(5, percentage)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </DesktopCard>

              {/* Weak Points Analysis — enhanced */}
              <DesktopCard className="md:col-span-2">
                <h3 className="text-lg font-black text-k-ink mb-6 flex items-center gap-2">
                  <AlertTriangle size={18} className="text-k-crimson" />
                  弱点分析 (Weak Points)
                </h3>

                {/* KAGAS error type breakdown */}
                {report.weakPoints.kagasRanked && report.weakPoints.kagasRanked.length > 0 && (
                  <div className="mb-6">
                    <div className="text-[10px] font-black text-k-sub uppercase tracking-wider mb-3">
                      错误类型分布 (KAGAS)
                    </div>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {report.weakPoints.kagasRanked.map((k: WeeklyReportKagasItem) => (
                        <div
                          key={k.type}
                          className="flex items-center gap-1.5 rounded-xl bg-k-bg px-3 py-1.5 border border-k-line"
                        >
                          <span className="text-[11px] font-black text-k-crimson">{k.count}</span>
                          <span className="text-[10px] font-bold text-k-ink">
                            {k.labelZh || k.type}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  {report.weakPoints.topMistakes.length > 0 ? (
                    report.weakPoints.topMistakes.map((m: WeeklyReportMistakeItem, i: number) => (
                      <div
                        key={i}
                        className="p-4 rounded-xl bg-k-bg/50 border border-k-line group hover:border-k-crimson/30 transition-all"
                      >
                        <div className="flex items-center gap-3 mb-2">
                          <DesignChip tone="crimson" size="sm">
                            {m.type}
                          </DesignChip>
                          {m.kagasType && m.kagasType !== m.type && (
                            <DesignChip tone="muted" size="sm">
                              {m.kagasType}
                            </DesignChip>
                          )}
                          <div className="text-xs font-bold text-k-ink line-through opacity-40">
                            {m.originalText}
                          </div>
                          <div className="text-xs font-black text-k-mint">→ {m.correctedText}</div>
                        </div>
                        <p className="text-xs text-k-sub font-medium leading-relaxed">
                          {m.explanation}
                        </p>
                      </div>
                    ))
                  ) : (
                    <div className="py-10 text-center text-k-sub font-bold italic">
                      本周没有记录明显的错误，继续保持！
                    </div>
                  )}
                </div>
              </DesktopCard>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <DesktopCard className="p-5">
                <div className="flex items-center gap-3">
                  <HanjaSeal c="句" size={34} bg="var(--color-k-indigo)" round={8} />
                  <div>
                    <div className="text-[10px] font-black text-k-sub uppercase">句子资产</div>
                    <div className="text-2xl font-black font-k-serif text-k-ink">
                      {report.assetSummary.sentencesSaved}
                    </div>
                    <div className="text-[10px] font-bold text-k-sub">
                      {report.assetSummary.sentenceReviewDue} 句待复习
                    </div>
                  </div>
                </div>
              </DesktopCard>
              <DesktopCard className="p-5">
                <div className="flex items-center gap-3">
                  <HanjaSeal c="詞" size={34} bg="var(--color-k-pink-deep)" round={8} />
                  <div>
                    <div className="text-[10px] font-black text-k-sub uppercase">词汇资产</div>
                    <div className="text-2xl font-black font-k-serif text-k-ink">
                      {report.assetSummary.wordsSaved}
                    </div>
                    <div className="text-[10px] font-bold text-k-sub">本周保存词汇</div>
                  </div>
                </div>
              </DesktopCard>
              <DesktopCard className="p-5">
                <div className="flex items-center gap-3">
                  <HanjaSeal c="法" size={34} bg="var(--color-k-mint-deep)" round={8} />
                  <div>
                    <div className="text-[10px] font-black text-k-sub uppercase">语法资产</div>
                    <div className="text-2xl font-black font-k-serif text-k-ink">
                      {report.assetSummary.grammarSaved}
                    </div>
                    <div className="text-[10px] font-bold text-k-sub">
                      {report.assetSummary.grammarReviewDue} 条待复习
                    </div>
                  </div>
                </div>
              </DesktopCard>
            </div>

            {/* Detailed Weak Grammar & Vocab Patterns */}
            {((weakGrammar && weakGrammar.length > 0) || (weakVocab && weakVocab.length > 0)) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {weakGrammar && weakGrammar.length > 0 && (
                  <DesktopCard>
                    <h3 className="font-black text-k-ink mb-4 flex items-center gap-2">
                      <HanjaSeal c="法" size={24} bg="var(--color-k-lilac)" round={6} />
                      薄弱语法点
                    </h3>
                    <div className="space-y-3">
                      {weakGrammar.map((g, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between p-3 rounded-xl bg-k-bg/50 border border-k-line"
                        >
                          <div className="min-w-0">
                            <div className="text-[12px] font-black text-k-ink truncate">
                              {g.title}
                            </div>
                            {g.level && (
                              <div className="text-[10px] text-k-sub mt-0.5">Level: {g.level}</div>
                            )}
                          </div>
                          <div className="text-right shrink-0 ml-3">
                            <div className="text-[16px] font-black text-k-crimson">
                              {g.proficiency}%
                            </div>
                            <div className="text-[9px] font-bold text-k-sub">掌握度</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </DesktopCard>
                )}
                {weakVocab && weakVocab.length > 0 && (
                  <DesktopCard>
                    <h3 className="font-black text-k-ink mb-4 flex items-center gap-2">
                      <HanjaSeal c="詞" size={24} bg="var(--color-k-pink)" round={6} />
                      薄弱词汇领域
                    </h3>
                    <div className="space-y-3">
                      {weakVocab.map((v, i) => (
                        <div key={i} className="p-3 rounded-xl bg-k-bg/50 border border-k-line">
                          <div className="flex items-center justify-between mb-2">
                            <div className="text-[12px] font-black text-k-ink">
                              {v.partOfSpeech || '其他'}
                            </div>
                            <div className="text-[10px] font-bold text-k-crimson">
                              {v.totalLapses} 次失误 · {v.wordCount} 词
                            </div>
                          </div>
                          {v.samples.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                              {v.samples.map((s, j) => (
                                <span
                                  key={j}
                                  className="text-[10px] font-bold text-k-ink bg-k-bg2 rounded-lg px-2 py-0.5"
                                >
                                  {s.word} <span className="text-k-sub">({s.lapses})</span>
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </DesktopCard>
                )}
              </div>
            )}

            {/* Suggestions */}
            <DesktopCard className="bg-k-mint/5 border-k-mint/20 border-2">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-k-mint flex items-center justify-center shrink-0">
                  <Lightbulb size={24} className="text-k-bg" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-k-ink mb-1">AI 学习建议</h3>
                  <p className="text-k-ink font-medium leading-relaxed mb-4">
                    {report.suggestions.focusSuggestion}
                  </p>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-black text-k-mint">下周目标:</span>
                    <span className="font-bold text-k-sub">{report.suggestions.nextWeekGoal}</span>
                  </div>
                </div>
              </div>
            </DesktopCard>

            <DesktopCard className="border-k-line/60">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-black text-k-ink">下周执行清单</h3>
                  <p className="text-xs font-medium text-k-sub">
                    将本周报告中的资产与弱点回写到今日任务，进入 dashboard 立即执行。
                  </p>
                </div>
                <Button
                  className="bg-k-ink text-k-bg hover:bg-k-ink/90"
                  disabled={isApplyingFocus}
                  onClick={handleApplyWeeklyFocus}
                >
                  {isApplyingFocus ? '写回中...' : '一键写回 Dashboard'}
                </Button>
              </div>
              <div className="mt-4 space-y-2">
                {weeklyExecutionChecklist.length > 0 ? (
                  weeklyExecutionChecklist.map((item, index) => (
                    <div
                      key={`${item}-${index}`}
                      className="rounded-xl bg-k-bg2/50 px-3 py-2 text-sm font-semibold text-k-ink"
                    >
                      {index + 1}. {item}
                    </div>
                  ))
                ) : (
                  <div className="rounded-xl bg-k-bg2/50 px-3 py-3 text-sm font-semibold text-k-sub">
                    本周暂无额外回写任务，保持当前学习节奏即可。
                  </div>
                )}
              </div>
              {weeklyFocusResult && (
                <div className="mt-5 border-t border-k-line pt-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="text-[10px] font-black uppercase tracking-wider text-k-sub">
                        回写策略
                      </div>
                      <div className="text-base font-black text-k-ink">
                        {weeklyFocusResult.strategy.label}
                      </div>
                      <div className="mt-1 text-xs font-semibold text-k-sub">
                        已写入 {weeklyFocusResult.planDate} 今日任务
                      </div>
                    </div>
                    <Button variant="outline" onClick={() => navigate('/dashboard')}>
                      查看 Dashboard
                    </Button>
                  </div>
                  <div className="mt-4 space-y-2">
                    {weeklyFocusResult.adjustments.map(adjustment => {
                      const orderChanged = adjustment.beforeIndex !== adjustment.afterIndex;
                      const targetChanged =
                        adjustment.beforeTargetCount !== adjustment.afterTargetCount;
                      return (
                        <div
                          key={adjustment.taskId}
                          className="grid gap-2 rounded-xl bg-k-bg2/50 px-3 py-3 text-xs md:grid-cols-[1fr_auto]"
                        >
                          <div className="min-w-0">
                            <div className="truncate font-black text-k-ink">{adjustment.title}</div>
                            <div className="mt-1 font-semibold text-k-sub">{adjustment.reason}</div>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 font-black text-k-ink">
                            <span>
                              {`#${adjustment.beforeIndex + 1} -> #${adjustment.afterIndex + 1}`}
                            </span>
                            <span>
                              {`${adjustment.beforeTargetCount ?? '-'} -> ${adjustment.afterTargetCount ?? '-'}`}
                            </span>
                            <DesignChip
                              tone={orderChanged || targetChanged ? 'butter' : 'muted'}
                              size="sm"
                            >
                              W{adjustment.priorityWeight}
                            </DesignChip>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </DesktopCard>
          </div>
        )}
      </div>
    </div>
  );
};

const BarChart3Icon = ({ size, className }: { size: number; className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M3 3v18h18" />
    <path d="M18 17V9" />
    <path d="M13 17V5" />
    <path d="M8 17v-3" />
  </svg>
);

export default WeeklyReportPage;
