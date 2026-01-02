// services/api.ts
// API LAYER: Client-side interface to Convex Backend with caching
import { ConvexHttpClient } from "convex/browser";
import { api as convexApi } from "../convex/_generated/api";
import { User, VocabularyItem, Mistake, Annotation, ExamAttempt, TextbookContent } from "../types";

const CONVEX_URL = (import.meta as any).env.VITE_CONVEX_URL;
if (!CONVEX_URL) {
  console.error("VITE_CONVEX_URL is not defined!");
}

const client = new ConvexHttpClient(CONVEX_URL!);

// ============================================
// CACHE CONFIGURATION
// ============================================
// To reduce Convex query volume and prevent explosions (>3M calls),
// we implement an in-memory cache with TTL and in-flight deduplication.
// 
// Configuration constants:
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes - adjust if needed
const DEFAULT_PAGE_SIZE = 50; // Default page size - prevents full-table scans
const MAX_CACHE_SIZE = 100; // Maximum cache entries to prevent memory leaks

// ============================================
// IN-MEMORY CACHE WITH TTL AND IN-FLIGHT DEDUPLICATION
// ============================================
interface CacheEntry {
  data: any;
  timestamp: number;
  promise?: Promise<any>; // For in-flight de-duplication
  lastAccessed: number; // For LRU eviction
}

const queryCache = new Map<string, CacheEntry>();

// LRU cache eviction - removes oldest accessed entry when cache is full
function evictLRUIfNeeded() {
  if (queryCache.size >= MAX_CACHE_SIZE) {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;
    
    queryCache.forEach((entry, key) => {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    });
    
    if (oldestKey) {
      queryCache.delete(oldestKey);
    }
  }
}

// Serialize params to create cache key (with deterministic object key ordering)
function serializeCacheKey(method: string, params?: any): string {
  if (!params || Object.keys(params).length === 0) {
    return method;
  }
  // Sort keys recursively to ensure consistent serialization regardless of property order
  const sortedParams = JSON.stringify(params, (key, value) => {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return Object.keys(value)
        .sort()
        .reduce((sorted, k) => {
          sorted[k] = value[k];
          return sorted;
        }, {} as any);
    }
    return value;
  });
  return `${method}:${sortedParams}`;
}

// Get from cache or execute query with in-flight de-duplication
async function cachedQuery(
  method: string,
  queryFn: () => Promise<any>,
  params?: any
): Promise<any> {
  const cacheKey = serializeCacheKey(method, params);
  const now = Date.now();
  
  // Check if we have a valid cached entry
  const cached = queryCache.get(cacheKey);
  if (cached) {
    // If there's an in-flight promise, return it
    if (cached.promise) {
      return cached.promise;
    }
    
    // If cache is still fresh, return cached data
    if (now - cached.timestamp < CACHE_TTL_MS) {
      cached.lastAccessed = now; // Update LRU timestamp
      return cached.data;
    }
    
    // Cache expired, remove it
    queryCache.delete(cacheKey);
  }
  
  // Execute the query and cache the promise for in-flight de-duplication
  const promise = queryFn().then(
    (data) => {
      // Store the result in cache
      evictLRUIfNeeded(); // Ensure cache doesn't grow unbounded
      queryCache.set(cacheKey, {
        data,
        timestamp: Date.now(),
        lastAccessed: Date.now(),
      });
      return data;
    },
    (error) => {
      // On error, remove the cache entry
      queryCache.delete(cacheKey);
      throw error;
    }
  );
  
  // Store the in-flight promise
  evictLRUIfNeeded(); // Ensure cache doesn't grow unbounded
  queryCache.set(cacheKey, {
    data: null,
    timestamp: now,
    lastAccessed: now,
    promise,
  });
  
  return promise;
}

// Helper to get token from storage
const getToken = () => {
  if (typeof window !== 'undefined') {
    const t = localStorage.getItem('token');
    if (t) return t;

    // Legacy fallback: if we only have userId, we might fail or need to re-login.
    // For now, return null.
    return null;
  }
  return null;
};

