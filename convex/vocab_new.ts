/**
 * Vocabulary module - Main entry point
 * This file re-exports all vocabulary functions from their respective modules
 */

// Export types
export * from './vocab/vocabTypes';

// Export queries
export * from './vocab/vocabQueries';

// Export mutations
export * from './vocab/vocabMutations';

// Legacy exports for backward compatibility
// These can be gradually migrated to use the modular imports
import { getStats, getDailyPhrase, getReviewDeck, getReviewSummary } from './vocab/vocabQueries';
import { saveWord, updateProgress, addToReview, setMastery, updateVocab } from './vocab/vocabMutations';

// Re-export with original names for backward compatibility
export {
  getStats,
  getDailyPhrase,
  getReviewDeck,
  getReviewSummary,
  saveWord,
  updateProgress,
  addToReview,
  setMastery,
  updateVocab,
};
