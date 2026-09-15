export type LandingDecorations = {
  phoneHeader: string;
  phoneSteps: readonly [string, string, string, string];
  heroNew: string;
  heroChips: readonly [string, string, string];
  logos: readonly [string, string, string, string, string];
  featureSection: readonly [string, string];
  features: readonly [string, string, string, string, string, string];
  loopSection: readonly [string, string];
  loopNumbers: readonly [string, string, string, string];
  loopPreviews: readonly [string, string, string, string];
  moduleSection: readonly [string, string];
  modules: readonly [string, string, string, string];
  communitySection: readonly [string, string];
  pricingSection: readonly [string, string];
  pricingPlans: readonly [string, string, string];
  testimonialSection: readonly [string, string];
  testimonialAvatars: readonly [string, string, string];
  faqSection: readonly [string, string];
  faqQuestion: string;
  finalBackground: string;
  finalStart: string;
  footerColumns: readonly [string, string, string, string];
  socialFirst: string;
};

const CHINESE_DECORATIONS: LandingDecorations = {
  phoneHeader: '\u97d3',
  phoneSteps: ['\u8907', '\u5b78', '\u807d', '\u8b80'],
  heroNew: '\u65b0',
  heroChips: ['\u7e8c', '\u8a5e', '\u80fd'],
  logos: ['\u8b80', '\u807d', '\u8a18', '\u8b6f', '\u901a'],
  featureSection: ['\u5177', '\u5b78'],
  features: ['\u4eca', '\u8a5e', '\u6cd5', '\u80fd', '\u8b6f', '\u6620'],
  loopSection: ['\u65e5', '\u65e5'],
  loopNumbers: ['\u58f9', '\u8cb3', '\u53c3', '\u8086'],
  loopPreviews: ['\u8907', '\u5b78', '\u807d', '\u8b80'],
  moduleSection: ['\u6a21', '\u5177'],
  modules: ['\u8a5e', '\u80fd', '\u6620', '\u8b80'],
  communitySection: ['\u6703', '\u4f34'],
  pricingSection: ['\u91d1', '\u64c7'],
  pricingPlans: ['\u7121', '\u6046', '\u6c38'],
  testimonialSection: ['\u8072', '\u8a71'],
  testimonialAvatars: ['\u6cb3', '\u5c0f', '민'],
  faqSection: ['\u554f', '\u554f'],
  faqQuestion: '\u554f',
  finalBackground: '\u97d3',
  finalStart: '\u59cb',
  footerColumns: ['\u5177', '\u5b78', '\u53f8', '\u52a9'],
  socialFirst: '\u5c0f',
};

const LATIN_DECORATIONS: LandingDecorations = {
  phoneHeader: 'KR',
  phoneSteps: ['R', 'L', 'A', 'R'],
  heroNew: 'NEW',
  heroChips: ['S', 'W', 'T'],
  logos: ['R', 'L', 'S', 'C', '↻'],
  featureSection: ['F', 'K'],
  features: ['D', 'V', 'G', 'T', 'C', 'M'],
  loopSection: ['D', '4'],
  loopNumbers: ['1', '2', '3', '4'],
  loopPreviews: ['R', 'L', 'A', 'R'],
  moduleSection: ['M', 'T'],
  modules: ['V', 'T', 'M', 'R'],
  communitySection: ['C', '+'],
  pricingSection: ['P', '$'],
  pricingPlans: ['F', 'P', '∞'],
  testimonialSection: ['T', '“'],
  testimonialAvatars: ['H', 'X', 'M'],
  faqSection: ['F', '?'],
  faqQuestion: 'Q',
  finalBackground: 'KR',
  finalStart: 'GO',
  footerColumns: ['P', 'L', 'C', 'S'],
  socialFirst: 'X',
};

export function getLandingDecorations(language?: string): LandingDecorations {
  return language?.toLowerCase().startsWith('zh') ? CHINESE_DECORATIONS : LATIN_DECORATIONS;
}
