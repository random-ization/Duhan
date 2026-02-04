import React from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';
interface ResetPasswordStatusProps {
  status: 'success' | 'error';
  labels: any;
  error?: string;
  navigate: (path: string) => void;
}

export const ResetPasswordStatus: React.FC<ResetPasswordStatusProps> = ({
  status,
  labels,
  error,
  navigate,
}) => {
  if (status === 'success') {
    return (
      <div className="text-center">
        <CheckCircle2 className="w-16 h-16 text-green-400 mx-auto mb-6" />
        <h1 className="text-2xl font-bold text-white mb-2">{labels.auth?.resetSuccess}</h1>
        <p className="text-indigo-200 text-sm mb-8">{labels.auth?.resetSuccessDesc}</p>
        <button
          onClick={() => navigate('/login')}
          className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-4 rounded-xl shadow-lg transition-all"
        >
          {labels.login || 'Log In'}
        </button>
      </div>
    );
  }

  return (
    <div className="text-center">
      <XCircle className="w-16 h-16 text-red-400 mx-auto mb-6" />
      <h1 className="text-2xl font-bold text-white mb-2">{labels.auth?.invalidLink}</h1>
      <p className="text-red-200 text-sm mb-8">{error}</p>
      <button
        onClick={() => navigate('/forgot-password')}
        className="w-full bg-slate-600 hover:bg-slate-500 text-white font-bold py-4 rounded-xl shadow-lg transition-all"
      >
        {labels.auth?.requestAgain}
      </button>
    </div>
  );
};
