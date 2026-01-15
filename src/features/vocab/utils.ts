export const speak = (text: string) => {
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'ko-KR';
  u.rate = 0.9;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(u);
};

export const getPosStyle = (pos: string | undefined) => {
  if (!pos) return 'hidden';
  const lower = pos.toLowerCase();

  // Verbs (Red/Pink)
  if (lower.includes('动') || lower.includes('verb')) return 'bg-red-100 text-red-700';

  // Nouns/Pronouns (Blue)
  if (
    lower.includes('名') ||
    lower.includes('noun') ||
    lower.includes('代') ||
    lower.includes('pronoun')
  )
    return 'bg-blue-100 text-blue-700';

  // Adjectives (Green)
  if (lower.includes('形') || lower.includes('adj')) return 'bg-green-100 text-green-700';

  // Adverbs (Amber)
  if (lower.includes('副') || lower.includes('adv')) return 'bg-amber-100 text-amber-800';

  // Others (Gray)
  return 'bg-slate-100 text-slate-600';
};

export const shuffleArray = <T>(array: T[]): T[] => {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};
