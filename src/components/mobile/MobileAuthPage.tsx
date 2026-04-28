import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthActions } from '@convex-dev/auth/react';
import { Mail, Lock, User, ArrowRight, AlertCircle } from 'lucide-react';
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
import { KT } from './ksoft/ksoft';
import { HanjaSeal } from './ksoft/ksoft';

const AUTH_REQUEST_TIMEOUT_MS = 15000;

const GoogleIcon: React.FC = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 48 48"
    aria-hidden="true"
    focusable="false"
    style={{ width: 18, height: 18, minWidth: 18, display: 'block', flexShrink: 0 }}
  >
    <path
      fill="#EA4335"
      d="M24 9.5c3.54 0 6.73 1.22 9.24 3.61l6.89-6.89C35.95 2.45 30.38 0 24 0 14.62 0 6.51 5.38 2.56 13.22l8.04 6.24C12.47 13.63 17.75 9.5 24 9.5z"
    />
    <path
      fill="#4285F4"
      d="M46.98 24.55c0-1.57-.14-3.09-.4-4.55H24v8.62h12.94c-.56 2.98-2.25 5.5-4.8 7.19l7.38 5.74c4.32-3.98 6.8-9.84 6.8-17z"
    />
    <path
      fill="#FBBC05"
      d="M10.6 28.54c-.5-1.48-.78-3.06-.78-4.54s.28-3.06.78-4.54l-8.04-6.24C.92 16.46 0 20.1 0 24s.92 7.54 2.56 10.78l8.04-6.24z"
    />
    <path
      fill="#34A853"
      d="M24 48c6.48 0 11.92-2.13 15.89-5.8l-7.38-5.74c-2.05 1.38-4.67 2.2-8.51 2.2-6.25 0-11.53-4.13-13.4-9.96l-8.04 6.24C6.51 42.62 14.62 48 24 48z"
    />
  </svg>
);

