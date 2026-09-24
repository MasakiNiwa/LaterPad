const rtf = new Intl.RelativeTimeFormat('ja', { numeric: 'auto' });
const dtf = new Intl.DateTimeFormat('ja-JP', { dateStyle: 'medium', timeStyle: 'short' });

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : dtf.format(d);
}

/** 「3 分前」のような相対表記。1 週間以上前は日時表記 */
export function formatRelative(iso: string, now = Date.now()): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return iso;
  const sec = Math.round((t - now) / 1000);
  const abs = Math.abs(sec);
  if (abs < 45) return 'たった今';
  if (abs < 3600) return rtf.format(Math.round(sec / 60), 'minute');
  if (abs < 86400) return rtf.format(Math.round(sec / 3600), 'hour');
  if (abs < 86400 * 7) return rtf.format(Math.round(sec / 86400), 'day');
  return formatDateTime(iso);
}
