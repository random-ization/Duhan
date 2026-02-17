import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAction } from 'convex/react';
import { useTranslation } from 'react-i18next';
import { aRef } from '../utils/convexRefs';
import { useCurrentLanguage } from '../hooks/useLocalizedNavigate';
import { LocalizedLink } from '../components/LocalizedLink';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui';

type VerifyState = 'idle' | 'loading' | 'success' | 'error';

const VerifyEmailPage: React.FC = () => {
  const { t } = useTranslation();
  const language = useCurrentLanguage();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const token = useMemo(() => searchParams.get('token')?.trim() || '', [searchParams]);

  const requestEmailVerification = useAction(
    aRef<{ language?: string }, { success: boolean; alreadyVerified?: boolean }>(
      'accountRecovery:requestEmailVerification'
    )
  );
  const confirmEmailVerification = useAction(
    aRef<{ token: string }, { success: boolean }>('accountRecovery:confirmEmailVerification')
  );

  const [state, setState] = useState<VerifyState>('idle');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) return;

    let cancelled = false;
    const run = async () => {
      setState('loading');
      try {
        await confirmEmailVerification({ token });
        if (cancelled) return;
        setState('success');
        setMessage(
          t('auth.verifyEmailSuccess', {
            defaultValue: 'Your email has been verified successfully.',
          })
        );
      } catch (err: any) {
        if (cancelled) return;
        setState('error');
        setMessage(
          err?.message === 'INVALID_OR_EXPIRED_TOKEN'
            ? t('auth.verifyEmailInvalidToken', {
                defaultValue: 'This verification link is invalid or expired.',
              })
            : err?.message || t('common.error', { defaultValue: 'Something went wrong.' })
        );
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [token, confirmEmailVerification, t]);

  const handleRequest = async () => {
    setState('loading');
    try {
      const result = await requestEmailVerification({ language });
      setState('success');
      setMessage(
        result.alreadyVerified
          ? t('auth.verifyEmailAlreadyVerified', {
              defaultValue: 'Your email is already verified.',
            })
          : t('auth.verifyEmailSent', {
              defaultValue: 'Verification email sent. Please check your inbox.',
            })
      );
    } catch (err: any) {
      setState('error');
      setMessage(
        err?.message === 'UNAUTHORIZED'
          ? t('auth.loginRequired', { defaultValue: 'Please log in first.' })
          : err?.message || t('common.error', { defaultValue: 'Something went wrong.' })
      );
    }
  };

  return (
    <div className="min-h-screen bg-muted flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-card rounded-2xl border border-border shadow-sm p-6">
        <h1 className="text-2xl font-black text-foreground mb-2">
          {t('auth.verifyEmail', { defaultValue: 'Verify email' })}
        </h1>

        {!token && (
          <p className="text-sm text-muted-foreground mb-6">
            {t('auth.verifyEmailDescription', {
              defaultValue: 'Click the button below to send a verification email.',
            })}
          </p>
        )}

        {state !== 'idle' && (
          <div
            className={`mb-5 rounded-xl border p-4 text-sm ${
              state === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-400/12 dark:border-emerald-300/40 dark:text-emerald-200'
                : state === 'error'
                  ? 'bg-red-50 border-red-200 text-red-700 dark:bg-rose-400/12 dark:border-rose-300/40 dark:text-rose-200'
                  : 'bg-muted border-border text-muted-foreground'
            }`}
          >
            {message || t('common.loading', { defaultValue: 'Loading...' })}
          </div>
        )}

        {!token && (
          <Button
            type="button"
            onClick={handleRequest}
            loading={state === 'loading'}
            loadingText={t('common.loading', { defaultValue: 'Loading...' })}
            variant="ghost"
            size="auto"
            className="w-full rounded-xl bg-primary text-primary-foreground font-bold py-3 disabled:opacity-60"
          >
            {t('auth.sendVerificationEmail', { defaultValue: 'Send verification email' })}
          </Button>
        )}

        <div className="mt-6 text-sm flex gap-4">
          <Button
            asChild
            variant="ghost"
            size="auto"
            className="text-indigo-600 dark:text-indigo-300 hover:text-indigo-700 dark:hover:text-indigo-200 font-semibold"
          >
            <LocalizedLink to="/login">
              {t('auth.backToLogin', { defaultValue: 'Back to login' })}
            </LocalizedLink>
          </Button>
          {user && (
            <Button
              asChild
              variant="ghost"
              size="auto"
              className="text-muted-foreground hover:text-muted-foreground font-semibold"
            >
              <LocalizedLink to="/profile">
                {t('profile.title', { defaultValue: 'Profile' })}
              </LocalizedLink>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default VerifyEmailPage;
