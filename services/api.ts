// services/api.ts
// SHIM LAYER: Redirects legacy Express API calls to Convex Backend
import { ConvexHttpClient } from "convex/browser";
import { api as convexApi } from "../convex/_generated/api";
import { User, VocabularyItem, Mistake, Annotation, ExamAttempt } from "../types";

const CONVEX_URL = (import.meta as any).env.VITE_CONVEX_URL;
if (!CONVEX_URL) {
  console.error("VITE_CONVEX_URL is not defined!");
}

const client = new ConvexHttpClient(CONVEX_URL!);

// Helper to get userId from storage
const getUserId = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('userId');
  }
  return null;
};

// Start of the Shimmed API
export const api = {
  // --- AUTH ---
  login: async (credentials: any) => {
    const { email, password } = credentials;
    const result = await client.mutation(convexApi.auth.login, { email, password });
    // Shim the legacy response format
    return {
      user: result.user,
      token: "convex-legacy-shim-token" // Dummy token
    };
  },

  register: async (data: any) => {
    const result = await client.mutation(convexApi.auth.register, data);
    return result;
  },

  getMe: async () => {
    const userId = getUserId();
    if (!userId) throw new Error("No user ID found");
    const user = await client.query(convexApi.auth.getMe, { userId });
    if (!user) throw new Error("User not found");
    return { user };
  },

  googleLogin: async (data: any) => {
    // Not fully implemented on backend yet in this shim context.
    throw new Error("Google Login migration pending - requires backend processing of OAuth code");
  },

  // --- USER DATA ---
  saveWord: async (item: VocabularyItem) => {
    const userId = getUserId();
    if (!userId) return;
    await client.mutation(convexApi.user.saveSavedWord, {
      userId,
      korean: item.korean || item.word || '',
      english: item.english || item.meaning || '',
      exampleSentence: item.exampleSentence,
      exampleTranslation: item.exampleTranslation
    });
  },

  saveMistake: async (item: any) => {
    const userId = getUserId();
    if (!userId) return;
    await client.mutation(convexApi.user.saveMistake, {
      userId,
      korean: item.korean,
      english: item.english,
      context: 'Web App'
    });
  },

  saveAnnotation: async (annotation: Annotation) => {
    const userId = getUserId();
    if (!userId) return;
    await client.mutation(convexApi.annotations.save, {
      userId,
      contextKey: annotation.contextKey,
      text: annotation.text,
      note: annotation.note,
      color: annotation.color || undefined,
      startOffset: annotation.startOffset,
      endOffset: annotation.endOffset
    });
  },

  saveExamAttempt: async (attempt: ExamAttempt) => {
    const userId = getUserId();
    if (!userId) return;
    await client.mutation(convexApi.user.saveExamAttempt, {
      userId,
      examId: attempt.examId,
      score: attempt.score,
      totalQuestions: attempt.maxScore,
      sectionScores: attempt.userAnswers
    });
  },

  deleteExamAttempt: async (attemptId: string) => {
    await client.mutation(convexApi.user.deleteExamAttempt, { attemptId: attemptId as any });
  },

  logActivity: async (activityType: string, duration?: number, itemsStudied?: number, metadata?: any) => {
    const userId = getUserId();
    if (!userId) return;

    // Safety check: Convex expects specific strings, verify or cast
    await client.mutation(convexApi.user.logActivity, {
      userId,
      activityType,
      duration,
      itemsStudied,
      metadata
    });
  },

  updateLearningProgress: async (data: any) => {
    const userId = getUserId();
    if (!userId) return;
    await client.mutation(convexApi.user.updateLearningProgress, {
      userId,
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

  // --- LEGACY / DEPRECATED ---
  request: async (endpoint: string, options?: any) => {
    console.warn(`Legacy api.request called for ${endpoint}. Migration required.`);
    return null;
  }
};

export const request = api.request;
export default api;
