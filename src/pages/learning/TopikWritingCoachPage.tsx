import React, { useEffect, useRef, useState } from 'react';
import { useAction, useMutation, useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Button, Textarea } from '../../components/ui';
import { DesktopCard } from '../../components/desktop/ui/DesktopCard';
import { HanjaSeal } from '../../components/desktop/ui/HanjaSeal';
import { DesignChip } from '../../components/desktop/ui/DesignChip';
import { notify } from '../../utils/notify';
import { DAILY_TASK, TOPIK_COACH } from '../../utils/convexRefs';
import { resolveSafeReturnTo } from '../../utils/navigation';
import {
  ArrowLeft,
  Send,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  History,
  Target,
  TrendingUp,
  BookOpen,
} from 'lucide-react';
import { useLocalizedNavigate } from '../../hooks/useLocalizedNavigate';
import { useAuth } from '../../contexts/AuthContext';
import { clsx } from 'clsx';
import type {
  TopikHotTopic,
  TopikMistakeBookCategory,
  TopikImprovementTask,
  TopikImprovementWeek,
  TopikWritingProgressTrend,
} from '../../../convex/topikCoach/writing';
import type { TopikCoachWeakPoint } from '../../../convex/topikCoach/weakPoints';
import type { WritingCoachError, WritingCoachFeedback } from '../../../convex/topikWritingCoach';

const TASK_TYPES = [
  { id: '51', label: 'Q51 · 造句 (公文)', desc: '根据语境填写公文、邮件中的短句。' },
  { id: '52', label: 'Q52 · 造句 (说明)', desc: '根据语境填写说明文、科普文中的短句。' },
  { id: '53', label: 'Q53 · 图表作文', desc: '根据给出的图表信息编写 200-300 字的说明文。' },
  { id: '54', label: 'Q54 · 大作文', desc: '针对特定话题编写 400-600 字的议论文。' },
];

type TopTab = 'practice' | 'score' | 'plan' | 'mistakes';

const getTopikLevelFromPrediction = (predictedTotal: number): number => {
  if (predictedTotal >= 80) return 6;
  if (predictedTotal >= 65) return 5;
  if (predictedTotal >= 50) return 4;
  if (predictedTotal >= 35) return 3;
  return 2;
};

const getWeakPointTone = (weakPoint: TopikCoachWeakPoint): 'muted' | 'butter' | 'crimson' => {
  if (weakPoint.highSeverityCount > 0) return 'crimson';
  if (weakPoint.count >= 3) return 'butter';
  return 'muted';
};

const getMistakeCategoryTone = (
  category: TopikMistakeBookCategory
): 'muted' | 'butter' | 'crimson' => {
  if ((category.severityCounts.HIGH ?? 0) > 0) return 'crimson';
  if ((category.severityCounts.MEDIUM ?? 0) > 0) return 'butter';
  return 'muted';
};

const formatScoreValue = (score: number): string => {
  if (Number.isInteger(score)) return String(score);
  return score.toFixed(1).replace(/\.0$/, '');
};

const formatScoreDelta = (delta: number): string => {
  const sign = delta > 0 ? '+' : '';
  return `${sign}${formatScoreValue(delta)} 分`;
};

const getTrendLabel = (trend: TopikWritingProgressTrend): string => {
  switch (trend) {
    case 'improving':
      return '持续提升';
    case 'declining':
      return '需要回稳';
    case 'stable':
      return '保持稳定';
    case 'insufficient_data':
      return '数据不足';
  }
};

