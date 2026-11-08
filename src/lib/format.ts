const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

export function parseDateOnly(iso: string): Date {
  return new Date(`${iso}T00:00:00`);
}

export function formatEventDate(iso: string): string {
  const date = parseDateOnly(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return `${date.getDate()} ${MONTHS[date.getMonth()]?.toUpperCase()}`;
}

export function formatLongDate(iso: string): string {
  const date = parseDateOnly(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString('en-AU', {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function formatDateTime(iso: string, time?: string): string {
  const date = formatLongDate(iso);
  return time ? `${date} · ${formatTime(time)}` : date;
}

export function formatDateRange(start: string, end: string): string {
  if (!end || end === start) return formatEventDate(start);
  return `${formatEventDate(start)}–${formatEventDate(end)}`;
}

export function formatTime(time: string): string {
  const [hourRaw, minuteRaw] = time.split(':');
  const hour = Number(hourRaw);
  const minute = Number(minuteRaw);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return time;
  const suffix = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${String(minute).padStart(2, '0')} ${suffix}`;
}

export function formatMoney(cents: number): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);
}

export function formatPrice(value: number | null): string {
  if (value == null) return 'See event';
  if (value === 0) return 'Free';
  return `$${value.toFixed(value % 1 === 0 ? 0 : 2)}`;
}

export function formatState(state: string): string {
  return state.toUpperCase();
}

export function formatDiscipline(discipline: string): string {
  if (!discipline) return 'Event';
  return discipline.charAt(0).toUpperCase() + discipline.slice(1);
}

export function stripHtml(value: string | null): string {
  if (!value) return '';
  return value
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<li[^>]*>/gi, '• ')
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function relativeTime(iso: string): string {
  const date = new Date(iso);
  const seconds = Math.round((date.getTime() - Date.now()) / 1000);
  const formatter = new Intl.RelativeTimeFormat('en-AU', { numeric: 'auto' });
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ['year', 31_536_000],
    ['month', 2_592_000],
    ['week', 604_800],
    ['day', 86_400],
    ['hour', 3_600],
    ['minute', 60],
  ];
  for (const [unit, size] of units) {
    if (Math.abs(seconds) >= size) return formatter.format(Math.round(seconds / size), unit);
  }
  return 'just now';
}

export function digitsOnly(value: string): string {
  return value.replace(/\D/g, '');
}
