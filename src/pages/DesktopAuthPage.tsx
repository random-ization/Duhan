import React, { useState, useEffect } from 'react';
import { useSearchParams, useLocation } from 'react-router-dom';
import {
  getLocalizedPath,
  useCurrentLanguage,
  useLocalizedNavigate,
} from '../hooks/useLocalizedNavigate';
import { Sparkles, AlertCircle, Mail, Lock, User } from 'lucide-react';
import { SEO as Seo } from '../seo/SEO';
import { getRouteMeta } from '../seo/publicRoutes';
import { useAuth } from '../contexts/AuthContext';
import { useAuthActions } from '@convex-dev/auth/react';
import { resolveSafeReturnTo } from '../utils/navigation';
import { useTranslation } from 'react-i18next';
import { trackEvent } from '../utils/analytics';
import { resolveAuthErrorMessage } from '../utils/authErrors';
import { KT, HanjaSeal } from '../components/mobile/ksoft/ksoft';
import { motion, AnimatePresence } from 'framer-motion';

export default function DesktopAuthPage() {
  const navigate = useLocalizedNavigate();
  const currentLanguage = useCurrentLanguage();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const { user, loading: authLoading } = useAuth();
  const { t } = useTranslation();
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ email: '', password: '', name: '' });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const redirectPath = resolveSafeReturnTo(searchParams.get('redirect'), '/dashboard/course');
  const meta = getRouteMeta(location.pathname);

  useEffect(() => {
    if (!authLoading && user) {
      navigate(redirectPath);
    }
  }, [user, authLoading, navigate, redirectPath]);

  const { signIn } = useAuthActions();
  const postAuthRedirectPath = getLocalizedPath(redirectPath, currentLanguage);
  const postAuthRedirectUrl = `${globalThis.location.origin}${postAuthRedirectPath}`;

  const toAuthErrorMessage = (err: unknown, fallbackKey: string) => {
    return resolveAuthErrorMessage(err, {
      fallback: t(fallbackKey),
      invalidCredentials: t('auth.invalidCredentials'),
      tooManyAttempts: t('auth.tooManyAttempts', {
        defaultValue: 'Too many attempts. Please try again later.',
      }),
      emailRequired: t('errors.EMAIL_REQUIRED'),
      accountExistsLinkRequired: t('errors.ACCOUNT_EXISTS_LINK_REQUIRED'),
      kakaoEmailRequired: t('errors.KAKAO_EMAIL_REQUIRED'),
      emailAlreadyExists: t('errors.EMAIL_ALREADY_EXISTS'),
    });
  };

  const handleSocialLogin = async (provider: 'google' | 'kakao') => {
    if (!isLogin) {
      trackEvent('signup_start', { language: currentLanguage, method: provider, platform: 'desktop' });
    }
    try {
      await signIn(provider, { redirectTo: postAuthRedirectUrl });
    } catch (e: unknown) {
      setError(toAuthErrorMessage(e, `auth.${provider}LoginFailed`));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isLogin) {
        await signIn('password', {
          email: formData.email,
          password: formData.password,
          flow: 'signIn',
          redirectTo: postAuthRedirectUrl,
        });
      } else {
        await signIn('password', {
          email: formData.email,
          password: formData.password,
          name: formData.name,
          flow: 'signUp',
          redirectTo: postAuthRedirectUrl,
        });
        trackEvent('signup_success', { language: currentLanguage, method: 'password', platform: 'desktop' });
      }
    } catch (e: unknown) {
      setError(toAuthErrorMessage(e, 'auth.loginFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen w-full flex flex-col md:flex-row bg-white overflow-hidden" style={{ fontFamily: KT.font }}>
      <Seo
        title={meta.title}
        description={meta.description}
        keywords={meta.keywords}
        noIndex={meta.noIndex}
      />

      {/* Left Side: Immersive Hero - FIXED HEIGHT & REFINED */}
      <div 
        className="hidden md:flex w-1/2 h-full flex-col justify-between p-16 relative overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${KT.crimson} 0%, ${KT.indigo} 100%)` }}
      >
        {/* Grain Texture Overlay */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none mix-blend-overlay grain-overlay" />
        
        {/* Rim Light Effect */}
        <div className="absolute inset-0 border-r border-white/5 pointer-events-none" />

        {/* Large background traditional kanji - Reduced size & repositioned for balance */}
        <motion.div 
          initial={{ opacity: 0, scale: 1.1 }}
          animate={{ opacity: 0.12, scale: 1 }}
          transition={{ duration: 2, ease: "easeOut" }}
          className="absolute right-0 top-10 font-serif font-medium pointer-events-none select-none"
          style={{ 
            fontSize: '480px', 
            lineHeight: 1, 
            color: '#fff',
            WebkitMaskImage: 'radial-gradient(circle at 60% 40%, black 10%, transparent 90%)',
            maskImage: 'radial-gradient(circle at 60% 40%, black 10%, transparent 90%)'
          }}
        >
          韓
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10"
        >
          <div className="flex items-center gap-5">
            <div className="relative group">
              <div className="absolute -inset-2 bg-white/10 rounded-2xl blur-lg opacity-0 group-hover:opacity-100 transition duration-500" />
              <img src="/logo.svg" alt="Duhan Logo" width={60} height={60} className="rounded-2xl shadow-sm" />
            </div>
            <div>
              <div className="text-3xl font-black text-white tracking-tighter">Duhan</div>
              <div className="text-[10px] font-bold text-white/50 uppercase tracking-[0.3em] mt-1">讀韓 · 重新认识韩语</div>
            </div>
          </div>
        </motion.div>

        <div className="relative z-10">
          <motion.h1 
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="text-[68px] font-black text-white leading-[1.05] tracking-tight"
          >
            한 글자가<br/>
            <span className="text-white/90">하루를 바꾼다</span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="mt-10 text-xl font-medium text-white/60 leading-relaxed max-w-md"
          >
            每个字，都让你离这门语言更近一步。<br/>
            沉浸学习，与 <span className="text-white font-bold">三万</span> 学韩者同行。
          </motion.p>
        </div>
      </div>

      {/* Right Side: Auth Form - SCROLLABLE & STABLE */}
      <div className="w-full md:w-1/2 h-full flex flex-col items-center justify-center p-8 md:p-12 lg:p-24 overflow-y-auto bg-white scrollbar-hide">
        <div className="w-full max-w-md py-12">
          {/* Mode Switcher */}
          <div className="flex bg-k-bg2 p-1 rounded-2xl w-fit mb-12 shadow-inner">
            <button 
              onClick={() => setIsLogin(true)}
              className={`px-10 py-2.5 rounded-xl text-sm font-black transition-all duration-300 ${isLogin ? 'bg-k-ink text-white shadow-xl scale-[1.02]' : 'text-k-sub hover:text-k-ink'}`}
            >
              登录
            </button>
            <button 
              onClick={() => setIsLogin(false)}
              className={`px-10 py-2.5 rounded-xl text-sm font-black transition-all duration-300 ${!isLogin ? 'bg-k-ink text-white shadow-xl scale-[1.02]' : 'text-k-sub hover:text-k-ink'}`}
            >
              注册
            </button>
          </div>

          <div className="mb-10 min-h-[90px]">
            <AnimatePresence mode="wait">
              <motion.div
                key={isLogin ? 'login' : 'signup'}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.2 }}
              >
                <div className="flex items-baseline gap-3 flex-wrap">
                  <h2 className="text-[34px] font-black tracking-tighter text-k-ink leading-tight">
                    {isLogin ? '欢迎回来' : '开始学习'}
                  </h2>
                  <span className="text-[28px] font-serif text-k-crimson opacity-70">
                    {isLogin ? '다시 만나서 반갑습니다' : '환영합니다'}
                  </span>
                </div>
                <p className="mt-2 text-k-sub font-bold opacity-80">
                  {isLogin ? '继续你的韩语之旅' : '加入三万名韩语学习者'}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>

          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8 p-4 rounded-2xl border-2 border-red-100 bg-red-50 text-red-600 text-sm font-black flex items-center gap-3 shadow-sm"
            >
              <AlertCircle size={20} className="shrink-0" />
              {error}
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <AnimatePresence mode="popLayout">
              {!isLogin && (
                <motion.div
                  initial={{ opacity: 0, height: 0, y: -10 }}
                  animate={{ opacity: 1, height: 'auto', y: 0 }}
                  exit={{ opacity: 0, height: 0, y: -10 }}
                  className="space-y-2 overflow-hidden"
                >
                  <label className="text-[10px] font-black text-k-sub uppercase tracking-[0.2em] px-1">昵称</label>
                  <div className="relative group">
                    <User className="absolute left-5 top-1/2 -translate-y-1/2 text-k-sub transition group-focus-within:text-k-ink group-focus-within:scale-110" size={18} />
                    <input
                      type="text"
                      placeholder="输入你的昵称"
                      className="w-full bg-k-bg2/30 px-14 py-4 rounded-2xl border-2 border-k-line/50 font-bold text-k-ink placeholder:text-k-sub focus:border-k-ink focus:bg-white outline-none transition-all shadow-sm focus:shadow-md"
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                      required={!isLogin}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-k-sub uppercase tracking-[0.2em] px-1">邮箱</label>
              <div className="relative group">
                <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-k-sub transition group-focus-within:text-k-ink group-focus-within:scale-110" size={18} />
                <input
                  type="email"
                  placeholder="haeun@email.com"
                  className="w-full bg-k-bg2/30 px-14 py-4 rounded-2xl border-2 border-k-line/50 font-bold text-k-ink placeholder:text-k-sub focus:border-k-ink focus:bg-white outline-none transition-all shadow-sm focus:shadow-md"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center px-1">
                <label className="text-[10px] font-black text-k-sub uppercase tracking-[0.2em]">密码</label>
                {isLogin && (
                  <button 
                    type="button" 
                    onClick={() => navigate('/forgot-password')}
                    className="text-[10px] font-black text-k-crimson hover:underline tracking-tight uppercase"
                  >
                    忘记密码?
                  </button>
                )}
              </div>
              <div className="relative group">
                <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-k-sub transition group-focus-within:text-k-ink group-focus-within:scale-110" size={18} />
                <input
                  type="password"
                  placeholder="••••••••"
                  className="w-full bg-k-bg2/30 px-14 py-4 rounded-2xl border-2 border-k-line/50 font-bold text-k-ink placeholder:text-k-sub focus:border-k-ink focus:bg-white outline-none transition-all shadow-sm focus:shadow-md"
                  value={formData.password}
                  onChange={e => setFormData({ ...formData, password: e.target.value })}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{ background: KT.crimson }}
              className="w-full py-5 mt-4 rounded-2xl text-white font-black text-lg flex items-center justify-center gap-2 hover:brightness-110 active:scale-[0.98] transition-all shadow-xl shadow-k-crimson/30 disabled:opacity-50"
            >
              {loading ? '处理中...' : (isLogin ? '登录 →' : '立即加入 →')}
            </button>
          </form>

          <div className="my-12 flex items-center gap-6">
            <div className="h-px bg-k-line flex-1"></div>
            <span className="text-[10px] font-black text-k-sub uppercase tracking-[0.3em] opacity-60">或者使用</span>
            <div className="h-px bg-k-line flex-1"></div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => handleSocialLogin('kakao')}
              className="flex items-center justify-center gap-3 py-4 border-2 border-k-line/60 rounded-2xl font-bold text-k-ink hover:bg-k-bg2/40 hover:border-k-ink/20 transition-all shadow-sm"
            >
              <div className="bg-[#FEE500] text-black text-[9px] font-black w-5 h-5 rounded-md flex items-center justify-center">K</div>
              <span className="text-sm">Kakao</span>
            </button>
            <button
              onClick={() => handleSocialLogin('google')}
              className="flex items-center justify-center gap-3 py-4 border-2 border-k-line/60 rounded-2xl font-bold text-k-ink hover:bg-k-bg2/40 hover:border-k-ink/20 transition-all shadow-sm"
            >
              <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-5 h-5" alt="Google" />
              <span className="text-sm">Google</span>
            </button>
          </div>

          <div className="mt-14 text-center text-[12px] font-bold text-k-sub leading-relaxed opacity-70">
            继续即表示同意 <button className="text-k-ink font-black hover:underline underline-offset-4 decoration-k-line">服务条款</button> 与 <button className="text-k-ink font-black hover:underline underline-offset-4 decoration-k-line">隐私政策</button>
          </div>
        </div>
      </div>
    </div>
  );
}