export const MobileAuthPage: React.FC = () => {
  const { t } = useTranslation();
  const { signIn } = useAuthActions();
  const { user, loading: authLoading } = useAuth();
  const navigate = useLocalizedNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const currentLanguage = useCurrentLanguage();

  const isLogin = useMemo(() => {
    return !location.pathname.endsWith('/register');
  }, [location.pathname]);

  const [showEmailForm, setShowEmailForm] = useState(false);
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

  const withRedirect = (basePath: string) => {
    const redirect = searchParams.get('redirect');
    if (!redirect) {
      return basePath;
    }
    return `${basePath}?redirect=${encodeURIComponent(redirect)}`;
  };

  useEffect(() => {
    if (!authLoading && user) {
      setLoading(false);
      navigate(redirectPath, { replace: true });
    }
  }, [authLoading, user, navigate, redirectPath]);

  useEffect(() => {
    setShowEmailForm(isLogin);
    setError(null);
  }, [isLogin]);

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
    <div
      className="min-h-[100dvh] flex flex-col"
      style={{
        background: `linear-gradient(180deg, ${KT.pink}70 0%, ${KT.bg} 45%, ${KT.bg} 100%)`,
        fontFamily: KT.font,
        width: '100%',
        maxWidth: '100vw',
        overflowX: 'hidden',
      }}
    >
      <div
        className="w-full max-w-md mx-auto flex-1 flex flex-col"
        style={{
          paddingTop: 'max(env(safe-area-inset-top), 24px)',
          width: '100%',
          maxWidth: 'min(100vw, 28rem)',
          overflowX: 'hidden',
        }}
      >
        <div
          className="flex-1"
          style={{
            padding: '40px 28px 24px',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <HanjaSeal c="韓" size={64} bg={KT.crimson} round={16} />
          <div
            style={{
              fontFamily: KT.serif,
              fontSize: 13,
              color: KT.crimson,
              letterSpacing: 5,
              marginTop: 28,
              fontWeight: 500,
            }}
          >
            DUHAN · 讀韓
          </div>
          <h1
            style={{
              fontSize: 42,
              fontWeight: 800,
              color: KT.ink,
              letterSpacing: -1.2,
              lineHeight: 1.05,
              marginTop: 10,
            }}
          >
            한국어,
            <br />
            매일 한 걸음.
          </h1>
          <p
            style={{
              fontSize: 15,
              color: KT.ink2,
              marginTop: 16,
              lineHeight: 1.5,
              fontWeight: 500,
            }}
          >
            FSRS 복습부터 TOPIK 대비까지
            <br />
            학습 친구들과 함께하는 한국어 여정.
          </p>
          <div style={{ marginTop: 'auto' }}>
            {!showEmailForm && (
              <Button
                type="button"
                size="auto"
                className="w-full h-[56px] rounded-[18px] mt-8"
                onClick={() => setShowEmailForm(true)}
                disabled={loading}
              >
                <span style={{ fontSize: 15, fontWeight: 800 }}>
                  {isLogin ? t('auth.loginButton') : t('auth.registerAction')}
                </span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            )}
          </div>
        </div>

        <div
          style={{
            background: KT.card,
            borderTopLeftRadius: 32,
            borderTopRightRadius: 32,
            border: `1px solid ${KT.line}`,
            boxShadow: KT.shLg,
            padding: '20px 22px calc(env(safe-area-inset-bottom) + 28px)',
          }}
        >
          {error && (
            <div
              className="mb-4 p-3 rounded-xl border flex items-start gap-2 text-xs font-bold"
              style={{ borderColor: '#C97A6E55', background: '#C97A6E1A', color: KT.crimson }}
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {showEmailForm && (
            <form onSubmit={handleSubmit} className="space-y-3 mb-4">
              {!isLogin && (
                <div className="relative">
                  <User
                    className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4"
                    style={{ color: KT.sub }}
                  />
                  <Input
                    id="mobile-auth-name"
                    name="name"
                    type="text"
                    autoComplete="name"
                    placeholder={t('auth.placeholderName')}
                    className="w-full rounded-[14px] h-[52px] pl-11 pr-4 border"
                    style={{ background: KT.bg2, borderColor: KT.line2, color: KT.ink }}
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    required={!isLogin}
                  />
                </div>
              )}
              <div className="relative">
                <Mail
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4"
                  style={{ color: KT.sub }}
                />
                <Input
                  id="mobile-auth-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder={t('auth.placeholderEmail')}
                  className="w-full rounded-[14px] h-[52px] pl-11 pr-4 border"
                  style={{ background: KT.bg2, borderColor: KT.line2, color: KT.ink }}
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>
              <div className="relative">
                <Lock
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4"
                  style={{ color: KT.sub }}
                />
                <Input
                  id="mobile-auth-password"
                  name="password"
                  type="password"
                  autoComplete={isLogin ? 'current-password' : 'new-password'}
                  placeholder={t('auth.placeholderPassword')}
                  className="w-full rounded-[14px] h-[52px] pl-11 pr-4 border"
                  style={{ background: KT.bg2, borderColor: KT.line2, color: KT.ink }}
                  value={formData.password}
                  onChange={e => setFormData({ ...formData, password: e.target.value })}
                  required
                />
              </div>
              {isLogin && (
                <div className="text-right">
                  <LocalizedLink
                    to="/forgot-password"
                    aria-label={t('auth.forgotPassword')}
                    className="text-xs font-semibold"
                    style={{ color: KT.sub }}
                  >
                    {t('auth.forgotPassword')}
                  </LocalizedLink>
                </div>
              )}
              <Button
                variant="default"
                size="auto"
                type="submit"
                loading={loading}
                loadingText={isLogin ? t('auth.loginButton') : t('auth.signupButton')}
                className="w-full h-[54px] rounded-[16px] flex items-center justify-center gap-2 mt-1"
              >
                <span className="text-[15px]">
                  {isLogin ? t('auth.loginButton') : t('auth.signupButton')}
                </span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </form>
          )}

          <div className={showEmailForm ? 'mt-2' : ''}>
            <Button
              variant="outline"
              size="auto"
              onClick={handleKakaoLogin}
              type="button"
              disabled={loading}
              loading={loading}
              loadingText={t('auth.social.kakao')}
              loadingIconClassName="w-4 h-4"
              className="w-full flex items-center justify-center gap-2.5 h-[52px] rounded-[18px]"
              style={{ background: KT.card, borderColor: KT.line2, color: KT.ink }}
            >
              <span
                className="font-black text-[11px] w-[18px] h-[18px] rounded flex items-center justify-center"
                style={{ background: '#FEE500', color: '#000' }}
              >
                K
              </span>
              <span className="text-[14px] font-bold">{t('auth.social.kakao')}</span>
            </Button>
            <Button
              variant="outline"
              size="auto"
              onClick={handleGoogleLogin}
              type="button"
              disabled={loading}
              loading={loading}
              loadingText={t('auth.social.google')}
              loadingIconClassName="w-4 h-4"
              className="w-full flex items-center justify-center gap-2.5 h-[52px] rounded-[18px] mt-2"
              style={{
                background: KT.card,
                borderColor: KT.line2,
                color: KT.ink,
                overflow: 'hidden',
              }}
            >
              <GoogleIcon />
              <span className="text-[14px] font-bold">{t('auth.social.google')}</span>
            </Button>
          </div>

          <div className="mt-5 text-center text-[13px] font-semibold" style={{ color: KT.sub }}>
            {isLogin ? t('auth.noAccount') : t('auth.hasAccount')}{' '}
            <Button
              variant="link"
              size="auto"
              onClick={() => {
                navigate(withRedirect(isLogin ? '/register' : '/login'));
              }}
              disabled={loading}
              className="font-bold h-auto p-0 underline"
              style={{ color: KT.ink }}
            >
              {isLogin ? t('auth.registerAction') : t('auth.loginAction')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
