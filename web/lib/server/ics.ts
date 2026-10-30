import 'server-only';
import { randomUUID } from 'node:crypto';

// SAST is a fixed UTC+2 (no daylight saving), so conversion to UTC is a constant 2 hour shift.
function utcStamp(date: string, time: string, addMin = 0) {
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm] = time.split(':').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d, hh - 2, mm + addMin));
  return t.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}
const fold = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');

export function bookingIcs(b: { id: string; typeLabel: string; where: string; durationMin: number; date: string; time: string }) {
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//byteleaf//booking//EN',
    'METHOD:REQUEST',
    'BEGIN:VEVENT',
    `UID:${b.id}-${randomUUID()}@byteleaf`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')}`,
    `DTSTART:${utcStamp(b.date, b.time)}`,
    `DTEND:${utcStamp(b.date, b.time, b.durationMin)}`,
    `SUMMARY:${fold(`byteleaf — ${b.typeLabel}`)}`,
    `LOCATION:${fold(b.where === 'Video call' ? '[meeting link]' : b.where)}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}
