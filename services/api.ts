// services/api.ts
// 统一的 request helper + 单一 export const api 对象
// 替换或合并到你的项目中，确保没有其它文件再 export 同名 api

import type {
  PodcastChannel,
  PodcastEpisode,
  ListeningHistoryItem,
  TranscriptResult,
  SentenceAnalysis
} from '../types';

type Nullable<T> = T | null;

// 本地开发时使用 /api 前缀（配合 Vite 代理），生产环境使用完整 URL
const envApiUrl = (import.meta as any).env?.VITE_API_URL || (window as any).__API_URL__;
const API_URL = envApiUrl ? envApiUrl : '/api';

function getTokenFromStorage(): string | null {
  try {
    return localStorage.getItem('token');
  } catch {
    return null;
  }
}

function buildHeaders(userHeaders?: Record<string, string>): Record<string, string> {
  const token = getTokenFromStorage();
  const authHeader = token ? { Authorization: `Bearer ${token}` } : {};
  return {
    'Content-Type': 'application/json',
    ...(userHeaders || {}),
    ...authHeader, // auth goes last to override if必要
  };
}

async function parseResponse(res: Response) {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return text;
  }
}

export async function request<T = any>(path: string, opts: RequestInit = {}): Promise<T> {
  const url = path.startsWith('http') ? path : `${API_URL}${path.startsWith('/') ? '' : '/'}${path}`;
  const userHeaders = (opts.headers || {}) as Record<string, string>;
  const headers = buildHeaders(userHeaders);

  // DEBUG: 在本地调试时可以打开，生产可去掉
  // console.debug('[api] Request:', url, { method: opts.method || 'GET', headers });

  const res = await fetch(url, {
    ...opts,
    headers,
    credentials: opts.credentials ?? 'same-origin',
  });

  const data = await parseResponse(res);

  if (!res.ok) {
    const err: any = new Error(data?.error || data?.message || `Request failed ${res.status}`);
    err.status = res.status;
    err.raw = data;
    throw err;
  }
  return data as T;
}

