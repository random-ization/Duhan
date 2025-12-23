import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Language, SubscriptionType } from '../types';
import { getLabels } from '../utils/i18n';
import { useApp } from '../contexts/AppContext';
import { api } from '../services/api';
import { useToast } from '../hooks/useToast';
import { ToastContainer } from '../components/common/Toast';
import { Button } from '../components/common/Button';
import { Loading } from '../components/common/Loading';
import {
  User as UserIcon, Camera, Lock, BarChart3, Calendar,
  Trophy, TrendingUp, Activity, CheckCircle, XCircle, Crown, Clock, Mail
} from 'lucide-react';

interface ProfileProps {
  language: Language;
}

const Profile: React.FC<ProfileProps> = ({ language }) => {
  const { user, updateUser } = useApp();
  const labels = getLabels(language);
  const { toasts, success, error, removeToast } = useToast();

  const [activeTab, setActiveTab] = useState<'info' | 'security' | 'stats'>('info');
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState(user?.name || '');
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!user) return <Loading fullScreen size="lg" />;

  const handleNameUpdate = async () => {
    if (!newName.trim() || newName === user.name) {
      setIsEditingName(false);
      return;
    }
    try {
      await api.updateProfile({ name: newName });
      updateUser({ name: newName });
      success(labels.profileUpdated);
      setIsEditingName(false);
    } catch (err) {
      error('Failed to update name');
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      error('Please upload an image file');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      error('Image size must be less than 5MB');
      return;
    }
    setIsUploadingAvatar(true);
    try {
      const result = await api.uploadAvatar(file);
      updateUser({ avatar: result.url });
      success(labels.avatarUpdated);
    } catch (err) {
      error('Failed to upload avatar');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) { error(labels.weakPassword); return; }
    if (newPassword !== confirmPassword) { error(labels.passwordMismatch); return; }
    setIsChangingPassword(true);
    try {
      await api.changePassword({ currentPassword, newPassword });
      success(labels.passwordUpdated);
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
    } catch (err: any) {
      if (err.message.includes('incorrect') || err.message.includes('wrong')) {
        error(labels.wrongPassword);
      } else {
        error('Failed to change password');
      }
    } finally {
      setIsChangingPassword(false);
    }
  };

  const examsTaken = user.examHistory?.length || 0;
  const averageScore = examsTaken > 0
    ? Math.round((user.examHistory || []).reduce((sum, exam) => sum + (exam.score / exam.maxScore) * 100, 0) / examsTaken)
    : 0;

  // Custom Tab Button Component
  const TabButton = ({ id, icon: Icon, label }: { id: typeof activeTab, icon: any, label: string }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`flex items-center gap-2 px-6 py-3 rounded-full font-bold text-sm transition-all ${activeTab === id
        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200'
        : 'bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-900 border border-transparent hover:border-slate-200'
        }`}
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  );

  return (
    <div className="max-w-[1000px] mx-auto pb-20">
      <ToastContainer toasts={toasts} onClose={removeToast} />

      {/* Header Profile Card */}
      <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm mb-8 flex flex-col md:flex-row items-center gap-8">
        <div className="relative group">
          <div className="w-32 h-32 rounded-full p-1 bg-gradient-to-br from-indigo-500 to-purple-600">
            <div className="w-full h-full rounded-full bg-white p-1 overflow-hidden relative">
              {isUploadingAvatar ? <Loading size="md" /> : user.avatar ? <img src={user.avatar} alt={user.name} className="w-full h-full object-cover rounded-full" /> : <div className="w-full h-full bg-slate-100 flex items-center justify-center text-slate-400"><UserIcon size={48} /></div>}
            </div>
          </div>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="absolute bottom-0 right-0 bg-slate-900 text-white p-2.5 rounded-full shadow-lg hover:scale-110 transition-transform cursor-pointer"
          >
            <Camera size={16} />
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
        </div>

        <div className="text-center md:text-left flex-1">
          <div className="flex flex-col md:flex-row items-center gap-3 mb-2">
            {isEditingName ? (
              <div className="flex items-center gap-2">
                <input type="text" value={newName} onChange={e => setNewName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleNameUpdate()} className="border-b-2 border-indigo-500 text-2xl font-bold text-slate-900 outline-none bg-transparent w-40" autoFocus />
                <button onClick={handleNameUpdate}><CheckCircle size={20} className="text-green-500" /></button>
                <button onClick={() => setIsEditingName(false)}><XCircle size={20} className="text-red-500" /></button>
              </div>
            ) : (
              <h1 className="text-3xl font-extrabold text-slate-900">{user.name}</h1>
            )}
            {!isEditingName && (
              <button onClick={() => setIsEditingName(true)} className="text-slate-400 hover:text-indigo-600 transition-colors"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg></button>
            )}
            {user.tier === 'PAID' && <span className="px-3 py-1 bg-amber-100 text-amber-700 text-xs font-bold rounded-full flex items-center gap-1"><Crown size={12} className="fill-current" /> Premium</span>}
          </div>
          <p className="text-slate-500 font-medium">{user.email}</p>
          <div className="mt-4 flex flex-wrap gap-4 justify-center md:justify-start">
            <div className="flex items-center gap-2 text-sm text-slate-600 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
              <Calendar size={14} className="text-indigo-500" />
              Joined {new Date(user.createdAt).toLocaleDateString()}
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-600 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
              <Trophy size={14} className="text-orange-500" />
              {examsTaken} exams completed
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex justify-center md:justify-start gap-4 mb-8 overflow-x-auto pb-2">
        <TabButton id="info" icon={UserIcon} label={labels.personalInfo} />
        <TabButton id="stats" icon={BarChart3} label={labels.learningStats} />
        <TabButton id="security" icon={Lock} label={labels.securitySettings} />
      </div>

      {/* Content Area */}
      <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm min-h-[400px]">
        {activeTab === 'info' && (
          <div className="max-w-xl space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h3 className="text-xl font-bold text-slate-900 border-b border-slate-100 pb-4 mb-6">Account Details</h3>
            <div className="grid gap-6">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{labels.displayName}</label>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-700 font-medium">{user.name}</div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{labels.email}</label>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-700 font-medium">{user.email}</div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{labels.role}</label>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-700 font-medium flex items-center justify-between">
                  {user.role}
                  <span className="text-xs bg-slate-200 px-2 py-1 rounded text-slate-600">ID: {user.id.slice(0, 8)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'security' && (
          <div className="max-w-xl space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h3 className="text-xl font-bold text-slate-900 border-b border-slate-100 pb-4 mb-6">{labels.changePassword}</h3>
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{labels.currentPassword}</label>
                <input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} className="w-full p-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all" required />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{labels.newPassword}</label>
                <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full p-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all" required />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{labels.confirmPassword}</label>
                <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="w-full p-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all" required />
              </div>
              <div className="pt-4">
                <Button type="submit" variant="primary" loading={isChangingPassword} disabled={!currentPassword || !newPassword || !confirmPassword}>
                  Update Password
                </Button>
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
                    <h4 className="font-bold text-slate-800 mb-1">{labels.forgotPassword || 'Forgot your password?'}</h4>
                    <p className="text-sm text-slate-500 mb-3">
                      {labels.forgotPasswordProfileDescription || "If you've forgotten your current password, you can reset it via email verification."}
                    </p>
                    <Link
                      to="/forgot-password"
                      className="inline-flex items-center gap-2 text-indigo-600 font-semibold text-sm hover:text-indigo-700 transition-colors"
                    >
                      {labels.resetPasswordViaEmail || 'Reset password via email'}
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M5 12h14M12 5l7 7-7 7" />
                      </svg>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'stats' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              {[
                { label: labels.dayStreak, value: user.statistics?.dayStreak || 0, color: 'text-orange-500', bg: 'bg-orange-50' },
                { label: labels.wordsLearned, value: (user.savedWords || []).length, color: 'text-emerald-500', bg: 'bg-emerald-50' },
                { label: labels.examsTaken, value: examsTaken, color: 'text-purple-500', bg: 'bg-purple-50' },
                { label: labels.averageScore, value: `${averageScore}%`, color: 'text-blue-500', bg: 'bg-blue-50' }
              ].map((stat, i) => (
                <div key={i} className={`p-4 rounded-2xl ${stat.bg} border border-transparent`}>
                  <div className={`text-2xl font-black ${stat.color} mb-1`}>{stat.value}</div>
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">{stat.label}</div>
                </div>
              ))}
            </div>

            <h3 className="text-lg font-bold text-slate-800 mb-4">{labels.recentActivity}</h3>
            <div className="space-y-3">
              {user.examHistory?.length === 0 ? (
                <div className="text-center py-12 bg-slate-50 rounded-2xl border border-slate-100 border-dashed text-slate-400">
                  No activity yet. Start a test to see your progress!
                </div>
              ) : (
                user.examHistory?.slice(0, 5).map((exam, i) => (
                  <div key={i} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <div>
                      <div className="font-bold text-slate-800">{exam.examTitle}</div>
                      <div className="text-xs text-slate-500">{new Date(exam.timestamp).toLocaleDateString()}</div>
                    </div>
                    <div className="text-right">
                      <div className={`font-bold text-lg ${(exam.score / exam.maxScore) >= 0.6 ? 'text-green-600' : 'text-slate-600'}`}>
                        {Math.round((exam.score / exam.maxScore) * 100)}%
                      </div>
                      <div className="text-xs text-slate-400">{exam.score}/{exam.maxScore}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;
