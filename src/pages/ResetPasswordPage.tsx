import React, { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAction } from 'convex/react';
import { useTranslation } from 'react-i18next';
import { aRef } from '../utils/convexRefs';
import { LocalizedLink } from '../components/LocalizedLink';
import { Button } from '../components/ui';
import { Input } from '../components/ui';

const getErrorMessage = (error: unknown): string | undefined => {
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    return typeof message === 'string' ? message : undefined;
  }
  return undefined;
};

const ResetPasswordPage: React.FC = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const token = useMemo(() => searchParams.get('token')?.trim() || '', [searchParams]);

  const confirmPasswordReset = useAction(
    aRef<{ token: string; newPassword: string }, { success: boolean }>(
      'accountRecovery:confirmPasswordReset'
    )
  );

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    if (!token) {
      setError(t('auth.invalidResetToken', { defaultValue: 'Invalid or missing reset token.' }));
      return;
    }
    if (newPassword.length < 8) {
      setError(
        t('auth.passwordTooShort', {
          defaultValue: 'Password must be at least 8 characters long.',
        })
      );
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(t('auth.passwordsNotMatch', { defaultValue: 'Passwords do not match.' }));
      return;
    }

    setLoading(true);
    try {
      await confirmPasswordReset({ token, newPassword });
      setSuccess(true);
    } catch (err: unknown) {
      const errorMessage = getErrorMessage(err);
      const message =
        errorMessage === 'INVALID_OR_EXPIRED_TOKEN'
          ? t('auth.invalidResetToken', { defaultValue: 'Invalid or expired reset token.' })
          : errorMessage === 'WEAK_PASSWORD'
            ? t('auth.passwordTooShort', {
                defaultValue: 'Password must be at least 8 characters long.',
              })
            : errorMessage || t('common.error', { defaultValue: 'Something went wrong.' });
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <h1 className="text-2xl font-black text-slate-900 mb-2">
          {t('auth.resetPassword', { defaultValue: 'Reset password' })}
        </h1>
        <p className="text-sm text-slate-500 mb-6">
          {t('auth.resetPasswordDescription', {
            defaultValue: 'Set a new password for your account.',
          })}
        </p>

        {success ? (
          <div className="space-y-4">
            <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-sm text-emerald-700">
              {t('auth.passwordResetSuccess', {
                defaultValue: 'Your password has been reset successfully.',
              })}
            </div>
            <Button
              asChild
              variant="ghost"
              size="auto"
              className="inline-block text-indigo-600 hover:text-indigo-700 font-semibold"
            >
              <LocalizedLink to="/login">
                {t('auth.backToLogin', { defaultValue: 'Back to login' })}
              </LocalizedLink>
            </Button>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <Input
              type="password"
              required
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              placeholder={t('auth.newPasswordLabel', { defaultValue: 'New Password' })}
              className="h-auto w-full rounded-xl shadow-none border border-slate-300 px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <Input
              type="password"
              required
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder={t('auth.confirmPasswordLabel', { defaultValue: 'Confirm Password' })}
              className="h-auto w-full rounded-xl shadow-none border border-slate-300 px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button
              type="submit"
              variant="ghost"
              size="auto"
              loading={loading}
              loadingText={t('common.loading', { defaultValue: 'Loading...' })}
              className="w-full rounded-xl bg-slate-900 text-white font-bold py-3 disabled:opacity-60"
            >
              {t('auth.resetPassword', { defaultValue: 'Reset password' })}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
};

export default ResetPasswordPage;
