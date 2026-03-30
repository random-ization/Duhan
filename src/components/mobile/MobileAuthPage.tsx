import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthActions } from '@convex-dev/auth/react';
import { Mail, Lock, User, ArrowRight, HelpCircle, Sparkles, AlertCircle } from 'lucide-react';
import { LocalizedLink } from '../../components/LocalizedLink';
import {
  getLocalizedPath,
  useCurrentLanguage,
  useLocalizedNavigate,
} from '../../hooks/useLocalizedNavigate';
import { useAuth } from '../../contexts/AuthContext';
import { resolveSafeReturnTo } from '../../utils/navigation';
import { Button } from '../ui';
import { Input } from '../ui';
import { trackEvent } from '../../utils/analytics';
import { resolveAuthErrorMessage } from '../../utils/authErrors';

const AUTH_REQUEST_TIMEOUT_MS = 15000;

export const MobileAuthPage: React.FC = () => {
  const { t } = useTranslation();
  const { signIn } = useAuthActions();
  const { user, loading: authLoading } = useAuth();
  const navigate = useLocalizedNavigate();
  const [searchParams] = useSearchParams();
  const currentLanguage = useCurrentLanguage();

  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
  });

  const redirectPath = resolveSafeReturnTo(searchParams.get('redirect'), '/dashboard');

  const postAuthRedirectPath = getLocalizedPath(redirectPath, currentLanguage);
  const postAuthRedirectUrl = `${globalThis.location.origin}${postAuthRedirectPath}`;

  useEffect(() => {
    if (!authLoading && user) {
      setLoading(false);
      navigate(redirectPath, { replace: true });
    }
  }, [authLoading, user, navigate, redirectPath]);

  const withTimeout = async <T,>(promise: Promise<T>, timeoutMs: number) => {
    let timeoutId: ReturnType<typeof globalThis.setTimeout> | undefined;
    try {
      return await Promise.race([
        promise,
        new Promise<T>((_, reject) => {
          timeoutId = globalThis.setTimeout(() => {
            reject(new Error('AUTH_REQUEST_TIMEOUT'));
          }, timeoutMs);
        }),
      ]);
    } finally {
      if (timeoutId !== undefined) {
        globalThis.clearTimeout(timeoutId);
      }
    }
  };

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
      timeout: t('auth.loginFailed'),
    });
  };

  const handleSocialLogin = async (provider: 'google' | 'kakao', fallbackKey: string) => {
    setLoading(true);
    setError(null);
    if (!isLogin) {
      trackEvent('signup_start', {
        language: currentLanguage,
        method: provider,
        platform: 'mobile',
      });
    }
    try {
      const result = await withTimeout(
        signIn(provider, { redirectTo: postAuthRedirectUrl }),
        AUTH_REQUEST_TIMEOUT_MS
      );

      if (result.redirect) {
        globalThis.location.assign(result.redirect.toString());
        return;
      }
    } catch (err: unknown) {
      setError(toAuthErrorMessage(err, fallbackKey));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    await handleSocialLogin('google', 'auth.googleLoginFailed');
  };

  const handleKakaoLogin = async () => {
    await handleSocialLogin('kakao', 'auth.loginFailed');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!isLogin) {
      trackEvent('signup_start', {
        language: currentLanguage,
        method: 'password',
        platform: 'mobile',
      });
    }

    try {
      if (isLogin) {
        await withTimeout(
          signIn('password', {
            email: formData.email,
            password: formData.password,
            flow: 'signIn',
            redirectTo: postAuthRedirectUrl,
          }),
          AUTH_REQUEST_TIMEOUT_MS
        );
      } else {
        await withTimeout(
          signIn('password', {
            email: formData.email,
            password: formData.password,
            name: formData.name,
            flow: 'signUp',
            redirectTo: postAuthRedirectUrl,
          }),
          AUTH_REQUEST_TIMEOUT_MS
        );
        trackEvent('signup_success', {
          language: currentLanguage,
          method: 'password',
          platform: 'mobile',
        });
      }
    } catch (err: unknown) {
      console.error('Auth error:', err);
      setError(toAuthErrorMessage(err, isLogin ? 'auth.loginFailed' : 'auth.signupFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col">
      <div className="flex-1 flex flex-col w-full max-w-md mx-auto bg-card sm:my-8 sm:rounded-[2rem] sm:border sm:shadow-2xl overflow-hidden">
        {/* Header / Brand Area */}
        <div className="bg-primary p-8 text-center relative overflow-hidden shrink-0">
          <div
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage:
                'repeating-linear-gradient(45deg, #000 0, #000 2px, transparent 2px, transparent 10px)',
            }}
          ></div>

          <div className="relative z-10 pt-4">
            <div className="w-16 h-16 bg-background rounded-[1.25rem] mx-auto mb-4 shadow-xl shadow-black/10 flex items-center justify-center">
              <img
                src="/logo.png"
                alt={t('common.alt.logo', { defaultValue: 'Duhan logo' })}
                className="w-10 h-10 object-contain"
              />
            </div>
            <h1 className="text-2xl font-black text-primary-foreground mb-1 tracking-tight">{t('auth.brand')}</h1>
            <p className="text-primary-foreground/80 font-bold text-xs tracking-wider uppercase">{t('auth.slogan')}</p>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col p-6 sm:px-10 overflow-y-auto pb-[calc(env(safe-area-inset-bottom)+2rem)]">
          {/* Toggle Title */}
          <h2 className="text-xl font-black text-foreground mb-6 flex items-center gap-2">
            {isLogin ? t('auth.welcomeBack') : t('auth.createCharacter')}
            <Sparkles className="w-4 h-4 text-amber-400 fill-current" />
          </h2>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-destructive/10 border border-destructive/20 flex items-start gap-2 text-xs font-bold text-destructive">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name Field (Hidden on Login, Shown on Register) */}
            {!isLogin && (
              <div className="relative group">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <Input
                  type="text"
                  placeholder={t('auth.placeholderName')}
                  className="w-full bg-accent/50 border-2 border-border/80 rounded-[14px] h-[52px] pl-12 pr-4 font-bold text-base text-foreground focus:outline-none focus:border-primary focus:bg-background transition-colors placeholder:text-muted-foreground placeholder:font-medium"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  required={!isLogin}
                />
              </div>
            )}

            {/* Email */}
            <div className="relative group">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <Input
                type="email"
                placeholder={t('auth.placeholderEmail')}
                className="w-full bg-accent/50 border-2 border-border/80 rounded-[14px] h-[52px] pl-12 pr-4 font-bold text-base text-foreground focus:outline-none focus:border-primary focus:bg-background transition-colors placeholder:text-muted-foreground placeholder:font-medium"
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>

            {/* Password */}
            <div className="relative group">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <Input
                type="password"
                placeholder={t('auth.placeholderPassword')}
                className="w-full bg-accent/50 border-2 border-border/80 rounded-[14px] h-[52px] pl-12 pr-4 font-bold text-base text-foreground focus:outline-none focus:border-primary focus:bg-background transition-colors placeholder:text-muted-foreground placeholder:font-medium"
                value={formData.password}
                onChange={e => setFormData({ ...formData, password: e.target.value })}
                required
              />
            </div>

            {/* Forgot Password */}
            {isLogin && (
              <div className="flex justify-end mt-1">
                <Button
                  asChild
                  variant="link"
                  size="auto"
                  className="h-auto p-0 font-bold"
                >
                  <LocalizedLink to="/forgot-password" area-label={t('auth.forgotPassword')}>
                    <span className="flex items-center gap-1.5 opacity-80 hover:opacity-100">
                      <HelpCircle className="w-3.5 h-3.5" />
                      <span className="text-xs">{t('auth.forgotPassword')}</span>
                    </span>
                  </LocalizedLink>
                </Button>
              </div>
            )}

            {/* Submit */}
            <Button
              variant="default"
              size="auto"
              type="submit"
              loading={loading}
              loadingText={isLogin ? t('auth.loginButton') : t('auth.signupButton')}
              className="w-full h-[54px] rounded-[16px] flex items-center justify-center gap-2 mt-2"
            >
              <span className="text-[15px]">{isLogin ? t('auth.loginButton') : t('auth.signupButton')}</span>
              <ArrowRight className="w-5 h-5" />
            </Button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-4 my-6">
            <div className="h-px bg-border flex-1"></div>
            <span className="text-[11px] font-black tracking-wider text-muted-foreground uppercase">
              {t('auth.orContinue')}
            </span>
            <div className="h-px bg-border flex-1"></div>
          </div>

          {/* Socials */}
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              size="auto"
              onClick={handleGoogleLogin}
              type="button"
              disabled={loading}
              loading={loading}
              loadingText={t('auth.social.google')}
              loadingIconClassName="w-4 h-4"
              className="flex items-center justify-center gap-2.5 h-[52px] rounded-[14px]"
            >
              <img
                src="https://www.svgrepo.com/show/475656/google-color.svg"
                className="w-[18px] h-[18px]"
                alt={t('auth.social.google', { defaultValue: 'Google' })}
              />
              <span className="text-[14px] font-bold">{t('auth.social.google')}</span>
            </Button>
            <Button
              variant="outline"
              size="auto"
              onClick={handleKakaoLogin}
              type="button"
              disabled={loading}
              loading={loading}
              loadingText={t('auth.social.kakao')}
              loadingIconClassName="w-4 h-4"
              className="flex items-center justify-center gap-2.5 h-[52px] rounded-[14px]"
            >
              <span className="bg-[#FEE500] text-black/90 font-black text-[11px] w-[18px] h-[18px] rounded flex items-center justify-center">
                K
              </span>
              <span className="text-[14px] font-bold">{t('auth.social.kakao')}</span>
            </Button>
          </div>

          {/* Toggle Mode */}
          <div className="mt-8 text-center text-[13px] font-semibold text-muted-foreground">
            {isLogin ? t('auth.noAccount') : t('auth.hasAccount')}
            <Button
              variant="link"
              size="auto"
              onClick={() => setIsLogin(!isLogin)}
              disabled={loading}
              className="font-bold ml-1 h-auto p-0"
            >
              {isLogin ? t('auth.registerAction') : t('auth.loginAction')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
