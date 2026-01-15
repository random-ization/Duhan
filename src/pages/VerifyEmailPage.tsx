import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getLabels } from '../utils/i18n';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const VerifyEmailPage: React.FC = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { language } = useAuth();
    const labels = getLabels(language);

    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [message, setMessage] = useState('');

    useEffect(() => {
        const verifyEmail = async () => {
            const token = searchParams.get('token');

            if (!token) {
                setStatus('error');
                setMessage(labels.auth?.invalidLinkDesc || (language === 'zh' ? '链接已失效或缺失令牌，请重新请求' : 'Invalid verification link. Token is missing.'));
                return;
            }

            try {
                const response = await fetch(`${API_URL}/auth/verify-email?token=${token}`);
                const data = await response.json();

                if (response.ok) {
                    setStatus('success');
                    setMessage(data.message || 'Email verified successfully!');
                } else {
                    setStatus('error');
                    setMessage(data.error || 'Verification failed. Please try again.');
                }
            } catch (error) {
                setStatus('error');
                setMessage('Network error. Please check your connection and try again.');
            }
        };

        verifyEmail();
    }, [searchParams, labels.auth?.invalidLinkDesc, language]);

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-slate-900 font-sans">
            {/* Background Effects */}
            <div className="absolute inset-0 z-0">
                <div className="absolute top-0 right-0 w-3/4 h-3/4 bg-indigo-900/30 rounded-full mix-blend-screen filter blur-[100px]"></div>
                <div className="absolute bottom-0 left-0 w-3/4 h-3/4 bg-violet-900/30 rounded-full mix-blend-screen filter blur-[100px]"></div>
            </div>

            <div className="w-full max-w-md p-6 relative z-10">
                <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl shadow-2xl p-8 md:p-10 text-center">

                    {status === 'loading' && (
                        <>
                            <Loader2 className="w-16 h-16 text-indigo-400 mx-auto animate-spin mb-6" />
                            <h1 className="text-2xl font-bold text-white mb-2">
                                {labels.auth?.verifyingEmail || 'Verifying your email...'}
                            </h1>
                            <p className="text-indigo-200 text-sm">
                                {labels.auth?.waitPlease || 'Please wait'}
                            </p>
                        </>
                    )}

                    {status === 'success' && (
                        <>
                            <CheckCircle2 className="w-16 h-16 text-green-400 mx-auto mb-6" />
                            <h1 className="text-2xl font-bold text-white mb-2">
                                {labels.auth?.verifySuccess || 'Email Verified!'}
                            </h1>
                            <p className="text-indigo-200 text-sm mb-8">{message}</p>
                            <button
                                onClick={() => navigate('/login')}
                                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-4 rounded-xl shadow-lg transition-all"
                            >
                                {labels.login || 'Log In'}
                            </button>
                        </>
                    )}

                    {status === 'error' && (
                        <>
                            <XCircle className="w-16 h-16 text-red-400 mx-auto mb-6" />
                            <h1 className="text-2xl font-bold text-white mb-2">
                                {labels.auth?.verifyFailed || 'Verification Failed'}
                            </h1>
                            <p className="text-red-200 text-sm mb-8">{message}</p>
                            <button
                                onClick={() => navigate('/login')}
                                className="w-full bg-slate-600 hover:bg-slate-500 text-white font-bold py-4 rounded-xl shadow-lg transition-all"
                            >
                                {labels.auth?.backToLogin || 'Back to Login'}
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default VerifyEmailPage;