// Start of the Shimmed API
export const api = {
  // --- AUTH ---
  login: async (credentials: any): Promise<{ user: any, token: string }> => {
    const { email, password } = credentials;
    try {
      const result = await client.mutation(convexApi.auth.login, { email, password });
      return result as any;
    } catch (err: any) {
      // 1. Check if ConvexError data is already attached (modern client)
      if (err.data && err.data.code) {
        const newError: any = new Error(err.data.message || 'Authentication failed');
        newError.data = err.data;
        newError.code = err.data.code;
        throw newError;
      }

      // 2. Fallback: Parse error message string for JSON
      // The error message might be 'Uncaught ConvexError: {"code":"..."}' or multi-line
      const errorMessage = err?.message || '';
      console.error("Login Error Details:", {
        message: errorMessage,
        data: err.data,
        stack: err.stack,
        raw: err
      });

      // Regex to capture JSON object after "ConvexError:" or similar markers
      // Matches {"code":...} possibly across newlines
      const jsonMatch = errorMessage.match(/ConvexError:\s*(\{[\s\S]*?\})/);

      if (jsonMatch) {
        try {
          const errorData = JSON.parse(jsonMatch[1]);
          const newError: any = new Error(errorData.message || 'Authentication failed');
          newError.data = errorData;
          newError.code = errorData.code;
          throw newError;
        } catch (parseErr) {
          // If parsing fails, fall through
        }
      }

      throw err;
    }
  },

  register: async (data: any) => {
    const result = await client.mutation(convexApi.auth.register, data);
    return result;
  },

  getMe: async () => {
    const token = getToken();
    const userId = typeof window !== 'undefined' ? localStorage.getItem('userId') : null;

    if (!token && !userId) throw new Error("No credentials found");

    // Pass both or preferably token. Context.auth.ts getMe handles both.
    const user = await client.query(convexApi.auth.getMe, {
      token: token || undefined,
      userId: userId || undefined
    });

    if (!user) throw new Error("User not found");
    return { user };
  },

  updateProfile: async (updates: any) => {
    const userId = typeof window !== 'undefined' ? localStorage.getItem('userId') : null;
    if (!userId) throw new Error("Not logged in");
    return await client.mutation(convexApi.auth.updateProfile, { userId, ...updates });
  },

  changePassword: async (data: any) => {
    const userId = typeof window !== 'undefined' ? localStorage.getItem('userId') : null;
    if (!userId) throw new Error("Not logged in");
    return await client.mutation(convexApi.auth.changePassword, {
      userId,
      currentPassword: data.currentPassword,
      newPassword: data.newPassword
    });
  },

  requestPasswordReset: async (email: string) => {
    return await client.mutation(convexApi.auth.requestPasswordReset, { email });
  },

  resetPassword: async (data: any) => {
    return await client.mutation(convexApi.auth.resetPassword, {
      token: data.token,
      newPassword: data.newPassword
    });
  },

  uploadAvatar: async (file: File) => {
    // Reuse uploadFile logic
    const { uploadUrl, publicUrl } = await client.action(convexApi.storage.getUploadUrl, {
      filename: file.name,
      contentType: file.type
    });

    await fetch(uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": file.type, "x-amz-acl": "public-read" },
      body: file,
    });

    return { url: publicUrl };
  },

  // --- USER DATA ---
  saveWord: async (item: VocabularyItem) => {
    const token = getToken();
    if (!token) return; // Silent fail or error?

    await client.mutation(convexApi.user.saveSavedWord, {
      token,
      korean: item.korean || item.word || '',
      english: item.english || item.meaning || '',
      exampleSentence: item.exampleSentence,
      exampleTranslation: item.exampleTranslation
    });
  },

  saveMistake: async (item: any) => {
    const token = getToken();
    if (!token) return;

    await client.mutation(convexApi.user.saveMistake, {
      token,
      korean: item.korean,
      english: item.english,
      wordId: item.id || item.wordId,
      context: 'Web App'
    });
  },

  saveAnnotation: async (annotation: Annotation) => {
    const token = getToken();
    const userId = typeof window !== 'undefined' ? localStorage.getItem('userId') : null;

    // Note: Annotations backend currently requires userId
    if (!userId) return;

    await client.mutation(convexApi.annotations.save, {
      token, // Pass token for auth lookup
      contextKey: annotation.contextKey,
      text: annotation.text,
      note: annotation.note,
      color: annotation.color || undefined,
      startOffset: annotation.startOffset,
      endOffset: annotation.endOffset
    });
  },

  saveExamAttempt: async (attempt: ExamAttempt) => {
    const token = getToken();
    if (!token) return;

    await client.mutation(convexApi.user.saveExamAttempt, {
      token,
      examId: attempt.examId,
      score: attempt.score,
      totalQuestions: attempt.maxScore,
      sectionScores: attempt.userAnswers
    });
  },

  deleteExamAttempt: async (attemptId: string) => {
    const token = getToken();
    await client.mutation(convexApi.user.deleteExamAttempt, {
      attemptId: attemptId as any,
      token: token || undefined
    });
  },

  logActivity: async (activityType: string, duration?: number, itemsStudied?: number, metadata?: any) => {
    const token = getToken();
    if (!token) return;

    // Safety check: Convex expects specific strings, verify or cast
    await client.mutation(convexApi.user.logActivity, {
      token,
      activityType,
      duration,
      itemsStudied,
      metadata
    });
  },

  updateLearningProgress: async (data: any) => {
    const token = getToken();
    if (!token) return;

    await client.mutation(convexApi.user.updateLearningProgress, {
      token,
      ...data
    });
  },

  // --- UPLOADS ---
  uploadFile: async (file: File) => {
    // 1. Get upload URL
    const { uploadUrl, publicUrl } = await client.action(convexApi.storage.getUploadUrl, {
      filename: file.name,
      contentType: file.type
    });

    // 2. Upload to S3 directly
    const result = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": file.type,
        "x-amz-acl": "public-read"
      },
      body: file,
    });

    if (!result.ok) throw new Error("Upload failed: " + result.statusText);

    // 3. Return Public URL
    return { url: publicUrl };
  },

  uploadMedia: async (formData: FormData) => {
    // Shim for legacy uploadMedia(formData)
    const file = formData.get('file') as File;
    if (!file) throw new Error("No file");

    // Reuse uploadFile logic
    const { uploadUrl, publicUrl } = await client.action(convexApi.storage.getUploadUrl, {
      filename: file.name,
      contentType: file.type
    });

    await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": file.type,
        "x-amz-acl": "public-read"
      },
      body: file,
    });

    return { url: publicUrl };
  },

  // --- PODCASTS ---
  searchPodcasts: async (term: string) => {
    return await client.action(convexApi.podcastActions.searchPodcasts, { term });
  },

  getPodcastEpisodes: async (feedUrl: string) => {
    return await client.action(convexApi.podcastActions.getEpisodes, { feedUrl });
  },

  // --- CONTENT ---
  getInstitutes: async (params?: any) => {
    // Shim for getInstitutes with caching and default pagination
    
    // Determine if caller is using explicit pagination
    const hasExplicitPagination = params?.paginationOpts || params?.limit;
    
    // Apply default pagination when no explicit params
    const queryArgs: any = {};
    if (hasExplicitPagination) {
      // Caller wants explicit pagination - pass through
      if (params?.limit) {
        queryArgs.paginationOpts = {
          numItems: params.limit,
          cursor: params.cursor || null
        };
      } else if (params?.paginationOpts) {
        queryArgs.paginationOpts = params.paginationOpts;
      }
    } else {
      // Apply sensible default pagination to avoid full-table scans
      queryArgs.paginationOpts = {
        numItems: DEFAULT_PAGE_SIZE,
        cursor: null
      };
    }
    
    // Execute with caching
    const result = await cachedQuery(
      'getInstitutes',
      () => client.query(convexApi.admin.getInstitutes, queryArgs),
      params
    );
    
    // Backwards compatibility: when no explicit pagination, return array
    // When explicit pagination is used, return full paginated response
    if (!hasExplicitPagination) {
      // Legacy callers expect an array
      return result.page || result;
    }
    
    // Return full paginated response for pagination UIs
    return result;
  },

  getUserStats: async (userId: string) => {
    // Use real backend stats query with caching
    return await cachedQuery(
      'getUserStats',
      () => client.query(convexApi.userStats.getStats, {}),
      { userId } // Cache per user
    );
  },

  // DEPRECATED: Returns empty data - should not be used
  getTextbookContent: async (params?: any) => {
    console.warn("api.getTextbookContent is deprecated and returns empty data");
    return {};
  },

  // --- LEGACY / DEPRECATED ---
  getTopikExams: async (params?: any) => {
    // Shim for getTopikExams with caching and default pagination
    
    // Determine if caller is using explicit pagination
    const hasExplicitPagination = params?.paginationOpts;
    
    // Apply default pagination when no explicit params
    const queryArgs: any = {};
    if (hasExplicitPagination) {
      // Caller wants explicit pagination - pass through
      queryArgs.paginationOpts = params.paginationOpts;
    } else {
      // Apply sensible default pagination to avoid full-table scans
      queryArgs.paginationOpts = {
        numItems: DEFAULT_PAGE_SIZE,
        cursor: null
      };
    }
    
    // Execute with caching
    const result = await cachedQuery(
      'getTopikExams',
      () => client.query(convexApi.topik.getExams, queryArgs),
      params
    );
    
    // Backwards compatibility: when no explicit pagination, return array
    // When explicit pagination is used, return full paginated response
    if (!hasExplicitPagination) {
      // Legacy callers expect an array
      return result.page || result;
    }
    
    // Return full paginated response for pagination UIs
    return result;
  },

  // Added missing methods
  saveTopikExam: async (exam: any) => {
    return await client.mutation(convexApi.topik.saveExam, exam);
  },

  deleteTopikExam: async (id: string) => {
    return await client.mutation(convexApi.topik.deleteExam, { examId: id });
  },

  saveTextbookContent: async (key: string, content: TextbookContent) => {
    return await client.mutation(convexApi.units.save, content as any);
  },

  getTextbookContentData: async (key: string) => {
    // Key format likely "courseId_unitIndex" e.g. "yonsei-1a_1"
    const parts = key.split('_');
    const courseId = parts[0];
    const unitIndex = parseInt(parts[1] || "0");

    return await client.query(convexApi.units.getDetails, {
      courseId,
      unitIndex
    });
  }
};

export default api;