// 单一的 api 导出对象 —— 把所有前端需要调用的接口方法都放在这里
export const api = {
  // --- Auth ---
  register: async (data: { name?: string; email: string; password: string }) =>
    request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  login: async (data: { email: string; password: string }) =>
    request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  googleLogin: async (data: { code?: string; redirectUri?: string; idToken?: string }) =>
    request<{ token: string; user: any }>('/auth/google', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getMe: async () => request('/auth/me'),

  // --- User Stats ---
  getUserStats: async () => request<{
    streak: number;
    weeklyMinutes: number[];
    dailyMinutes: number;
    dailyGoal: number;
    dailyProgress: number;
    todayActivities: {
      wordsLearned: number;
      readingsCompleted: number;
      listeningsCompleted: number;
    };
    courseProgress: Array<{
      courseId: string;
      courseName: string;
      completedUnits: number;
      totalUnits: number;
      lastAccessAt: string;
    }>;
  }>('/user/stats'),

  // --- Course Progress ---
  completeUnit: async (courseId: string, unitIndex: number) =>
    request('/user/progress/complete-unit', {
      method: 'POST',
      body: JSON.stringify({ courseId, unitIndex }),
    }),

  getCourseProgress: async (courseId: string) =>
    request<{
      success: boolean;
      data: {
        courseId: string;
        courseName: string;
        completedUnits: number[];
        completedCount: number;
        totalUnits: number;
        progressPercent: number;
      };
    }>(`/user/progress/${courseId}`),


  // --- Admin / Users ---
  getUsers: async (page = 1, limit = 10, search = ''): Promise<{
    users: any[];
    total: number;
    pages: number;
    page: number;
    limit: number;
  }> => {
    return request(`/admin/users?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}`);
  },

  updateUser: async (userId: string, updates: Record<string, any>) =>
    request(`/admin/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    }),

  deleteUser: async (userId: string) =>
    request(`/admin/users/${userId}`, {
      method: 'DELETE',
    }),

  // --- Content / Textbook ---
  getInstitutes: async () => request('/content/institutes'),
  createInstitute: async (institute: any) =>
    request('/content/institutes', {
      method: 'POST',
      body: JSON.stringify(institute),
    }),
  updateInstitute: async (id: string, updates: { name?: string; coverUrl?: string; themeColor?: string; publisher?: string; displayLevel?: string; volume?: string; levels?: any[] }) =>
    request(`/content/institutes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    }),
  deleteInstitute: async (id: string) =>
    request(`/content/institutes/${id}`, {
      method: 'DELETE',
    }),

  getTextbookContent: async () => request<Record<string, any>>('/content/textbook'),
  // Fetch single textbook content data via proxy (with cache controls)
  getTextbookContentData: async (key: string) =>
    request<any>(`/content/textbook/${encodeURIComponent(key)}/data`),
  saveTextbookContent: async (key: string, content: any) =>
    request('/content/textbook', {
      method: 'POST',
      body: JSON.stringify({ key, ...content }),
    }),

  // --- TOPIK ---
  getTopikExams: async () => request<any[]>('/content/topik'),
  getTopikExamById: async (id: string) => request<any>(`/content/topik/${id}`),
  getTopikExamQuestions: async (id: string) => request<any[]>(`/content/topik/${id}/questions`),

  saveTopikExam: async (exam: any) => {
    // 简化：直接发送所有数据到后端，让后端处理 S3 上传
    // 避免前端直接访问 S3 的 CORS 问题
    console.log('[saveTopikExam] Sending exam to backend...');

    return request('/content/topik', {
      method: 'POST',
      body: JSON.stringify(exam),
    });
  },

  deleteTopikExam: async (id: string) =>
    request(`/content/topik/${id}`, {
      method: 'DELETE',
    }),

  // --- AI Analysis ---
  analyzeTopikQuestion: async (data: {
    question: string;
    options: string[];
    correctAnswer: number;
    type?: string;
    language?: string;
    imageUrl?: string; // New: For image-based questions
  }): Promise<{
    success: boolean;
    data: {
      translation: string;
      keyPoint: string;
      analysis: string;
      wrongOptions: Record<string, string>;
      cached?: boolean;
    };
  }> =>
    request('/ai/analyze-question', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // --- Legal Docs ---
  getLegalDocument: async (type: 'terms' | 'privacy' | 'refund') =>
    request(`/content/legal/${type}`),

  saveLegalDocument: async (type: 'terms' | 'privacy' | 'refund', title: string, content: string) =>
    request(`/content/legal/${type}`, {
      method: 'POST',
      body: JSON.stringify({ title, content }),
    }),

  // --- Uploads (example) ---
  uploadMedia: async (file: File): Promise<{ url: string }> => {
    const formData = new FormData();
    formData.append('file', file);
    const token = getTokenFromStorage();

    const res = await fetch(`${API_URL}/upload`, {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      } as any,
      body: formData,
      credentials: 'same-origin',
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(errText || 'Upload failed');
    }
    return (await res.json()) as { url: string };
  },

  // --- User Learning Data ---
  saveWord: async (word: any) =>
    request('/user/word', {
      method: 'POST',
      body: JSON.stringify(word),
    }),

  saveMistake: async (word: any) =>
    request('/user/mistake', {
      method: 'POST',
      body: JSON.stringify(word),
    }),

  saveAnnotation: async (annotation: any) =>
    request('/user/annotation', {
      method: 'POST',
      body: JSON.stringify(annotation),
    }),

  saveExamAttempt: async (attempt: any) =>
    request('/user/exam', {
      method: 'POST',
      body: JSON.stringify(attempt),
    }),

  deleteExamAttempt: async (id: string) =>
    request(`/user/exam/${id}`, {
      method: 'DELETE',
    }),

  // --- Canvas Annotations (画板笔记) ---
  getCanvasAnnotations: async (params: {
    targetId: string;
    targetType: 'TEXTBOOK' | 'EXAM';
    pageIndex?: number;
  }) => {
    const query = new URLSearchParams({
      targetId: params.targetId,
      targetType: params.targetType,
      ...(params.pageIndex !== undefined ? { pageIndex: String(params.pageIndex) } : {}),
    });
    return request<any[]>(`/annotation?${query}`);
  },

  saveCanvasAnnotation: async (annotation: {
    targetId: string;
    targetType: 'TEXTBOOK' | 'EXAM';
    pageIndex: number;
    data: any;
    visibility?: string;
  }) =>
    request('/annotation', {
      method: 'POST',
      body: JSON.stringify(annotation),
    }),

  deleteCanvasAnnotation: async (id: string) =>
    request(`/annotation/${id}`, {
      method: 'DELETE',
    }),

  logActivity: async (activityType: string, duration?: number, itemsStudied?: number, metadata?: any) =>
    request('/user/activity', {
      method: 'POST',
      body: JSON.stringify({ activityType, duration, itemsStudied, metadata }),
    }),

  updateLearningProgress: async (progress: any) =>
    request('/user/progress', {
      method: 'POST',
      body: JSON.stringify(progress),
    }),

  // --- Profile ---
  updateProfile: async (updates: { name?: string; email?: string }) =>
    request('/user/profile', {
      method: 'PUT',
      body: JSON.stringify(updates),
    }),

  uploadAvatar: async (file: File): Promise<{ url: string }> => {
    const formData = new FormData();
    formData.append('avatar', file);
    const token = getTokenFromStorage();

    const res = await fetch(`${API_URL}/user/avatar`, {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      } as any,
      body: formData,
      credentials: 'same-origin',
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(errText || 'Upload failed');
    }
    const data = await res.json();
    return { url: data.avatarUrl || data.url } as { url: string };
  },

  changePassword: async (data: { currentPassword: string; newPassword: string }) =>
    request('/user/password', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  uploadFile: async (formData: FormData): Promise<{ url: string }> => {
    const token = getTokenFromStorage();
    const headers: any = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    // Note: Do not set Content-Type header when sending FormData, 
    // fetch will automatically set it to multipart/form-data with boundary

    const res = await fetch(`${API_URL}/upload`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(errText || 'Upload failed');
    }
    return (await res.json()) as { url: string };
  },

  // --- Notebook API ---
  saveNotebook: async (data: {
    type: string;
    title: string;
    content: any;
    tags?: string[];
  }): Promise<{
    success: boolean;
    data: {
      id: string;
      type: string;
      title: string;
      preview: string | null;
      tags: string[];
      createdAt: string;
    };
  }> =>
    request('/notebook', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getNotebookList: async (type?: string): Promise<{
    success: boolean;
    data: Array<{
      id: string;
      type: string;
      title: string;
      preview: string | null;
      tags: string[];
      createdAt: string;
    }>;
  }> =>
    request(`/notebook${type ? `?type=${type}` : ''}`),

  getNotebookDetail: async (id: string): Promise<{
    success: boolean;
    data: {
      id: string;
      type: string;
      title: string;
      preview: string | null;
      tags: string[];
      content: any;
      createdAt: string;
    };
  }> =>
    request(`/notebook/${id}`),

  deleteNotebook: async (id: string): Promise<{ success: boolean }> =>
    request(`/notebook/${id}`, { method: 'DELETE' }),

  // --- Video Learning API ---
  video: {
    list: (level?: string, page?: number, limit?: number) =>
      request<{
        success: boolean;
        data: {
          id: string;
          title: string;
          description?: string;
          thumbnailUrl?: string;
          level: string;
          duration?: number;
          views: number;
          createdAt: string;
        }[];
        pagination: {
          page: number;
          limit: number;
          total: number;
          totalPages: number;
        };
      }>(`/videos${level ? `?level=${level}` : ''}${page ? `&page=${page}` : ''}${limit ? `&limit=${limit}` : ''}`),

    get: (id: string) =>
      request<{
        success: boolean;
        data: {
          id: string;
          title: string;
          description?: string;
          videoUrl: string;
          thumbnailUrl?: string;
          level: string;
          duration?: number;
          transcriptData?: { start: number; end: number; text: string; translation?: string }[];
          views: number;
          createdAt: string;
        };
      }>(`/videos/${id}`),

    upload: async (formData: FormData) => {
      const token = getTokenFromStorage();
      const res = await fetch(`${API_URL}/videos`, {
        method: 'POST',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: formData,
      });
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || 'Upload failed');
      }
      return res.json();
    },

    update: (id: string, data: {
      title?: string;
      description?: string;
      videoUrl?: string;
      thumbnailUrl?: string;
      level?: string;
      duration?: number;
      transcriptData?: any;
    }) =>
      request<{ success: boolean; data: any }>(`/videos/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),

    delete: (id: string) =>
      request<{ success: boolean; message: string }>(`/videos/${id}`, {
        method: 'DELETE',
      }),
  },

  // --- Podcast API ---
  searchPodcasts: async (term: string) =>
    request<PodcastChannel[]>(`/podcasts/search?term=${encodeURIComponent(term)}`),

  getPodcastEpisodes: async (feedUrl: string) =>
    request<{ channel: PodcastChannel; episodes: PodcastEpisode[] }>(`/podcasts/episodes?feedUrl=${encodeURIComponent(feedUrl)}`),

  getMyPodcastFeed: async () =>
    request<{ channels: PodcastChannel[]; episodes: PodcastEpisode[] }>('/podcasts/my-feed'),

  getPodcastTrending: async () =>
    request<{ external: PodcastChannel[]; internal: PodcastEpisode[] }>('/podcasts/trending'),

  getPodcastSubscriptions: async () =>
    request<PodcastChannel[]>('/podcasts/subscriptions'),

  togglePodcastSubscription: async (channel: {
    itunesId: string;
    title: string;
    author: string;
    feedUrl: string;
    artworkUrl?: string;
  }) =>
    request<{ success: boolean; isSubscribed: boolean }>('/podcasts/subscribe', {
      method: 'POST',
      body: JSON.stringify({ channel }),
    }),

  trackPodcastView: async (episode: Partial<PodcastEpisode> & { channel?: Partial<PodcastChannel> }) =>
    request<{ success: boolean; views: number }>('/podcasts/view', {
      method: 'POST',
      body: JSON.stringify({ episode }),
    }),

  togglePodcastLike: async (episode: Partial<PodcastEpisode>) =>
    request<{ success: boolean; isLiked: boolean }>('/podcasts/like', {
      method: 'POST',
      body: JSON.stringify({ episode }),
    }),

  getPodcastHistory: async () =>
    request<ListeningHistoryItem[]>('/podcasts/history'),

  savePodcastProgress: async (episodeGuid: string, progress: number) =>
    request<{ success: boolean }>('/podcasts/progress', {
      method: 'POST',
      body: JSON.stringify({ episodeGuid, progress }),
    }),

  // --- AI Sentence Analysis ---
  analyzeSentence: async (sentence: string, context?: string, language?: string) =>
    request<{
      success: boolean;
      data: {
        vocabulary: { word: string; root: string; meaning: string; type: string }[];
        grammar: { structure: string; explanation: string }[];
        nuance: string;
        cached?: boolean;
      };
    }>('/ai/analyze-sentence', {
      method: 'POST',
      body: JSON.stringify({ sentence, context, language }),
    }),

  // --- AI Transcript Generation ---
  generateTranscript: async (audioUrl: string, episodeId: string, language?: string) =>
    request<{
      success: boolean;
      data: {
        segments: { start: number; end: number; text: string; translation: string }[];
        language?: string;
        duration?: number;
        cached?: boolean;
      };
    }>('/ai/transcript', {
      method: 'POST',
      body: JSON.stringify({ audioUrl, episodeId, language }),
    }),

  deleteTranscript: async (episodeId: string) =>
    request<{ success: boolean }>(`/ai/transcript/${episodeId}`, {
      method: 'DELETE',
    }),

  // --- Grammar Training ---
  getGrammarPoints: async (courseId: string) =>
    request<any>(`/courses/${courseId}/grammar`),

  // New: Get grammar for a specific unit (uses new CourseGrammar architecture)
  getUnitGrammar: async (courseId: string, unitId: number) =>
    request<{ data: any[] }>(`/grammar/courses/${courseId}/units/${unitId}/grammar`),

  toggleGrammarStatus: async (grammarId: string) =>
    request<{ id: string; status: string; lastReviewed: string }>(`/grammar/${grammarId}/toggle`, {
      method: 'POST'
    }),

  // Legacy: Old AI check
  checkGrammar: async (sentence: string, grammarId: string) =>
    request<any>('/grammar/ai-check', {
      method: 'POST',
      body: JSON.stringify({ sentence, grammarId })
    }),

  // New: AI sentence check with proficiency tracking
  checkGrammarSentence: async (grammarId: string, userSentence: string) =>
    request<{
      success: boolean;
      data: {
        isCorrect: boolean;
        feedback: string;
        correctedSentence?: string;
        progress: {
          proficiency: number;
          status: string;
          lastReviewed: string;
        };
      };
    }>(`/grammar/${grammarId}/check`, {
      method: 'POST',
      body: JSON.stringify({ userSentence })
    }),

  // ========== Reading Module (Unit Learning Data) ==========

  // Get aggregated unit data (article + vocab + grammar + annotations)
  getUnitLearningData: async (courseId: string, unitIndex: number) =>
    request<{
      success: boolean;
      data: {
        unit: {
          id: string;
          title: string;
          text: string;
          translation?: string;
          audioUrl?: string;
          analysisData?: {
            surface: string;  // Conjugated form (e.g., "갔습니다")
            base: string;     // Dictionary form (e.g., "가다")
            offset: number;
            length: number;
            pos: string;
          }[];
        } | null;
        vocabList: {
          id: string;
          korean: string;
          meaning: string;
          pronunciation?: string;
          hanja?: string;
          pos?: string;
          audioUrl?: string;
          exampleSentence?: string;
          exampleMeaning?: string;
        }[];
        grammarList: {
          id: string;
          title: string;
          type: string;
          summary: string;
          explanation: string;
          conjugationRules: any;
          examples: any;
        }[];
        annotations: {
          id: string;
          startOffset?: number;
          endOffset?: number;
          text: string;
          color?: string;
          note?: string;
          createdAt: string;
        }[];
        meta: {
          courseId: string;
          unitIndex: number;
          vocabCount: number;
          grammarCount: number;
          annotationCount: number;
        };
      };
    }>(`/courses/${courseId}/units/${unitIndex}`),

  // Save annotation for unit reading
  saveUnitAnnotation: async (courseId: string, unitIndex: number, annotation: {
    startOffset?: number;
    endOffset?: number;
    text: string;
    color?: string;
    note?: string;
  }) =>
    request<{ success: boolean; data: any }>(`/courses/${courseId}/units/${unitIndex}/annotation`, {
      method: 'POST',
      body: JSON.stringify(annotation)
    }),

  // Delete annotation
  deleteUnitAnnotation: async (courseId: string, unitIndex: number, annotationId: string) =>
    request<{ success: boolean }>(`/courses/${courseId}/units/${unitIndex}/annotation/${annotationId}`, {
      method: 'DELETE'
    }),

  // ========== Admin: Unit Content Management ==========

  // Save/Update unit content (triggers AI analysis on backend)
  saveUnitContent: async (data: {
    courseId: string;
    unitIndex: number;
    title: string;
    readingText: string;
    translation?: string;
    audioUrl?: string;
    transcriptData?: any; // Listening karaoke data
  }) =>
    request<{
      success: boolean;
      data: {
        id: string;
        courseId: string;
        unitIndex: number;
        title: string;
        hasAnalysis: boolean;
        tokenCount: number;
      };
    }>(`/courses/${data.courseId}/units/${data.unitIndex}`, {
      method: 'POST',
      body: JSON.stringify({
        title: data.title,
        readingText: data.readingText,
        translation: data.translation,
        audioUrl: data.audioUrl,
        transcriptData: data.transcriptData,
      })
    }),

  // Re-run AI analysis on existing unit
  reanalyzeUnit: async (courseId: string, unitIndex: number) =>
    request<{
      success: boolean;
      data: {
        id: string;
        tokenCount: number;
        tokens: {
          surface: string;
          base: string;
          offset: number;
          length: number;
          pos: string;
        }[];
      };
    }>(`/courses/${courseId}/units/${unitIndex}/analyze`, {
      method: 'POST'
    }),

  // Get all units for a course (for admin list view)
  getUnitsForCourse: async (courseId: string) =>
    request<{
      success: boolean;
      data: {
        id: string;
        unitIndex: number;
        title: string;
        hasContent: boolean;
        hasAnalysis: boolean;
        createdAt: string;
        updatedAt: string;
      }[];
    }>(`/courses/${courseId}/units`),

  // ========== Listening Management (Separate from Reading) ==========

  // Get all listening units for a course
  getListeningUnitsForCourse: async (courseId: string) =>
    request<{
      success: boolean;
      data: {
        id: string;
        unitIndex: number;
        title: string;
        hasAudio: boolean;
        createdAt: string;
        updatedAt: string;
      }[];
    }>(`/courses/${courseId}/listening`),

  // Get a single listening unit with transcript data
  getListeningUnit: async (courseId: string, unitIndex: number) =>
    request<{
      success: boolean;
      data: {
        id: string;
        courseId: string;
        unitIndex: number;
        title: string;
        audioUrl: string;
        transcriptData: any;
      };
    }>(`/courses/${courseId}/listening/${unitIndex}`),

  // Create or update a listening unit
  saveListeningUnit: async (data: {
    courseId: string;
    unitIndex: number;
    title: string;
    audioUrl?: string;
    transcriptData?: any;
  }) =>
    request<{
      success: boolean;
      data: {
        id: string;
        courseId: string;
        unitIndex: number;
        title: string;
      };
    }>(`/courses/${data.courseId}/listening/${data.unitIndex}`, {
      method: 'POST',
      body: JSON.stringify({
        title: data.title,
        audioUrl: data.audioUrl,
        transcriptData: data.transcriptData,
      })
    }),

  // Delete a listening unit
  deleteListeningUnit: async (courseId: string, unitIndex: number) =>
    request<{
      success: boolean;
      message: string;
    }>(`/courses/${courseId}/listening/${unitIndex}`, {
      method: 'DELETE'
    }),

  // ========== Grammar Management ==========

  // Search grammar points globally
  searchGrammar: async (query: string) =>
    request<{
      success: boolean;
      data: {
        id: string;
        title: string;
        searchKey?: string;
        level: string;
        type: string;
        summary: string;
      }[];
    }>(`/grammar/search?query=${encodeURIComponent(query)}`),

  // Create a new grammar point
  createGrammar: async (data: {
    title: string;
    searchKey?: string;
    level?: string;
    type?: string;
    summary?: string;
    explanation?: string;
    conjugationRules?: any;
    examples?: any;
  }) =>
    request<{ success: boolean; data: any }>('/grammar', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  // Update a grammar point
  updateGrammar: async (id: string, data: {
    title?: string;
    searchKey?: string;
    level?: string;
    type?: string;
    summary?: string;
    explanation?: string;
    conjugationRules?: any;
    examples?: any;
  }) =>
    request<{ success: boolean; data: any }>(`/grammar/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),

  // Assign grammar to a unit
  assignGrammarToUnit: async (courseId: string, unitIndex: number, grammarId: string, displayOrder?: number) =>
    request<{ success: boolean; data: any }>('/grammar/assign', {
      method: 'POST',
      body: JSON.stringify({ courseId, unitIndex, grammarId, displayOrder })
    }),

  // Remove grammar from a unit
  removeGrammarFromUnit: async (courseId: string, unitIndex: number, grammarId: string) =>
    request<{ success: boolean }>(`/grammar/courses/${courseId}/units/${unitIndex}/grammar/${grammarId}`, {
      method: 'DELETE'
    }),

  // Get grammar points for a unit
  getUnitGrammars: async (courseId: string, unitId: number) =>
    request<{
      data: {
        id: string;
        title: string;
        type: string;
        summary: string;
        explanation: string;
        examples: any;
        displayOrder: number;
      }[];
    }>(`/grammar/courses/${courseId}/units/${unitId}/grammar`),

  // ========== Stats/Dashboard ==========

  // Get overview statistics
  getOverviewStats: async () =>
    request<{
      success: boolean;
      data: {
        users: number;
        institutes: number;
        vocabulary: number;
        grammar: number;
        units: number;
        exams: number;
      };
    }>('/stats/overview'),

  // Get AI usage statistics
  getAiUsageStats: async (days = 30) =>
    request<{
      success: boolean;
      data: {
        period: string;
        summary: {
          totalCalls: number;
          totalTokens: number;
          totalCost: number;
        };
        byFeature: Record<string, { calls: number; tokens: number; cost: number }>;
        daily: { date: string; calls: number; cost: number }[];
      };
    }>(`/stats/ai-usage?days=${days}`),

  // Get recent learning activity
  getRecentActivity: async (limit = 20) =>
    request<{
      success: boolean;
      data: {
        recent: any[];
        summary: Record<string, number>;
      };
    }>(`/stats/recent-activity?limit=${limit}`),

  // ========== Admin Dashboard ==========

  // Get comprehensive admin dashboard data
  getAdminDashboardStats: async () =>
    request<{
      success: boolean;
      data: {
        stats: {
          totalUsers: number;
          totalInstitutes: number;
          activeLearnersLast7Days: number;
          paidUsers: number;
          monthlyAiCost: number;
          vocabulary: number;
          grammar: number;
          units: number;
          exams: number;
        };
        charts: {
          userTrend: { date: string; count: number }[];
          activityHeatmap: { date: string; count: number }[];
        };
        aiUsage: {
          byFeature: Record<string, { calls: number; tokens: number; cost: number }>;
          daily: { date: string; calls: number; cost: number }[];
        };
      };
    }>('/admin/dashboard/stats'),

  // ========== User Personal Stats ==========

  // Get my personal learning stats (for profile dashboard)
  getMyStats: async () =>
    request<{
      success: boolean;
      data: {
        streak: number;
        todayMinutes: number;
        dailyGoal: number;
        wordsToReview: number;
        totalWordsLearned: number;
        totalGrammarLearned: number;
        weeklyActivity: { day: string; minutes: number }[];
        currentProgress: {
          instituteName: string;
          level: number;
          unit: number;
          module: string;
        } | null;
      };
    }>('/user/me/stats'),

  // 其余 api 方法按需添加，务必使用上面的 request(...) 以确保 Authorization 被正确注入
};

export default api; // 如果项目里有使用 default import 的地方，保留 default 导出；否则可删
