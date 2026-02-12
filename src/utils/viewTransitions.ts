export function getCourseCoverTransitionName(courseId: string | null | undefined): string {
  const raw = (courseId || '').trim();
  const safe = raw.replace(/[^a-zA-Z0-9_-]/g, '_');
  return `course-cover-${safe || 'unknown'}`;
}
