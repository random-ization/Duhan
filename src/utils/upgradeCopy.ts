import type { Language } from '../types';

type UpgradeBenefitCopy = {
  title: string;
  subtitle: string;
  bullets: string[];
  lockedTitle: string;
  lockedNote: string;
  lockedCtaHint: string;
};

export function getUpgradeBenefitCopy(language: Language): UpgradeBenefitCopy {
  if (language === 'zh') {
    return {
      title: '让你的韩语真正突破',
      subtitle:
        '免费版帮你起步，完整版让你每周看到明确进步 — 更多词汇、更准确的语法、更高的写作分数。',
      bullets: [
        'AI 深度解析每一个句子，让阅读时遇到的生词和语法不再是谜',
        'TOPIK 写作 AI 实时评估 + 错题归档，分数可见提升',
        '间隔重复不限量，掌握的词汇以每周可见的速度增长',
        '个性化弱点分析 + 每周周报，用数据驱动你的学习决策',
      ],
      lockedTitle: '升级后即可使用此功能',
      lockedNote: '升级立即生效，你保存的进度和学习数据完整保留。',
      lockedCtaHint: '查看方案后即可返回当前页面继续学习',
    };
  }

  return {
    title: 'Break through your Korean plateau',
    subtitle:
      'Free gets you started. Full access turns every study session into measurable progress.',
    bullets: [
      'AI explains every sentence you read — no more guessing at grammar or vocab',
      'TOPIK writing coach with instant scoring — watch your score improve week by week',
      'Unlimited spaced repetition — your vocabulary grows at a pace you can see',
      'Personalized weak-point reports — know exactly what to study next',
    ],
    lockedTitle: 'Unlock this feature',
    lockedNote: 'Upgrade takes effect immediately. Your progress and data are fully preserved.',
    lockedCtaHint: 'After checkout you can return here and continue right away',
  };
}
