import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { TopikExam, Language, ExamAttempt, Annotation } from '../../../types';
import { ExamList } from '../../../components/topik/ExamList';
import { ExamResultView, ExamReviewView, ExamCoverView } from '../../../components/topik/ExamViews';
import { useAuth } from '../../../contexts/AuthContext';
import { useData } from '../../../contexts/DataContext';

interface ExamListContainerProps {
    canAccessContent?: (content: any) => boolean;
    onShowUpgradePrompt?: () => void;
}

/**
 * ExamListContainer - 考试列表页面级组件
 * 
 * 保留原 TopikModule 的列表、封面、结果、复习功能
 * 考试进行页面跳转到 ExamSessionContainer
 */
const ExamListContainer: React.FC<ExamListContainerProps> = ({
    canAccessContent,
    onShowUpgradePrompt,
}) => {
    const navigate = useNavigate();
    const { user, language, saveExamAttempt, saveAnnotation, deleteExamAttempt } = useAuth();
    const { topikExams: exams } = useData();

    const history = useMemo(() => user?.examHistory || [], [user]);
    const annotations = useMemo(() => user?.annotations || [], [user]);

    // 视图状态
    const [view, setView] = useState<'LIST' | 'HISTORY_LIST' | 'COVER' | 'RESULT' | 'REVIEW'>('LIST');
    const [currentExam, setCurrentExam] = useState<TopikExam | null>(null);
    const [userAnswers, setUserAnswers] = useState<Record<number, number>>({});
    const [currentReviewAttempt, setCurrentReviewAttempt] = useState<ExamAttempt | null>(null);
    const [examResult, setExamResult] = useState<{
        score: number;
        totalScore: number;
        correctCount: number;
        totalQuestions: number;
    } | null>(null);

    // 选择试卷 - 进入封面页
    const selectExam = (exam: TopikExam) => {
        if (canAccessContent && !canAccessContent(exam)) {
            onShowUpgradePrompt?.();
            return;
        }

        setCurrentExam(exam);
        setUserAnswers({});
        setView('COVER');
    };

    // 开始考试 - 跳转到新的 ExamSessionContainer
    const startExam = () => {
        if (currentExam) {
            navigate(`/topik/exam/${currentExam.id}`);
        }
    };

    // 复习考试
    const reviewExam = (attempt?: ExamAttempt) => {
        if (attempt) {
            setCurrentReviewAttempt(attempt);
            const exam = exams.find(e => e.id === attempt.examId);
            if (exam) {
                setCurrentExam(exam);
                setUserAnswers(attempt.userAnswers);
            }
        }
        setView('REVIEW');
    };

    // 返回列表
    const resetExam = () => {
        setCurrentExam(null);
        setUserAnswers({});
        setExamResult(null);
        setCurrentReviewAttempt(null);
        setView('LIST');
    };

    // 保存标注
    const handleSaveAnnotation = (annotation: Annotation) => {
        saveAnnotation(annotation);
    };

    // 删除标注
    const handleDeleteAnnotation = (annotationId: string) => {
        const toDelete = annotations.find(a => a.id === annotationId);
        if (!toDelete) return;

        const deleteAnnotation: Annotation = {
            ...toDelete,
            note: '',
            color: null,
        };
        saveAnnotation(deleteAnnotation);
    };

    // 列表视图
    if (view === 'LIST') {
        return (
            <ExamList
                exams={exams}
                history={history}
                language={language}
                onSelectExam={selectExam}
                onViewHistory={() => setView('HISTORY_LIST')}
                onReviewAttempt={reviewExam}
                canAccessContent={canAccessContent}
                onDeleteAttempt={deleteExamAttempt}
            />
        );
    }

    // 历史列表视图
    if (view === 'HISTORY_LIST') {
        return (
            <ExamList
                exams={exams}
                history={history}
                language={language}
                onSelectExam={selectExam}
                onViewHistory={() => setView('LIST')}
                onReviewAttempt={reviewExam}
                showHistoryView={true}
                onBack={() => setView('LIST')}
                canAccessContent={canAccessContent}
                onDeleteAttempt={deleteExamAttempt}
            />
        );
    }

    // 封面视图
    if (view === 'COVER' && currentExam) {
        return (
            <ExamCoverView
                exam={currentExam}
                language={language}
                onStart={startExam}
                onBack={resetExam}
                hasAttempted={history.some(h => h.examId === currentExam.id)}
            />
        );
    }

    // 结果视图
    if (view === 'RESULT' && currentExam && examResult) {
        return (
            <ExamResultView
                exam={currentExam}
                result={examResult}
                language={language}
                onReview={() => reviewExam()}
                onTryAgain={() => {
                    setUserAnswers({});
                    setExamResult(null);
                    setView('COVER');
                }}
                onBackToList={resetExam}
            />
        );
    }

    // 复习视图
    if (view === 'REVIEW' && currentExam) {
        return (
            <ExamReviewView
                exam={currentExam}
                userAnswers={userAnswers}
                language={language}
                annotations={annotations}
                onSaveAnnotation={handleSaveAnnotation}
                onDeleteAnnotation={handleDeleteAnnotation}
                onBack={resetExam}
            />
        );
    }

    return null;
};

export default ExamListContainer;
