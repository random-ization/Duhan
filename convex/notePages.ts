/**
 * NotePages module - Refactored for better organization
 * 
 * This file now serves as the main entry point for all notePages functionality.
 * The actual implementations have been split into modular files:
 * - notePages/notePagesTypes.ts - Type definitions and constants
 * - notePages/notePagesQueries.ts - Query functions
 * - notePages/notePagesMutations.ts - Mutation functions
 * - notePages/notePagesUtils.ts - Utility functions
 */

// Re-export everything from the modular structure
export * from './notePages/notePagesTypes';
export * from './notePages/notePagesQueries';
export * from './notePages/notePagesMutations';
export * from './notePages/notePagesUtils';
