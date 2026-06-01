/**
 * Onboarding Page - goal selection plus backend-powered lightweight diagnosis.
 */
import React, { useCallback, useMemo, useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { useTranslation } from 'react-i18next';
import { useLocalizedNavigate } from '../hooks/useLocalizedNavigate';
import { Button } from '../components/ui';
import { api } from '../../convex/_generated/api';
import type { DiagnosisQuestionDto } from '../../convex/onboarding/shared';
import { CheckCircle2, ChevronRight, Sparkles, ArrowLeft } from 'lucide-react';

const GOALS = [
  { id: 'TOPIK', emoji: '📝', label: 'TOPIK 考试', desc: '备考 TOPIK I/II，提升分数' },
  { id: 'STUDY_ABROAD', emoji: '🎓', label: '韩国留学 / 生活', desc: '学校、打工、日常韩语' },
  { id: 'CONTENT', emoji: '📺', label: '韩剧 / K-pop / 内容理解', desc: '看懂韩语真实内容' },
  { id: 'SPEAKING', emoji: '💬', label: '口语交流', desc: '能听懂、能表达' },
  { id: 'BUSINESS', emoji: '💼', label: '工作 / 商务韩语', desc: '职场韩语、邮件、面试' },
  { id: 'READING', emoji: '📖', label: '阅读提升', desc: '看懂新闻、文章、书籍' },
  { id: 'WRITING', emoji: '✍️', label: '写作提升', desc: '写出准确自然的韩语' },
] as const;

const DAILY_MINUTES_OPTIONS = [
  { value: 15, label: '15 分钟', desc: '轻松入门' },
  { value: 30, label: '30 分钟', desc: '稳步提升' },
  { value: 45, label: '45 分钟', desc: '认真学习' },
  { value: 60, label: '60 分钟', desc: '全力冲刺' },
] as const;

type Step = 'goals' | 'diagnosis' | 'time' | 'done';
type DiagnosisAnswers = Record<string, string>;

function normalizeUiLanguage(language: string): 'zh' | 'en' | 'vi' | 'mn' {
  if (language.startsWith('zh')) return 'zh';
  if (language.startsWith('vi')) return 'vi';
  if (language.startsWith('mn')) return 'mn';
  return 'en';
}

function allQuestionsAnswered(
  questions: DiagnosisQuestionDto[] | undefined,
  answers: DiagnosisAnswers
): boolean {
  return Boolean(questions?.length && questions.every(question => Boolean(answers[question.id])));
}

const OnboardingPage: React.FC = () => {
  const { i18n } = useTranslation();
  const language = normalizeUiLanguage(i18n.language);
  const navigate = useLocalizedNavigate();
  const submitGoals = useMutation(api.onboarding.submitGoals);
  const submitDiagnosisResult = useMutation(api.onboarding.submitDiagnosisResult);
  const generateTodayPlan = useMutation(api.dailyTask.generateTodayPlan);
  const diagnosisQuestions = useQuery(api.onboarding.getDiagnosisQuestions, { language });

  const [step, setStep] = useState<Step>('goals');
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const [diagnosisAnswers, setDiagnosisAnswers] = useState<DiagnosisAnswers>({});
  const [dailyMinutes, setDailyMinutes] = useState<number>(30);
  const [saving, setSaving] = useState(false);

  const answeredDiagnosis = useMemo(
    () => allQuestionsAnswered(diagnosisQuestions, diagnosisAnswers),
    [diagnosisQuestions, diagnosisAnswers]
  );

  const toggleGoal = useCallback((goalId: string) => {
    setSelectedGoals(prev =>
      prev.includes(goalId)
        ? prev.filter(g => g !== goalId)
        : prev.length < 3
          ? [...prev, goalId]
          : prev
    );
  }, []);

  const setDiagnosisAnswer = useCallback((questionId: string, optionId: string) => {
    setDiagnosisAnswers(prev => ({
      ...prev,
      [questionId]: optionId,
    }));
  }, []);

  const handleFinish = useCallback(async () => {
    if (!answeredDiagnosis) return;
    setSaving(true);
    try {
      await submitGoals({
        studyFocus: selectedGoals,
        dailyMinutes,
        preferredLanguage: language,
      });
      await submitDiagnosisResult({
        language,
        answers: Object.entries(diagnosisAnswers).map(([questionId, optionId]) => ({
          questionId,
          optionId,
        })),
      });
      await generateTodayPlan({ language });
      setStep('done');
      navigate('/dashboard');
    } catch (error) {
      console.error('Onboarding save failed:', error);
      navigate('/dashboard');
    } finally {
      setSaving(false);
    }
  }, [
    answeredDiagnosis,
    dailyMinutes,
    diagnosisAnswers,
    generateTodayPlan,
    language,
    navigate,
    selectedGoals,
    submitDiagnosisResult,
    submitGoals,
  ]);

  const handleSkip = useCallback(async () => {
    setSaving(true);
    try {
      await submitGoals({
        studyFocus: ['CONTENT'],
        preferredLanguage: language,
        dailyMinutes: 30,
      });
      await generateTodayPlan({ language });
      navigate('/dashboard');
    } catch {
      navigate('/dashboard');
    } finally {
      setSaving(false);
    }
  }, [generateTodayPlan, language, navigate, submitGoals]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-stone-100 dark:from-slate-950 dark:to-stone-950">
      <div className="mx-auto max-w-lg px-5 py-12">
        <div className="mb-8 flex items-center justify-center gap-2">
          {(['goals', 'diagnosis', 'time'] as const).map((s, i) => {
            const stepIndex = ['goals', 'diagnosis', 'time'].indexOf(step);
            return (
              <div
                key={s}
                className={`h-2 rounded-full transition-all ${
                  s === step
                    ? 'w-8 bg-red-500'
                    : i < stepIndex
                      ? 'w-2 bg-red-300'
                      : 'w-2 bg-gray-300'
                }`}
              />
            );
          })}
        </div>

        {step === 'goals' && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            <h1 className="mb-2 text-center text-2xl font-black text-gray-900 dark:text-gray-100">
              你为什么学韩语？
            </h1>
            <p className="mb-8 text-center text-sm text-gray-500">
              选择 1-3 个主要目标，帮助系统为你安排学习内容
            </p>

            <div className="space-y-3">
              {GOALS.map(g => {
                const selected = selectedGoals.includes(g.id);
                return (
                  <button
                    key={g.id}
                    onClick={() => toggleGoal(g.id)}
                    className={`flex w-full items-center gap-4 rounded-2xl border-2 px-5 py-4 text-left transition-all ${
                      selected
                        ? 'border-red-500 bg-red-50 shadow-md dark:bg-red-950/30'
                        : 'border-gray-200 bg-white hover:border-gray-300 dark:border-gray-700 dark:bg-gray-900'
                    }`}
                  >
                    <span className="text-2xl">{g.emoji}</span>
                    <div className="flex-1">
                      <div className="text-sm font-bold text-gray-900 dark:text-gray-100">
                        {g.label}
                      </div>
                      <div className="text-xs text-gray-500">{g.desc}</div>
                    </div>
                    {selected && <CheckCircle2 size={20} className="text-red-500" />}
                  </button>
                );
              })}
            </div>

            <div className="mt-8 flex gap-3">
              <Button
                onClick={handleSkip}
                loading={saving}
                variant="ghost"
                className="flex-1 text-gray-500"
              >
                跳过
              </Button>
              <Button
                onClick={() => setStep('diagnosis')}
                disabled={selectedGoals.length === 0}
                className="flex-1 rounded-xl bg-red-500 font-bold text-white hover:bg-red-600"
              >
                下一步 <ChevronRight size={16} />
              </Button>
            </div>
          </div>
        )}

        {step === 'diagnosis' && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            <button
              onClick={() => setStep('goals')}
              className="mb-4 flex items-center text-sm text-gray-500 hover:text-gray-700"
            >
              <ArrowLeft size={16} className="mr-1" /> 返回
            </button>
            <h1 className="mb-2 text-center text-2xl font-black text-gray-900 dark:text-gray-100">
              轻量水平诊断
            </h1>
            <p className="mb-8 text-center text-sm text-gray-500">
              用 3 个问题估算当前水平，首页会据此生成今日任务
            </p>

            {!diagnosisQuestions ? (
              <div className="rounded-2xl bg-white px-5 py-8 text-center text-sm font-bold text-gray-500 dark:bg-gray-900">
                正在载入诊断题...
              </div>
            ) : (
              <div className="space-y-5">
                {diagnosisQuestions.map((question, index) => (
                  <div
                    key={question.id}
                    className="rounded-2xl border-2 border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-900"
                  >
                    <div className="text-xs font-black text-red-500">Q{index + 1}</div>
                    <h2 className="mt-1 text-sm font-black text-gray-900 dark:text-gray-100">
                      {question.prompt}
                    </h2>
                    {question.helpText && (
                      <p className="mt-1 text-xs text-gray-500">{question.helpText}</p>
                    )}
                    <div className="mt-4 space-y-2">
                      {question.options.map(option => {
                        const selected = diagnosisAnswers[question.id] === option.id;
                        return (
                          <button
                            key={option.id}
                            onClick={() => setDiagnosisAnswer(question.id, option.id)}
                            className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left text-sm font-bold transition-all ${
                              selected
                                ? 'border-red-500 bg-red-50 text-red-700'
                                : 'border-gray-200 bg-gray-50 text-gray-700 hover:border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200'
                            }`}
                          >
                            {option.label}
                            {selected && <CheckCircle2 size={16} className="text-red-500" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-8">
              <Button
                onClick={() => setStep('time')}
                disabled={!answeredDiagnosis}
                className="w-full rounded-xl bg-red-500 font-bold text-white hover:bg-red-600"
              >
                下一步 <ChevronRight size={16} />
              </Button>
            </div>
          </div>
        )}

        {step === 'time' && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            <button
              onClick={() => setStep('diagnosis')}
              className="mb-4 flex items-center text-sm text-gray-500 hover:text-gray-700"
            >
              <ArrowLeft size={16} className="mr-1" /> 返回
            </button>
            <h1 className="mb-2 text-center text-2xl font-black text-gray-900 dark:text-gray-100">
              每天想学多久？
            </h1>
            <p className="mb-8 text-center text-sm text-gray-500">我们会据此安排每日任务量</p>

            <div className="grid grid-cols-2 gap-3">
              {DAILY_MINUTES_OPTIONS.map(opt => {
                const selected = dailyMinutes === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => setDailyMinutes(opt.value)}
                    className={`rounded-2xl border-2 px-4 py-5 text-center transition-all ${
                      selected
                        ? 'border-red-500 bg-red-50 shadow-md dark:bg-red-950/30'
                        : 'border-gray-200 bg-white hover:border-gray-300 dark:border-gray-700 dark:bg-gray-900'
                    }`}
                  >
                    <div className="text-2xl font-black text-gray-900 dark:text-gray-100">
                      {opt.label}
                    </div>
                    <div className="mt-1 text-xs text-gray-500">{opt.desc}</div>
                  </button>
                );
              })}
            </div>

            <div className="mt-8">
              <Button
                onClick={handleFinish}
                loading={saving}
                className="w-full rounded-xl bg-red-500 font-bold text-white hover:bg-red-600"
              >
                <Sparkles size={16} className="mr-1" /> 生成今日学习计划
              </Button>
            </div>
          </div>
        )}

        {step === 'done' && (
          <div className="animate-in fade-in zoom-in duration-500 py-16 text-center">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100">
              <CheckCircle2 size={40} className="text-emerald-600" />
            </div>
            <h1 className="text-2xl font-black text-gray-900 dark:text-gray-100">准备就绪！</h1>
            <p className="mt-2 text-sm text-gray-500">正在进入你的学习驾驶舱...</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default OnboardingPage;
