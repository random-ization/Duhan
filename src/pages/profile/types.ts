type LooseStringMap = Record<string, string | undefined>;

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
  profileUpdated?: string;
  avatarUpdated?: string;
  passwordUpdated?: string;
  weakPassword?: string;
  passwordMismatch?: string;
  wrongPassword?: string;
  common?: {
    signOut?: string;
  };
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
    unnamed?: string;
    updateNameFailed?: string;
    uploadImageError?: string;
    imageTooLarge?: string;
    uploadAvatarFailed?: string;
    changePasswordFailed?: string;
    link?: {
      connect?: string;
      unlink?: string;
      linked?: string;
      notLinked?: string;
      sectionTitle?: string;
    };
    dashboard?: LooseStringMap & {
      title?: string;
      subtitle?: string;
      overviewTab?: string;
    };
    accountHub?: LooseStringMap & {
      title?: string;
      subtitle?: string;
      tabLabel?: string;
    };
    learningHub?: LooseStringMap & {
      title?: string;
      subtitle?: string;
      tabLabel?: string;
    };
    activityHub?: LooseStringMap & {
      title?: string;
      subtitle?: string;
      tabLabel?: string;
    };
    settingsCenter?: LooseStringMap & {
      title?: string;
      subtitle?: string;
      tabLabel?: string;
      loading?: string;
      appSectionTitle?: string;
      appSectionDescription?: string;
      reviewSectionTitle?: string;
      reviewSectionDescription?: string;
      flashcardAutoPlayDescription?: string;
      flashcardKoreanFirstTitle?: string;
      flashcardKoreanFirstDescription?: string;
      flashcardMeaningFirstTitle?: string;
      flashcardMeaningFirstDescription?: string;
      passFailModeDescription?: string;
      fourButtonsModeDescription?: string;
      audioSectionTitle?: string;
      audioSectionDescription?: string;
      playMeaningDescription?: string;
      playExampleTranslationDescription?: string;
      dictationAdvancedTitle?: string;
      dictationAutoNextDescription?: string;
      globalSyncNotice?: string;
    };
    securityHub?: LooseStringMap & {
      title?: string;
      subtitle?: string;
      tabLabel?: string;
    };
  };
  vocab?: {
    autoPlay?: string;
    cardFront?: string;
    koreanFront?: string;
    meaningFront?: string;
    ratingMode?: string;
    passFail?: string;
    fourButtons?: string;
    passFailDesc?: string;
    fourButtonsDesc?: string;
    playMeaning?: string;
    playExampleTranslation?: string;
    repeatCount?: string;
    speed?: string;
    playGap?: string;
    autoNext?: string;
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
