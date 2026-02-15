import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAction } from 'convex/react';
import { useTranslation } from 'react-i18next';
import { aRef } from '../utils/convexRefs';
import { useCurrentLanguage } from '../hooks/useLocalizedNavigate';
import { LocalizedLink } from '../components/LocalizedLink';
import { useAuth } from '../contexts/AuthContext';

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
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <h1 className="text-2xl font-black text-slate-900 mb-2">
          {t('auth.verifyEmail', { defaultValue: 'Verify email' })}
        </h1>

        {!token && (
          <p className="text-sm text-slate-500 mb-6">
            {t('auth.verifyEmailDescription', {
              defaultValue: 'Click the button below to send a verification email.',
            })}
          </p>
        )}

        {state !== 'idle' && (
          <div
            className={`mb-5 rounded-xl border p-4 text-sm ${
              state === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                : state === 'error'
                  ? 'bg-red-50 border-red-200 text-red-700'
                  : 'bg-slate-50 border-slate-200 text-slate-600'
            }`}
          >
            {message || t('common.loading', { defaultValue: 'Loading...' })}
          </div>
        )}

        {!token && (
          <button
            onClick={handleRequest}
            disabled={state === 'loading'}
            className="w-full rounded-xl bg-slate-900 text-white font-bold py-3 disabled:opacity-60"
          >
            {state === 'loading'
              ? t('common.loading', { defaultValue: 'Loading...' })
              : t('auth.sendVerificationEmail', { defaultValue: 'Send verification email' })}
          </button>
        )}

        <div className="mt-6 text-sm flex gap-4">
          <LocalizedLink
            to="/login"
            className="text-indigo-600 hover:text-indigo-700 font-semibold"
          >
            {t('auth.backToLogin', { defaultValue: 'Back to login' })}
          </LocalizedLink>
          {user && (
            <LocalizedLink
              to="/profile"
              className="text-slate-600 hover:text-slate-700 font-semibold"
            >
              {t('profile.title', { defaultValue: 'Profile' })}
            </LocalizedLink>
          )}
        </div>
      </div>
    </div>
  );
};

export default VerifyEmailPage;
