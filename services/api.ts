
import { User, VocabularyItem, Annotation, ExamAttempt, TopikQuestion, Institute, TextbookContent, TopikExam } from '../types';

const API_URL = 'http://localhost:3001/api';

const getHeaders = () => {
    const token = localStorage.getItem('token');
    return {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
};

export const api = {
    // Auth
    register: async (data: any) => {
        const res = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!res.ok) throw new Error((await res.json()).error);
        return res.json();
    },

    login: async (data: any) => {
        const res = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!res.ok) throw new Error((await res.json()).error);
        return res.json();
    },

    getMe: async () => {
        const res = await fetch(`${API_URL}/auth/me`, {
            method: 'GET',
            headers: getHeaders()
        });
        if (!res.ok) throw new Error("Failed to validate session");
        return res.json();
    },

    // User Data
    saveWord: async (word: Partial<VocabularyItem> & { unit?: number }) => {
        const res = await fetch(`${API_URL}/user/word`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(word)
        });
        return res.json();
    },

    saveMistake: async (word: Partial<VocabularyItem>) => {
        const res = await fetch(`${API_URL}/user/mistake`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(word)
        });
        return res.json();
    },

    saveAnnotation: async (annotation: Annotation) => {
        const res = await fetch(`${API_URL}/user/annotation`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(annotation)
        });
        return res.json();
    },

    saveExamAttempt: async (attempt: ExamAttempt) => {
        const res = await fetch(`${API_URL}/user/exam`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(attempt)
        });
        return res.json();
    },

    // Content Management (Public Read, Admin Write)
    getInstitutes: async (): Promise<Institute[]> => {
        const res = await fetch(`${API_URL}/content/institutes`);
        if (!res.ok) return [];
        return res.json();
    },

    createInstitute: async (institute: Institute) => {
        const res = await fetch(`${API_URL}/content/institutes`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(institute)
        });
        return res.json();
    },

    getTextbookContent: async (): Promise<Record<string, TextbookContent>> => {
        const res = await fetch(`${API_URL}/content/textbook`);
        if (!res.ok) return {};
        return res.json();
    },

    saveTextbookContent: async (key: string, content: TextbookContent) => {
        const res = await fetch(`${API_URL}/content/textbook`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ key, ...content })
        });
        return res.json();
    },

    getTopikExams: async (): Promise<TopikExam[]> => {
        const res = await fetch(`${API_URL}/content/topik`);
        if (!res.ok) return [];
        return res.json();
    },

    saveTopikExam: async (exam: TopikExam) => {
        const res = await fetch(`${API_URL}/content/topik`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(exam)
        });
        return res.json();
    },

    deleteTopikExam: async (id: string) => {
        await fetch(`${API_URL}/content/topik/${id}`, {
            method: 'DELETE',
            headers: getHeaders()
        });
    },

    // Profile Management
    updateProfile: async (updates: { name?: string; avatar?: string }) => {
        const res = await fetch(`${API_URL}/user/profile`, {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify(updates)
        });
        if (!res.ok) throw new Error('Failed to update profile');
        return res.json();
    },

    changePassword: async (currentPassword: string, newPassword: string) => {
        const res = await fetch(`${API_URL}/user/password`, {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify({ currentPassword, newPassword })
        });
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.message || 'Failed to change password');
        }
        return res.json();
    },

    uploadAvatar: async (file: File) => {
        const formData = new FormData();
        formData.append('avatar', file);
        
        // Note: FormData requires special handling, don't include Content-Type header
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_URL}/user/avatar`, {
            method: 'POST',
            headers: {
                ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                // Content-Type is automatically set by browser for FormData
            },
            body: formData
        });
        if (!res.ok) throw new Error('Failed to upload avatar');
        return res.json();
    }
};
