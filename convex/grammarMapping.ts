import type { TokenInfo } from 'kiwi-nlp';

export function expandPattern(raw: string): string[] {
  const cleaned = raw.trim().replaceAll(/-+/g, '').replaceAll(/\s+/g, '');
  if (!cleaned) return [];

  const slashParts = cleaned
    .split('/')
    .map(s => s.trim())
    .filter(Boolean);
  const out: string[] = [];
  for (const part of slashParts.length > 0 ? slashParts : [cleaned]) {
    const withParensRemoved = part.replaceAll(/[()]/g, '');
    if (withParensRemoved.includes('으시')) {
      out.push(withParensRemoved, withParensRemoved.replace(/^으/, ''));
      continue;
    }
    if (withParensRemoved.includes('으')) {
      out.push(withParensRemoved, withParensRemoved.replace(/^으/, ''));
      continue;
    }
    out.push(withParensRemoved);
  }
  return [...new Set(out)].filter(Boolean);
}

export function buildAffixCandidateSet(affixForms: string[]): Set<string> {
  const out = new Set<string>();
  for (let i = 0; i < affixForms.length; i += 1) {
    out.add(affixForms[i]);
    if (i + 1 < affixForms.length) out.add(affixForms[i] + affixForms[i + 1]);
    if (i + 2 < affixForms.length) out.add(affixForms[i] + affixForms[i + 1] + affixForms[i + 2]);
  }
  return out;
}

export function scoreGrammarMatch(patterns: string[], candidates: Set<string>): number {
  let score = 0;
  for (const raw of patterns) {
    const variants = expandPattern(raw);
    for (const v of variants) {
      if (!v) continue;
      if (candidates.has(v)) score += 10 + v.length * 2;
    }
  }
  return score;
}

export function inferLemma(
  morphemes: TokenInfo[],
  surfaceFallback: string
): { lemma: string; pos?: string } {
  const content = morphemes.find(
    m =>
      /^[NVMA]/.test(m.tag) ||
      m.tag === 'VV' ||
      m.tag === 'VA' ||
      m.tag === 'VCP' ||
      m.tag === 'VCN' ||
      m.tag === 'VX'
  );
  if (!content) return { lemma: surfaceFallback };

  const hasHaVerb = morphemes.find(m => m.tag === 'VV' && m.str === '하');
  if (hasHaVerb) {
    const noun = morphemes.find(m => m.tag.startsWith('N'));
    if (noun) return { lemma: `${noun.str}하다`, pos: 'VV' };
  }

  if (content.tag === 'VCP') return { lemma: '이다', pos: 'VCP' };
  if (content.tag === 'VV' || content.tag === 'VA' || content.tag === 'VX') {
    return { lemma: `${content.str}다`, pos: content.tag };
  }
  if (content.tag.startsWith('N')) return { lemma: content.str, pos: content.tag };
  return { lemma: content.str, pos: content.tag };
}
