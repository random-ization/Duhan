import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { AuthRequest } from '../middleware/auth.middleware';
import { RegisterSchema, RegisterInput, LoginSchema, LoginInput } from '../schemas/validation';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key-change-in-prod';

// Constants
const MS_PER_DAY = 24 * 60 * 60 * 1000;

// Helper to calculate day streak
const calculateDayStreak = (activities: any[]): number => {
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

// Helper to format user for frontend
const formatUser = (user: any) => {
  const formattedHistory = user.examHistory.map((h: any) => ({
    ...h,
    timestamp: h.timestamp.getTime(),
    // userAnswers is already an object (Json type in Prisma)
  }));

  // Calculate real statistics from learning activities
  const activities = user.learningActivities || [];

  // Calculate listening hours
  const listeningActivities = activities.filter((a: any) => a.activityType === 'LISTENING');
  const totalListeningMinutes = listeningActivities.reduce(
    (sum: number, a: any) => sum + (a.duration || 0),
    0
  );
  const listeningHours = parseFloat((totalListeningMinutes / 60).toFixed(1));

  // Calculate readings completed
  const readingActivities = activities.filter((a: any) => a.activityType === 'READING');
  const readingsCompleted = readingActivities.length;

  // Calculate day streak
  const dayStreak = calculateDayStreak(activities);

  // Create activity log for last 365 days
  const activityLog: boolean[] = [];
  const now = Date.now();
  for (let i = 364; i >= 0; i--) {
    const date = new Date(now - i * MS_PER_DAY).toDateString();
    const hasActivity = activities.some((a: any) => new Date(a.date).toDateString() === date);
    activityLog.push(hasActivity);
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    avatar: user.avatar,
    tier: user.tier,
    role: user.role,
    joinDate: user.createdAt.getTime(),
    lastActive: Date.now(),
    savedWords: user.savedWords,
    mistakes: user.mistakes,
    annotations: user.annotations.map((a: any) => ({
      ...a,
      timestamp: a.createdAt.getTime(),
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
    lastInstitute: user.lastInstitute,
    lastLevel: user.lastLevel,
    lastUnit: user.lastUnit,
    lastModule: user.lastModule,
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

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role: 'STUDENT',
        tier: 'FREE',
      },
    });

    const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });

    // For register, we return a basic user structure since relations are empty
    res.json({
      token,
      user: {
        ...user,
        password: undefined,
        savedWords: [],
        mistakes: [],
        annotations: [],
        examHistory: [],
      },
    });
  } catch (error: any) {
    console.error('Register Error:', error);
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    res.status(500).json({ error: 'Registration failed' });
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
