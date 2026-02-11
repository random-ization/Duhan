import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getLabels } from '../utils/i18n';
import { useLocalizedNavigate } from '../hooks/useLocalizedNavigate';

const API_URL = import.meta.env.VITE_API_URL || '/api';

const VerifyEmailPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useLocalizedNavigate();
  const { language } = useAuth();
  const labels = getLabels(language);

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const verifyEmail = async () => {
      const token = searchParams.get('token');

      if (!token) {
        setStatus('error');
        setMessage(labels.auth?.invalidLinkDesc);
        return;
      }

      try {
        const response = await fetch(`${API_URL}/auth/verify-email?token=${token}`);
        const data = await response.json();

        if (response.ok) {
          setStatus('success');
          setMessage(data.message || labels.auth?.verifySuccess);
        } else {
          setStatus('error');
          setMessage(data.error || labels.auth?.verifyFailed);
        }
      } catch (err) {
        console.error(err);
        setStatus('error');
        setMessage(labels.auth?.networkError);
      }
    };

    verifyEmail();
  }, [
    searchParams,
    labels.auth?.invalidLinkDesc,
    labels.auth?.verifySuccess,
    labels.auth?.verifyFailed,
    labels.auth?.networkError,
  ]);

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-900 font-sans">
      {/* Background Effects */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-0 right-0 w-3/4 h-3/4 bg-indigo-900/30 rounded-full mix-blend-screen filter blur-[100px]"></div>
        <div className="absolute bottom-0 left-0 w-3/4 h-3/4 bg-violet-900/30 rounded-full mix-blend-screen filter blur-[100px]"></div>
      </div>

      <div className="w-full max-w-md p-6 relative z-10">
        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl shadow-2xl p-6 md:p-10 text-center">
          {status === 'loading' && (
            <>
              <Loader2 className="w-16 h-16 text-indigo-400 mx-auto animate-spin mb-6" />
              <h1 className="text-2xl font-bold text-white mb-2">{labels.auth?.verifyingEmail}</h1>
              <p className="text-indigo-200 text-sm">{labels.auth?.waitPlease}</p>
            </>
          )}

          {status === 'success' && (
            <>
              <CheckCircle2 className="w-16 h-16 text-green-400 mx-auto mb-6" />
              <h1 className="text-2xl font-bold text-white mb-2">{labels.auth?.verifySuccess}</h1>
              <p className="text-indigo-200 text-sm mb-8">{message}</p>
              <button
                onClick={() => navigate('/login')}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-4 rounded-xl shadow-lg transition-all"
              >
                {labels.login}
              </button>
            </>
          )}

          {status === 'error' && (
            <>
              <XCircle className="w-16 h-16 text-red-400 mx-auto mb-6" />
              <h1 className="text-2xl font-bold text-white mb-2">{labels.auth?.verifyFailed}</h1>
              <p className="text-red-200 text-sm mb-8">{message}</p>
              <button
                onClick={() => navigate('/login')}
                className="w-full bg-slate-600 hover:bg-slate-500 text-white font-bold py-4 rounded-xl shadow-lg transition-all"
              >
                {labels.auth?.backToLogin}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default VerifyEmailPage;
