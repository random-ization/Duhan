/**
 * Shared Query Limits Configuration
 * 
 * Defines maximum limits for Convex queries to prevent excessive calls
 * and full table scans. Adjust these values based on application needs
 * and observed query performance.
 */

/**
 * Maximum number of user records to scan when searching
 * Prevents full table scans on large user tables
 */
export const MAX_USER_SEARCH_SCAN = 1000;

/**
 * Maximum items to return per user collection in enrichUser()
 * Prevents unbounded queries when users have large amounts of data
 * Applies to: savedWords, mistakes, examAttempts
 */
export const MAX_ITEMS_PER_USER_COLLECTION = 100;

/**
 * Default limit for vocabulary queries when not specified
 * Prevents fetching all vocabulary for a course
 */
export const DEFAULT_VOCAB_LIMIT = 500;

/**
 * Maximum institutes to return in fallback (non-paginated) mode
 * Prevents full table scans on institutes table
 */
export const MAX_INSTITUTES_FALLBACK = 100;
