/**
 * TopikWritingPage.tsx
 *
 * "Glue" page that orchestrates the TOPIK II writing exam flow:
 *   LOADING → EXAM (WritingExamSession) → REPORT (WritingEvaluationReport)
 *
 * Route: /topik/writing/:examId
 */

import React, { useEffect, useRef, useState } from 'react';
import { Navigate, useLocation, useParams, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery } from 'convex/react';
import { useCurrentLanguage, useLocalizedNavigate } from '../hooks/useLocalizedNavigate';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { WritingExamSession } from '../components/topik/WritingExamSession';
import { WritingEvaluationReport } from '../components/topik/WritingEvaluationReport';
import type { Id } from '../../convex/_generated/dataModel';
import { useUpgradeFlow } from '../hooks/useUpgradeFlow';
import { getEntitlementErrorData } from '../utils/entitlements';
import { notify } from '../utils/notify';
import { useIsMobile } from '../hooks/useIsMobile';
import { MobileImmersiveHeader } from '../components/mobile/MobileImmersiveHeader';
import { appendReturnToPath } from '../utils/navigation';
import { localizeInternalPath } from '../utils/localizedRouting';
import { TOPIK } from '../utils/convexRefs';

import { api } from '../../convex/_generated/api';

// ─── Types ────────────────────────────────────────────────────────────────────

type PageState =
  | { phase: 'loading' }
  | {
      phase: 'exam';
      sessionId: Id<'topik_writing_sessions'>;
      endTime: number;
      initialAnswers: Record<string, string>;
    }
  | { phase: 'report'; sessionId: Id<'topik_writing_sessions'>; answers: Record<string, string> };

type WritingQuestionType = 'FILL_BLANK' | 'GRAPH_ESSAY' | 'OPINION_ESSAY';

function normalizeQuestionType(questionType: string, number: number): WritingQuestionType {
  if (
    questionType === 'FILL_BLANK' ||
    questionType === 'GRAPH_ESSAY' ||
    questionType === 'OPINION_ESSAY'
  ) {
    return questionType;
  }
  if (number <= 52) return 'FILL_BLANK';
  if (number === 53) return 'GRAPH_ESSAY';
  return 'OPINION_ESSAY';
}

// ─── Component ────────────────────────────────────────────────────────────────

