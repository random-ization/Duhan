/**
 * TopikWritingPage.tsx
 *
 * "Glue" page that orchestrates the TOPIK II writing exam flow:
 *   LOADING → EXAM (WritingExamSession) → REPORT (WritingEvaluationReport)
 *
 * Route: /topik/writing/:examId
 */

import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useMutation, useQuery } from 'convex/react';
import { useLocalizedNavigate } from '../hooks/useLocalizedNavigate';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { WritingExamSession } from '../components/topik/WritingExamSession';
import { WritingEvaluationReport } from '../components/topik/WritingEvaluationReport';
import { Navigate } from 'react-router-dom';
import type { Id } from '../../convex/_generated/dataModel';

import { api } from '../../convex/_generated/api';

// ─── Types ────────────────────────────────────────────────────────────────────

type PageState =
    | { phase: 'loading' }
    | { phase: 'exam'; sessionId: string; endTime: number }
    | { phase: 'report'; sessionId: string; answers: Record<string, string> };

type WritingQuestionType = 'FILL_BLANK' | 'GRAPH_ESSAY' | 'OPINION_ESSAY';

function normalizeQuestionType(
    questionType: string,
    number: number,
): WritingQuestionType {
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
    const { topikExams } = useData();
    const navigate = useLocalizedNavigate();
    const { t } = useTranslation();

    const startSession = useMutation(api.topikWriting.startSession);
    // Find the exam in context
    const exam = topikExams.find(e => e.id === examId);
    const writingQuestions = useQuery(
        api.topikWriting.getWritingQuestions,
        exam?._id ? { examId: exam._id as Id<'topik_exams'> } : 'skip',
    );

    const [state, setPageState] = useState<PageState>({ phase: 'loading' });

    // On mount: start or resume session
    useEffect(() => {
        if (!examId || !user || !exam || !exam._id) return;

        startSession({ examId: exam._id as Id<'topik_exams'> })
            .then((sessionId: string) => {
                // endTime = now + 50 min (same as backend); backend is source of truth
                // but we show an optimistic countdown. The session doc will correct it.
                const endTime = Date.now() + 50 * 60 * 1000;
                setPageState({ phase: 'exam', sessionId, endTime });
            })
            .catch(err => {
                console.error('Failed to start writing session', err);
                navigate('/topik');
            });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [examId, user, exam]);

    if (!user) return <Navigate to="/" replace />;
    if (!examId) return <Navigate to="/topik" replace />;

    // ── Render loading ──────────────────────────────────────────────────────────
    if (state.phase === 'loading') {
        return (
            <div className="flex items-center justify-center min-h-screen bg-background">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
                    <p className="font-bold text-muted-foreground text-sm">
                        {t('topikWriting.session.loadingExam', { defaultValue: 'Preparing writing exam...' })}
                    </p>
                </div>
            </div>
        );
    }

    // ── Render report ───────────────────────────────────────────────────────────
    if (state.phase === 'report') {
        return (
            <div className="min-h-screen bg-background">
                <WritingEvaluationReport
                    sessionId={state.sessionId}
                    originalAnswers={state.answers}
                    onBack={() => navigate('/topik')}
                />
            </div>
        );
    }

    // ── Render exam ─────────────────────────────────────────────────────────────
    // Fallback placeholder when no writing questions have been uploaded yet.
    const placeholderQuestions = [
        {
            _id: '51', number: 51, questionType: 'FILL_BLANK' as const, score: 10,
            instruction: t('topikWriting.session.q51Instruction', {
                defaultValue:
                    'Fill in the blank based on the context to make the passage complete and natural.',
            })
        },
        {
            _id: '52', number: 52, questionType: 'FILL_BLANK' as const, score: 10,
            instruction: t('topikWriting.session.q52Instruction', {
                defaultValue: 'Fill in the blank according to the requirements of the prompt.',
            })
        },
        {
            _id: '53', number: 53, questionType: 'GRAPH_ESSAY' as const, score: 30,
            instruction: t('topikWriting.session.q53Instruction', {
                defaultValue:
                    'Based on the graph below, write an explanatory essay (200-300 characters).',
            })
        },
        {
            _id: '54', number: 54, questionType: 'OPINION_ESSAY' as const, score: 50,
            instruction: t('topikWriting.session.q54Instruction', {
                defaultValue:
                    'Write an argumentative essay on the topic below (400-700 characters).',
            })
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

    return (
        <WritingExamSession
            sessionId={state.sessionId}
            examId={examId}
            endTime={state.endTime}
            questions={resolvedQuestions}
            initialAnswers={{}}
            onSubmitted={submittedAnswers => {
                setPageState({
                    phase: 'report',
                    sessionId: state.sessionId,
                    answers: submittedAnswers,
                });
            }}
            onExit={() => {
                navigate('/topik');
            }}
        />
    );
};

export default TopikWritingPage;
