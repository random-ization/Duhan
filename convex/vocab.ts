/**
 * Vocabulary module - Refactored for better organization
 * 
 * This file now serves as the main entry point for all vocabulary functionality.
 * The actual implementations have been split into modular files:
 * - vocab/vocabTypes.ts - Type definitions
 * - vocab/vocabQueries.ts - Query functions
 * - vocab/vocabMutations.ts - Mutation functions
 */

// Re-export everything from the modular structure
export * from './vocab/vocabTypes';
export * from './vocab/vocabQueries';
export * from './vocab/vocabMutations';
