import React from 'react';
import { Camera, CheckCircle, XCircle, Crown, Calendar, Trophy } from 'lucide-react';
import { User } from '../../../types';

interface ProfileHeaderProps {
  user: User;
  labels: any;
  displayName: string;
  isEditingName: boolean;
  setIsEditingName: (val: boolean) => void;
  newName: string;
  setNewName: (val: string) => void;
  handleNameUpdate: () => Promise<void>;
  renderAvatar: () => React.ReactNode;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  handleAvatarUpload: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  syncProfileFromIdentityMutation: () => Promise<{ updated: boolean }>;
  examsTaken: number;
  joinedDateLabel: string;
  isProfileIncomplete: boolean;
  success: (msg: string) => void;
  error: (msg: string) => void;
  navigate: (path: string) => void;
}

export const ProfileHeader: React.FC<ProfileHeaderProps> = ({
  user,
  labels,
  displayName,
  isEditingName,
  setIsEditingName,
  newName,
  setNewName,
  handleNameUpdate,
  renderAvatar,
  fileInputRef,
  handleAvatarUpload,
  syncProfileFromIdentityMutation,
  examsTaken,
  joinedDateLabel,
  isProfileIncomplete,
  success,
  error,
  navigate,
}) => {
  return (
    <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm mb-8 flex flex-col md:flex-row items-center gap-8">
      <div className="relative group">
        <div className="w-32 h-32 rounded-full p-1 bg-gradient-to-br from-indigo-500 to-purple-600">
          <div className="w-full h-full rounded-full bg-white p-1 overflow-hidden relative">
            {renderAvatar()}
          </div>
        </div>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="absolute bottom-0 right-0 bg-slate-900 text-white p-2.5 rounded-full shadow-lg hover:scale-110 transition-transform cursor-pointer"
        >
          <Camera size={16} />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleAvatarUpload}
          className="hidden"
        />
      </div>

      <div className="text-center md:text-left flex-1">
        <div className="flex flex-col md:flex-row items-center gap-3 mb-2">
          {isEditingName ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleNameUpdate()}
                className="border-b-2 border-indigo-500 text-2xl font-bold text-slate-900 outline-none bg-transparent w-40"
                autoFocus
              />
              <button onClick={handleNameUpdate}>
                <CheckCircle size={20} className="text-green-500" />
              </button>
              <button onClick={() => setIsEditingName(false)}>
                <XCircle size={20} className="text-red-500" />
              </button>
            </div>
          ) : (
            <h1 className="text-3xl font-extrabold text-slate-900">{displayName}</h1>
          )}
          {!isEditingName && (
            <button
              onClick={() => setIsEditingName(true)}
              className="text-slate-400 hover:text-indigo-600 transition-colors"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </button>
          )}
          {(user.tier === 'PAID' || user.tier === 'PREMIUM') && (
            <span className="px-3 py-1 bg-amber-100 text-amber-700 text-xs font-bold rounded-full flex items-center gap-1">
              <Crown size={12} className="fill-current" />{' '}
              {labels.profile?.premiumBadge || 'Premium'}
            </span>
          )}
        </div>
        <p className="text-slate-500 font-medium">{user.email}</p>
        {isProfileIncomplete && (
          <div className="mt-3 flex flex-wrap gap-2 justify-center md:justify-start">
            <button
              type="button"
              onClick={async () => {
                try {
                  const result = await syncProfileFromIdentityMutation();
                  if (result.updated) {
                    success(labels.profile?.importSuccess || 'Imported social profile');
                  } else {
                    error(
                      labels.profile?.importUnavailable ||
                        'Could not import profile, please set manually'
                    );
                  }
                } catch {
                  error(labels.profile?.importFailed || 'Import failed');
                }
              }}
              className="px-4 py-2 rounded-xl text-sm font-bold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition"
            >
              {labels.profile?.importButton || 'Import social profile'}
            </button>
            <button
              type="button"
              onClick={() => navigate('/profile')}
              className="px-4 py-2 rounded-xl text-sm font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 transition"
            >
              {labels.profile?.createManually || 'Create manually'}
            </button>
          </div>
        )}
        <div className="mt-4 flex flex-wrap gap-4 justify-center md:justify-start">
          <div className="flex items-center gap-2 text-sm text-slate-600 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
            <Calendar size={14} className="text-indigo-500" />
            {labels.profile?.joined || 'Joined'} {joinedDateLabel}
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-600 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
            <Trophy size={14} className="text-orange-500" />
            {examsTaken} {labels.profile?.examsCompleted || 'exams completed'}
          </div>
        </div>
      </div>
    </div>
  );
};
