// services/api.ts
// 统一的 request helper + 单一 export const api 对象
// 替换或合并到你的项目中，确保没有其它文件再 export 同名 api

type Nullable<T> = T | null;

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
  register: async (data: { email: string; password: string }) =>
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

  getTextbookContent: async () => request<Record<string, any>>('/content/textbook'),
  saveTextbookContent: async (key: string, content: any) =>
    request('/content/textbook', {
      method: 'POST',
      body: JSON.stringify({ key, ...content }),
    }),

  // --- TOPIK ---
  getTopikExams: async () => request<any[]>('/content/topik'),
  saveTopikExam: async (exam: any) =>
    request('/content/topik', {
      method: 'POST',
      body: JSON.stringify(exam),
    }),
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

  // 其余 api 方法按需添加，务必使用上面的 request(...) 以确保 Authorization 被正确注入
};

export default api; // 如果项目里有使用 default import 的地方，保留 default 导出；否则可删