const TopikWritingCoachPage: React.FC = () => {
  const navigate = useLocalizedNavigate();
  const { user } = useAuth();
  const [topTab, setTopTab] = useState<TopTab>('practice');
  const [selectedTask, setSelectedTask] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [answer, setAnswer] = useState('');
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [feedback, setFeedback] = useState<WritingCoachFeedback | null>(null);
  const prefilledRewriteTaskRef = useRef<string | null>(null);
  const searchParams =
    typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search)
      : new URLSearchParams();
  const returnActionPath = resolveSafeReturnTo(searchParams.get('returnTo'), '/topik');
  const returnActionLabel =
    returnActionPath === '/dashboard/weekly-report'
      ? '回到学习反馈'
      : searchParams.get('flow') === 'today' || returnActionPath === '/dashboard'
        ? '回到今日之路'
        : '返回 TOPIK';
  const todayTaskId = searchParams.get('flow') === 'today' ? searchParams.get('taskId') : null;

  const evaluateAction = useAction(api.topikWritingCoach.evaluateWritingCoach);
  const saveAttemptMutation = useMutation(api.topikWritingCoach.saveWritingCoachAttempt);

  // TOPIK Coach queries
  const scorePrediction = useQuery(TOPIK_COACH.getScorePrediction, user ? {} : 'skip');
  const improvementPlan = useQuery(TOPIK_COACH.getImprovementPlan, user ? {} : 'skip');
  const mistakeBook = useQuery(TOPIK_COACH.getMistakeBook, user ? { limit: 20 } : 'skip');
  const weakPoints = useQuery(
    TOPIK_COACH.getWeakPoints,
    user ? { limit: 5, daysBack: 45 } : 'skip'
  );
  const hotTopics = useQuery(TOPIK_COACH.getHotTopics, user ? {} : 'skip');
  const writingProgress = useQuery(TOPIK_COACH.getWritingProgress, user ? { limit: 12 } : 'skip');

  const predictScoreMutation = useMutation(TOPIK_COACH.predictScore);
  const generatePlanMutation = useMutation(TOPIK_COACH.generateImprovementPlan);
  const scheduleTopikRewriteTask = useMutation(DAILY_TASK.scheduleTopikRewriteTask);
  const updateTaskCompletion = useMutation(DAILY_TASK.updateTaskCompletion);
  const rewriteTaskId = searchParams.get('rewriteTaskId');

  useEffect(() => {
    if (!rewriteTaskId || prefilledRewriteTaskRef.current === rewriteTaskId) {
      return;
    }
    const scheduledAttemptId = rewriteTaskId.startsWith('topik-rewrite:')
      ? rewriteTaskId.slice('topik-rewrite:'.length)
      : null;
    if (!scheduledAttemptId || !writingProgress) {
      return;
    }

    const comparison = writingProgress.rewriteComparisons.find(
      item => String(item.latestAttempt.attemptId) === scheduledAttemptId
    );
    if (!comparison) {
      return;
    }

    setTopTab('practice');
    setSelectedTask(comparison.taskType);
    setPrompt(comparison.promptPreview);
    setAnswer(comparison.latestAttempt.userAnswer);
    prefilledRewriteTaskRef.current = rewriteTaskId;
  }, [rewriteTaskId, writingProgress]);

  const handleSubmit = async () => {
    if (!selectedTask || !answer.trim()) {
      notify.info('请选择题型并输入你的回答');
      return;
    }

    setIsEvaluating(true);
    setFeedback(null);

    try {
      const result = await evaluateAction({
        taskType: selectedTask,
        prompt: prompt || `TOPIK II 第 ${selectedTask} 题练习`,
        userAnswer: answer,
        language: 'zh',
      });

      setFeedback(result);

      // Auto-save the attempt
      await saveAttemptMutation({
        taskType: selectedTask,
        prompt: prompt || `TOPIK II 第 ${selectedTask} 题练习`,
        userAnswer: answer,
        feedback: result,
      });

      if (rewriteTaskId?.startsWith('topik-rewrite:')) {
        await updateTaskCompletion({
          taskId: rewriteTaskId,
          completed: true,
          currentCount: 1,
        });
      }
      if (todayTaskId && todayTaskId !== rewriteTaskId) {
        await updateTaskCompletion({
          taskId: todayTaskId,
          completed: true,
          currentCount: 1,
        });
      }

      notify.success('AI 评估已完成');
    } catch (error) {
      console.error(error);
      notify.error('评估失败，请重试');
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleScheduleRewrite = async (
    comparison: NonNullable<typeof writingProgress>['rewriteComparisons'][number]
  ) => {
    try {
      await scheduleTopikRewriteTask({
        taskType: comparison.taskType,
        promptPreview: comparison.promptPreview,
        latestAttemptId: comparison.latestAttempt.attemptId,
        revisionFocus: comparison.revisionFocus,
      });
      notify.success('已加入今日复练');
    } catch (error) {
      console.error(error);
      notify.error('加入今日复练失败，请重试');
    }
  };

  const tabs: { id: TopTab; icon: React.ReactNode; label: string; seal: string }[] = [
    { id: 'practice', icon: <Send size={14} />, label: '练习', seal: '笔' },
    { id: 'score', icon: <Target size={14} />, label: '分数预测', seal: '分' },
    { id: 'plan', icon: <TrendingUp size={14} />, label: '提升计划', seal: '升' },
    { id: 'mistakes', icon: <BookOpen size={14} />, label: '错题本', seal: '误' },
  ];

  return (
    <div className="min-h-screen bg-k-bg p-6 md:p-12 font-k-sans pb-32">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(returnActionPath)}>
            <ArrowLeft size={20} />
          </Button>
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <HanjaSeal c="笔" size={40} bg="var(--color-k-mint)" round={10} />
            <div>
              <h1 className="text-2xl font-black text-k-ink">TOPIK 写作教练</h1>
              <p className="text-sm text-k-sub font-medium">AI 实时评估 · 深度解析 · 提分建议</p>
            </div>
          </div>
          {returnActionPath !== '/topik' && (
            <Button variant="outline" size="sm" onClick={() => navigate(returnActionPath)}>
              {returnActionLabel}
            </Button>
          )}
        </div>

        {/* Tab Bar */}
        <div className="mb-8 flex gap-1.5 rounded-2xl border border-k-line/10 bg-k-bg2/50 p-1.5">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setTopTab(tab.id)}
              className={clsx(
                'flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-[12px] font-black transition-all flex-1 justify-center',
                topTab === tab.id
                  ? 'bg-k-card text-k-ink shadow-sm border border-k-line/10'
                  : 'text-k-sub hover:text-k-ink'
              )}
            >
              {tab.icon}
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Practice Tab */}
        {topTab === 'practice' && (
          <>
            {!feedback ? (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {hotTopics && hotTopics.length > 0 && (
                  <DesktopCard className="space-y-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-black text-k-ink">推荐题库</h3>
                        <p className="text-xs font-medium text-k-sub">
                          从近期高频 TOPIK 写作题开始，完成后进入分数预测和错题复盘。
                        </p>
                      </div>
                      <DesignChip tone="muted" size="sm">
                        Prompt Bank
                      </DesignChip>
                    </div>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      {hotTopics.slice(0, 4).map((topic: TopikHotTopic) => (
                        <button
                          key={`${topic.taskType}-${topic.promptPreview}`}
                          type="button"
                          onClick={() => {
                            setSelectedTask(topic.taskType);
                            setPrompt(topic.promptPreview);
                          }}
                          className={clsx(
                            'rounded-2xl border p-4 text-left transition-all hover:border-k-mint',
                            selectedTask === topic.taskType && prompt === topic.promptPreview
                              ? 'border-k-mint bg-k-mint/5'
                              : 'border-k-line bg-k-card'
                          )}
                        >
                          <div className="mb-2 flex items-center justify-between gap-2">
                            <span className="text-xs font-black text-k-ink">
                              Q{topic.taskType} · {topic.count} 次练习
                            </span>
                            <span className="text-[10px] font-bold text-k-sub">
                              均分 {topic.avgScore}
                            </span>
                          </div>
                          <p className="line-clamp-2 text-xs font-medium leading-relaxed text-k-sub">
                            {topic.promptPreview}
                          </p>
                        </button>
                      ))}
                    </div>
                  </DesktopCard>
                )}
                {/* Step 1: Task Selection */}
                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-k-ink flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-k-ink text-k-bg flex items-center justify-center text-xs">
                      1
                    </span>
                    选择题型
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {TASK_TYPES.map(task => (
                      <button
                        key={task.id}
                        onClick={() => setSelectedTask(task.id)}
                        className={clsx(
                          'text-left p-4 rounded-2xl border-2 transition-all',
                          selectedTask === task.id
                            ? 'border-k-mint bg-k-mint/5 shadow-inner'
                            : 'border-k-line bg-k-card hover:border-k-mint/50'
                        )}
                      >
                        <div className="font-black text-k-ink">{task.label}</div>
                        <div className="text-xs text-k-sub mt-1">{task.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Step 2: Input */}
                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-k-ink flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-k-ink text-k-bg flex items-center justify-center text-xs">
                      2
                    </span>
                    题目与回答
                  </h3>
                  <DesktopCard className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-k-sub">题目要求 (可选)</label>
                      <Textarea
                        placeholder="输入题目要求或复制真题内容..."
                        value={prompt}
                        onChange={e => setPrompt(e.target.value)}
                        className="min-h-[100px] bg-k-bg/50 border-k-line focus:border-k-mint"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-k-sub">你的回答 (韩语)</label>
                      <Textarea
                        placeholder="在这里输入你的韩语作文内容..."
                        value={answer}
                        onChange={e => setAnswer(e.target.value)}
                        className="min-h-[200px] text-lg font-medium border-k-line focus:border-k-mint"
                      />
                      <div className="text-right text-xs text-k-sub font-mono">
                        字数: {answer.length}
                      </div>
                    </div>
                    <Button
                      className="w-full h-14 text-lg font-black bg-k-ink hover:bg-k-ink/90 text-k-bg rounded-2xl flex items-center justify-center gap-2"
                      disabled={isEvaluating || !selectedTask || !answer.trim()}
                      onClick={handleSubmit}
                    >
                      {isEvaluating ? (
                        <>
                          <div className="w-5 h-5 border-2 border-k-bg border-t-transparent animate-spin rounded-full" />
                          AI 正在深度评估中...
                        </>
                      ) : (
                        <>
                          <Sparkles size={20} className="text-k-butter" />
                          开始 AI 评估
                        </>
                      )}
                    </Button>
                  </DesktopCard>
                </div>
              </div>
            ) : (
              /* Feedback Display */
              <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500">
                <div className="flex justify-between items-center">
                  <h3 className="text-xl font-black text-k-ink">评估报告</h3>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setFeedback(null);
                        setAnswer('');
                      }}
                    >
                      同题重练
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setFeedback(null)}>
                      返回修改
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Score Card */}
                  <DesktopCard className="md:col-span-1 flex flex-col items-center justify-center py-10 text-center">
                    <div className="text-sm font-black text-k-sub uppercase tracking-widest mb-2">
                      预估分数
                    </div>
                    <div className="text-7xl font-black text-k-mint font-k-serif">
                      {feedback.estimatedScore}
                    </div>
                    <DesignChip tone="mint" className="mt-4">
                      {feedback.scoreBand}
                    </DesignChip>
                  </DesktopCard>

                  {/* Overall Comment */}
                  <DesktopCard className="md:col-span-2">
                    <h4 className="font-black text-k-ink mb-3 flex items-center gap-2">
                      <Sparkles size={18} className="text-k-mint" />
                      教练总评
                    </h4>
                    <p className="text-k-ink leading-relaxed font-medium">
                      {feedback.overallCommentZh}
                    </p>
                    <div className="mt-6 grid grid-cols-2 gap-4">
                      <div className="p-3 rounded-xl bg-green-50 border border-green-100">
                        <div className="text-[10px] font-black text-green-600 mb-1">
                          优势 (STRENGTHS)
                        </div>
                        <ul className="text-xs space-y-1">
                          {feedback.strengths?.map((s, i) => (
                            <li key={i} className="flex items-start gap-1">
                              <CheckCircle2 size={12} className="mt-0.5 shrink-0" />
                              {s}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="p-3 rounded-xl bg-amber-50 border border-amber-100">
                        <div className="text-[10px] font-black text-amber-600 mb-1">
                          待改进 (WEAKNESSES)
                        </div>
                        <ul className="text-xs space-y-1">
                          {feedback.weaknesses?.map((w, i) => (
                            <li key={i} className="flex items-start gap-1">
                              <AlertCircle size={12} className="mt-0.5 shrink-0" />
                              {w}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </DesktopCard>
                </div>

                {/* Error Analysis */}
                <div className="space-y-4">
                  <h4 className="text-lg font-black text-k-ink">错误分析</h4>
                  <div className="space-y-3">
                    {feedback.errors?.map((err: WritingCoachError, idx: number) => (
                      <DesktopCard key={idx} className="border-l-4 border-l-k-crimson">
                        <div className="flex justify-between items-start mb-2">
                          <DesignChip
                            tone={err.severity === 'HIGH' ? 'crimson' : 'muted'}
                            size="sm"
                          >
                            {err.errorType} · {err.severity}
                          </DesignChip>
                          {err.relatedGrammarPattern && (
                            <span className="text-[10px] font-bold text-k-mint bg-k-mint/10 px-2 py-0.5 rounded-full">
                              相关语法: {err.relatedGrammarPattern}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-4 items-center mb-2">
                          <div className="line-through text-k-sub font-medium">
                            {err.originalText}
                          </div>
                          <div className="text-k-mint font-black">→ {err.correctedText}</div>
                        </div>
                        <p className="text-sm text-k-ink font-medium">{err.explanationZh}</p>
                      </DesktopCard>
                    ))}
                  </div>
                </div>

                {/* Improved Version */}
                <div className="space-y-4">
                  <h4 className="text-lg font-black text-k-ink">高分范文建议</h4>
                  <DesktopCard className="bg-k-ink text-k-bg selection:bg-k-mint/50">
                    <p className="text-lg leading-relaxed font-medium whitespace-pre-wrap">
                      {feedback.improvedVersion}
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-4 text-k-mint hover:bg-k-mint/10 font-bold"
                      onClick={() => {
                        navigator.clipboard.writeText(feedback.improvedVersion);
                        notify.success('已复制到剪贴板');
                      }}
                    >
                      复制全文
                    </Button>
                  </DesktopCard>
                </div>

                {/* Recommendations */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <DesktopCard>
                    <h4 className="font-black text-k-ink mb-4 flex items-center gap-2">
                      <Sparkles size={18} className="text-k-butter" />
                      好句积累
                    </h4>
                    <div className="space-y-3">
                      {feedback.usefulExpressions?.map((exp, i) => (
                        <div key={i} className="group cursor-pointer">
                          <div className="font-bold text-k-ink group-hover:text-k-mint transition">
                            {exp.kr}
                          </div>
                          <div className="text-xs text-k-sub">{exp.zh}</div>
                        </div>
                      ))}
                    </div>
                  </DesktopCard>
                  <DesktopCard>
                    <h4 className="font-black text-k-ink mb-4 flex items-center gap-2">
                      <Sparkles size={18} className="text-k-indigo" />
                      复习建议
                    </h4>
                    <div className="space-y-3">
                      {feedback.recommendedReview?.map((rev, i) => (
                        <div key={i} className="flex items-center justify-between">
                          <div>
                            <span className="text-[10px] font-black text-k-sub mr-2">
                              {rev.type}
                            </span>
                            <span className="font-bold text-k-ink">{rev.pattern}</span>
                          </div>
                          <Button variant="ghost" size="sm" className="text-k-indigo font-bold h-7">
                            前往复习
                          </Button>
                        </div>
                      ))}
                    </div>
                    <div className="mt-6 pt-4 border-t border-k-line">
                      <div className="text-[10px] font-black text-k-sub mb-1">下一步建议</div>
                      <p className="text-xs text-k-ink font-medium leading-relaxed">
                        {feedback.nextPracticeSuggestion}
                      </p>
                    </div>
                  </DesktopCard>
                </div>
              </div>
            )}
          </>
        )}

        {/* Score Prediction Tab */}
        {topTab === 'score' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <DesktopCard className="text-center py-12">
              <HanjaSeal c="分" size={56} bg="var(--color-k-crimson)" round={14} />
              <h3 className="mt-4 text-xl font-black text-k-ink">分数预测</h3>
              <p className="mt-1 text-sm text-k-sub">基于你的历次练习表现，预测 TOPIK 写作分数</p>

              {scorePrediction ? (
                <div className="mt-8 space-y-6">
                  <div className="text-8xl font-black font-k-serif text-k-crimson">
                    {scorePrediction.predictedTotal ?? '—'}
                  </div>
                  <DesignChip tone="crimson">
                    {`TOPIK II Level ${getTopikLevelFromPrediction(scorePrediction.predictedTotal)}`}
                  </DesignChip>
                  {scorePrediction.dimensionBreakdown && (
                    <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4 text-left max-w-xl mx-auto">
                      {Object.entries(scorePrediction.dimensionBreakdown).map(([key, val]) => (
                        <div key={key} className="rounded-xl bg-k-bg2 p-3">
                          <div className="text-[10px] font-black text-k-sub uppercase tracking-wider">
                            {key}
                          </div>
                          <div className="text-2xl font-black text-k-ink font-k-serif">{val}</div>
                        </div>
                      ))}
                    </div>
                  )}
                  {scorePrediction.generatedAt && (
                    <p className="text-[10px] text-k-sub">
                      上次更新: {new Date(scorePrediction.generatedAt).toLocaleDateString('zh-CN')}
                    </p>
                  )}
                </div>
              ) : (
                <div className="mt-8">
                  <p className="text-sm text-k-sub mb-4">完成至少 3 次写作练习后即可生成分数预测</p>
                  <Button
                    onClick={() =>
                      void predictScoreMutation({}).catch(() => notify.error('预测失败'))
                    }
                    className="bg-k-crimson hover:bg-k-crimson/90 text-white font-bold rounded-xl"
                  >
                    <Target size={16} className="mr-1" /> 生成预测
                  </Button>
                </div>
              )}
            </DesktopCard>

            {writingProgress && writingProgress.attemptsAnalyzed > 0 && (
              <>
                <DesktopCard>
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <TrendingUp size={18} className="text-k-mint" />
                        <h3 className="text-lg font-black text-k-ink">写作趋势</h3>
                      </div>
                      <p className="mt-1 text-sm font-medium text-k-sub">
                        {`最近 ${writingProgress.attemptsAnalyzed} 次平均 ${formatScoreValue(writingProgress.averageScore)} 分`}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <DesignChip
                        tone={writingProgress.trend === 'declining' ? 'crimson' : 'mint'}
                        size="sm"
                      >
                        {getTrendLabel(writingProgress.trend)}
                      </DesignChip>
                      <DesignChip
                        tone={writingProgress.scoreDelta >= 0 ? 'mint' : 'crimson'}
                        size="sm"
                      >
                        {formatScoreDelta(writingProgress.scoreDelta)}
                      </DesignChip>
                    </div>
                  </div>
                  <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
                    <div className="rounded-2xl bg-k-bg2/60 p-4">
                      <div className="text-[10px] font-black uppercase tracking-wider text-k-sub">
                        Latest
                      </div>
                      <div className="mt-1 text-2xl font-black text-k-ink font-k-serif">
                        {formatScoreValue(writingProgress.latestScore)}
                      </div>
                    </div>
                    <div className="rounded-2xl bg-k-bg2/60 p-4">
                      <div className="text-[10px] font-black uppercase tracking-wider text-k-sub">
                        Best
                      </div>
                      <div className="mt-1 text-2xl font-black text-k-ink font-k-serif">
                        {formatScoreValue(writingProgress.bestScore)}
                      </div>
                    </div>
                    <div className="rounded-2xl bg-k-bg2/60 p-4">
                      <div className="text-[10px] font-black uppercase tracking-wider text-k-sub">
                        Normalized
                      </div>
                      <div className="mt-1 text-2xl font-black text-k-ink font-k-serif">
                        {formatScoreValue(
                          writingProgress.timeline[writingProgress.timeline.length - 1]
                            ?.normalizedScore ?? 0
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="mt-5 flex items-end gap-2 overflow-x-auto pb-1">
                    {writingProgress.timeline.map(point => (
                      <div
                        key={point.attemptId}
                        className="flex min-w-12 flex-1 flex-col items-center gap-2"
                      >
                        <div className="flex h-24 w-full items-end rounded-xl bg-k-bg2/50 px-2 py-2">
                          <div
                            className="w-full rounded-lg bg-k-mint"
                            style={{
                              height: `${Math.max(8, Math.min(100, point.normalizedScore))}%`,
                            }}
                          />
                        </div>
                        <span className="text-[10px] font-black text-k-sub">Q{point.taskType}</span>
                      </div>
                    ))}
                  </div>
                </DesktopCard>

                {writingProgress.rewriteComparisons.length > 0 && (
                  <DesktopCard>
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-black text-k-ink">同题重写对比</h3>
                        <p className="text-xs font-medium text-k-sub">
                          重复练同一道题时，保留首次到最近一次的分数变化。
                        </p>
                      </div>
                      <DesignChip tone="butter" size="sm">
                        Rewrite
                      </DesignChip>
                    </div>
                    <div className="space-y-3">
                      {writingProgress.rewriteComparisons.map(comparison => (
                        <div
                          key={comparison.promptKey}
                          className="rounded-2xl border border-k-line/10 bg-k-bg2/40 p-4"
                        >
                          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                            <div>
                              <div className="text-xs font-black text-k-ink">
                                Q{comparison.taskType} · {comparison.attemptCount} 次重写
                              </div>
                              <p className="mt-1 line-clamp-2 text-xs font-medium leading-relaxed text-k-sub">
                                {comparison.promptPreview}
                              </p>
                            </div>
                            <div className="shrink-0 text-left md:text-right">
                              <div className="text-sm font-black text-k-ink">
                                {`首次 ${formatScoreValue(comparison.firstScore)} → 最新 ${formatScoreValue(comparison.latestScore)}`}
                              </div>
                              <div className="mt-1 text-xs font-bold text-k-mint">
                                {formatScoreDelta(comparison.scoreDelta)}
                              </div>
                            </div>
                          </div>
                          <div className="mt-4 rounded-2xl border border-k-line/10 bg-k-card p-4">
                            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                              <h4 className="text-sm font-black text-k-ink">修订前后文本</h4>
                              <Button
                                variant="outline"
                                size="sm"
                                className="font-bold"
                                onClick={() => {
                                  setSelectedTask(comparison.taskType);
                                  setPrompt(comparison.promptPreview);
                                  setAnswer(comparison.latestAttempt.userAnswer);
                                  setTopTab('practice');
                                }}
                              >
                                用最近稿继续重写
                              </Button>
                              <Button
                                size="sm"
                                className="bg-k-ink text-k-bg hover:bg-k-ink/90 font-bold"
                                onClick={() => void handleScheduleRewrite(comparison)}
                              >
                                加入今日复练
                              </Button>
                            </div>
                            <div className="grid gap-3 md:grid-cols-2">
                              <div className="rounded-xl bg-k-bg2/60 p-3">
                                <div className="mb-2 flex items-center justify-between gap-2">
                                  <span className="text-[11px] font-black text-k-sub">首次稿</span>
                                  <span className="text-[11px] font-black text-k-crimson">
                                    {formatScoreValue(comparison.firstAttempt.estimatedScore)} 分
                                  </span>
                                </div>
                                <p className="whitespace-pre-wrap text-sm font-medium leading-relaxed text-k-ink">
                                  {comparison.firstAttempt.userAnswer}
                                </p>
                              </div>
                              <div className="rounded-xl bg-k-mint/10 p-3">
                                <div className="mb-2 flex items-center justify-between gap-2">
                                  <span className="text-[11px] font-black text-k-sub">最近稿</span>
                                  <span className="text-[11px] font-black text-k-mint">
                                    {formatScoreValue(comparison.latestAttempt.estimatedScore)} 分
                                  </span>
                                </div>
                                <p className="whitespace-pre-wrap text-sm font-medium leading-relaxed text-k-ink">
                                  {comparison.latestAttempt.userAnswer}
                                </p>
                              </div>
                            </div>
                            {comparison.latestAttempt.improvedVersion && (
                              <div className="mt-3 rounded-xl bg-k-ink p-3 text-k-bg">
                                <div className="mb-2 text-[11px] font-black text-k-mint">
                                  AI 高分改写
                                </div>
                                <p className="whitespace-pre-wrap text-sm font-medium leading-relaxed">
                                  {comparison.latestAttempt.improvedVersion}
                                </p>
                              </div>
                            )}
                            {comparison.retryHistory.length > 0 && (
                              <div className="mt-3 rounded-xl border border-k-line/10 bg-k-bg p-3">
                                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                                  <div className="text-[11px] font-black text-k-sub">
                                    多日复练历史
                                  </div>
                                  <DesignChip tone="muted" size="sm">
                                    {comparison.retryHistory.length} 次复练
                                  </DesignChip>
                                </div>
                                <div className="grid gap-2 md:grid-cols-3">
                                  {comparison.retryHistory.map((historyPoint, index) => (
                                    <div
                                      key={historyPoint.attemptId}
                                      className="rounded-xl bg-k-card px-3 py-2"
                                    >
                                      <div className="text-xs font-black text-k-ink">
                                        第 {index + 1} 次 ·{' '}
                                        {formatScoreValue(historyPoint.estimatedScore)} 分
                                      </div>
                                      <div className="mt-1 text-[10px] font-bold text-k-sub">
                                        {new Date(historyPoint.createdAt).toLocaleDateString(
                                          'zh-CN'
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            {comparison.revisionGoals.length > 0 && (
                              <div className="mt-3 rounded-xl border border-k-line/10 bg-k-bg p-3">
                                <div className="mb-2 text-[11px] font-black text-k-sub">
                                  明确修订目标
                                </div>
                                <div className="space-y-2">
                                  {comparison.revisionGoals.map((goal, index) => (
                                    <div
                                      key={goal.goalId}
                                      className="rounded-xl bg-k-card px-3 py-2"
                                    >
                                      <div className="text-xs font-black text-k-ink">
                                        目标 {index + 1} · {goal.title}
                                      </div>
                                      <p className="mt-1 text-xs font-medium leading-relaxed text-k-sub">
                                        {goal.target}
                                      </p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            {comparison.revisionFocus.length > 0 && (
                              <div className="mt-3 rounded-xl border border-k-line/10 bg-k-bg p-3">
                                <div className="mb-2 text-[11px] font-black text-k-sub">
                                  下一次重写焦点
                                </div>
                                <ul className="space-y-1">
                                  {comparison.revisionFocus.map(focus => (
                                    <li
                                      key={focus}
                                      className="text-xs font-medium leading-relaxed text-k-ink"
                                    >
                                      {focus}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </DesktopCard>
                )}
              </>
            )}
          </div>
        )}

        {/* Improvement Plan Tab */}
        {topTab === 'plan' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-black text-k-ink flex items-center gap-2">
                <HanjaSeal c="升" size={32} bg="var(--color-k-mint)" round={8} />
                提升计划
              </h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => void generatePlanMutation({}).catch(() => notify.error('生成失败'))}
                className="font-bold"
              >
                <TrendingUp size={14} className="mr-1" /> 刷新计划
              </Button>
            </div>

            {improvementPlan ? (
              <div className="space-y-4">
                {improvementPlan.targetLevel && (
                  <DesktopCard>
                    <div className="flex items-center gap-4">
                      <div className="text-5xl font-black text-k-mint font-k-serif">
                        {improvementPlan.targetLevel}
                      </div>
                      <div>
                        <div className="text-[10px] font-black text-k-sub uppercase tracking-wider">
                          目标等级
                        </div>
                        <div className="text-sm font-bold text-k-ink">
                          TOPIK II Level {improvementPlan.targetLevel}
                        </div>
                      </div>
                    </div>
                  </DesktopCard>
                )}
                {improvementPlan.weeklyTasks.length > 0 && (
                  <div className="space-y-3">
                    {improvementPlan.weeklyTasks.map((goal: TopikImprovementWeek) => (
                      <DesktopCard key={goal.week}>
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-full bg-k-mint/10 flex items-center justify-center text-sm font-black text-k-mint shrink-0">
                            {goal.week}
                          </div>
                          <div className="flex-1">
                            <div className="font-black text-k-ink text-sm">{`第 ${goal.week} 周 · ${goal.focus}`}</div>
                            <div className="text-xs text-k-sub mt-1 leading-relaxed">
                              {`围绕 ${goal.focus} 制定专项练习与复盘任务。`}
                            </div>
                            {goal.tasks.length > 0 && (
                              <ul className="mt-2 space-y-1">
                                {goal.tasks.map((task: TopikImprovementTask, j: number) => (
                                  <li
                                    key={`${goal.week}-${j}`}
                                    className="text-xs text-k-ink flex items-start gap-1.5"
                                  >
                                    <span className="text-k-mint mt-0.5">•</span>
                                    <span>{`${task.description} · ${task.targetCount} 次`}</span>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        </div>
                      </DesktopCard>
                    ))}
                  </div>
                )}
                {improvementPlan.weakErrorCodes.length > 0 && (
                  <DesktopCard>
                    <h4 className="font-black text-k-ink mb-3">重点突破方向</h4>
                    <div className="flex flex-wrap gap-2">
                      {improvementPlan.weakErrorCodes.map(area => (
                        <DesignChip key={area} tone="mint">
                          {area}
                        </DesignChip>
                      ))}
                    </div>
                  </DesktopCard>
                )}
              </div>
            ) : (
              <DesktopCard className="text-center py-12">
                <p className="text-sm text-k-sub mb-4">系统将根据你的练习记录生成个性化提升计划</p>
                <Button
                  onClick={() =>
                    void generatePlanMutation({}).catch(() => notify.error('生成失败'))
                  }
                  className="bg-k-mint hover:bg-k-mint/90 text-white font-bold rounded-xl"
                >
                  <TrendingUp size={16} className="mr-1" /> 生成提升计划
                </Button>
              </DesktopCard>
            )}
          </div>
        )}

        {/* Mistake Book Tab */}
        {topTab === 'mistakes' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h3 className="text-xl font-black text-k-ink flex items-center gap-2">
              <HanjaSeal c="误" size={32} bg="var(--color-k-crimson)" round={8} />
              错题本
            </h3>

            {weakPoints && weakPoints.length > 0 && (
              <DesktopCard>
                <h4 className="font-black text-k-ink mb-4">近期薄弱点</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {weakPoints.map((weakPoint: TopikCoachWeakPoint) => (
                    <div
                      key={weakPoint.code}
                      className="rounded-2xl border border-k-line/10 bg-k-bg2/40 p-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <DesignChip tone={getWeakPointTone(weakPoint)} size="sm">
                          {weakPoint.labelZh}
                        </DesignChip>
                        <span className="text-xs font-black text-k-sub">{weakPoint.count} 次</span>
                      </div>
                      {weakPoint.taskTypes.length > 0 && (
                        <div className="mt-2 text-[11px] font-bold text-k-sub">
                          {`高频题型: ${weakPoint.taskTypes.map(taskType => `Q${taskType}`).join(' / ')}`}
                        </div>
                      )}
                      <p className="mt-2 text-xs leading-relaxed text-k-ink">
                        {weakPoint.latestExplanation}
                      </p>
                    </div>
                  ))}
                </div>
              </DesktopCard>
            )}

            {mistakeBook && mistakeBook.categories.length > 0 ? (
              <div className="space-y-3">
                {mistakeBook.categories.map((category: TopikMistakeBookCategory) => {
                  const latestExample = category.recentExamples[0];
                  return (
                    <DesktopCard key={category.type} className="border-l-4 border-l-amber-400">
                      <div className="flex items-start justify-between mb-2">
                        <DesignChip tone={getMistakeCategoryTone(category)} size="sm">
                          {category.labelZh}
                        </DesignChip>
                        <span className="text-[10px] font-bold text-k-sub bg-k-bg2 px-2 py-0.5 rounded-full">
                          {category.count} 次
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2 mb-3">
                        <DesignChip tone="muted" size="sm">
                          {category.label}
                        </DesignChip>
                        {category.category && (
                          <span className="text-[10px] font-bold text-k-sub bg-k-bg2 px-2 py-0.5 rounded-full">
                            {category.category}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2 text-[10px] font-bold text-k-sub">
                        <span>{`HIGH ${category.severityCounts.HIGH ?? 0}`}</span>
                        <span>{`MEDIUM ${category.severityCounts.MEDIUM ?? 0}`}</span>
                        <span>{`LOW ${category.severityCounts.LOW ?? 0}`}</span>
                      </div>
                      {latestExample && (
                        <>
                          <div className="flex flex-wrap gap-3 items-center mt-3 mb-2">
                            <span className="line-through text-k-sub font-medium text-sm">
                              {latestExample.original}
                            </span>
                            <span className="text-k-mint font-black text-sm">
                              → {latestExample.corrected}
                            </span>
                          </div>
                          <p className="text-xs text-k-ink font-medium leading-relaxed">
                            {latestExample.explanation}
                          </p>
                          <div className="mt-2 text-[10px] text-k-sub">
                            {new Date(latestExample.createdAt).toLocaleDateString('zh-CN')}
                          </div>
                        </>
                      )}
                    </DesktopCard>
                  );
                })}
                {mistakeBook.totalErrors > 0 && (
                  <DesktopCard>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-[10px] font-black text-k-sub uppercase tracking-wider">
                          Total Errors
                        </div>
                        <div className="text-2xl font-black text-k-ink font-k-serif">
                          {mistakeBook.totalErrors}
                        </div>
                      </div>
                      <div className="text-xs text-k-sub text-right">
                        {`共 ${mistakeBook.categories.length} 类高频错误`}
                      </div>
                    </div>
                  </DesktopCard>
                )}
              </div>
            ) : (
              <DesktopCard className="text-center py-12">
                <History size={32} className="mx-auto text-k-sub/40 mb-4" />
                <p className="text-sm text-k-sub font-medium">还没有错题记录</p>
                <p className="text-xs text-k-sub/60 mt-1">
                  完成写作练习后，AI 发现的错误会自动归档到这里
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={() => setTopTab('practice')}
                >
                  开始练习
                </Button>
              </DesktopCard>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default TopikWritingCoachPage;
