'use node';

import { internalAction } from './_generated/server';
import { v } from 'convex/values';
import { analyzeSentenceTokens } from './kiwi';

export type TopikWritingKiwiAnnotation = {
  verified: boolean;
  kiwiContext?: string;
};

export const annotateWritingErrorsWithKiwi = internalAction({
  args: {
    userAnswer: v.string(),
    originalTexts: v.array(v.string()),
  },
  handler: async (_ctx, args): Promise<TopikWritingKiwiAnnotation[]> => {
    const kiwiAnalysis = await analyzeSentenceTokens(args.userAnswer);
    const tokenSurfaces = new Set(
      kiwiAnalysis.lemmas.concat(kiwiAnalysis.stems, kiwiAnalysis.particles, kiwiAnalysis.endings)
    );

    return args.originalTexts.map(originalText => {
      if (!originalText) {
        return { verified: false };
      }

      const verified = args.userAnswer.includes(originalText);
      if (!verified || !tokenSurfaces.has(originalText)) {
        return { verified };
      }

      const kiwiContext = kiwiAnalysis.tokenSummary
        .split(' ')
        .find(token => token.startsWith(`${originalText}/`));

      return kiwiContext ? { verified, kiwiContext } : { verified };
    });
  },
});
