export type ProfileLabels = {
  displayName?: string;
  email?: string;
  role?: string;
  accountTitle?: string;
  changePassword?: string;
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
  forgotPassword?: string;
  forgotPasswordProfileDescription?: string;
  resetPasswordViaEmail?: string;
  dayStreak?: string;
  wordsLearned?: string;
  examsTaken?: string;
  averageScore?: string;
  profile?: {
    premiumBadge?: string;
    importButton?: string;
    importSuccess?: string;
    importUnavailable?: string;
    importFailed?: string;
    createManually?: string;
    joined?: string;
    examsCompleted?: string;
    settingsTitle?: string;
    displayLanguage?: string;
    languageDesc?: string;
    recentActivity?: string;
    noActivity?: string;
    updatePassword?: string;
    connectFailed?: string;
    unlinkSuccess?: string;
    keepOneLoginMethod?: string;
    unlinkFailed?: string;
    achievementGallery?: string;
    accountTitle?: string;
  };
  auth?: {
    social?: {
      google?: string;
      kakao?: string;
    };
  };
};

export type SocialSignInOptions = {
  redirectTo?: string;
};
