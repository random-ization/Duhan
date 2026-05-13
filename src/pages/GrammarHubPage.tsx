import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLearningSelection } from '../contexts/LearningContext';
import { useData } from '../contexts/DataContext';
import { useLocalizedNavigate, getLocalizedPath, useCurrentLanguage } from '../hooks/useLocalizedNavigate';
import { ContentSkeleton } from '../components/common';
import { TOPIK_GRAMMAR_COURSE_ID } from '../utils/learningFlow';

/**
 * GrammarHubPage resolves the user's active course and renders the grammar module
 * for it. This keeps "语法" (Grammar) as a standalone top-level entry in the
 * sidebar — independent of the Today (/dashboard/course) flow.
 */
const GrammarHubPage: React.FC = () => {
  const { user } = useAuth();
  const { selectedInstitute } = useLearningSelection();
  const { institutes, institutesLoading } = useData();
  const currentLang = useCurrentLanguage();

  // Always fixed to TOPIK grammar as per user request
  const resolvedInstituteId = TOPIK_GRAMMAR_COURSE_ID;

  if (institutesLoading && !resolvedInstituteId) {
    return <ContentSkeleton />;
  }

  if (!resolvedInstituteId) {
    // No courses available at all — send user to courses overview
    return <Navigate to={getLocalizedPath('/courses', currentLang)} replace />;
  }

  return (
    <Navigate
      to={getLocalizedPath(`/course/${resolvedInstituteId}/grammar`, currentLang)}
      replace
    />
  );
};

export default GrammarHubPage;
