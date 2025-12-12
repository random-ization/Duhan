import { z } from 'zod';

// Auth schemas
export const RegisterSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  name: z.string().min(1, 'Name is required').max(100, 'Name is too long'),
});

export const LoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

// User data schemas
export const SaveWordSchema = z.object({
  korean: z.string().min(1, 'Korean word is required'),
  english: z.string().min(1, 'English translation is required'),
  pos: z.string().optional().nullable(),
  exampleSentence: z.string().optional(),
  exampleTranslation: z.string().optional(),
  unit: z.union([z.string(), z.number()]).optional(),
});

export const SaveMistakeSchema = z.object({
  korean: z.string().min(1, 'Korean word is required'),
  english: z.string().min(1, 'English translation is required'),
});

export const SaveAnnotationSchema = z.object({
  id: z.string().optional(),
  contextKey: z.string().min(1, 'Context key is required'),
  startOffset: z.number().int().min(0).optional(),
  endOffset: z.number().int().min(0).optional(),
  sentenceIndex: z.number().int().min(0).optional().nullable(),
  text: z.string().min(1, 'Text is required'),
  color: z.string().optional().nullable(),
  note: z.string().optional().nullable(),
});

export const SaveExamAttemptSchema = z.object({
  id: z.string().optional(),
  examId: z.string().min(1, 'Exam ID is required'),
  examTitle: z.string().min(1, 'Exam title is required'),
  score: z.number().int().min(0),
  maxScore: z.number().int().min(1),
  userAnswers: z.record(z.string(), z.number()),
  timestamp: z.union([z.string(), z.number(), z.date()]).optional(),
});

export const LogActivitySchema = z.object({
  activityType: z.enum(['VOCAB', 'READING', 'LISTENING', 'GRAMMAR', 'EXAM']),
  duration: z.number().int().min(0).optional().nullable(),
  itemsStudied: z.number().int().min(0).optional().nullable(),
  metadata: z.record(z.string(), z.any()).optional().nullable(),
});

export const UpdateLearningProgressSchema = z.object({
  lastInstitute: z.string().optional().nullable(),
  lastLevel: z.number().int().optional().nullable(),
  lastUnit: z.number().int().optional().nullable(),
  lastModule: z.string().optional().nullable(),
});

// Content schemas
export const CreateInstituteSchema = z.object({
  id: z.string().min(1, 'Institute ID is required'),
  name: z.string().min(1, 'Institute name is required'),
  levels: z.array(
    z.object({
      level: z.number(),
      units: z.number(),
    })
  ),
});

export const SaveContentSchema = z.object({
  key: z.string().min(1, 'Key is required'),
  // Match Prisma model field names exactly
  generalContext: z.string().optional().nullable(),
  vocabularyList: z.string().optional().nullable(),  // JSON string
  readingText: z.string().optional().nullable(),
  readingTranslation: z.string().optional().nullable(),
  readingTitle: z.string().optional().nullable(),
  listeningScript: z.string().optional().nullable(),
  listeningTranslation: z.string().optional().nullable(),
  listeningTitle: z.string().optional().nullable(),
  listeningAudioUrl: z.string().optional().nullable(),
  grammarList: z.string().optional().nullable(),  // JSON string
  isPaid: z.boolean().optional(),
});

export const SaveTopikExamSchema = z.object({
  id: z.string().min(1, 'Exam ID is required'),
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional().nullable(),
  type: z.enum(['READING', 'LISTENING']),
  round: z.number().int(),
  timeLimit: z.number().int().min(1),
  // ✅ 修复：paperType 允许空字符串（转为 null）
  paperType: z.preprocess(
    (val) => (val === '' ? null : val),
    z.enum(['A', 'B']).optional().nullable()
  ),

  // ✅ 修复：添加音频字段，允许为空
  audioUrl: z.string().optional().nullable(),

  isPaid: z.boolean().optional(),

  questions: z.array(
    z.object({
      id: z.union([z.string(), z.number()]).optional(),
      number: z.number().int(),

      // ✅ 修复：question 允许为空（图片题可能没有提问文本）
      question: z.string().optional().nullable().default(''),

      passage: z.string().optional().nullable(),
      audioUrl: z.string().optional().nullable(),

      // ✅ 修复：统一字段名为 image (匹配前端)，允许为空
      image: z.string().optional().nullable(),
      imageUrl: z.string().optional().nullable(), // 兼容旧字段名

      // ✅ 新增字段支持
      instruction: z.string().optional().nullable(),
      layout: z.string().optional().nullable(),
      groupCount: z.number().int().optional().nullable(),
      contextBox: z.string().optional().nullable(),

      options: z.array(z.string()),
      optionImages: z.array(z.string()).optional().nullable(),
      correctAnswer: z.number().int().min(0),
      explanation: z.string().optional().nullable(),
      score: z.number().optional().default(2),
    })
  ),
});

export const UpdateProfileSchema = z.object({
  name: z.string().min(1, 'Name cannot be empty').optional(),
  avatar: z.string().optional(),
});

export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(6, 'Password must be at least 6 characters'),
});

// Type exports
export type RegisterInput = z.infer<typeof RegisterSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
export type SaveWordInput = z.infer<typeof SaveWordSchema>;
export type SaveMistakeInput = z.infer<typeof SaveMistakeSchema>;
export type SaveAnnotationInput = z.infer<typeof SaveAnnotationSchema>;
export type SaveExamAttemptInput = z.infer<typeof SaveExamAttemptSchema>;
export type LogActivityInput = z.infer<typeof LogActivitySchema>;
export type UpdateLearningProgressInput = z.infer<typeof UpdateLearningProgressSchema>;
export type CreateInstituteInput = z.infer<typeof CreateInstituteSchema>;
export type SaveContentInput = z.infer<typeof SaveContentSchema>;
export type SaveTopikExamInput = z.infer<typeof SaveTopikExamSchema>;
export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>;
export type ChangePasswordInput = z.infer<typeof ChangePasswordSchema>;
