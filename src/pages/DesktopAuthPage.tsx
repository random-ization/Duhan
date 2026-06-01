import React, { useState, useEffect } from 'react';
import { useSearchParams, useLocation } from 'react-router-dom';
import {
  getLocalizedPath,
  useCurrentLanguage,
  useLocalizedNavigate,
} from '../hooks/useLocalizedNavigate';
import { AlertCircle, Mail, Lock, User } from 'lucide-react';
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
      trackEvent('signup_start', {
        language: currentLanguage,
        method: provider,
        platform: 'desktop',
      });
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
        trackEvent('signup_success', {
          language: currentLanguage,
          method: 'password',
          platform: 'desktop',
        });
      }
    } catch (e: unknown) {
      setError(toAuthErrorMessage(e, 'auth.loginFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="h-screen w-full flex flex-col md:flex-row bg-white overflow-hidden"
      style={{ fontFamily: KT.font }}
    >
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
          transition={{ duration: 2, ease: 'easeOut' }}
          className="absolute right-0 top-10 font-serif font-medium pointer-events-none select-none"
          style={{
            fontSize: '480px',
            lineHeight: 1,
            color: '#fff',
            WebkitMaskImage: 'radial-gradient(circle at 60% 40%, black 10%, transparent 90%)',
            maskImage: 'radial-gradient(circle at 60% 40%, black 10%, transparent 90%)',
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
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-8">
                <HanjaSeal c="韓" size={48} className="shadow-lg" />
                <h1 className="text-2xl font-bold tracking-tight text-white">
                  {t('auth.desktop.subtitle', { defaultValue: '讀韓 · 重新认识韩语' })}
                </h1>
              </div>

              <div className="space-y-6">
                <div className="space-y-1">
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 }}
                    className="text-6xl font-black text-white opacity-90"
                  >
                    {t('auth.desktop.heroLine1', { defaultValue: '한 글자가' })}
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                    className="text-6xl font-black text-white/90"
                  >
                    {t('auth.desktop.heroLine2', { defaultValue: '하루를 바꾼다' })}
                  </motion.div>
                </div>

                <p className="text-lg text-white/70 font-medium leading-relaxed max-w-sm">
                  {t('auth.desktop.heroDesc1', {
                    defaultValue: '每个字，都让你离这门语言更近一步。',
                  })}
                  <br />
                  {t('auth.desktop.heroDesc2', { defaultValue: '沉浸学习，与 ' })}
                  <span className="text-white font-bold border-b-2 border-white/30">
                    {t('auth.desktop.heroDesc3', { defaultValue: '三万' })}
                  </span>
                  {t('auth.desktop.heroDesc4', { defaultValue: ' 学韩者同行。' })}
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Right Side: Auth Form - SCROLLABLE & STABLE */}
      <div className="w-full md:w-1/2 h-full flex flex-col items-center justify-center p-8 md:p-12 lg:p-24 overflow-y-auto bg-white scrollbar-hide">
        <div className="w-full max-w-md py-12">
          {/* Mode Switcher */}
          <div className="flex bg-k-bg2 p-1 rounded-2xl w-fit mb-12 shadow-inner">
            <button
              onClick={() => setIsLogin(true)}
              className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${isLogin ? 'bg-k-ink text-white shadow-lg' : 'text-k-sub hover:text-k-ink'}`}
            >
              {t('login')}
            </button>
            <button
              onClick={() => setIsLogin(false)}
              className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${!isLogin ? 'bg-k-ink text-white shadow-lg' : 'text-k-sub hover:text-k-ink'}`}
            >
              {t('register')}
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
                    {isLogin
                      ? t('auth.desktop.welcomeBack', { defaultValue: '欢迎回来' })
                      : t('auth.desktop.startLearning', { defaultValue: '开始学习' })}
                  </h2>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[15px] font-serif text-k-crimson font-medium">
                      {isLogin
                        ? t('auth.desktop.welcomeBackKo', {
                            defaultValue: '다시 만나서 반갑습니다',
                          })
                        : t('auth.desktop.welcomeKo', { defaultValue: '환영합니다' })}
                    </span>
                  </div>
                </div>
                <p className="mt-3 text-k-sub text-[15px] font-medium opacity-70">
                  {isLogin
                    ? t('auth.desktop.continueJourney', { defaultValue: '继续你的韩语之旅' })
                    : t('auth.desktop.joinLearners', { defaultValue: '加入三万名韩语学习者' })}
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
                  <label className="block text-[13px] font-black text-k-ink uppercase tracking-wider mb-2 ml-1">
                    {t('auth.desktop.nickname', { defaultValue: '昵称' })}
                  </label>
                  <div className="relative group">
                    <User
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-k-sub group-focus-within:text-k-ink transition-colors"
                      size={18}
                    />
                    <input
                      type="text"
                      placeholder={t('auth.desktop.nicknamePlaceholder', {
                        defaultValue: '输入你的昵称',
                      })}
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
              <label className="block text-[13px] font-black text-k-ink uppercase tracking-wider mb-2 ml-1">
                {t('email')}
              </label>
              <div className="relative group">
                <Mail
                  className="absolute left-5 top-1/2 -translate-y-1/2 text-k-sub transition group-focus-within:text-k-ink group-focus-within:scale-110"
                  size={18}
                />
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
              <div className="flex justify-between items-center mb-2 ml-1">
                <label className="block text-[13px] font-black text-k-ink uppercase tracking-wider">
                  {t('password')}
                </label>
                {isLogin && (
                  <button
                    type="button"
                    onClick={() => navigate('/forgot-password')}
                    className="text-xs font-bold text-k-crimson hover:underline"
                  >
                    {t('auth.desktop.forgotPassword', { defaultValue: '忘记密码?' })}
                  </button>
                )}
              </div>
              <div className="relative group">
                <Lock
                  className="absolute left-5 top-1/2 -translate-y-1/2 text-k-sub transition group-focus-within:text-k-ink group-focus-within:scale-110"
                  size={18}
                />
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
              className="w-full bg-k-ink text-white h-14 mt-4 rounded-2xl font-black text-lg shadow-xl hover:shadow-2xl transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading
                ? t('auth.desktop.processing', { defaultValue: '处理中...' })
                : isLogin
                  ? t('auth.desktop.loginAction', { defaultValue: '登录 →' })
                  : t('auth.desktop.joinAction', { defaultValue: '立即加入 →' })}
            </button>
          </form>

          <div className="my-12 relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-k-line"></div>
            </div>
            <div className="relative flex justify-center text-[10px] uppercase tracking-widest font-black text-k-sub/60 bg-white px-4">
              {t('auth.desktop.orUse', { defaultValue: '或者使用' })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => handleSocialLogin('kakao')}
              className="flex items-center justify-center gap-3 py-4 border-2 border-k-line/60 rounded-2xl font-bold text-k-ink hover:bg-k-bg2/40 hover:border-k-ink/20 transition-all shadow-sm"
            >
              <div className="bg-[#FEE500] text-black text-[9px] font-black w-5 h-5 rounded-md flex items-center justify-center">
                K
              </div>
              <span className="text-sm">Kakao</span>
            </button>
            <button
              onClick={() => handleSocialLogin('google')}
              className="flex items-center justify-center gap-3 py-4 border-2 border-k-line/60 rounded-2xl font-bold text-k-ink hover:bg-k-bg2/40 hover:border-k-ink/20 transition-all shadow-sm"
            >
              <img
                src="https://www.svgrepo.com/show/475656/google-color.svg"
                className="w-5 h-5"
                alt="Google"
              />
              <span className="text-sm">Google</span>
            </button>
          </div>

          <p className="mt-14 text-center text-xs text-k-sub/50 font-medium px-4 leading-relaxed">
            {t('auth.desktop.agreement', { defaultValue: '继续即表示同意' })} {t('appName')}{' '}
            {t('auth.desktop.and', { defaultValue: '与' })}{' '}
            <span className="text-k-ink/60 border-b border-k-ink/20 cursor-pointer hover:text-k-crimson">
              {t('common.terms')}
            </span>{' '}
            {t('auth.desktop.and', { defaultValue: '与' })}{' '}
            <span className="text-k-ink/60 border-b border-k-ink/20 cursor-pointer hover:text-k-crimson">
              {t('common.privacy')}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
