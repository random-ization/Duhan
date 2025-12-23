import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { Prisma } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { AuthRequest } from '../middleware/auth.middleware';
import { RegisterSchema, RegisterInput, LoginSchema, LoginInput } from '../schemas/validation';
import { sendVerificationEmail, sendPasswordResetEmail } from '../lib/email';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key-change-in-prod';

// Constants
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const RESET_TOKEN_EXPIRY_HOURS = 1;
const VERIFICATION_TOKEN_EXPIRY_MINUTES = 10;

// Valid tier values
const VALID_TIERS = ['FREE', 'PAID'] as const;
type ValidTier = typeof VALID_TIERS[number];

// Type for User with all relations loaded
type UserWithRelations = Prisma.UserGetPayload<{
  include: {
    savedWords: true;
    mistakes: true;
    annotations: true;
    examHistory: true;
    learningActivities: true;
  };
}>;

// Type for learning activity
type LearningActivity = Prisma.LearningActivityGetPayload<{}>;

// Helper to generate random token
const generateToken = (): string => crypto.randomBytes(32).toString('hex');

// Helper to calculate day streak (now properly typed)
const calculateDayStreak = (activities: LearningActivity[]): number => {
  if (!activities || activities.length === 0) return 0;

  // Get unique dates, sorted descending
  const uniqueDates = [...new Set(activities.map(a => new Date(a.date).toDateString()))].sort(
    (a, b) => new Date(b).getTime() - new Date(a).getTime()
  );

  if (uniqueDates.length === 0) return 0;

  // Check if today or yesterday has activity
  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - MS_PER_DAY).toDateString();

  if (uniqueDates[0] !== today && uniqueDates[0] !== yesterday) {
    return 0; // Streak broken
  }

  let streak = 1; // Start with 1 since we have at least one day

  // Check consecutive days going backwards
  for (let i = 1; i < uniqueDates.length; i++) {
    const currentDateMs = new Date(uniqueDates[i - 1]).getTime();
    const prevDateMs = new Date(uniqueDates[i]).getTime();
    const daysDiff = Math.floor((currentDateMs - prevDateMs) / MS_PER_DAY);

    if (daysDiff === 1) {
      // Consecutive day found
      streak++;
    } else {
      // Streak broken
      break;
    }
  }

  return streak;
};

// Helper to format user for frontend (now properly typed)
const formatUser = (user: UserWithRelations) => {
  const formattedHistory = user.examHistory.map((h) => ({
    ...h,
    timestamp: h.timestamp.getTime(),
    // userAnswers is already an object (Json type in Prisma)
  }));

  // Calculate real statistics from learning activities
  const activities = user.learningActivities || [];

  // Calculate listening hours
  const listeningActivities = activities.filter((a) => a.activityType === 'LISTENING');
  const totalListeningMinutes = listeningActivities.reduce(
    (sum, a) => sum + (a.duration || 0),
    0
  );
  const listeningHours = parseFloat((totalListeningMinutes / 60).toFixed(1));

  // Calculate readings completed
  const readingActivities = activities.filter((a) => a.activityType === 'READING');
  const readingsCompleted = readingActivities.length;

  // Calculate day streak
  const dayStreak = calculateDayStreak(activities);

  // Create activity log for last 365 days
  const activityLog: boolean[] = [];
  const now = Date.now();
  for (let i = 364; i >= 0; i--) {
    const date = new Date(now - i * MS_PER_DAY).toDateString();
    const hasActivity = activities.some((a) => new Date(a.date).toDateString() === date);
    activityLog.push(hasActivity);
  }

  // Validate tier - fallback to FREE if invalid
  const validTier: ValidTier = (VALID_TIERS as readonly string[]).includes(user.tier)
    ? (user.tier as ValidTier)
    : 'FREE';

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    avatar: user.avatar ?? undefined, // Convert null to undefined for frontend
    tier: validTier,
    role: user.role as 'STUDENT' | 'ADMIN',
    joinDate: user.createdAt.getTime(),
    lastActive: Date.now(),
    savedWords: user.savedWords,
    mistakes: user.mistakes.map((m) => ({
      id: m.id,
      korean: m.korean,
      english: m.english,
      createdAt: m.createdAt.getTime(),
    })),
    annotations: user.annotations.map((a) => ({
      id: a.id,
      contextKey: a.contextKey,
      startOffset: a.startOffset ?? undefined,
      endOffset: a.endOffset ?? undefined,
      sentenceIndex: a.sentenceIndex ?? undefined,
      text: a.text,
      color: a.color as 'yellow' | 'green' | 'blue' | 'pink' | null,
      note: a.note ?? '',
      timestamp: a.createdAt.getTime(),
      // Canvas annotation fields
      targetType: a.targetType ?? undefined,
      targetId: a.targetId ?? undefined,
      pageIndex: a.pageIndex ?? undefined,
      data: a.data ?? undefined,
      visibility: a.visibility ?? undefined,
    })),
    examHistory: formattedHistory,
    statistics: {
      wordsLearned: user.savedWords.length,
      readingsCompleted,
      listeningHours,
      dayStreak,
      activityLog,
    },
    // Learning progress
    lastInstitute: user.lastInstitute ?? undefined,
    lastLevel: user.lastLevel ?? undefined,
    lastUnit: user.lastUnit ?? undefined,
    lastModule: user.lastModule ?? undefined,
    // Subscription details
    subscriptionType: user.subscriptionType ?? undefined,
    subscriptionExpiry: user.subscriptionExpiry?.getTime(),
  };
};

