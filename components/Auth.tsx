import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Language } from '../types';
import { getLabels } from '../utils/i18n';
import { api } from '../services/api';
import { AlertCircle, ArrowRight, Loader2, Mail, Lock, User as UserIcon, CheckCircle2, RefreshCw } from 'lucide-react';

interface AuthProps {
  onLogin: (user: User) => void;
  language: Language;
  initialMode?: 'login' | 'register';
}

const Auth: React.FC<AuthProps> = ({ onLogin, language, initialMode = 'login' }) => {
  const navigate = useNavigate();
  const [isRegistering, setIsRegistering] = useState(initialMode === 'register');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);

  // Resend verification email state
  const [showResendVerification, setShowResendVerification] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  const labels = getLabels(language);

  // Cooldown timer effect
  useEffect(() => {
    if (cooldownSeconds > 0) {
      const timer = setTimeout(() => setCooldownSeconds(cooldownSeconds - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldownSeconds]);

  const handleResendVerification = async () => {
    if (cooldownSeconds > 0 || resendLoading) return;

    setResendLoading(true);
    setResendSuccess(false);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/auth/resend-verification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (response.ok) {
        setResendSuccess(true);
        setCooldownSeconds(120); // 2 minutes cooldown
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to resend verification email');
      }
    } catch (err) {
      setError(language === 'zh' ? '网络错误，请稍后重试' : 'Network error. Please try again.');
    } finally {
      setResendLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setShowResendVerification(false);
    setResendSuccess(false);

    try {
      if (isRegistering) {
        // Registration now returns a message, not a token
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, password }),
        });
        const data = await response.json();

        if (response.ok) {
          setRegistrationSuccess(true);
        } else {
          setError(data.error || 'Registration failed');
        }
      } else {
        const response = await api.login({ email, password });
        localStorage.setItem('token', response.token);
        onLogin(response.user);
      }
    } catch (err: any) {
      // Handle email not verified error
      if (err.code === 'EMAIL_NOT_VERIFIED') {
        setError(language === 'zh' ? '请先验证您的邮箱后再登录' : 'Please verify your email before logging in.');
        setShowResendVerification(true);
      } else {
        setError(err.message || 'Authentication failed');
      }
    } finally {
      setLoading(false);
    }
  };

  // Registration success screen
  if (registrationSuccess) {
    return (
      <div className="min-h-screen w-full relative flex items-center justify-center overflow-hidden bg-slate-900 font-sans selection:bg-indigo-500 selection:text-white">
        <div className="absolute inset-0 z-0">
          <div className="absolute top-0 right-0 w-3/4 h-3/4 bg-indigo-900/30 rounded-full mix-blend-screen filter blur-[100px] animate-blob"></div>
          <div className="absolute bottom-0 left-0 w-3/4 h-3/4 bg-violet-900/30 rounded-full mix-blend-screen filter blur-[100px] animate-blob animation-delay-2000"></div>
        </div>

        <div className="w-full max-w-md p-6 relative z-10">
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl shadow-2xl p-8 md:p-10 text-center animate-fade-in-up">
            <CheckCircle2 className="w-20 h-20 text-green-400 mx-auto mb-6" />
            <h1 className="text-2xl font-bold text-white mb-4">
              {language === 'zh' ? '注册成功！' : 'Registration Successful!'}
            </h1>
            <p className="text-indigo-200 mb-8">
              {language === 'zh'
                ? '我们已向您的邮箱发送了验证链接，请查收并点击链接完成验证。'
                : 'We have sent a verification link to your email. Please check your inbox and click the link to verify your account.'}
            </p>
            <div className="p-4 bg-indigo-500/20 border border-indigo-500/30 rounded-xl mb-6">
              <p className="text-sm text-indigo-100 flex items-center justify-center gap-2">
                <Mail className="w-4 h-4" />
                {email}
              </p>
            </div>

            {/* Resend verification email section */}
            {resendSuccess && (
              <div className="mb-4 p-3 bg-green-500/20 border border-green-500/30 rounded-xl">
                <p className="text-sm text-green-300 flex items-center justify-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  {language === 'zh' ? '验证邮件已重新发送！' : 'Verification email resent!'}
                </p>
              </div>
            )}

            <button
              onClick={handleResendVerification}
              disabled={cooldownSeconds > 0 || resendLoading}
              className="w-full mb-3 flex items-center justify-center gap-2 bg-slate-700/50 hover:bg-slate-600/50 disabled:bg-slate-800/50 disabled:cursor-not-allowed text-white font-medium py-3 rounded-xl transition-all"
            >
              {resendLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : cooldownSeconds > 0 ? (
                <>
                  <RefreshCw className="w-4 h-4" />
                  {language === 'zh'
                    ? `${Math.floor(cooldownSeconds / 60)}:${(cooldownSeconds % 60).toString().padStart(2, '0')} 后可重发`
                    : `Resend in ${Math.floor(cooldownSeconds / 60)}:${(cooldownSeconds % 60).toString().padStart(2, '0')}`
                  }
                </>
              ) : (
                <>
                  <Mail className="w-4 h-4" />
                  {language === 'zh' ? '重新发送验证邮件' : 'Resend Verification Email'}
                </>
              )}
            </button>

            <button
              onClick={() => navigate('/login')}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-4 rounded-xl shadow-lg transition-all"
            >
              {language === 'zh' ? '返回登录' : 'Back to Login'}
            </button>
          </div>
        </div>

        <style>{`
          @keyframes blob {
            0% { transform: translate(0px, 0px) scale(1); }
            33% { transform: translate(30px, -50px) scale(1.1); }
            66% { transform: translate(-20px, 20px) scale(0.9); }
            100% { transform: translate(0px, 0px) scale(1); }
          }
          .animate-blob { animation: blob 7s infinite; }
          .animation-delay-2000 { animation-delay: 2s; }
          .animate-fade-in-up {
            animation: fadeInUp 0.6s ease-out forwards;
          }
          @keyframes fadeInUp {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full relative flex items-center justify-center overflow-hidden bg-slate-900 font-sans selection:bg-indigo-500 selection:text-white">

      {/* Background Effects matching Landing Page */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-0 right-0 w-3/4 h-3/4 bg-indigo-900/30 rounded-full mix-blend-screen filter blur-[100px] animate-blob"></div>
        <div className="absolute bottom-0 left-0 w-3/4 h-3/4 bg-violet-900/30 rounded-full mix-blend-screen filter blur-[100px] animate-blob animation-delay-2000"></div>
      </div>

      <div className="w-full max-w-md p-6 relative z-10">
        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl shadow-2xl p-8 md:p-10 animate-fade-in-up">

          {/* Header */}
          <div className="text-center mb-8">
            <img src="/logo.jpg" alt="Logo" className="w-20 h-20 rounded-2xl shadow-lg mb-6 hover:scale-105 transition-transform" />
            <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">
              {isRegistering ? (language === 'zh' ? '创建账号' : 'Create Account') : (labels.welcomeBack || 'Welcome Back')}
            </h1>
            <p className="text-indigo-200 text-sm">
              {isRegistering
                ? (language === 'zh' ? '开始您的韩语精通之旅' : 'Start your journey to Korean mastery')
                : (language === 'zh' ? '登录以继续您的课程' : 'Sign in to continue your lessons')
              }
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-500/20 border border-red-500/30 text-red-100 rounded-xl text-sm animate-in slide-in-from-top-2">
              <div className="flex items-start">
                <AlertCircle className="w-5 h-5 mr-3 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>

              {/* Resend Verification Email Button */}
              {showResendVerification && (
                <div className="mt-4 pt-4 border-t border-red-500/30">
                  {resendSuccess ? (
                    <div className="flex items-center gap-2 text-green-300">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{language === 'zh' ? '验证邮件已发送，请查收！' : 'Verification email sent!'}</span>
                    </div>
                  ) : null}

                  <button
                    type="button"
                    onClick={handleResendVerification}
                    disabled={cooldownSeconds > 0 || resendLoading}
                    className="mt-2 w-full flex items-center justify-center gap-2 bg-indigo-600/50 hover:bg-indigo-600 disabled:bg-slate-600/50 disabled:cursor-not-allowed text-white font-medium py-2.5 rounded-xl transition-all"
                  >
                    {resendLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : cooldownSeconds > 0 ? (
                      <>
                        <RefreshCw className="w-4 h-4" />
                        {language === 'zh'
                          ? `${Math.floor(cooldownSeconds / 60)}:${(cooldownSeconds % 60).toString().padStart(2, '0')} 后可重发`
                          : `Resend in ${Math.floor(cooldownSeconds / 60)}:${(cooldownSeconds % 60).toString().padStart(2, '0')}`
                        }
                      </>
                    ) : (
                      <>
                        <Mail className="w-4 h-4" />
                        {language === 'zh' ? '重新发送验证邮件' : 'Resend Verification Email'}
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {isRegistering && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-indigo-200 ml-1 uppercase tracking-wider">{labels.displayName}</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <UserIcon className="h-5 w-5 text-indigo-300 group-focus-within:text-white transition-colors" />
                  </div>
                  <input
                    type="text"
                    required={isRegistering}
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="block w-full pl-11 pr-4 py-3.5 bg-slate-800/50 border border-indigo-500/30 rounded-xl text-white placeholder-indigo-300/50 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-400 transition-all"
                    placeholder="Gil-dong Hong"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-indigo-200 ml-1 uppercase tracking-wider">{labels.email}</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-indigo-300 group-focus-within:text-white transition-colors" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="block w-full pl-11 pr-4 py-3.5 bg-slate-800/50 border border-indigo-500/30 rounded-xl text-white placeholder-indigo-300/50 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-400 transition-all"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-indigo-200 ml-1 uppercase tracking-wider">{labels.password}</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-indigo-300 group-focus-within:text-white transition-colors" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="block w-full pl-11 pr-4 py-3.5 bg-slate-800/50 border border-indigo-500/30 rounded-xl text-white placeholder-indigo-300/50 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-400 transition-all"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {/* Forgot Password Link - Only show on login */}
            {!isRegistering && (
              <div className="text-right">
                <button
                  type="button"
                  onClick={() => navigate('/forgot-password')}
                  className="text-sm text-indigo-300 hover:text-white transition-colors"
                >
                  {language === 'zh' ? '忘记密码？' : 'Forgot Password?'}
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-indigo-900/50 hover:shadow-indigo-600/30 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  {isRegistering ? labels.register : labels.login}
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 text-center">
            <button
              onClick={() => {
                setIsRegistering(!isRegistering);
                setError('');
              }}
              className="text-sm text-indigo-200 hover:text-white font-medium transition-colors hover:underline underline-offset-4"
            >
              {isRegistering
                ? (language === 'zh' ? '已有账号？点此登录' : 'Already have an account? Sign In')
                : (language === 'zh' ? '没有账号？免费注册' : "Don't have an account? Register")
              }
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        .animate-blob { animation: blob 7s infinite; }
        .animation-delay-2000 { animation-delay: 2s; }
        .animate-fade-in-up {
          animation: fadeInUp 0.6s ease-out forwards;
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default Auth;
