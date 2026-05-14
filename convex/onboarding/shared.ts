import { ConvexError } from 'convex/values';
import type { Doc, Id } from '../_generated/dataModel';
import type { MutationCtx, QueryCtx } from '../_generated/server';

export const ONBOARDING_VERSION = 'p0-v1';

export type SupportedLanguage = 'zh' | 'en' | 'vi' | 'mn';
export type GoalProfileStatus = 'not_started' | 'goal_set' | 'completed';

export type DiagnosisQuestionOptionDto = {
  id: string;
  label: string;
  score: number;
};

export type DiagnosisQuestionDto = {
  id: string;
  prompt: string;
  helpText?: string;
  options: DiagnosisQuestionOptionDto[];
};

type LocalizedQuestionOption = {
  id: string;
  score: number;
  labelZh: string;
  labelEn: string;
  labelVi: string;
  labelMn: string;
};

type LocalizedQuestion = {
  id: string;
  promptZh: string;
  promptEn: string;
  promptVi: string;
  promptMn: string;
  helpZh?: string;
  helpEn?: string;
  helpVi?: string;
  helpMn?: string;
  options: LocalizedQuestionOption[];
};

export const DIAGNOSIS_QUESTIONS: readonly LocalizedQuestion[] = [
  {
    id: 'reading_confidence',
    promptZh: '看到中短篇韩语内容时，你通常能理解到什么程度？',
    promptEn: 'How much of a short-to-medium Korean text can you usually understand?',
    promptVi: 'Bạn thường hiểu được bao nhiêu khi đọc một đoạn tiếng Hàn ngắn hoặc vừa?',
    promptMn: 'Богино, дунд урттай солонгос эх уншихад та ихэвчлэн хэр ойлгодог вэ?',
    helpZh: '按你最近一周的真实感受作答。',
    helpEn: 'Answer based on your real experience from the last week.',
    helpVi: 'Hãy trả lời theo trải nghiệm thực tế của tuần gần đây.',
    helpMn: 'Сүүлийн 7 хоногийн бодит туршлагаа бодож хариулна уу.',
    options: [
      {
        id: 'needs_translation',
        score: 1,
        labelZh: '大多需要翻译辅助',
        labelEn: 'I still need translation most of the time',
        labelVi: 'Tôi vẫn cần bản dịch trong hầu hết trường hợp',
        labelMn: 'Ихэнхдээ орчуулга шаардлагатай',
      },
      {
        id: 'keyword_only',
        score: 2,
        labelZh: '能抓住关键词和大意',
        labelEn: 'I can catch keywords and the main idea',
        labelVi: 'Tôi nắm được từ khóa và ý chính',
        labelMn: 'Түлхүүр үг, ерөнхий санааг ойлгодог',
      },
      {
        id: 'mostly_understand',
        score: 3,
        labelZh: '大部分都能顺畅理解',
        labelEn: 'I understand most of it smoothly',
        labelVi: 'Tôi hiểu phần lớn nội dung khá trôi chảy',
        labelMn: 'Ихэнх хэсгийг төвөггүй ойлгодог',
      },
    ],
  },
  {
    id: 'listening_confidence',
    promptZh: '听播客、课程或短视频时，你现在的听力状态更接近哪一项？',
    promptEn: 'When listening to podcasts, lessons, or short videos, which feels closest?',
    promptVi:
      'Khi nghe podcast, bài học hoặc video ngắn, tình trạng nghe của bạn gần với lựa chọn nào?',
    promptMn: 'Подкаст, хичээл эсвэл богино видео сонсохдоо аль нь танд хамгийн ойр санагддаг вэ?',
    options: [
      {
        id: 'word_by_word',
        score: 1,
        labelZh: '只能零散听懂单词',
        labelEn: 'I only catch scattered words',
        labelVi: 'Tôi chỉ nghe được vài từ rời rạc',
        labelMn: 'Зөвхөн хэсэг үг ойлгодог',
      },
      {
        id: 'main_flow',
        score: 2,
        labelZh: '能跟住主要内容',
        labelEn: 'I can follow the main flow',
        labelVi: 'Tôi theo được mạch nội dung chính',
        labelMn: 'Гол агуулгыг дагаж чаддаг',
      },
      {
        id: 'comfortable_speed',
        score: 3,
        labelZh: '正常语速下也比较轻松',
        labelEn: 'Normal speed already feels comfortable',
        labelVi: 'Tốc độ bình thường cũng khá thoải mái',
        labelMn: 'Энгийн хурдаар сонсоход нэлээд тухтай',
      },
    ],
  },
  {
    id: 'study_consistency',
    promptZh: '过去两周里，你平均每周能稳定学习几天？',
    promptEn: 'Over the last two weeks, how many days per week did you study consistently?',
    promptVi: 'Trong hai tuần qua, trung bình mỗi tuần bạn học đều mấy ngày?',
    promptMn: 'Сүүлийн хоёр долоо хоногт та долоо хоногт хэдэн өдөр тогтвортой сурсан бэ?',
    options: [
      {
        id: 'one_or_two',
        score: 1,
        labelZh: '1-2 天',
        labelEn: '1-2 days',
        labelVi: '1-2 ngày',
        labelMn: '1-2 өдөр',
      },
      {
        id: 'three_or_four',
        score: 2,
        labelZh: '3-4 天',
        labelEn: '3-4 days',
        labelVi: '3-4 ngày',
        labelMn: '3-4 өдөр',
      },
      {
        id: 'five_plus',
        score: 3,
        labelZh: '5 天及以上',
        labelEn: '5+ days',
        labelVi: 'Từ 5 ngày trở lên',
        labelMn: '5 ба түүнээс дээш өдөр',
      },
    ],
  },
] as const;

