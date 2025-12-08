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

// minimal request helper - replace or merge with your existing services/api.ts
const API_URL = (import.meta as any).env?.VITE_API_URL || (window as any).__API_URL__ || '';

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
    ...authHeader, // auth goes last to override if necessary
  };
}

export async function request<T = any>(path: string, opts: RequestInit = {}): Promise<T> {
  const url = path.startsWith('http') ? path : `${API_URL}${path.startsWith('/') ? '' : '/'}${path}`;
  const userHeaders = (opts.headers || {}) as Record<string, string>;
  const headers = buildHeaders(userHeaders);

  // temporary debug - remove later
  console.debug('[api] Request:', url, { method: opts.method || 'GET', headers });

  const res = await fetch(url, {
    ...opts,
    headers,
    credentials: opts.credentials ?? 'same-origin',
  });

  const text = await res.text();
  let data: any = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }

  if (!res.ok) {
    const err: any = new Error(data?.error || data?.message || `Request failed ${res.status}`);
    err.status = res.status;
    err.raw = data;
    throw err;
  }
  return data as T;
}

// Example wrapper - ensure api.getUsers uses the request helper
export const api = {
  getUsers: async (): Promise<any[]> => {
    // Use the same path pattern your backend expects. If API_URL already contains /hangyeol-server/api,
    // pass the path accordingly. Example assumes API_URL='' and absolute path needed:
    return request<any[]>('/hangyeol-server/api/admin/users');
  },

  // ...other api methods should use request(...) as well
};

interface RegisterData {
  name: string;
  email: string;
  password: string;
}

interface LoginData {
  email: string;
  password: string;
}

interface AuthResponse {
  token: string;
  user: User;
}

export const api = {
  // --- Auth ---
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

  // --- General Upload (Optimization: Storage Space) ---
  uploadMedia: async (file: File): Promise<{ url: string }> => {
    const formData = new FormData();
    formData.append('file', file);

    const token = localStorage.getItem('token');
    
    // 使用 fetch 直接上传，不设置 Content-Type 让浏览器自动处理 boundary
    const res = await fetch(`${API_URL}/upload`, { 
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    });

    if (!res.ok) {
      let errorMessage = 'Upload failed';
      try {
        const errorData = await res.json();
        errorMessage = errorData.error || errorMessage;
      } catch {}
      throw new Error(errorMessage);
    }
    
    return res.json();
  },

  uploadAvatar: async (file: File): Promise<{ avatarUrl: string }> => {
    // 复用 uploadMedia 的逻辑，或者保持独立以匹配后端路由
    // 这里保持原样以防后端区别处理
    const formData = new FormData();
    formData.append('avatar', file);
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_URL}/user/avatar`, {
        method: 'POST',
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: formData
    });
    if(!res.ok) throw new Error('Avatar upload failed');
    return res.json();
  },

  // --- User Data ---
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

  // --- Content ---
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
  // --- Admin: Users ---
  getUsers: async (): Promise<User[]> => {
  try {
    return await request<User[]>(`${API_URL}/admin/users`);
  } catch (err) {
    console.error('getUsers failed', err);
    return [];
  }
},

updateUser: async (userId: string, updates: Partial<User>) => {
  return request(`${API_URL}/admin/users/${userId}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(updates),
  });
},

deleteUser: async (userId: string) => {
  return request(`${API_URL}/admin/users/${userId}`, {
    method: 'DELETE',
    headers: getHeaders(),
  });
},

  deleteTopikExam: async (id: string) => {
    return request(`${API_URL}/content/topik/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
  },

  // --- Profile ---
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

  // --- Tracking ---
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

  // --- Legal ---
  getLegalDocument: async (type: 'terms' | 'privacy' | 'refund') => {
    return request(`${API_URL}/content/legal/${type}`);
  },

  saveLegalDocument: async (
    type: 'terms' | 'privacy' | 'refund',
    title: string,
    content: string
  ) => {
    return request(`${API_URL}/content/legal/${type}`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ title, content }),
    });
  },
};
