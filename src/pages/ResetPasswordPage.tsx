import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Lock, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getLabels } from '../utils/i18n';

import { useAction } from 'convex/react';
import { makeFunctionReference } from 'convex/server';
import { toErrorMessage } from '../utils/errors';

const ResetPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { language, logout } = useAuth();
  const labels = getLabels(language);

  const token = searchParams.get('token');
  const email = searchParams.get('email');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'form' | 'success' | 'error'>('form');
  const [error, setError] = useState('');

  const resetPassword = useAction(
    makeFunctionReference<
      'action',
      { email: string; token: string; newPassword: string },
      { success: boolean; error?: string }
    >('passwordReset:resetPassword')
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      setError(
        labels.auth?.passwordsNotMatch ||
          (language === 'zh' ? '两次输入的密码不一致' : 'Passwords do not match')
      );
      return;
    }

    if (newPassword.length < 6) {
      setError(
        labels.auth?.passwordTooShort ||
          (language === 'zh' ? '密码至少需要6个字符' : 'Password must be at least 6 characters')
      );
      return;
    }

    setLoading(true);

    try {
      if (!email) {
        setError(
          labels.auth?.invalidLinkDesc ||
            'Reset token is missing or expired. Please request a new one.'
        );
        setStatus('error');
        return;
      }
      if (!token) {
        setError(
          labels.auth?.invalidLinkDesc ||
            'Reset token is missing or expired. Please request a new one.'
        );
        setStatus('error');
        return;
      }
      await resetPassword({ email, token, newPassword });

      // Force logout to clear any existing session
      logout();
      setStatus('success');
    } catch (err: unknown) {
      const message = toErrorMessage(err);
      setError(message || 'Failed to reset password. Please try again.');

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
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl shadow-2xl p-8 md:p-10 text-center">
            <XCircle className="w-16 h-16 text-red-400 mx-auto mb-6" />
            <h1 className="text-2xl font-bold text-white mb-2">
              {labels.auth?.invalidLink || (language === 'zh' ? '无效链接' : 'Invalid Link')}
            </h1>
            <p className="text-red-200 text-sm mb-8">
              {labels.auth?.invalidLinkDesc ||
                (language === 'zh'
                  ? '链接已失效或缺失令牌，请重新请求'
                  : 'Reset token is missing or expired. Please request a new one.')}
            </p>
            <button
              onClick={() => navigate('/forgot-password')}
              className="w-full bg-slate-600 hover:bg-slate-500 text-white font-bold py-4 rounded-xl shadow-lg transition-all"
            >
              {labels.auth?.requestAgain || (language === 'zh' ? '重新请求' : 'Request Again')}
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
        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl shadow-2xl p-8 md:p-10">
          {status === 'form' && (
            <>
              {/* Header */}
              <div className="text-center mb-8">
                <Lock className="w-16 h-16 text-indigo-400 mx-auto mb-4" />
                <h1 className="text-2xl font-bold text-white mb-2">
                  {labels.auth?.setNewPassword ||
                    (language === 'zh' ? '设置新密码' : 'Set New Password')}
                </h1>
                <p className="text-indigo-200 text-sm">
                  {labels.auth?.enterNewPassword ||
                    (language === 'zh' ? '请输入您的新密码' : 'Enter your new password below')}
                </p>
              </div>

              {error && (
                <div className="mb-6 p-4 bg-red-500/20 border border-red-500/30 text-red-100 rounded-xl text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-indigo-200 ml-1 uppercase tracking-wider">
                    {language === 'zh' ? '新密码' : 'New Password'}
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-indigo-300 group-focus-within:text-white transition-colors" />
                    </div>
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      className="block w-full pl-11 pr-4 py-3.5 bg-slate-800/50 border border-indigo-500/30 rounded-xl text-white placeholder-indigo-300/50 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-400 transition-all"
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-indigo-200 ml-1 uppercase tracking-wider">
                    {labels.auth?.confirmPasswordLabel ||
                      (language === 'zh' ? '确认密码' : 'Confirm Password')}
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-indigo-300 group-focus-within:text-white transition-colors" />
                    </div>
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      className="block w-full pl-11 pr-4 py-3.5 bg-slate-800/50 border border-indigo-500/30 rounded-xl text-white placeholder-indigo-300/50 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-400 transition-all"
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-70"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    labels.auth?.recoverPassword ||
                    (language === 'zh' ? '重置密码' : 'Reset Password')
                  )}
                </button>
              </form>
            </>
          )}

          {status === 'success' && (
            <div className="text-center">
              <CheckCircle2 className="w-16 h-16 text-green-400 mx-auto mb-6" />
              <h1 className="text-2xl font-bold text-white mb-2">
                {labels.auth?.resetSuccess ||
                  (language === 'zh' ? '密码重置成功！' : 'Password Reset!')}
              </h1>
              <p className="text-indigo-200 text-sm mb-8">
                {labels.auth?.resetSuccessDesc ||
                  (language === 'zh'
                    ? '您已退出登录，请使用新密码重新登录'
                    : 'You have been logged out. Please log in with your new password.')}
              </p>
              <button
                onClick={() => navigate('/login')}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-4 rounded-xl shadow-lg transition-all"
              >
                {labels.login || 'Log In'}
              </button>
            </div>
          )}

          {status === 'error' && (
            <div className="text-center">
              <XCircle className="w-16 h-16 text-red-400 mx-auto mb-6" />
              <h1 className="text-2xl font-bold text-white mb-2">
                {labels.auth?.invalidLink || (language === 'zh' ? '链接已失效' : 'Link Expired')}
              </h1>
              <p className="text-red-200 text-sm mb-8">{error}</p>
              <button
                onClick={() => navigate('/forgot-password')}
                className="w-full bg-slate-600 hover:bg-slate-500 text-white font-bold py-4 rounded-xl shadow-lg transition-all"
              >
                {labels.auth?.requestAgain || (language === 'zh' ? '重新请求' : 'Request New Link')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