export const register = async (req: Request, res: Response) => {
  try {
    // Validate input
    const validatedData: RegisterInput = RegisterSchema.parse(req.body);
    const { email, password, name } = validatedData;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const verificationToken = generateToken();
    const verificationTokenExpiry = new Date(Date.now() + VERIFICATION_TOKEN_EXPIRY_MINUTES * 60 * 1000);

    await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role: 'STUDENT',
        tier: 'FREE',
        isVerified: false,
        verificationToken,
        verificationTokenExpiry,
      },
    });

    // Send verification email
    try {
      await sendVerificationEmail(email, verificationToken);
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError);
      // Don't fail registration if email fails - user can request resend
    }

    res.json({
      message: 'Registration successful. Please check your email to verify your account.',
    });
  } catch (error: any) {
    console.error('Register Error:', error);
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    res.status(500).json({ error: 'Registration failed' });
  }
};

export const verifyEmail = async (req: Request, res: Response) => {
  try {
    const { token } = req.query;

    if (!token || typeof token !== 'string') {
      return res.status(400).json({ error: 'Invalid verification token' });
    }

    const user = await prisma.user.findUnique({
      where: { verificationToken: token },
    });

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired verification token' });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        isVerified: true,
        verificationToken: null,
      },
    });

    res.json({ message: 'Email verified successfully. You can now log in.' });
  } catch (error) {
    console.error('Verify Email Error:', error);
    res.status(500).json({ error: 'Email verification failed' });
  }
};

export const resendVerificationEmail = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const user = await prisma.user.findUnique({ where: { email } });

    // Don't reveal if user exists or not (security best practice)
    if (!user) {
      return res.json({ message: 'If an account with that email exists and is not verified, we sent a verification link.' });
    }

    // If already verified, no need to resend
    if (user.isVerified) {
      return res.json({ message: 'If an account with that email exists and is not verified, we sent a verification link.' });
    }

    let tokenToSend = user.verificationToken;

    // Check if existing token is still valid (within 10 minutes)
    const tokenStillValid = user.verificationTokenExpiry && user.verificationTokenExpiry > new Date();

    if (!tokenStillValid || !tokenToSend) {
      // Token expired or doesn't exist, generate new one
      tokenToSend = generateToken();
      const verificationTokenExpiry = new Date(Date.now() + VERIFICATION_TOKEN_EXPIRY_MINUTES * 60 * 1000);

      await prisma.user.update({
        where: { id: user.id },
        data: {
          verificationToken: tokenToSend,
          verificationTokenExpiry,
        },
      });
    }
    // If token is still valid, we reuse the same token (don't update database)

    // Send verification email
    try {
      await sendVerificationEmail(email, tokenToSend);
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError);
      return res.status(500).json({ error: 'Failed to send verification email. Please try again later.' });
    }

    res.json({ message: 'If an account with that email exists and is not verified, we sent a verification link.' });
  } catch (error) {
    console.error('Resend Verification Email Error:', error);
    res.status(500).json({ error: 'Failed to resend verification email' });
  }
};