const TopikWritingPage: React.FC = () => {
  const { examId } = useParams<{ examId: string }>();
  const { user } = useAuth();
  const navigate = useLocalizedNavigate();
  const currentLanguage = useCurrentLanguage();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { t } = useTranslation();
  const { startUpgradeFlow } = useUpgradeFlow();
  const isMobile = useIsMobile();

  const startSession = useMutation(api.topikWriting.startSession);
  const exam = useQuery(TOPIK.getExamById, examId ? { examId } : 'skip');
  const writingQuestions = useQuery(
    api.topikWriting.getWritingQuestions,
    exam?._id ? { examId: exam._id as Id<'topik_exams'> } : 'skip'
  );
  const topikLobbyPath = appendReturnToPath('/topik', searchParams.get('returnTo'));
  const writingReturnPath = `${location.pathname}${location.search}`;

  const [state, setPageState] = useState<PageState>({ phase: 'loading' });
  const invalidExamHandledRef = useRef<string | null>(null);

  // On mount: start or resume session
  useEffect(() => {
    if (!examId || !user) return;
    if (exam === undefined) return;

    if (!exam || exam.type !== 'WRITING' || !exam._id) {
      if (invalidExamHandledRef.current === examId) {
        return;
      }
      invalidExamHandledRef.current = examId;
      notify.error(
        t('topikWriting.session.examNotFound', {
          defaultValue: 'Unable to find this writing exam.',
        })
      );
      navigate(topikLobbyPath);
      return;
    }

    invalidExamHandledRef.current = null;

    startSession({ examId: exam._id as Id<'topik_exams'> })
      .then(session => {
        setPageState({
          phase: 'exam',
          sessionId: session.sessionId,
          endTime: session.endTime,
          initialAnswers: session.answers ?? {},
        });
      })
      .catch(err => {
        console.error('Failed to start writing session', err);
        const entitlementError = getEntitlementErrorData(err);
        if (entitlementError?.upgradeSource) {
          startUpgradeFlow({
            plan: 'ANNUAL',
            source: entitlementError.upgradeSource,
            returnTo: writingReturnPath,
          });
          return;
        }
        notify.error(
          t('topikWriting.session.startFailed', {
            defaultValue: 'Unable to start this writing exam right now.',
          })
        );
        navigate(topikLobbyPath);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [examId, user, exam, navigate, startUpgradeFlow, t, topikLobbyPath, writingReturnPath]);

  if (!user) return <Navigate to={localizeInternalPath('/', currentLanguage)} replace />;
  if (!examId) return <Navigate to={topikLobbyPath} replace />;
  if (exam === null) return null;

  // ── Render loading ──────────────────────────────────────────────────────────
  if (state.phase === 'loading') {
    const loadingContent = (
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
        <p className="font-bold text-muted-foreground text-sm">
          {t('topikWriting.session.loadingExam', { defaultValue: 'Preparing writing exam...' })}
        </p>
      </div>
    );

    if (isMobile) {
      return (
        <div className="min-h-screen bg-background">
          <MobileImmersiveHeader
            eyebrow={t('dashboard.topik.writing', { defaultValue: 'TOPIK Writing' })}
            title={t('topikWriting.title', { defaultValue: 'TOPIK II Writing' })}
            subtitle={t('topikWriting.session.loadingExam', {
              defaultValue: 'Preparing writing exam...',
            })}
            onBack={() => navigate(topikLobbyPath)}
            backLabel={t('topikWriting.report.back', { defaultValue: 'Back' })}
          />
          <div className="flex min-h-[calc(100dvh-var(--mobile-header-offset))] items-center justify-center px-4 pb-mobile-safe pt-8">
            {loadingContent}
          </div>
        </div>
      );
    }

    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        {loadingContent}
      </div>
    );
  }

  // ── Render report ───────────────────────────────────────────────────────────
  // Fallback placeholder when no writing questions have been uploaded yet.
  const placeholderQuestions = [
    {
      _id: '51',
      number: 51,
      questionType: 'FILL_BLANK' as const,
      score: 10,
      instruction: t('topikWriting.session.q51Instruction', {
        defaultValue:
          'Fill in the blank based on the context to make the passage complete and natural.',
      }),
    },
    {
      _id: '52',
      number: 52,
      questionType: 'FILL_BLANK' as const,
      score: 10,
      instruction: t('topikWriting.session.q52Instruction', {
        defaultValue: 'Fill in the blank according to the requirements of the prompt.',
      }),
    },
    {
      _id: '53',
      number: 53,
      questionType: 'GRAPH_ESSAY' as const,
      score: 30,
      instruction: t('topikWriting.session.q53Instruction', {
        defaultValue: 'Based on the graph below, write an explanatory essay (200-300 characters).',
      }),
    },
    {
      _id: '54',
      number: 54,
      questionType: 'OPINION_ESSAY' as const,
      score: 50,
      instruction: t('topikWriting.session.q54Instruction', {
        defaultValue: 'Write an argumentative essay on the topic below (400-700 characters).',
      }),
    },
  ];

  const resolvedQuestions =
    writingQuestions && writingQuestions.length > 0
      ? [...writingQuestions]
          .sort((a, b) => a.number - b.number)
          .map(q => ({
            _id: String(q._id),
            number: q.number,
            questionType: normalizeQuestionType(q.questionType, q.number),
            score: q.score,
            instruction: q.instruction,
            contextBox: q.contextBox,
            image: q.image,
            modelAnswer: q.modelAnswer,
          }))
      : placeholderQuestions;

  if (isMobile) {
    if (state.phase === 'report') {
      const reportState = state as Extract<typeof state, { phase: 'report' }>;
      return (
        <div className="min-h-screen bg-background">
          <WritingEvaluationReport
            sessionId={reportState.sessionId}
            originalAnswers={reportState.answers}
            onBack={() => navigate(topikLobbyPath)}
          />
        </div>
      );
    }
    const examState = state as Extract<typeof state, { phase: 'exam' }>;

    return (
      <WritingExamSession
        sessionId={examState.sessionId}
        examId={examId}
        endTime={examState.endTime}
        questions={resolvedQuestions}
        initialAnswers={examState.initialAnswers}
        onSubmitError={error => {
          const entitlementError = getEntitlementErrorData(error);
          if (entitlementError?.upgradeSource) {
            startUpgradeFlow({
              plan: 'ANNUAL',
              source: entitlementError.upgradeSource,
              returnTo: writingReturnPath,
            });
            return;
          }
          notify.error(
            t('topikWriting.session.submitFailed', {
              defaultValue: 'Unable to submit this writing exam right now.',
            })
          );
        }}
        onSubmitted={submittedAnswers => {
          setPageState({
            phase: 'report',
            sessionId: state.sessionId,
            answers: submittedAnswers,
          });
        }}
        onExit={() => {
          navigate(topikLobbyPath);
        }}
      />
    );
  }

  if (state.phase === 'report') {
    const reportState = state as Extract<typeof state, { phase: 'report' }>;
    return (
      <div className="min-h-screen bg-background">
        <WritingEvaluationReport
          sessionId={reportState.sessionId}
          originalAnswers={reportState.answers}
          onBack={() => navigate(topikLobbyPath)}
        />
      </div>
    );
  }

  const examState = state as Extract<typeof state, { phase: 'exam' }>;

  return (
    <WritingExamSession
      sessionId={examState.sessionId}
      examId={examId}
      endTime={examState.endTime}
      questions={resolvedQuestions}
      initialAnswers={examState.initialAnswers}
      onSubmitError={error => {
        const entitlementError = getEntitlementErrorData(error);
        if (entitlementError?.upgradeSource) {
          startUpgradeFlow({
            plan: 'ANNUAL',
            source: entitlementError.upgradeSource,
            returnTo: writingReturnPath,
          });
          return;
        }
        notify.error(
          t('topikWriting.session.submitFailed', {
            defaultValue: 'Unable to submit this writing exam right now.',
          })
        );
      }}
      onSubmitted={submittedAnswers => {
        setPageState({
          phase: 'report',
          sessionId: examState.sessionId,
          answers: submittedAnswers,
        });
      }}
      onExit={() => {
        navigate(topikLobbyPath);
      }}
    />
  );
};

export default TopikWritingPage;
