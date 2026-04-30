import React from 'react';
import { WritingExamSession } from '../../components/topik/WritingExamSession';
import { WritingEvaluationReport } from '../../components/topik/WritingEvaluationReport';

interface DesktopTopikWritingPageProps {
  state: any;
  loadingContent: React.ReactNode;
  resolvedQuestions: any[];
  examId: string;
  topikLobbyPath: string;
  writingReturnPath: string;
  navigate: any;
  setPageState: (s: any) => void;
  startUpgradeFlow: any;
  getEntitlementErrorData: any;
  notify: any;
  t: any;
}

export const DesktopTopikWritingPage: React.FC<DesktopTopikWritingPageProps> = ({
  state,
  loadingContent,
  resolvedQuestions,
  examId,
  topikLobbyPath,
  writingReturnPath,
  navigate,
  setPageState,
  startUpgradeFlow,
  getEntitlementErrorData,
  notify,
  t,
}) => {
  if (state.phase === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        {loadingContent}
      </div>
    );
  }

  if (state.phase === 'report') {
    return (
      <div className="min-h-screen bg-background">
        <WritingEvaluationReport
          sessionId={state.sessionId}
          originalAnswers={state.answers}
          onBack={() => navigate(topikLobbyPath)}
        />
      </div>
    );
  }

  return (
    <WritingExamSession
      sessionId={state.sessionId}
      examId={examId}
      endTime={state.endTime}
      questions={resolvedQuestions}
      initialAnswers={state.initialAnswers}
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
};

export default DesktopTopikWritingPage;
