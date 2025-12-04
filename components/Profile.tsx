import React, { useState, useRef } from 'react';
import { Language, ExamAttempt } from '../types';
import { getLabels } from '../utils/i18n';
import { useApp } from '../contexts/AppContext';
import { api } from '../services/api';
import { useToast } from '../hooks/useToast';
import { ToastContainer } from './common/Toast';
import { Button } from './common/Button';
import { Loading } from './common/Loading';
import {
  User as UserIcon,
  Camera,
  Lock,
  BarChart3,
  Calendar,
  Trophy,
  TrendingUp,
  Activity,
  CheckCircle,
  XCircle,
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

    // Validate file type
    if (!file.type.startsWith('image/')) {
      error('Please upload an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      error('Image size must be less than 5MB');
      return;
    }

    setIsUploadingAvatar(true);
    try {
      const result = await api.uploadAvatar(file);
      updateUser({ avatar: result.avatarUrl });
      success(labels.avatarUpdated);
    } catch (err) {
      error('Failed to upload avatar');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (newPassword.length < 6) {
      error(labels.weakPassword);
      return;
    }

    if (newPassword !== confirmPassword) {
      error(labels.passwordMismatch);
      return;
    }

    setIsChangingPassword(true);
    try {
      await api.changePassword(currentPassword, newPassword);
      success(labels.passwordUpdated);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
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

  // Calculate statistics
  const totalWords = user.savedWords.length;
  const examsTaken = user.examHistory?.length || 0;
  const averageScore =
    examsTaken > 0
      ? Math.round(
          user.examHistory.reduce((sum, exam) => sum + (exam.score / exam.maxScore) * 100, 0) /
            examsTaken
        )
      : 0;

  const daysSinceJoin = Math.floor((Date.now() - user.joinDate) / (1000 * 60 * 60 * 24));

  // Get recent exam history (last 5)
  const recentExams = [...(user.examHistory || [])].sort((a, b) => b.timestamp - a.timestamp).slice(0, 5);

  return (
    <div className="max-w-6xl mx-auto">
      <ToastContainer toasts={toasts} onClose={removeToast} />

      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-8 mb-6 text-white">
        <div className="flex items-center gap-6">
          {/* Avatar */}
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-white/20 flex items-center justify-center overflow-hidden">
              {isUploadingAvatar ? (
                <Loading size="md" />
              ) : user.avatar ? (
                <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
              ) : (
                <UserIcon size={48} />
              )}
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploadingAvatar}
              className="absolute bottom-0 right-0 bg-white text-indigo-600 p-2 rounded-full shadow-lg hover:bg-indigo-50 transition-colors disabled:opacity-50"
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

          {/* User Info */}
          <div className="flex-1">
            {isEditingName ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleNameUpdate()}
                  className="bg-white/20 border border-white/30 rounded-lg px-4 py-2 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/50"
                  autoFocus
                />
                <Button variant="ghost" size="sm" onClick={handleNameUpdate}>
                  <CheckCircle size={20} />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setIsEditingName(false)}>
                  <XCircle size={20} />
                </Button>
              </div>
            ) : (
              <h1 className="text-3xl font-bold mb-1 flex items-center gap-2">
                {user.name}
                <button
                  onClick={() => setIsEditingName(true)}
                  className="text-white/70 hover:text-white transition-colors"
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </button>
              </h1>
            )}
            <p className="text-white/80">{user.email}</p>
            <div className="flex items-center gap-4 mt-2 text-sm">
              <span className="flex items-center gap-1">
                <Calendar size={16} />
                {labels.joinedDate}: {new Date(user.joinDate).toLocaleDateString()}
              </span>
              <span className="px-2 py-1 bg-white/20 rounded-full">
                {user.tier === 'PAID' ? labels.premium : labels.free}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 mb-6">
        <div className="flex border-b border-slate-200">
          <button
            onClick={() => setActiveTab('info')}
            className={`flex-1 px-6 py-4 font-medium transition-colors ${
              activeTab === 'info'
                ? 'text-indigo-600 border-b-2 border-indigo-600'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <UserIcon size={20} />
              {labels.personalInfo}
            </div>
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`flex-1 px-6 py-4 font-medium transition-colors ${
              activeTab === 'security'
                ? 'text-indigo-600 border-b-2 border-indigo-600'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Lock size={20} />
              {labels.securitySettings}
            </div>
          </button>
          <button
            onClick={() => setActiveTab('stats')}
            className={`flex-1 px-6 py-4 font-medium transition-colors ${
              activeTab === 'stats'
                ? 'text-indigo-600 border-b-2 border-indigo-600'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <BarChart3 size={20} />
              {labels.learningStats}
            </div>
          </button>
        </div>

        <div className="p-6">
          {/* Personal Info Tab */}
          {activeTab === 'info' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  {labels.displayName}
                </label>
                <input
                  type="text"
                  value={user.name}
                  disabled
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-slate-50 text-slate-500"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Click the edit icon next to your name in the header to change it
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  {labels.email}
                </label>
                <input
                  type="email"
                  value={user.email}
                  disabled
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-slate-50 text-slate-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  {labels.plan}
                </label>
                <div className="flex items-center gap-2">
                  <span className="px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg font-medium">
                    {user.tier === 'PAID' ? labels.premium : labels.free}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  {labels.role}
                </label>
                <span className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg inline-block">
                  {user.role}
                </span>
              </div>
            </div>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-4">
                {labels.changePassword}
              </h3>
              <form onSubmit={handlePasswordChange} className="space-y-4 max-w-md">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    {labels.currentPassword}
                  </label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    {labels.newPassword}
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    {labels.confirmPassword}
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  loading={isChangingPassword}
                  disabled={!currentPassword || !newPassword || !confirmPassword}
                >
                  {labels.changePassword}
                </Button>
              </form>
            </div>
          )}

          {/* Statistics Tab */}
          {activeTab === 'stats' && (
            <div className="space-y-6">
              {/* Quick Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-xl">
                  <div className="flex items-center gap-2 text-blue-600 mb-2">
                    <Trophy size={20} />
                    <span className="text-xs font-medium uppercase">{labels.dayStreak}</span>
                  </div>
                  <p className="text-3xl font-bold text-blue-900">
                    {user.statistics?.dayStreak || 0}
                  </p>
                  <p className="text-xs text-blue-600 mt-1">{labels.days}</p>
                </div>

                <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-xl">
                  <div className="flex items-center gap-2 text-green-600 mb-2">
                    <Activity size={20} />
                    <span className="text-xs font-medium uppercase">{labels.wordsLearned}</span>
                  </div>
                  <p className="text-3xl font-bold text-green-900">{totalWords}</p>
                  <p className="text-xs text-green-600 mt-1">{labels.wordsUnit}</p>
                </div>

                <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-xl">
                  <div className="flex items-center gap-2 text-purple-600 mb-2">
                    <BarChart3 size={20} />
                    <span className="text-xs font-medium uppercase">{labels.examsTaken}</span>
                  </div>
                  <p className="text-3xl font-bold text-purple-900">{examsTaken}</p>
                  <p className="text-xs text-purple-600 mt-1">{labels.completed}</p>
                </div>

                <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-4 rounded-xl">
                  <div className="flex items-center gap-2 text-orange-600 mb-2">
                    <TrendingUp size={20} />
                    <span className="text-xs font-medium uppercase">{labels.averageScore}</span>
                  </div>
                  <p className="text-3xl font-bold text-orange-900">{averageScore}%</p>
                  <p className="text-xs text-orange-600 mt-1">{labels.score}</p>
                </div>
              </div>

              {/* Account Info */}
              <div className="bg-slate-50 p-4 rounded-xl">
                <h3 className="text-sm font-medium text-slate-700 mb-3">
                  {labels.accountSettings}
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-slate-500">{labels.joinedDate}:</span>
                    <p className="font-medium text-slate-900">
                      {new Date(user.joinDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-500">Days Active:</span>
                    <p className="font-medium text-slate-900">{daysSinceJoin} {labels.days}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">{labels.plan}:</span>
                    <p className="font-medium text-slate-900">
                      {user.tier === 'PAID' ? labels.premium : labels.free}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-500">{labels.role}:</span>
                    <p className="font-medium text-slate-900">{user.role}</p>
                  </div>
                </div>
              </div>

              {/* Recent Exam History */}
              {recentExams.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">
                    {labels.recentActivity}
                  </h3>
                  <div className="space-y-3">
                    {recentExams.map((exam) => {
                      const percentage = Math.round((exam.score / exam.maxScore) * 100);
                      const passed = percentage >= 60;

                      return (
                        <div
                          key={exam.id}
                          className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-lg hover:shadow-md transition-shadow"
                        >
                          <div className="flex items-center gap-4">
                            <div
                              className={`p-2 rounded-lg ${
                                passed ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                              }`}
                            >
                              {passed ? <CheckCircle size={24} /> : <XCircle size={24} />}
                            </div>
                            <div>
                              <h4 className="font-medium text-slate-900">{exam.examTitle}</h4>
                              <p className="text-sm text-slate-500">
                                {new Date(exam.timestamp).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold text-slate-900">{percentage}%</p>
                            <p className="text-sm text-slate-500">
                              {exam.score} / {exam.maxScore}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {examsTaken === 0 && (
                <div className="text-center py-12">
                  <Trophy size={48} className="mx-auto text-slate-300 mb-4" />
                  <p className="text-slate-500">
                    No exam history yet. Start practicing to track your progress!
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;
