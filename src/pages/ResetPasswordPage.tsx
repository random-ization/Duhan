import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { XCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getLabels } from '../utils/i18n';

import { useAction } from 'convex/react';
import { toErrorMessage } from '../utils/errors';
import { useLocalizedNavigate } from '../hooks/useLocalizedNavigate';
import { PASSWORD_RESET } from '../utils/convexRefs';
import { ResetPasswordForm } from './reset-password/components/ResetPasswordForm';
import { ResetPasswordStatus } from './reset-password/components/ResetPasswordStatus';

const ResetPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useLocalizedNavigate();
  const { language, logout } = useAuth();
  const labels = getLabels(language);

  const token = searchParams.get('token');
  const email = searchParams.get('email');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'form' | 'success' | 'error'>('form');
  const [error, setError] = useState('');

  const resetPassword = useAction(PASSWORD_RESET.resetPassword);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      setError(labels.auth?.passwordsNotMatch);
      return;
    }

    if (newPassword.length < 6) {
      setError(labels.auth?.passwordTooShort);
      return;
    }

    setLoading(true);

    try {
      if (!email) {
        setError(labels.auth?.invalidLinkDesc);
        setStatus('error');
        return;
      }
      if (!token) {
        setError(labels.auth?.invalidLinkDesc);
        setStatus('error');
        return;
      }
      await resetPassword({ email, token, newPassword });

      // Force logout to clear any existing session
      logout();
      setStatus('success');
    } catch (err: unknown) {
      const message = toErrorMessage(err);
      setError(message || labels.auth?.resetFailed);

      if (message?.includes('expired') || message?.includes('Invalid')) {
        setStatus('error');
      }
    } finally {
      setLoading(false);
    }
  };

  if (!token || !email) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-slate-900 font-sans">
        <div className="absolute inset-0 z-0">
          <div className="absolute top-0 right-0 w-3/4 h-3/4 bg-indigo-900/30 rounded-full mix-blend-screen filter blur-[100px]"></div>
          <div className="absolute bottom-0 left-0 w-3/4 h-3/4 bg-violet-900/30 rounded-full mix-blend-screen filter blur-[100px]"></div>
        </div>
        <div className="w-full max-w-md p-6 relative z-10">
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl shadow-2xl p-6 md:p-10 text-center">
            <XCircle className="w-16 h-16 text-red-400 mx-auto mb-6" />
            <h1 className="text-2xl font-bold text-white mb-2">{labels.auth?.invalidLink}</h1>
            <p className="text-red-200 text-sm mb-8">{labels.auth?.invalidLinkDesc}</p>
            <button
              onClick={() => navigate('/forgot-password')}
              className="w-full bg-slate-600 hover:bg-slate-500 text-white font-bold py-4 rounded-xl shadow-lg transition-all"
            >
              {labels.auth?.requestAgain}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-900 font-sans">
      {/* Background Effects */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-0 right-0 w-3/4 h-3/4 bg-indigo-900/30 rounded-full mix-blend-screen filter blur-[100px]"></div>
        <div className="absolute bottom-0 left-0 w-3/4 h-3/4 bg-violet-900/30 rounded-full mix-blend-screen filter blur-[100px]"></div>
      </div>

      <div className="w-full max-w-md p-6 relative z-10">
        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl shadow-2xl p-6 md:p-10">
          {status === 'form' ? (
            <ResetPasswordForm
              labels={labels}
              newPassword={newPassword}
              setNewPassword={setNewPassword}
              confirmPassword={confirmPassword}
              setConfirmPassword={setConfirmPassword}
              handleSubmit={handleSubmit}
              loading={loading}
              error={error}
            />
          ) : (
            <ResetPasswordStatus
              status={status}
              labels={labels}
              error={error}
              navigate={navigate}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
