import React from 'react';
import { Loading } from '../../../components/common/Loading';
import { Mail } from 'lucide-react';
import { LocalizedLink } from '../../../components/LocalizedLink';

interface ProfileSecurityTabProps {
  labels: any;
  handlePasswordChange: (e: React.FormEvent) => Promise<void>;
  currentPassword: string;
  setCurrentPassword: (val: string) => void;
  newPassword: string;
  setNewPassword: (val: string) => void;
  confirmPassword: string;
  setConfirmPassword: (val: string) => void;
  isChangingPassword: boolean;
  accountSectionTitle: string;
  linkedProviders: Set<string>;
  linkedCount: number;
  accountsLoading: boolean;
  linkedLabel: string;
  notLinkedLabel: string;
  unlinkLabel: string;
  linkLabel: string;
  signIn: (providerId: string, options?: any) => Promise<any>;
  unlinkAuthProviderMutation: (args: { provider: string }) => Promise<any>;
  getAccountButtonClass: (isLinked: boolean, accountsLoading: boolean, disableUnlink: boolean) => string;
  language: string;
  success: (msg: string) => void;
  error: (msg: string) => void;
  toErrorMessage: (err: any) => string;
}

export const ProfileSecurityTab: React.FC<ProfileSecurityTabProps> = ({
  labels,
  handlePasswordChange,
  currentPassword,
  setCurrentPassword,
  newPassword,
  setNewPassword,
  confirmPassword,
  setConfirmPassword,
  isChangingPassword,
  accountSectionTitle,
  linkedProviders,
  linkedCount,
  accountsLoading,
  linkedLabel,
  notLinkedLabel,
  unlinkLabel,
  linkLabel,
  signIn,
  unlinkAuthProviderMutation,
  getAccountButtonClass,
  language,
  success,
  error,
  toErrorMessage,
}) => {
  return (
    <div className="max-w-xl space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <h3 className="text-xl font-bold text-slate-900 border-b border-slate-100 pb-4 mb-6">
        {labels.changePassword}
      </h3>
      <form onSubmit={handlePasswordChange} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
            {labels.currentPassword}
          </label>
          <input
            type="password"
            value={currentPassword}
            onChange={e => setCurrentPassword(e.target.value)}
            className="w-full p-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
            required
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
            {labels.newPassword}
          </label>
          <input
            type="password"
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
            className="w-full p-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
            required
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
            {labels.confirmPassword}
          </label>
          <input
            type="password"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            className="w-full p-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
            required
          />
        </div>
        <div className="pt-4">
          <button
            type="submit"
            disabled={!currentPassword || !newPassword || !confirmPassword || isChangingPassword}
            className={`w-full py-3 px-4 rounded-xl font-bold text-white shadow-lg transition-all ${
              !currentPassword || !newPassword || !confirmPassword || isChangingPassword
                ? 'bg-slate-300 cursor-not-allowed'
                : 'bg-gradient-to-r from-indigo-500 to-purple-600 hover:scale-[1.02] active:scale-[0.98]'
            }`}
          >
            {isChangingPassword ? (
              <Loading size="sm" />
            ) : (
              labels.profile?.updatePassword || 'Update Password'
            )}
          </button>
        </div>
      </form>

      {/* Forgot Password Section */}
      <div className="border-t border-slate-100 pt-6 mt-6">
        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <Mail size={20} className="text-indigo-600" />
            </div>
            <div className="flex-1">
              <h4 className="font-bold text-slate-800 mb-1">
                {labels.forgotPassword || 'Forgot your password?'}
              </h4>
              <p className="text-sm text-slate-500 mb-3">
                {labels.forgotPasswordProfileDescription ||
                  "If you've forgotten your current password, you can reset it via email verification."}
              </p>
              <LocalizedLink
                to="/forgot-password"
                className="inline-flex items-center gap-2 text-indigo-600 font-semibold text-sm hover:text-indigo-700 transition-colors"
              >
                {labels.resetPasswordViaEmail || 'Reset password via email'}
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </LocalizedLink>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-slate-100 pt-6 mt-6">
        <h4 className="font-bold text-slate-800 mb-3">{accountSectionTitle}</h4>
        <div className="space-y-3">
          {[
            { id: 'google', label: labels.auth?.social?.google || 'Google' },
            { id: 'kakao', label: labels.auth?.social?.kakao || 'Kakao' },
          ].map(provider => {
            const isLinked = linkedProviders.has(provider.id);
            const disableUnlink = isLinked && linkedCount <= 1;
            return (
              <div
                key={provider.id}
                className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <span className="font-bold text-slate-800">{provider.label}</span>
                  <span
                    className={`text-xs font-bold px-2 py-1 rounded-full ${
                      isLinked ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {isLinked ? linkedLabel : notLinkedLabel}
                  </span>
                </div>
                <button
                  type="button"
                  disabled={accountsLoading || disableUnlink}
                  onClick={async () => {
                    if (!isLinked) {
                      try {
                        await signIn(provider.id, { redirectTo: globalThis.location.href });
                      } catch {
                        error(
                          language === 'zh'
                            ? '绑定失败'
                            : `Failed to connect ${provider.label}`
                        );
                      }
                      return;
                    }

                    try {
                      await unlinkAuthProviderMutation({ provider: provider.id });
                      success(language === 'zh' ? '解绑成功' : 'Account unlinked');
                    } catch (err: unknown) {
                      const message = toErrorMessage(err);
                      if (message.includes('LAST_AUTH_METHOD')) {
                        error(
                          language === 'zh' ? '至少保留一种登录方式' : 'Keep one login method'
                        );
                        return;
                      }
                      error(language === 'zh' ? '解绑失败' : 'Failed to unlink account');
                    }
                  }}
                  className={`px-4 py-2 rounded-lg text-sm font-bold transition ${getAccountButtonClass(isLinked, accountsLoading, disableUnlink)}`}
                >
                  {isLinked ? unlinkLabel : linkLabel}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