export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const user = await prisma.user.findUnique({ where: { email } });

    // Don't reveal if user exists or not (security best practice)
    if (!user) {
      return res.json({ message: 'If an account with that email exists, we sent a password reset link.' });
    }

    const resetToken = generateToken();
    const resetTokenExpiry = new Date(Date.now() + RESET_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken,
        resetTokenExpiry,
      },
    });

    try {
      await sendPasswordResetEmail(email, resetToken);
    } catch (emailError) {
      console.error('Failed to send password reset email:', emailError);
    }

    res.json({ message: 'If an account with that email exists, we sent a password reset link.' });
  } catch (error) {
    console.error('Forgot Password Error:', error);
    res.status(500).json({ error: 'Failed to process password reset request' });
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Token and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const user = await prisma.user.findUnique({
      where: { resetToken: token },
    });

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    if (!user.resetTokenExpiry || user.resetTokenExpiry < new Date()) {
      return res.status(400).json({ error: 'Reset token has expired' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null,
      },
    });

    res.json({ message: 'Password reset successfully. You can now log in with your new password.' });
  } catch (error) {
    console.error('Reset Password Error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    // Validate input
    const validatedData: LoginInput = LoginSchema.parse(req.body);
    const { email, password } = validatedData;

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        savedWords: true,
        mistakes: true,
        annotations: true,
        examHistory: true,
        learningActivities: {
          orderBy: { date: 'desc' },
          take: 365, // Last year of activity
        },
      },
    });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check if email is verified
    if (!user.isVerified) {
      return res.status(403).json({
        error: 'Please verify your email before logging in.',
        code: 'EMAIL_NOT_VERIFIED'
      });
    }

    const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });

    res.json({ token, user: formatUser(user) });
  } catch (error: any) {
    console.error('Login Error:', error);
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    res.status(500).json({ error: 'Login failed' });
  }
};

export const getMe = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        savedWords: true,
        mistakes: true,
        annotations: true,
        examHistory: true,
        learningActivities: {
          orderBy: { date: 'desc' },
          take: 365, // Last year of activity
        },
      },
    });

    if (!user) return res.status(404).json({ error: 'User not found' });

    res.json({ user: formatUser(user) });
  } catch (error) {
    console.error('GetMe Error:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
};

// Google OAuth Login
import { exchangeCodeForUserInfo, verifyIdToken } from '../lib/google-auth';

export const googleLogin = async (req: Request, res: Response) => {
  try {
    const { code, redirectUri, idToken } = req.body;

    let googleUser;

    if (idToken) {
      // Client already has ID token (e.g., from Google Sign-In button SDK)
      googleUser = await verifyIdToken(idToken);
    } else if (code && redirectUri) {
      // Exchange authorization code for tokens
      googleUser = await exchangeCodeForUserInfo(code, redirectUri);
    } else {
      return res.status(400).json({ error: 'Either code+redirectUri or idToken is required' });
    }

    // Try to find user by Google ID first
    let user = await prisma.user.findUnique({
      where: { googleId: googleUser.googleId },
      include: {
        savedWords: true,
        mistakes: true,
        annotations: true,
        examHistory: true,
        learningActivities: {
          orderBy: { date: 'desc' },
          take: 365,
        },
      },
    });

    if (!user) {
      // Try to find by email (for linking existing accounts)
      const existingUser = await prisma.user.findUnique({
        where: { email: googleUser.email },
      });

      if (existingUser) {
        // Link Google account to existing user
        user = await prisma.user.update({
          where: { id: existingUser.id },
          data: {
            googleId: googleUser.googleId,
            isVerified: true, // Google email is verified
            avatar: existingUser.avatar || googleUser.avatar, // Keep existing avatar or use Google's
          },
          include: {
            savedWords: true,
            mistakes: true,
            annotations: true,
            examHistory: true,
            learningActivities: {
              orderBy: { date: 'desc' },
              take: 365,
            },
          },
        });
      } else {
        // Create new user
        user = await prisma.user.create({
          data: {
            email: googleUser.email,
            name: googleUser.name,
            password: '', // No password for OAuth users
            googleId: googleUser.googleId,
            avatar: googleUser.avatar,
            role: 'STUDENT',
            tier: 'FREE',
            isVerified: true, // Google accounts are pre-verified
          },
          include: {
            savedWords: true,
            mistakes: true,
            annotations: true,
            examHistory: true,
            learningActivities: {
              orderBy: { date: 'desc' },
              take: 365,
            },
          },
        });
      }
    }

    // Generate JWT
    const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });

    res.json({ token, user: formatUser(user) });
  } catch (error: any) {
    console.error('Google Login Error:', error);
    res.status(500).json({ error: error.message || 'Google login failed' });
  }
};

