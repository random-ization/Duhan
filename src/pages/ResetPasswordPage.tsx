import React, { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAction } from 'convex/react';
import { useTranslation } from 'react-i18next';
import { aRef } from '../utils/convexRefs';
import { LocalizedLink } from '../components/LocalizedLink';

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
            <LocalizedLink
              to="/login"
              className="inline-block text-indigo-600 hover:text-indigo-700 font-semibold"
            >
              {t('auth.backToLogin', { defaultValue: 'Back to login' })}
            </LocalizedLink>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <input
              type="password"
              required
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              placeholder={t('auth.newPassword', { defaultValue: 'New password' })}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder={t('auth.confirmPassword', { defaultValue: 'Confirm password' })}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-slate-900 text-white font-bold py-3 disabled:opacity-60"
            >
              {loading
                ? t('common.loading', { defaultValue: 'Loading...' })
                : t('auth.resetPassword', { defaultValue: 'Reset password' })}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default ResetPasswordPage;
