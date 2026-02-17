import React, { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAction } from 'convex/react';
import { useTranslation } from 'react-i18next';
import { aRef } from '../utils/convexRefs';
import { LocalizedLink } from '../components/LocalizedLink';
import { Button } from '../components/ui';
import { Input } from '../components/ui';

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
      setError(
        t('auth.passwordMismatch', { defaultValue: 'The two password fields do not match.' })
      );
      return;
    }

    setLoading(true);
    try {
      await confirmPasswordReset({ token, newPassword });
      setSuccess(true);
    } catch (err: any) {
      const message =
        err?.message === 'INVALID_OR_EXPIRED_TOKEN'
          ? t('auth.invalidResetToken', { defaultValue: 'Invalid or expired reset token.' })
          : err?.message === 'WEAK_PASSWORD'
            ? t('auth.passwordTooShort', {
                defaultValue: 'Password must be at least 8 characters long.',
              })
            : err?.message || t('common.error', { defaultValue: 'Something went wrong.' });
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-card rounded-2xl border border-border shadow-sm p-6">
        <h1 className="text-2xl font-black text-foreground mb-2">
          {t('auth.resetPassword', { defaultValue: 'Reset password' })}
        </h1>
        <p className="text-sm text-muted-foreground mb-6">
          {t('auth.resetPasswordDescription', {
            defaultValue: 'Set a new password for your account.',
          })}
        </p>

        {success ? (
          <div className="space-y-4">
            <div className="rounded-xl bg-emerald-50 border border-emerald-200 dark:bg-emerald-400/12 dark:border-emerald-300/40 p-4 text-sm text-emerald-700 dark:text-emerald-200">
              {t('auth.passwordResetSuccess', {
                defaultValue: 'Your password has been reset successfully.',
              })}
            </div>
            <Button
              asChild
              variant="ghost"
              size="auto"
              className="inline-block text-indigo-600 dark:text-indigo-300 hover:text-indigo-700 dark:hover:text-indigo-200 font-semibold"
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
              placeholder={t('auth.newPassword', { defaultValue: 'New password' })}
              className="h-auto w-full rounded-xl shadow-none border border-border px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-300/70"
            />
            <Input
              type="password"
              required
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder={t('auth.confirmPassword', { defaultValue: 'Confirm password' })}
              className="h-auto w-full rounded-xl shadow-none border border-border px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-300/70"
            />
            {error && <p className="text-sm text-red-600 dark:text-rose-300">{error}</p>}
            <Button
              type="submit"
              variant="ghost"
              size="auto"
              loading={loading}
              loadingText={t('common.loading', { defaultValue: 'Loading...' })}
              className="w-full rounded-xl bg-primary text-primary-foreground font-bold py-3 disabled:opacity-60"
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
