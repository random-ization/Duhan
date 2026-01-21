import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useLocalizedNavigate } from '../hooks/useLocalizedNavigate';
import { LocalizedLink } from '../components/LocalizedLink';
import { ArrowLeft, Mail, Send, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { SEO } from '../seo/SEO';
import { getRouteMeta } from '../seo/publicRoutes';
import { useAuth } from '../contexts/AuthContext';
import { getLabels } from '../utils/i18n';
import { useAction } from 'convex/react';
import { PASSWORD_RESET } from '../utils/convexRefs';

export default function ForgotPasswordPage() {
  const requestPasswordReset = useAction(PASSWORD_RESET.requestPasswordReset);
  const { language } = useAuth();
  const navigate = useLocalizedNavigate();
  const location = useLocation();
  const labels = getLabels(language);
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const meta = getRouteMeta(location.pathname);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setMessage('');
      setError('');
      setLoading(true);
      await requestPasswordReset({ email });
      setMessage(labels.auth?.resendSuccess || 'Reset link sent! Please check your inbox.');
    } catch {
      setError(labels.auth?.resendError || 'Failed to reset password.');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#F0F4F8] p-6 md:p-12 flex items-center justify-center font-sans">
      <SEO title={meta.title} description={meta.description} keywords={meta.keywords} />
      <div className="max-w-5xl w-full bg-white rounded-[3rem] border-2 border-slate-900 shadow-pop overflow-hidden flex flex-col md:flex-row min-h-[600px]">
        {/* Left: Visuals (Consistent with AuthPage) */}
        <div className="w-full md:w-1/2 bg-slate-900 relative flex flex-col items-center justify-center p-10 text-white overflow-hidden">
          <div
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage:
                'repeating-linear-gradient(45deg, #4f46e5 0, #4f46e5 2px, transparent 2px, transparent 10px)',
            }}
          ></div>

          <div className="relative z-10 text-center">
            <div className="w-20 h-20 bg-indigo-500 rounded-3xl flex items-center justify-center text-4xl font-black border-4 border-white shadow-lg mb-6 mx-auto">
              ?
            </div>
            <h1 className="text-4xl font-black font-display mb-2">
              {labels.auth?.recoveryTitle || (language === 'zh' ? '账号找回' : 'Account Recovery')}
            </h1>
            <p className="text-slate-400 font-bold text-lg tracking-wide">
              {labels.auth?.recoverySlogan ||
                (language === 'zh' ? '别担心，探索者。' : "Don't panic, Explorer.")}
            </p>
          </div>

          {/* 3D Rocket Decoration (Using the fixed URL) */}
          <div className="absolute bottom-10 -left-10 animate-pulse duration-[3000ms]">
            <img
              src="/emojis/Rocket.png"
              className="w-32 h-32 drop-shadow-xl opacity-80"
              alt="Rocket"
            />
          </div>
        </div>

        {/* Right: Recovery Console */}
        <div className="w-full md:w-1/2 p-8 md:p-12 flex flex-col justify-center bg-white relative">
          <div className="mb-8">
            <LocalizedLink
              to="/login"
              className="inline-flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-slate-600 transition mb-4"
            >
              <ArrowLeft size={16} /> {labels.auth?.backToLogin || 'Back to Login'}
            </LocalizedLink>
            <h2 className="text-3xl font-black text-slate-900">
              {labels.auth?.recoverPassword ||
                (language === 'zh' ? '重置密码' : 'Recover Password')}
            </h2>
            <p className="text-slate-500 font-medium mt-2">
              {labels.auth?.recoveryDesc ||
                (language === 'zh'
                  ? '请输入您的已注册邮箱，我们将发送一条恢复信号。'
                  : 'Enter your registered email, and we will send a recovery signal.')}
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-xl border-2 border-red-100 flex items-center gap-2 font-bold text-sm">
              <AlertCircle size={18} /> {error}
            </div>
          )}

          {message && (
            <div className="mb-6 p-4 bg-green-50 text-green-600 rounded-xl border-2 border-green-100 flex items-center gap-2 font-bold text-sm">
              <CheckCircle size={18} /> {message}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="relative group">
              <Mail
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition"
                size={20}
              />
              <input
                type="email"
                placeholder={labels.auth?.placeholderEmail || 'Email Address'}
                className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl pl-12 pr-4 py-4 font-bold focus:outline-none focus:border-indigo-500 focus:bg-white transition text-slate-900 placeholder:text-slate-400"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>

            <button
              disabled={loading}
              className="w-full bg-indigo-600 text-white font-black py-4 rounded-xl border-b-4 border-indigo-800 hover:translate-y-1 hover:border-b-0 hover:mb-1 transition shadow-xl flex items-center justify-center gap-2 disabled:opacity-50 active:shadow-none active:scale-95"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>
                    {labels.auth?.sending || (language === 'zh' ? '正在发送...' : 'Sending...')}
                  </span>
                </div>
              ) : (
                <>
                  {labels.auth?.sendResetLink ||
                    (language === 'zh' ? '发送重置链接' : 'Send Reset Link')}
                  <Send size={18} />
                </>
              )}
            </button>
          </form>
          <div className="mt-8 text-center">
            <button
              onClick={() => navigate('/login')}
              className="inline-flex items-center gap-2 text-sm font-black text-slate-400 hover:text-indigo-600 transition-colors"
            >
              <ArrowLeft size={16} />
              {labels.auth?.backToLogin || (language === 'zh' ? '返回登录' : 'Back to Login')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
