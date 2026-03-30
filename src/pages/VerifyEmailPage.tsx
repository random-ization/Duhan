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

const getErrorMessage = (error: unknown): string | undefined => {
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    return typeof message === 'string' ? message : undefined;
  }
  return undefined;
};

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
      } catch (err: unknown) {
        const errorMessage = getErrorMessage(err);
        if (cancelled) return;
        setState('error');
        setMessage(
          errorMessage === 'INVALID_OR_EXPIRED_TOKEN'
            ? t('auth.verifyEmailInvalidToken', {
                defaultValue: 'This verification link is invalid or expired.',
              })
            : errorMessage || t('common.error', { defaultValue: 'Something went wrong.' })
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
    } catch (err: unknown) {
      const errorMessage = getErrorMessage(err);
      setState('error');
      setMessage(
        errorMessage === 'UNAUTHORIZED'
          ? t('auth.loginRequired', { defaultValue: 'Please log in first.' })
          : errorMessage || t('common.error', { defaultValue: 'Something went wrong.' })
      );
    }
  };

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col sm:justify-center sm:py-12 sm:px-6">
      <div className="flex-1 sm:flex-initial flex flex-col w-full max-w-md mx-auto bg-card sm:rounded-[2rem] sm:border sm:shadow-2xl overflow-y-auto mt-0 px-6 py-12 sm:p-8">
        <h1 className="text-2xl font-black text-foreground mb-2 mt-4 sm:mt-0 tracking-tight">
          {t('auth.verifyEmail', { defaultValue: 'Verify email' })}
        </h1>

        {!token && (
          <p className="text-sm font-medium text-muted-foreground mb-8">
            {t('auth.verifyEmailDescription', {
              defaultValue: 'Click the button below to send a verification email.',
            })}
          </p>
        )}

        {state !== 'idle' && (
          <div
            className={`mb-6 rounded-[14px] border p-4 text-sm font-medium ${
              state === 'success'
                ? 'bg-secondary border-border text-secondary-foreground'
                : state === 'error'
                  ? 'bg-destructive/10 border-destructive/20 text-destructive'
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
            variant="default"
            size="auto"
            className="w-full h-[54px] rounded-[16px] flex items-center justify-center gap-2 mt-2 font-bold text-[15px]"
          >
            {t('auth.sendVerificationEmail', { defaultValue: 'Send verification email' })}
          </Button>
        )}

        <div className="mt-8 text-[13px] font-semibold text-muted-foreground flex items-center justify-start gap-4">
          <Button
            asChild
            variant="link"
            size="auto"
            className="h-auto p-0 font-bold"
          >
            <LocalizedLink to="/login">
              {t('auth.backToLogin', { defaultValue: 'Back to login' })}
            </LocalizedLink>
          </Button>
          {user && (
            <Button
              asChild
              variant="link"
              size="auto"
              className="h-auto p-0 font-bold text-foreground"
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
