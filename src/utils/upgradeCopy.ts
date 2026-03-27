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
      title: '\u89e3\u9501\u5b8c\u6574\u5b66\u4e60\u7248',
      subtitle:
        'Free \u8d1f\u8d23\u8ba9\u4f60\u5f00\u59cb\u5b66，Pro / Lifetime \u8d1f\u8d23\u8ba9\u4f60\u6301\u7eed\u5b66、\u6df1\u5ea6\u5b66。',
      bullets: [
        '\u5168\u90e8\u6559\u6750、\u5168\u90e8\u8bfe\u7a0b、\u5168\u90e8\u5355\u5143\u5b8c\u6574\u5f00\u653e',
        '\u5168\u90e8 TOPIK / \u5199\u4f5c\u771f\u9898、\u9519\u9898\u805a\u5408\u4e0e\u957f\u671f\u62a5\u544a',
        '\u5a92\u4f53\u65e0\u9650\u64ad\u653e、\u652f\u6301\u500d\u901f、\u7edf\u4e00 AI Credit 100 \u70b9/\u5929',
        'PDF \u5bfc\u51fa、\u5386\u53f2\u5206\u6790、\u6df1\u5ea6\u5b66\u4e60\u5de5\u5177\u5168\u90e8\u5f00\u653e',
      ],
      lockedTitle: '\u8fd9\u4e00\u90e8\u5206\u5c5e\u4e8e\u5b8c\u6574\u5b66\u4e60\u7248',
      lockedNote:
        '\u5347\u7ea7\u540e\u53ef\u7acb\u5373\u89e3\u9501\u5f53\u524d\u5185\u5bb9，\u5e76\u7ee7\u7eed\u4fdd\u7559\u5230\u4f60\u7684\u5f53\u524d\u8d26\u53f7。',
      lockedCtaHint:
        '\u67e5\u770b\u65b9\u6848\u540e\u5373\u53ef\u8fd4\u56de\u5f53\u524d\u9875\u9762\u7ee7\u7eed\u5b66\u4e60',
    };
  }

  return {
    title: 'Unlock the full study plan',
    subtitle: 'Free helps you start. Pro / Lifetime unlock the full depth of the platform.',
    bullets: [
      'All textbooks, courses, and units unlocked',
      'Full TOPIK and writing archive with long-term reports',
      'Unlimited media playback, speed control, and 100 daily AI credits',
      'PDF export, analytics, and the full study toolkit',
    ],
    lockedTitle: 'This section belongs to the full plan',
    lockedNote: 'Upgrade to unlock this content immediately on your current account.',
    lockedCtaHint: 'After checkout you can return here and continue right away',
  };
}
