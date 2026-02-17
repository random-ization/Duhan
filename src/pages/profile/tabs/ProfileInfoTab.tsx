import React from 'react';
import type { User } from '../../../types';

export const ProfileInfoTab: React.FC<{
  labels: Record<string, any>;
  user: User;
  displayName: string;
  userIdDisplay: string;
}> = ({ labels, user, displayName, userIdDisplay }) => {
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
            {displayName}
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
      </div>
    </div>
  );
};
