import React from 'react';
import { useMutation } from 'convex/react';
import { useAuth } from '../../contexts/AuthContext';
import { mRef, NoArgs } from '../../utils/convexRefs';
import { useLocalizedNavigate } from '../../hooks/useLocalizedNavigate';
import { getLabels } from '../../utils/i18n';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';

const PROFILE_PROMPT_DISMISS_KEY = 'profile_setup_prompt_dismissed';

interface ProfileSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ProfileSetupModal({ isOpen, onClose }: Readonly<ProfileSetupModalProps>) {
  const { language } = useAuth();
  const labels = getLabels(language);
  const navigate = useLocalizedNavigate();
  const syncProfileFromIdentityMutation = useMutation(
    mRef<NoArgs, { updated: boolean }>('auth:syncProfileFromIdentity')
  );

  if (!isOpen) return null;

  const dismiss = () => {
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem(PROFILE_PROMPT_DISMISS_KEY, '1');
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4">
      <Card className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white shadow-xl">
        <CardContent className="p-6 sm:p-8">
          <h2 className="text-xl font-black text-slate-900 sm:text-2xl">
            {labels.profileSetupPrompt?.title || 'Complete your profile'}
          </h2>
          <p className="mt-2 text-sm text-slate-600 sm:text-base">
            {labels.profileSetupPrompt?.description ||
              'Import your current login profile (name/avatar) or create your own.'}
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Button
              type="button"
              variant="ghost"
              size="auto"
              onClick={async () => {
                try {
                  await syncProfileFromIdentityMutation();
                } finally {
                  dismiss();
                }
              }}
              className="flex-1 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 px-5 py-3 font-bold text-white transition hover:opacity-95 active:opacity-90"
            >
              {labels.profileSetupPrompt?.useSocial || 'Use social profile'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="auto"
              onClick={() => {
                dismiss();
                navigate('/profile');
              }}
              className="flex-1 rounded-2xl bg-slate-100 px-5 py-3 font-bold text-slate-900 transition hover:bg-slate-200 active:bg-slate-300"
            >
              {labels.profileSetupPrompt?.createMyself || 'Create myself'}
            </Button>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="auto"
            onClick={dismiss}
            className="mt-4 w-full text-sm font-bold text-slate-500 transition hover:text-slate-700"
          >
            {labels.profileSetupPrompt?.maybeLater || 'Maybe later'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
