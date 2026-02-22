export const getPosStyle = (pos: string | undefined) => {
  if (!pos) return 'hidden';
  const lower = pos.toLowerCase();

  // Verbs (Red/Pink)
  if (lower.includes('\u52A8') || lower.includes('verb')) return 'bg-red-100 text-red-700';

  // Nouns/Pronouns (Blue)
  if (
    lower.includes('\u540D') ||
    lower.includes('noun') ||
    lower.includes('\u4EE3') ||
    lower.includes('pronoun')
  )
    return 'bg-blue-100 text-blue-700';

  // Adjectives (Green)
  if (lower.includes('\u5F62') || lower.includes('adj')) return 'bg-green-100 text-green-700';

  // Adverbs (Amber)
  if (lower.includes('\u526F') || lower.includes('adv')) return 'bg-amber-100 text-amber-800';

  // Others (Gray)
  return 'bg-muted text-muted-foreground';
};

export const shuffleArray = <T>(array: T[]): T[] => {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};
