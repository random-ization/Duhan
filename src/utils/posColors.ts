/**
 * Returns Tailwind CSS classes for a given Part of Speech tag to display
 * colored badges instead of standard gray.
 */
export function getPosColorClass(pos?: string): string {
  if (!pos) return 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400';

  const normalized = pos.toUpperCase().trim();

  if (
    normalized.includes('NOUN') ||
    normalized === 'N' ||
    normalized === 'N.' ||
    normalized.includes('\u540D') ||
    normalized.includes('\u4EE3') ||
    normalized.includes('PRON')
  ) {
    return 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300';
  }
  if (
    normalized.includes('VERB') ||
    normalized === 'V' ||
    normalized === 'V.' ||
    normalized.includes('\u52A8')
  ) {
    return 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300';
  }
  if (
    normalized.includes('ADJ') ||
    normalized === 'A' ||
    normalized === 'A.' ||
    normalized.includes('\u5F62')
  ) {
    return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300';
  }
  if (normalized.includes('ADV') || normalized.includes('\u526F')) {
    return 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300';
  }
  if (normalized.includes('PARTICLE') || normalized.includes('\u52A9')) {
    return 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300';
  }
  if (
    normalized.includes('NUM') ||
    normalized.includes('NUMBER') ||
    normalized.includes('\u6570')
  ) {
    return 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300';
  }
  if (
    normalized.includes('PREFIX') ||
    normalized.includes('SUFFIX') ||
    normalized.includes('\u63A5')
  ) {
    return 'bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-900/40 dark:text-fuchsia-300';
  }

  // Default fallback
  return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400';
}
