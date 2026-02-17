import React from 'react';
import { Camera, CheckCircle, XCircle, Crown, Calendar, Trophy } from 'lucide-react';
import { User } from '../../../types';
import { Button } from '../../../components/ui';
import { Input } from '../../../components/ui';

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
  const [syncingProfile, setSyncingProfile] = React.useState(false);

  return (
    <div className="bg-card rounded-3xl p-8 border border-border shadow-sm mb-8 flex flex-col md:flex-row items-center gap-8">
      <div className="relative group">
        <div className="w-32 h-32 rounded-full p-1 bg-gradient-to-br from-indigo-500 to-purple-600 dark:from-indigo-400/75 dark:to-violet-400/75">
          <div className="w-full h-full rounded-full bg-card p-1 overflow-hidden relative">
            {renderAvatar()}
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="auto"
          onClick={() => fileInputRef.current?.click()}
          className="absolute bottom-0 right-0 bg-primary text-primary-foreground p-2.5 rounded-full shadow-lg hover:scale-110 transition-transform cursor-pointer"
        >
          <Camera size={16} />
        </Button>
        <Input
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
              <Input
                type="text"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleNameUpdate()}
                className="h-auto border-b-2 border-indigo-500 dark:border-indigo-300/70 text-2xl font-bold text-foreground outline-none bg-transparent w-40 p-0 rounded-none border-x-0 border-t-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
                autoFocus
              />
              <Button type="button" variant="ghost" size="auto" onClick={handleNameUpdate}>
                <CheckCircle size={20} className="text-green-500 dark:text-emerald-300" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="auto"
                onClick={() => setIsEditingName(false)}
              >
                <XCircle size={20} className="text-red-500 dark:text-rose-300" />
              </Button>
            </div>
          ) : (
            <h1 className="text-3xl font-extrabold text-foreground">{displayName}</h1>
          )}
          {!isEditingName && (
            <Button
              type="button"
              variant="ghost"
              size="auto"
              onClick={() => setIsEditingName(true)}
              className="text-muted-foreground hover:text-indigo-600 dark:hover:text-indigo-300 transition-colors"
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
            </Button>
          )}
          {(user.tier === 'PAID' || user.tier === 'PREMIUM') && (
            <span className="px-3 py-1 bg-amber-100 text-amber-700 dark:bg-amber-400/15 dark:text-amber-200 text-xs font-bold rounded-full flex items-center gap-1">
              <Crown size={12} className="fill-current" />{' '}
              {labels.profile?.premiumBadge || 'Premium'}
            </span>
          )}
        </div>
        <p className="text-muted-foreground font-medium">{user.email}</p>
        {isProfileIncomplete && (
          <div className="mt-3 flex flex-wrap gap-2 justify-center md:justify-start">
            <Button
              type="button"
              variant="ghost"
              size="auto"
              disabled={syncingProfile}
              loading={syncingProfile}
              loadingText={labels.profile?.importButton || 'Import social profile'}
              loadingIconClassName="w-4 h-4"
              onClick={async () => {
                if (syncingProfile) return;
                try {
                  setSyncingProfile(true);
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
                } finally {
                  setSyncingProfile(false);
                }
              }}
              className="px-4 py-2 rounded-xl text-sm font-bold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-400/15 dark:text-indigo-200 dark:hover:bg-indigo-400/20 transition"
            >
              {labels.profile?.importButton || 'Import social profile'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="auto"
              onClick={() => navigate('/profile')}
              className="px-4 py-2 rounded-xl text-sm font-bold bg-muted text-muted-foreground hover:bg-muted transition"
            >
              {labels.profile?.createManually || 'Create manually'}
            </Button>
          </div>
        )}
        <div className="mt-4 flex flex-wrap gap-4 justify-center md:justify-start">
          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted px-3 py-1.5 rounded-lg border border-border">
            <Calendar size={14} className="text-indigo-500 dark:text-indigo-300" />
            {labels.profile?.joined || 'Joined'} {joinedDateLabel}
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted px-3 py-1.5 rounded-lg border border-border">
            <Trophy size={14} className="text-orange-500 dark:text-orange-300" />
            {examsTaken} {labels.profile?.examsCompleted || 'exams completed'}
          </div>
        </div>
      </div>
    </div>
  );
};
