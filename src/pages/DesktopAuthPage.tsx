import React, { useState, useEffect } from 'react';
import { useSearchParams, useLocation } from 'react-router-dom';
import {
  getLocalizedPath,
  useCurrentLanguage,
  useLocalizedNavigate,
} from '../hooks/useLocalizedNavigate';
import { LocalizedLink } from '../components/LocalizedLink';
import { ArrowRight, Sparkles, AlertCircle, Mail, Lock, User, HelpCircle } from 'lucide-react';
import { SEO as Seo } from '../seo/SEO';
import { getRouteMeta } from '../seo/publicRoutes';
import { useAuth } from '../contexts/AuthContext';
import { useAuthActions } from '@convex-dev/auth/react';
import { useQuery } from 'convex/react';
import { qRef } from '../utils/convexRefs';
import { useTranslation } from 'react-i18next';
import { Button } from '../components/ui';
import { Input } from '../components/ui';

// Google OAuth Config - Removed legacy config
// const GOOGLE_CLIENT_ID ...
// const REDIRECT_URI ...

export default function DesktopAuthPage() {
  const navigate = useLocalizedNavigate();
  const currentLanguage = useCurrentLanguage();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const { user, loading: authLoading } = useAuth(); // Assume loading is available
  const { t } = useTranslation();
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ email: '', password: '', name: '' });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const safeRedirectPath = (() => {
    const raw = searchParams.get('redirect');
    if (!raw) return null;
    if (!raw.startsWith('/')) return null;
    if (raw.startsWith('//')) return null;
    if (raw.includes('://')) return null;
    return raw;
  })();

  // Determine which page we're on for SEO
  const meta = getRouteMeta(location.pathname);

  // Auto-redirect if already logged in
  useEffect(() => {
    if (!authLoading && user) {
      navigate(safeRedirectPath || '/dashboard');
    }
  }, [user, authLoading, navigate, safeRedirectPath]);

  /* Refactored: Legacy manual callback handling removed. ConvexAuthProvider handles this.
  // Handle Google OAuth callback
  useEffect(() => {
    const code = searchParams.get('code');
    if (code && !user && !googleLoading) {
      handleGoogleCallback(code);
    }
  }, [searchParams, user]);
  */

  const { signIn } = useAuthActions();
  const logoSetting = useQuery(
    qRef<{ key: string }, { value?: { url?: string } } | null>('settings:getSetting'),
    { key: 'logo' }
  );
  const postAuthRedirectPath = getLocalizedPath(safeRedirectPath || '/dashboard', currentLanguage);
  const postAuthRedirectUrl = `${globalThis.location.origin}${postAuthRedirectPath}`;

  const toAuthErrorMessage = (err: unknown, fallbackKey: string) => {
    const message = err instanceof Error ? err.message : String(err);
    const translated = t(`errors.${message}`, { defaultValue: '' });
    if (translated) return translated;
    if (message && !message.startsWith('errors.')) return message;
    return t(fallbackKey);
  };

  const handleGoogleLogin = async () => {
    try {
      await signIn('google', { redirectTo: postAuthRedirectUrl });
    } catch (e: unknown) {
      setError(toAuthErrorMessage(e, 'auth.googleLoginFailed'));
    }
  };

  const handleKakaoLogin = async () => {
    try {
      await signIn('kakao', { redirectTo: postAuthRedirectUrl });
    } catch (e: unknown) {
      setError(toAuthErrorMessage(e, 'auth.loginFailed'));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isLogin) {
        // Login with email/password
        await signIn('password', {
          email: formData.email,
          password: formData.password,
          flow: 'signIn',
          redirectTo: postAuthRedirectUrl,
        });
      } else {
        // Register with email/password
        await signIn('password', {
          email: formData.email,
          password: formData.password,
          name: formData.name,
          flow: 'signUp',
          redirectTo: postAuthRedirectUrl,
        });
      }
    } catch (e: unknown) {
      console.error('Auth error:', e);
      setError(toAuthErrorMessage(e, 'auth.loginFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F0F4F8] dark:bg-background p-4 md:p-12 flex items-center justify-center font-sans">
      <Seo
        title={meta.title}
        description={meta.description}
        keywords={meta.keywords}
        noIndex={meta.noIndex}
      />
      <div className="max-w-5xl w-full bg-card rounded-3xl md:rounded-[3rem] border-2 border-foreground shadow-pop overflow-hidden flex flex-col md:flex-row min-h-0 md:min-h-[650px]">
        {/* Left: Visuals (Game Cover) */}
        <div className="w-full md:w-1/2 bg-indigo-600 dark:bg-indigo-500 relative flex flex-col items-center justify-center p-6 md:p-10 text-white dark:text-primary-foreground overflow-hidden">
          <div
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage:
                'repeating-linear-gradient(45deg, #000 0, #000 2px, transparent 2px, transparent 10px)',
            }}
          ></div>

          <div className="relative z-10 text-center">
            {logoSetting?.value?.url ? (
              <img
                src={logoSetting.value.url}
                alt={t('common.alt.logo')}
                className="w-32 h-32 object-contain mb-6 mx-auto drop-shadow-2xl"
              />
            ) : (
              <img
                src="/logo.png"
                alt={t('common.alt.logo')}
                className="w-32 h-32 object-contain mb-6 mx-auto drop-shadow-2xl rounded-3xl dark:brightness-0 dark:invert"
              />
            )}
            <h1 className="text-5xl font-black font-display mb-2">{t('auth.brand')}</h1>
            <p className="text-indigo-200 dark:text-indigo-100 font-bold text-lg tracking-wide">
              {t('auth.slogan')}
            </p>
          </div>

          {/* 3D Rocket Decoration */}
          <div className="absolute bottom-10 -left-10 animate-bounce duration-[2000ms]">
            <img
              src="/emojis/Rocket.png"
              className="w-32 h-32 drop-shadow-xl"
              alt={t('auth.alt.rocket')}
            />
          </div>
        </div>

        {/* Right: Console (Form) */}
        <div className="w-full md:w-1/2 p-6 md:p-12 flex flex-col justify-center bg-card relative">
          <h2 className="text-3xl font-black mb-6 text-foreground flex items-center gap-2">
            {isLogin ? t('auth.welcomeBack') : t('auth.createCharacter')}{' '}
            <Sparkles className="text-yellow-400 dark:text-amber-300 fill-current" />
          </h2>

          {error && (
            <div className="mb-6 p-4 rounded-xl border-2 flex items-center gap-2 font-bold text-sm bg-red-50 text-red-600 border-red-100 dark:bg-rose-400/12 dark:text-rose-200 dark:border-rose-300/30">
              <AlertCircle size={18} /> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="relative group">
                <User
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-indigo-500 dark:group-focus-within:text-indigo-300 transition"
                  size={20}
                />
                <Input
                  type="text"
                  placeholder={t('auth.placeholderName')}
                  className="h-auto w-full bg-muted shadow-none border-2 border-border rounded-xl pl-12 pr-4 py-3 font-bold focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-300 focus:bg-card transition text-foreground placeholder:text-muted-foreground"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
            )}

            <div className="relative group">
              <Mail
                className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-indigo-500 dark:group-focus-within:text-indigo-300 transition"
                size={20}
              />
              <Input
                type="email"
                placeholder={t('auth.placeholderEmail')}
                className="h-auto w-full bg-muted shadow-none border-2 border-border rounded-xl pl-12 pr-4 py-3 font-bold focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-300 focus:bg-card transition text-foreground placeholder:text-muted-foreground"
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>

            <div className="relative group">
              <Lock
                className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-indigo-500 dark:group-focus-within:text-indigo-300 transition"
                size={20}
              />
              <Input
                type="password"
                placeholder={t('auth.placeholderPassword')}
                className="h-auto w-full bg-muted shadow-none border-2 border-border rounded-xl pl-12 pr-4 py-3 font-bold focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-300 focus:bg-card transition text-foreground placeholder:text-muted-foreground"
                value={formData.password}
                onChange={e => setFormData({ ...formData, password: e.target.value })}
                required
              />
            </div>

            {/* Forgot Password Link */}
            {isLogin && (
              <div className="flex justify-end">
                <Button
                  asChild
                  variant="ghost"
                  size="auto"
                  className="text-xs font-bold text-muted-foreground hover:text-indigo-600 dark:hover:text-indigo-300 inline-flex items-center gap-1 transition"
                >
                  <LocalizedLink to="/forgot-password">
                    <HelpCircle size={14} /> {t('auth.forgotPassword')}
                  </LocalizedLink>
                </Button>
              </div>
            )}

            <Button
              type="submit"
              variant="ghost"
              size="auto"
              loading={loading}
              loadingText={isLogin ? t('auth.loginButton') : t('auth.signupButton')}
              className="w-full mt-4 bg-primary text-primary-foreground font-black py-4 rounded-xl border-b-4 border-foreground hover:translate-y-1 hover:border-b-0 hover:mb-1 transition shadow-xl flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95 active:shadow-none"
            >
              {isLogin ? t('auth.loginButton') : t('auth.signupButton')}
              <ArrowRight size={20} />
            </Button>
          </form>

          {/* Social Login Divider */}
          <div className="my-8 flex items-center gap-4">
            <div className="h-px bg-muted flex-1"></div>
            <span className="text-xs font-bold text-muted-foreground uppercase">
              {t('auth.orContinue')}
            </span>
            <div className="h-px bg-muted flex-1"></div>
          </div>

          {/* Social Buttons */}
          <div className="grid grid-cols-2 gap-4">
            <Button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              loading={loading}
              loadingText={t('auth.social.google')}
              loadingIconClassName="w-4 h-4"
              variant="ghost"
              size="auto"
              className="flex items-center justify-center gap-2 py-3 border-2 border-border rounded-xl font-bold text-muted-foreground hover:bg-muted hover:border-border transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <img
                src="https://www.svgrepo.com/show/475656/google-color.svg"
                className="w-5 h-5"
                alt={t('auth.social.google')}
              />
              {t('auth.social.google')}
            </Button>
            <Button
              type="button"
              onClick={handleKakaoLogin}
              disabled={loading}
              loading={loading}
              loadingText={t('auth.social.kakao')}
              loadingIconClassName="w-4 h-4"
              variant="ghost"
              size="auto"
              className="flex items-center justify-center gap-2 py-3 border-2 border-border rounded-xl font-bold text-muted-foreground hover:bg-muted hover:border-border transition"
            >
              <span className="bg-yellow-400 dark:bg-amber-300 text-foreground font-black text-xs px-1 rounded">
                K
              </span>
              {t('auth.social.kakao')}
            </Button>
          </div>

          <div className="mt-8 text-center text-xs font-bold text-muted-foreground">
            {isLogin ? t('auth.noAccount') : t('auth.hasAccount')}
            <Button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setError(null);
              }}
              disabled={loading}
              variant="ghost"
              size="auto"
              className="text-indigo-600 dark:text-indigo-300 hover:underline uppercase"
            >
              {isLogin ? t('auth.registerAction') : t('auth.loginAction')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
