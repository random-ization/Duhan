export function formatNotificationTime(
  createdAt: number,
  translateNow: (defaultLabel: string) => string
): string {
  const diff = Date.now() - createdAt;
  const minutes = Math.round(diff / 60000);
  if (minutes < 1) return translateNow('now');
  if (minutes < 60) return `${String(minutes)}m`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${String(hours)}h`;
  const days = Math.round(hours / 24);
  return `${String(days)}d`;
}
