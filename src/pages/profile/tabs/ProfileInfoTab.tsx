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
      <h3 className="text-xl font-bold text-slate-900 border-b border-slate-100 pb-4 mb-6">
        {labels.profile?.accountTitle || 'Account Details'}
      </h3>
      <div className="grid gap-6">
        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
            {labels.displayName}
          </label>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-700 font-medium">
            {displayName}
          </div>
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
            {labels.email}
          </label>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-700 font-medium">
            {user.email}
          </div>
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
            {labels.role}
          </label>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-700 font-medium flex items-center justify-between">
            {user.role}
            <span className="text-xs bg-slate-200 px-2 py-1 rounded text-slate-600">
              ID: {userIdDisplay}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
