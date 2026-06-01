import React from 'react';
import { Navigate } from 'react-router-dom';
import { getLocalizedPath, useCurrentLanguage } from '../hooks/useLocalizedNavigate';
import { TOPIK_GRAMMAR_COURSE_ID } from '../utils/learningFlow';

/**
 * GrammarHubPage resolves the user's active course and renders the grammar module
 * for it. This keeps "语法" (Grammar) as a standalone top-level entry in the
 * sidebar — independent of the Today (/dashboard/course) flow.
 */
const GrammarHubPage: React.FC = () => {
  const currentLang = useCurrentLanguage();

  // Always fixed to TOPIK grammar as per user request
  const resolvedInstituteId = TOPIK_GRAMMAR_COURSE_ID;

  return (
    <Navigate
      to={getLocalizedPath(`/course/${resolvedInstituteId}/grammar`, currentLang)}
      replace
    />
  );
};

export default GrammarHubPage;