export function normalizeOnboardingLanguage(language?: string): SupportedLanguage {
  if (language?.startsWith('zh')) return 'zh';
  if (language?.startsWith('vi')) return 'vi';
  if (language?.startsWith('mn')) return 'mn';
  return 'en';
}

export async function getLatestGoalProfile(
  ctx: QueryCtx | MutationCtx,
  userId: Id<'users'>
): Promise<Doc<'user_goal_profile'> | null> {
  const rows = await ctx.db
    .query('user_goal_profile')
    .withIndex('by_user', q => q.eq('userId', userId))
    .collect();

  return (
    rows.sort((a, b) => (b.updatedAt ?? b.createdAt) - (a.updatedAt ?? a.createdAt))[0] ?? null
  );
}

export function toGoalProfileStatus(status?: string): GoalProfileStatus {
  if (status === 'completed') return 'completed';
  if (status === 'goal_set') return 'goal_set';
  return 'not_started';
}

export function getDiagnosisQuestions(language?: string): DiagnosisQuestionDto[] {
  const resolvedLanguage = normalizeOnboardingLanguage(language);
  return DIAGNOSIS_QUESTIONS.map(question => ({
    id: question.id,
    prompt:
      resolvedLanguage === 'zh'
        ? question.promptZh
        : resolvedLanguage === 'vi'
          ? question.promptVi
          : resolvedLanguage === 'mn'
            ? question.promptMn
            : question.promptEn,
    helpText:
      resolvedLanguage === 'zh'
        ? question.helpZh
        : resolvedLanguage === 'vi'
          ? question.helpVi
          : resolvedLanguage === 'mn'
            ? question.helpMn
            : question.helpEn,
    options: question.options.map(option => ({
      id: option.id,
      score: option.score,
      label:
        resolvedLanguage === 'zh'
          ? option.labelZh
          : resolvedLanguage === 'vi'
            ? option.labelVi
            : resolvedLanguage === 'mn'
              ? option.labelMn
              : option.labelEn,
    })),
  }));
}

export function buildDiagnosisSummary(args: {
  averageScore: number;
  language: SupportedLanguage;
  recommendedCurrentLevel: string;
  suggestedDailyMinutes: number;
  focusAreas: string[];
}): string {
  const focusText = args.focusAreas.join(', ');
  if (args.language === 'zh') {
    return `诊断显示你目前更接近 ${args.recommendedCurrentLevel}，建议每天保持 ${args.suggestedDailyMinutes} 分钟，并优先关注 ${focusText}。`;
  }
  if (args.language === 'vi') {
    return `Kết quả chẩn đoán cho thấy bạn đang gần mức ${args.recommendedCurrentLevel}; hãy duy trì ${args.suggestedDailyMinutes} phút mỗi ngày và ưu tiên ${focusText}.`;
  }
  if (args.language === 'mn') {
    return `Оношилгоогоор таны түвшин ${args.recommendedCurrentLevel}-д ойр байна. Өдөрт ${args.suggestedDailyMinutes} минут тогтмол сурч, ${focusText}-д төвлөрөхийг зөвлөж байна.`;
  }
  return `Your diagnostic result suggests you are around ${args.recommendedCurrentLevel}. Aim for ${args.suggestedDailyMinutes} minutes per day and focus on ${focusText}.`;
}

export function inferCurrentLevelFromScore(averageScore: number): string {
  if (averageScore < 1.7) return 'TOPIK 1';
  if (averageScore < 2.4) return 'TOPIK 2';
  return 'TOPIK 3+';
}

export function inferSuggestedDailyMinutes(averageScore: number): number {
  if (averageScore < 1.7) return 20;
  if (averageScore < 2.4) return 30;
  return 45;
}

export function assertDiagnosisQuestionExists(questionId: string) {
  const found = DIAGNOSIS_QUESTIONS.find(item => item.id === questionId);
  if (!found) {
    throw new ConvexError({
      code: 'INVALID_DIAGNOSIS_QUESTION',
      message: `Unknown diagnosis question: ${questionId}`,
    });
  }
  return found;
}
