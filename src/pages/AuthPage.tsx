import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, Sparkles, AlertCircle, Mail, Lock, User, HelpCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useAuthActions } from "@convex-dev/auth/react";
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { getLabels } from '../utils/i18n';

// Google OAuth Config - Removed legacy config
// const GOOGLE_CLIENT_ID ...
// const REDIRECT_URI ...

export default function AuthPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, language, loading: authLoading } = useAuth(); // Assume loading is available
  const labels = getLabels(language);
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ email: '', password: '', name: '' });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Auto-redirect if already logged in
  useEffect(() => {
    if (!authLoading && user) {
      const redirectUrl = searchParams.get('redirect') || '/dashboard';
      navigate(redirectUrl);
    }
  }, [user, authLoading, navigate, searchParams]);

  /* Refactored: Legacy manual callback handling removed. ConvexAuthProvider handles this.
  // Handle Google OAuth callback
  useEffect(() => {
    const code = searchParams.get('code');
    if (code && !user && !googleLoading) {
      handleGoogleCallback(code);
    }
  }, [searchParams, user]);
  */

  // const loginMutation = useMutation(api.auth.login);
  // const registerMutation = useMutation(api.auth.register);
  // const googleAuthMutation = useMutation(api.auth.googleAuth);

  /* Refactored: Legacy manual callback handling removed. ConvexAuthProvider handles this.
  const handleGoogleCallback = async (code: string) => {
     // ...
  };
  */

  const { signIn } = useAuthActions();
  const logoSetting = useQuery(api.settings.getSetting, { key: "logo" });

  const handleGoogleLogin = async () => {
    try {
      await signIn("google", { redirectTo: window.location.origin + "/dashboard" });
    } catch (e: any) {
      setError(e.message || "Google login failed");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isLogin) {
        // Login with email/password
        await signIn("password", {
          email: formData.email,
          password: formData.password,
          flow: "signIn",
          redirectTo: window.location.origin + "/dashboard"
        });
      } else {
        // Register with email/password
        await signIn("password", {
          email: formData.email,
          password: formData.password,
          name: formData.name,
          flow: "signUp",
          redirectTo: window.location.origin + "/dashboard"
        });
      }
    } catch (e: any) {
      console.error("Auth error:", e);
      setError(e.message || (isLogin ? "Login failed" : "Registration failed"));
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
            {logoSetting?.value?.url ? (
              <img
                src={logoSetting.value.url}
                alt="Logo"
                className="w-32 h-32 object-contain mb-6 mx-auto drop-shadow-2xl"
              />
            ) : (
              <img
                src="/logo.png"
                alt="Logo"
                className="w-32 h-32 object-contain mb-6 mx-auto drop-shadow-2xl rounded-3xl"
              />
            )}
            <h1 className="text-5xl font-black font-display mb-2">{labels.auth?.brand || "DuHan."}</h1>
            <p className="text-indigo-200 font-bold text-lg tracking-wide">{labels.auth?.slogan || (language === 'zh' ? "提升你的韩语水平" : "Level Up Your Korean")}</p>
          </div>

          {/* 3D Rocket Decoration */}
          <div className="absolute bottom-10 -left-10 animate-bounce duration-[2000ms]">
            <img
              src="/emojis/Rocket.png"
              className="w-32 h-32 drop-shadow-xl"
              alt="Rocket"
            />
          </div>
        </div>

        {/* Right: Console (Form) */}
        <div className="w-full md:w-1/2 p-8 md:p-12 flex flex-col justify-center bg-white relative">
          <h2 className="text-3xl font-black mb-6 text-slate-900 flex items-center gap-2">
            {isLogin ? (labels.auth?.welcomeBack || (language === 'zh' ? "欢迎回来，探索者！" : "Welcome back, Explorer!")) : (labels.auth?.createCharacter || (language === 'zh' ? "创建新角色" : "Create New Character"))} <Sparkles className="text-yellow-400 fill-current" />
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
                  placeholder={labels.auth?.placeholderName || "Character Name"}
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
                placeholder={labels.auth?.placeholderEmail || "Email Address"}
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
                placeholder={labels.auth?.placeholderPassword || "Password"}
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
                  <HelpCircle size={14} /> {labels.auth?.forgotPassword || "Forgot Password?"}
                </Link>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-4 bg-slate-900 text-white font-black py-4 rounded-xl border-b-4 border-black hover:translate-y-1 hover:border-b-0 hover:mb-1 transition shadow-xl flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95 active:shadow-none"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (isLogin ? (labels.auth?.loginButton || (language === 'zh' ? "开始游戏 (登录)" : "Start Game (LOGIN)")) : (labels.auth?.signupButton || (language === 'zh' ? "注册账户" : "Sign Up")))}
              {!loading && <ArrowRight size={20} />}
            </button>
          </form>

          {/* Social Login Divider */}
          <div className="my-8 flex items-center gap-4">
            <div className="h-px bg-slate-200 flex-1"></div>
            <span className="text-xs font-bold text-slate-400 uppercase">{labels.auth?.orContinue || (language === 'zh' ? "或通过以下方式继续" : "Or continue with")}</span>
            <div className="h-px bg-slate-200 flex-1"></div>
          </div>

          {/* Social Buttons */}
          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              onClick={handleGoogleLogin}
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
            {isLogin ? (labels.auth?.noAccount || (language === 'zh' ? "还没有账号？" : "No account yet? ")) : (labels.auth?.hasAccount || (language === 'zh' ? "已经有账号？" : "Already have an account? "))}
            <button
              type="button"
              onClick={() => { setIsLogin(!isLogin); setError(null); }}
              className="text-indigo-600 hover:underline uppercase"
            >
              {isLogin ? (labels.auth?.registerAction || "Create Character") : (labels.auth?.loginAction || "Login Now")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

