import React from 'react';
import { Lock, Loader2 } from 'lucide-react';
interface ResetPasswordFormProps {
  labels: any;
  newPassword: string;
  setNewPassword: (val: string) => void;
  confirmPassword: string;
  setConfirmPassword: (val: string) => void;
  handleSubmit: (e: React.FormEvent) => Promise<void>;
  loading: boolean;
  error: string;
}

export const ResetPasswordForm: React.FC<ResetPasswordFormProps> = ({
  labels,
  newPassword,
  setNewPassword,
  confirmPassword,
  setConfirmPassword,
  handleSubmit,
  loading,
  error,
}) => {
  const defaultButtonLabel = labels.auth?.recoverPassword;
  const recoverPasswordLabel = labels.auth?.recoverPassword || defaultButtonLabel;

  const buttonLabel = loading ? <Loader2 className="w-5 h-5 animate-spin" /> : recoverPasswordLabel;

  return (
    <>
      <div className="text-center mb-8">
        <Lock className="w-16 h-16 text-indigo-400 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-white mb-2">{labels.auth?.setNewPassword}</h1>
        <p className="text-indigo-200 text-sm">{labels.auth?.enterNewPassword}</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-500/20 border border-red-500/30 text-red-100 rounded-xl text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-indigo-200 ml-1 uppercase tracking-wider">
            {labels.auth?.newPasswordLabel}
          </label>
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Lock className="h-5 w-5 text-indigo-300 group-focus-within:text-white transition-colors" />
            </div>
            <input
              type="password"
              required
              minLength={6}
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              className="block w-full pl-11 pr-4 py-3.5 bg-slate-800/50 border border-indigo-500/30 rounded-xl text-white placeholder-indigo-300/50 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-400 transition-all"
              placeholder="••••••••"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-indigo-200 ml-1 uppercase tracking-wider">
            {labels.auth?.confirmPasswordLabel}
          </label>
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Lock className="h-5 w-5 text-indigo-300 group-focus-within:text-white transition-colors" />
            </div>
            <input
              type="password"
              required
              minLength={6}
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              className="block w-full pl-11 pr-4 py-3.5 bg-slate-800/50 border border-indigo-500/30 rounded-xl text-white placeholder-indigo-300/50 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-400 transition-all"
              placeholder="••••••••"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-70"
        >
          {buttonLabel}
        </button>
      </form>
    </>
  );
};
