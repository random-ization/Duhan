import type { Language } from '../types';
import { getUpgradeBenefitCopy } from './upgradeCopy';

type SubscriptionFeatureCardCopy = {
  title: string;
  description: string;
  bullets: string[];
};

type SubscriptionComparisonRowCopy = {
  label: string;
  free: string;
  paid: string;
};

export type SubscriptionPageCopy = {
  pageLabel: string;
  heroBadge: string;
  heroTitle: string;
  heroSubtitle: string;
  featureCards: SubscriptionFeatureCardCopy[];
  comparisonTitle: string;
  comparisonSubtitle: string;
  comparisonRows: SubscriptionComparisonRowCopy[];
};

function normalizeLanguage(language: string): Language {
  const baseLanguage = (language || 'en').split('-')[0];
  if (baseLanguage === 'zh' || baseLanguage === 'vi' || baseLanguage === 'mn') {
    return baseLanguage;
  }
  return 'en';
}

export function getSubscriptionPageCopy(language: string): SubscriptionPageCopy {
  const normalizedLanguage = normalizeLanguage(language);
  const upgradeCopy = getUpgradeBenefitCopy(normalizedLanguage);

  if (normalizedLanguage === 'zh') {
    return {
      pageLabel: '\u8ba2\u9605\u65b9\u6848',
      heroBadge: 'Free / Pro / Lifetime',
      heroTitle: upgradeCopy.title,
      heroSubtitle: upgradeCopy.subtitle,
      featureCards: [
        {
          title: '\u6559\u6750\u4e0e\u8bfe\u7a0b',
          description:
            '\u514d\u8d39\u7528\u6237\u5148\u5b66\u6bcf\u95e8\u8bfe\u524d 2 \u5355\u5143，\u786e\u8ba4\u5185\u5bb9\u9002\u5408\u81ea\u5df1\u540e，\u518d\u8fdb\u5165\u5b8c\u6574\u8bfe\u7a0b\u4f53\u7cfb。',
          bullets: [
            '\u8bcd\u6c47、\u8bed\u6cd5、\u9605\u8bfb、\u542c\u529b\u90fd\u80fd\u771f\u5b9e\u4f53\u9a8c',
            '\u7b2c 3 \u5355\u5143\u5f00\u59cb\u7531\u670d\u52a1\u7aef\u7edf\u4e00\u9650\u5236\u4e3a\u4ed8\u8d39\u5185\u5bb9',
            'Pro / Lifetime \u89e3\u9501\u5168\u90e8\u6559\u6750、\u5168\u90e8\u8bfe\u7a0b、\u5168\u90e8\u5355\u5143',
          ],
        },
        {
          title: 'TOPIK \u4e0e\u5199\u4f5c',
          description:
            '\u514d\u8d39\u5c42\u4fdd\u7559\u5b8c\u6574\u6837\u672c\u4f53\u9a8c，\u771f\u9898\u6df1\u5ea6、\u5199\u4f5c\u8bc4\u5206\u548c\u957f\u671f\u5386\u53f2\u90fd\u5f52\u5230\u5b8c\u6574\u5b66\u4e60\u7248。',
          bullets: [
            'Free \u4ec5\u5f00\u653e\u7ba1\u7406\u5458\u6807\u8bb0\u7684\u516c\u5f00\u6837\u672c\u5377',
            'Pro / Lifetime \u5f00\u653e\u5168\u90e8 TOPIK \u5ba2\u89c2\u9898、\u5199\u4f5c\u9898\u548c\u8bc4\u5206\u62a5\u544a',
            '\u9519\u9898\u805a\u5408、\u5206\u9898\u578b\u7edf\u8ba1、\u957f\u671f\u5386\u53f2\u5206\u6790\u5168\u90e8\u4fdd\u7559',
          ],
        },
        {
          title: '\u5a92\u4f53、AI \u4e0e\u5bfc\u51fa',
          description:
            '\u9ad8\u6210\u672c\u529f\u80fd\u7edf\u4e00\u653e\u5230\u4ed8\u8d39\u5c42，\u4f46\u514d\u8d39\u7528\u6237\u4ecd\u7136\u80fd\u5148\u4f53\u9a8c\u6838\u5fc3\u6d41\u7a0b。',
          bullets: [
            '\u5a92\u4f53\u5e93\u53ef\u6d4f\u89c8\u5168\u90e8\u5217\u8868，\u4f46\u5b8c\u6574\u64ad\u653e\u9650 2 \u4e2a/\u5929，\u4ec5 1.0x',
            '\u7edf\u4e00 AI Credit：Free 5 \u70b9/\u5929，Pro / Lifetime 100 \u70b9/\u5929',
            'PDF \u5bfc\u51fa、\u957f\u671f\u5386\u53f2\u548c\u805a\u5408\u5206\u6790\u4ec5\u5bf9\u4ed8\u8d39\u7528\u6237\u5f00\u653e',
          ],
        },
      ],
      comparisonTitle: '\u6309\u529f\u80fd\u770b\u6e05 Free \u548c Pro \u7684\u8fb9\u754c',
      comparisonSubtitle:
        '\u5148\u628a\u771f\u6b63\u7684\u6743\u9650\u5dee\u5f02\u8bb2\u6e05\u695a，\u518d\u51b3\u5b9a\u662f\u5426\u5347\u7ea7。',
      comparisonRows: [
        {
          label: '\u6559\u6750\u8bfe\u7a0b',
          free: '\u6bcf\u95e8\u8bfe\u524d 2 \u5355\u5143',
          paid: '\u5168\u90e8\u8bfe\u7a0b、\u5168\u90e8\u5355\u5143',
        },
        {
          label: '\u5355\u8bcd\u7cfb\u7edf',
          free: '20 \u65b0\u8bcd/\u5929，Test 1 \u6b21/\u5929',
          paid: '\u65b0\u589e\u65e0\u9650、\u6d4b\u8bd5\u65e0\u9650、\u5386\u53f2\u8d8b\u52bf',
        },
        {
          label: 'TOPIK / \u5199\u4f5c',
          free: '\u4ec5\u516c\u5f00\u6837\u672c\u5377 + \u5f53\u524d\u7ed3\u679c\u9875',
          paid: '\u5168\u90e8\u771f\u9898、\u5199\u4f5c\u8bc4\u5206、\u957f\u671f\u62a5\u544a',
        },
        {
          label: '\u5a92\u4f53\u5b66\u4e60',
          free: '\u5b8c\u6574\u64ad\u653e 2 \u4e2a/\u5929，\u4ec5 1.0x',
          paid: '\u65e0\u9650\u64ad\u653e + \u500d\u901f\u63a7\u5236',
        },
        {
          label: 'AI \u80fd\u529b',
          free: '\u7edf\u4e00 AI Credit 5 \u70b9/\u5929',
          paid: '\u7edf\u4e00 AI Credit 100 \u70b9/\u5929',
        },
        {
          label: '\u5bfc\u51fa\u4e0e\u5206\u6790',
          free: '\u65e0 PDF，\u4ec5\u4fdd\u7559\u5373\u65f6\u7ed3\u679c\u9875',
          paid: 'PDF \u5bfc\u51fa + \u957f\u671f\u5386\u53f2\u5206\u6790',
        },
      ],
    };
  }

  return {
    pageLabel: 'Pricing',
    heroBadge: 'Free / Pro / Lifetime',
    heroTitle: upgradeCopy.title,
    heroSubtitle: upgradeCopy.subtitle,
    featureCards: [
      {
        title: 'Courses and textbooks',
        description:
          'Free users can work through the first 2 units of every course before committing to the full curriculum.',
        bullets: [
          'Vocabulary, grammar, reading, and listening are all available in the free sample units',
          'Starting with unit 3, access is enforced server-side',
          'Pro / Lifetime unlock every textbook, course, and unit',
        ],
      },
      {
        title: 'TOPIK and writing',
        description:
          'The free tier keeps a real sample flow, while the full archive, grading, and long-term analysis stay paid.',
        bullets: [
          'Free includes only admin-marked public sample exams',
          'Pro / Lifetime unlock the full TOPIK objective and writing archive',
          'Mistake clustering, section analytics, and long-term reports stay available over time',
        ],
      },
      {
        title: 'Media, AI, and export',
        description:
          'Higher-cost features are reserved for paid plans, but the free tier still lets users try the core workflow.',
        bullets: [
          'The media library is browsable, but full playback is limited to 2 items per day at 1.0x',
          'Unified AI credits: Free gets 5 per day, Pro / Lifetime get 100 per day',
          'PDF export and long-term analytics are part of the full study plan',
        ],
      },
    ],
    comparisonTitle: 'See the real boundary between Free and Pro',
    comparisonSubtitle: 'The difference is clearer by feature than by price label alone.',
    comparisonRows: [
      {
        label: 'Courses',
        free: 'First 2 units per course',
        paid: 'All courses and units',
      },
      {
        label: 'Vocabulary system',
        free: '20 new saves/day, 1 test/day',
        paid: 'Unlimited saves, tests, and trends',
      },
      {
        label: 'TOPIK / Writing',
        free: 'Public samples + current result page',
        paid: 'Full archive, grading, and reports',
      },
      {
        label: 'Media study',
        free: '2 full plays/day at 1.0x',
        paid: 'Unlimited playback + speed control',
      },
      {
        label: 'AI features',
        free: '5 AI credits/day',
        paid: '100 AI credits/day',
      },
      {
        label: 'Export and analytics',
        free: 'No PDF, no long-term history',
        paid: 'PDF export + deeper analytics',
      },
    ],
  };
}
