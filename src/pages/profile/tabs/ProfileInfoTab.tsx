import React, { useEffect, useState } from 'react';
import { Check, Crown, Pencil } from 'lucide-react';
import { Button } from '../../../components/ui';
import { Input } from '../../../components/ui';
import type { User } from '../../../types';
import type { ProfileLabels } from '../types';

export const ProfileInfoTab: React.FC<{
  labels: ProfileLabels;
  user: User;
  displayName: string;
  userIdDisplay: string;
  isPremium?: boolean;
  onNameUpdate?: (nextName: string) => Promise<void>;
}> = ({ labels, user, displayName, userIdDisplay, isPremium = false, onNameUpdate }) => {
  const [isEditingName, setIsEditingName] = useState(false);
  const [isSavingName, setIsSavingName] = useState(false);
  const [draftName, setDraftName] = useState(displayName);

  useEffect(() => {
    setDraftName(displayName);
  }, [displayName]);

  const canEditName = typeof onNameUpdate === 'function';

  const handleNameSave = async () => {
    if (!canEditName) return;
    const nextName = draftName.trim();
    if (!nextName || nextName === displayName) {
      setIsEditingName(false);
      setDraftName(displayName);
      return;
    }
    try {
      setIsSavingName(true);
      await onNameUpdate(nextName);
      setIsEditingName(false);
    } finally {
      setIsSavingName(false);
    }
  };

  return (
    <div className="max-w-xl space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <h3 className="text-xl font-bold text-foreground border-b border-border pb-4 mb-6">
        {labels.profile?.accountTitle || 'Account Details'}
      </h3>
      <div className="grid gap-6">
        <div>
          <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
            {labels.displayName}
          </label>
          <div className="p-3 bg-muted rounded-xl border border-border text-muted-foreground font-medium">
            {isEditingName ? (
              <div className="flex items-center gap-2">
                <Input
                  value={draftName}
                  onChange={e => setDraftName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && void handleNameSave()}
                  className="h-9"
                  autoFocus
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="auto"
                  onClick={() => void handleNameSave()}
                  disabled={isSavingName}
                  className="h-9 w-9 rounded-lg"
                >
                  <Check className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-2">
                <span>{displayName}</span>
                {canEditName && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="auto"
                    onClick={() => setIsEditingName(true)}
                    className="h-8 w-8 rounded-lg"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
        <div>
          <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
            {labels.email}
          </label>
          <div className="p-3 bg-muted rounded-xl border border-border text-muted-foreground font-medium">
            {user.email}
          </div>
        </div>
        <div>
          <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
            {labels.role}
          </label>
          <div className="p-3 bg-muted rounded-xl border border-border text-muted-foreground font-medium flex items-center justify-between">
            {user.role}
            <span className="text-xs bg-muted px-2 py-1 rounded text-muted-foreground">
              ID: {userIdDisplay}
            </span>
          </div>
        </div>
        {isPremium && (
          <div>
            <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
              {labels.profile?.premiumBadge || 'Membership'}
            </label>
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-700 font-semibold flex items-center gap-2 dark:bg-amber-400/12 dark:border-amber-400/20 dark:text-amber-200">
              <Crown className="h-4 w-4" />
              {labels.profile?.premiumBadge || 'Premium'}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
