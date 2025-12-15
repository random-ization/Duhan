// services/api.ts
// 统一的 request helper + 单一 export const api 对象
// 替换或合并到你的项目中，确保没有其它文件再 export 同名 api

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

  getMe: async () => request('/auth/me'),

  // --- Admin / Users ---
  getUsers: async (): Promise<any[]> => {
    // 采用绝对路径以兼容部署下的 base
    return request<any[]>('/admin/users');
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
  updateInstitute: async (id: string, name: string) =>
    request(`/content/institutes/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ name }),
    }),
  deleteInstitute: async (id: string) =>
    request(`/content/institutes/${id}`, {
      method: 'DELETE',
    }),

  getTextbookContent: async () => request<Record<string, any>>('/content/textbook'),
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
    // S3 Migration Optimization: Direct Upload
    // If questions are present, upload to S3 directly via Presigned URL
    if (exam.questions && Array.isArray(exam.questions) && exam.questions.length > 0) {
      try {
        console.log('[saveTopikExam] requesting presigned URL...');
        // 1. Get Presigned URL
        const presignRes = await request<{ url: string; key: string; publicUrl: string }>('/upload/presign', {
          method: 'POST',
          body: JSON.stringify({
            filename: `exam-${exam.id || Date.now()}.json`,
            contentType: 'application/json',
            folder: 'exams' // Use specific folder
          })
        });

        console.log('[saveTopikExam] uploading to S3...', presignRes.publicUrl);

        // 2. Upload to S3 (Direct PUT)
        // using fetch directly to avoid default headers (like Auth) which S3 might reject if signed headers mismatch
        // But headers must match signature. Backend signed with "host".
        const s3Res = await fetch(presignRes.url, {
          method: 'PUT',
          body: JSON.stringify(exam.questions),
          headers: {
            'Content-Type': 'application/json',
            'x-amz-acl': 'public-read' // Match signed header
          }
        });

        if (!s3Res.ok) {
          throw new Error(`S3 Upload failed: ${s3Res.status}`);
        }

        console.log('[saveTopikExam] upload successful, saving metadata...');

        // 3. Save Metadata with questionsUrl
        // Remove questions array to reduce payload
        const { questions, ...examMsg } = exam;
        return request('/content/topik', {
          method: 'POST',
          body: JSON.stringify({
            ...examMsg,
            questionsUrl: presignRes.publicUrl,
            questions: null // Clear questions array
          }),
        });

      } catch (e) {
        console.error('[saveTopikExam] Direct upload failed, falling back to legacy save (or failing)', e);
        // Fallback: try legacy save (might crash backend if too large/network broken)
        // But let's try it anyway or just throw? 
        // If backend network is broken, legacy save will fail if it tries to upload.
        // If backend was reverted to DB storage, legacy save works.
        // We assume backend is updated to handle questionsUrl. 
        // If we fail here, let's just throw for now to see the error.
        throw e;
      }
    }

    // Default (no questions or legacy)
    return request('/content/topik', {
      method: 'POST',
      body: JSON.stringify(exam),
    });
  },

  deleteTopikExam: async (id: string) =>
    request(`/content/topik/${id}`, {
      method: 'DELETE',
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
    return (await res.json()) as { url: string };
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

  // 其余 api 方法按需添加，务必使用上面的 request(...) 以确保 Authorization 被正确注入
};

export default api; // 如果项目里有使用 default import 的地方，保留 default 导出；否则可删

