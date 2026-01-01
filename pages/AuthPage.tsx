import React, { useState, useEffect } from 'react';
import { useNavigate, Navigate, Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, Sparkles, AlertCircle, Mail, Lock, User, HelpCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';

// Google OAuth Config
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
const REDIRECT_URI = typeof window !== 'undefined'
  ? `${window.location.origin}/auth`
  : '';

export default function AuthPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login, user, language } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ email: '', password: '', name: '' });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // Handle Google OAuth callback
  useEffect(() => {
    const code = searchParams.get('code');
    if (code && !user && !googleLoading) {
      handleGoogleCallback(code);
    }
  }, [searchParams, user]);

  const handleGoogleCallback = async (code: string) => {
    setGoogleLoading(true);
    setError(null);
    try {
      const response = await api.googleLogin({ code, redirectUri: REDIRECT_URI });
      login(response.user, response.token);
      const redirectUrl = searchParams.get('redirect') || '/dashboard';
      // Clean URL and navigate
      window.history.replaceState({}, '', '/auth');
      navigate(redirectUrl);
    } catch (err: any) {
      setError(err.message || 'Google 登录失败');
      // Clean URL
      window.history.replaceState({}, '', '/auth');
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    if (!GOOGLE_CLIENT_ID) {
      setError('Google 登录未配置');
      return;
    }

    const scope = 'openid email profile';
    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.set('client_id', GOOGLE_CLIENT_ID);
    authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', scope);
    authUrl.searchParams.set('access_type', 'offline');
    authUrl.searchParams.set('prompt', 'select_account');

    window.location.href = authUrl.toString();
  };

  if (user) {
    const redirectUrl = searchParams.get('redirect') || '/dashboard';
    return <Navigate to={redirectUrl} replace />;
  }

  // Show loading during Google callback
  if (googleLoading) {
    return (
      <div className="min-h-screen bg-[#F0F4F8] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-indigo-600 mx-auto mb-4" />
          <p className="text-slate-600 font-bold">正在通过 Google 登录...</p>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isLogin) {
        // Call API to login and get user data
        const response = await api.login({
          email: formData.email.trim(),
          password: formData.password.trim()
        });
        // response contains { user, token }
        login(response.user, response.token);
        const redirectUrl = searchParams.get('redirect') || '/dashboard';
        navigate(redirectUrl);
      } else {
        // Registration - use api helper for consistency
        await api.register({
          name: formData.name.trim(),
          email: formData.email.trim(),
          password: formData.password.trim()
        });
        setIsLogin(true);
        setError('注册成功！请检查邮箱验证后登录。');
      }
    } catch (err: any) {
      // Extract error code from ConvexError (data.code) or regular error (code)
      const errorCode = err?.data?.code || err?.code;

      // Map error codes to user-friendly messages
      const errorMessages: Record<string, string> = {
        INVALID_CREDENTIALS: language === 'zh' ? '邮箱或密码错误' : 'Invalid email or password',
        EMAIL_ALREADY_EXISTS: language === 'zh' ? '该邮箱已被注册' : 'An account with this email already exists',
        EMAIL_NOT_VERIFIED: language === 'zh' ? '请先验证您的邮箱后再登录' : 'Please verify your email before logging in',
        USER_NOT_FOUND: language === 'zh' ? '用户不存在' : 'User not found',
        USER_CREATION_FAILED: language === 'zh' ? '注册失败，请稍后重试' : 'Registration failed, please try again',
      };

      const message = errorCode && errorMessages[errorCode]
        ? errorMessages[errorCode]
        : (err?.message || (language === 'zh' ? '登录失败，请稍后重试' : 'Authentication failed, please try again'));

      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F0F4F8] p-6 md:p-12 flex items-center justify-center font-sans">
      <div className="max-w-5xl w-full bg-white rounded-[3rem] border-2 border-slate-900 shadow-pop overflow-hidden flex flex-col md:flex-row min-h-[650px]">

        {/* Left: Visuals (Game Cover) */}
        <div className="w-full md:w-1/2 bg-indigo-600 relative flex flex-col items-center justify-center p-10 text-white overflow-hidden">
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "repeating-linear-gradient(45deg, #000 0, #000 2px, transparent 2px, transparent 10px)" }}></div>

          <div className="relative z-10 text-center">
            <div className="w-24 h-24 bg-white text-indigo-600 rounded-3xl flex items-center justify-center text-5xl font-black border-4 border-slate-900 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.3)] mb-6 mx-auto font-display">D</div>
            <h1 className="text-5xl font-black font-display mb-2">DuHan.</h1>
            <p className="text-indigo-200 font-bold text-lg tracking-wide">Level Up Your Korean</p>
          </div>

          {/* 3D Rocket Decoration */}
          <div className="absolute bottom-10 -left-10 animate-bounce duration-[2000ms]">
            <img
              src="https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Travel%20and%20places/Rocket.png"
              className="w-32 h-32 drop-shadow-xl"
              alt="Rocket"
            />
          </div>
        </div>

        {/* Right: Console (Form) */}
        <div className="w-full md:w-1/2 p-8 md:p-12 flex flex-col justify-center bg-white relative">
          <h2 className="text-3xl font-black mb-6 text-slate-900 flex items-center gap-2">
            {isLogin ? "欢迎回来, 探险家!" : "创建新角色"} <Sparkles className="text-yellow-400 fill-current" />
          </h2>

          {error && (
            <div className={`mb-6 p-4 rounded-xl border-2 flex items-center gap-2 font-bold text-sm ${error.includes('成功') ? 'bg-green-50 text-green-600 border-green-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
              <AlertCircle size={18} /> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="relative group">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition" size={20} />
                <input
                  type="text"
                  placeholder="角色昵称 (Character Name)"
                  className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl pl-12 pr-4 py-3 font-bold focus:outline-none focus:border-indigo-500 focus:bg-white transition text-slate-900 placeholder:text-slate-400"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
            )}

            <div className="relative group">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition" size={20} />
              <input
                type="email"
                placeholder="电子邮箱 (Email)"
                className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl pl-12 pr-4 py-3 font-bold focus:outline-none focus:border-indigo-500 focus:bg-white transition text-slate-900 placeholder:text-slate-400"
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>

            <div className="relative group">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition" size={20} />
              <input
                type="password"
                placeholder="密码 (Password)"
                className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl pl-12 pr-4 py-3 font-bold focus:outline-none focus:border-indigo-500 focus:bg-white transition text-slate-900 placeholder:text-slate-400"
                value={formData.password}
                onChange={e => setFormData({ ...formData, password: e.target.value })}
                required
              />
            </div>

            {/* Forgot Password Link */}
            {isLogin && (
              <div className="flex justify-end">
                <Link to="/forgot-password" className="text-xs font-bold text-slate-400 hover:text-indigo-600 flex items-center gap-1 transition">
                  <HelpCircle size={14} /> 忘记密码?
                </Link>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-4 bg-slate-900 text-white font-black py-4 rounded-xl border-b-4 border-black hover:translate-y-1 hover:border-b-0 hover:mb-1 transition shadow-xl flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95 active:shadow-none"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (isLogin ? "开始游戏 (LOGIN)" : "注册账号 (SIGN UP)")}
              {!loading && <ArrowRight size={20} />}
            </button>
          </form>

          {/* Social Login Divider */}
          <div className="my-8 flex items-center gap-4">
            <div className="h-px bg-slate-200 flex-1"></div>
            <span className="text-xs font-bold text-slate-400 uppercase">Or continue with</span>
            <div className="h-px bg-slate-200 flex-1"></div>
          </div>

          {/* Social Buttons */}
          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={!GOOGLE_CLIENT_ID}
              className="flex items-center justify-center gap-2 py-3 border-2 border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-5 h-5" alt="Google" />
              Google
            </button>
            <button
              type="button"
              disabled
              className="flex items-center justify-center gap-2 py-3 border-2 border-slate-200 rounded-xl font-bold text-slate-400 cursor-not-allowed opacity-50"
            >
              <span className="bg-yellow-400 text-black font-black text-xs px-1 rounded">K</span>
              Kakao
            </button>
          </div>

          <div className="mt-8 text-center text-xs font-bold text-slate-400">
            {isLogin ? "还没有账号? " : "已有账号? "}
            <button
              type="button"
              onClick={() => { setIsLogin(!isLogin); setError(null); }}
              className="text-indigo-600 hover:underline uppercase"
            >
              {isLogin ? "注册新角色" : "直接登录"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

