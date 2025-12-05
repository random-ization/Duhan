import {
  User,
  VocabularyItem,
  Annotation,
  ExamAttempt,
  TopikQuestion,
  Institute,
  TextbookContent,
  TopikExam,
} from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const getHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

// Unified request function with error handling
async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options);

  if (!res.ok) {
    let errorMessage = `Request failed with status ${res.status}`;
    try {
      const errorData = await res.json();
      errorMessage = errorData.error || errorData.message || errorMessage;
    } catch {
      // If parsing JSON fails, use default error message
    }
    throw new Error(errorMessage);
  }

  return res.json();
}

// Type definitions for auth endpoints
interface RegisterData {
  username: string;
  password: string;
  email?: string;
}

interface LoginData {
  username: string;
  password: string;
}

interface AuthResponse {
  token: string;
  user: User;
}

export const api = {
  // Auth
  register: async (data: RegisterData): Promise<AuthResponse> => {
    return request<AuthResponse>(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },

  login: async (data: LoginData): Promise<AuthResponse> => {
    return request<AuthResponse>(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },

  getMe: async (): Promise<{ user: User }> => {
    return request<{ user: User }>(`${API_URL}/auth/me`, {
      method: 'GET',
      headers: getHeaders(),
    });
  },

  // User Data
  saveWord: async (word: Partial<VocabularyItem> & { unit?: number }) => {
    return request(`${API_URL}/user/word`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(word),
    });
  },

  saveMistake: async (word: Partial<VocabularyItem>) => {
    return request(`${API_URL}/user/mistake`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(word),
    });
  },

  saveAnnotation: async (annotation: Annotation) => {
    return request(`${API_URL}/user/annotation`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(annotation),
    });
  },

  saveExamAttempt: async (attempt: ExamAttempt) => {
    return request(`${API_URL}/user/exam`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(attempt),
    });
  },

  // Content Management (Public Read, Admin Write)
  getInstitutes: async (): Promise<Institute[]> => {
    try {
      return await request<Institute[]>(`${API_URL}/content/institutes`);
    } catch {
      return [];
    }
  },

  createInstitute: async (institute: Institute) => {
    return request(`${API_URL}/content/institutes`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(institute),
    });
  },

  getTextbookContent: async (): Promise<Record<string, TextbookContent>> => {
    try {
      return await request<Record<string, TextbookContent>>(`${API_URL}/content/textbook`);
    } catch {
      return {};
    }
  },

  saveTextbookContent: async (key: string, content: TextbookContent) => {
    return request(`${API_URL}/content/textbook`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ key, ...content }),
    });
  },

  getTopikExams: async (): Promise<TopikExam[]> => {
    try {
      return await request<TopikExam[]>(`${API_URL}/content/topik`);
    } catch {
      return [];
    }
  },

  saveTopikExam: async (exam: TopikExam) => {
    return request(`${API_URL}/content/topik`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(exam),
    });
  },

  deleteTopikExam: async (id: string) => {
    return request(`${API_URL}/content/topik/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
  },

  // Profile Management
  updateProfile: async (updates: { name?: string; avatar?: string }) => {
    return request(`${API_URL}/user/profile`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(updates),
    });
  },

  changePassword: async (currentPassword: string, newPassword: string) => {
    return request(`${API_URL}/user/password`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  },

  uploadAvatar: async (file: File) => {
    const formData = new FormData();
    formData.append('avatar', file);

    // Note: FormData requires special handling, don't include Content-Type header
    const token = localStorage.getItem('token');
    return request(`${API_URL}/user/avatar`, {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        // Content-Type is automatically set by browser for FormData
      },
      body: formData,
    });
  },

  // Learning Activity Tracking
  logActivity: async (
    activityType: 'VOCAB' | 'READING' | 'LISTENING' | 'GRAMMAR' | 'EXAM',
    duration?: number,
    itemsStudied?: number,
    metadata?: any
  ) => {
    return request(`${API_URL}/user/activity`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        activityType,
        duration,
        itemsStudied,
        metadata,
      }),
    });
  },

  // Learning Progress Tracking
  updateLearningProgress: async (progress: {
    lastInstitute?: string;
    lastLevel?: number;
    lastUnit?: number;
    lastModule?: string;
  }) => {
    return request(`${API_URL}/user/progress`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(progress),
    });
  },
};
