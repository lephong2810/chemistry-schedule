// Tiện ích hiển thị dùng chung cho giao diện (không thay đổi dữ liệu gốc)
import { ScheduleItem } from '../types';
import {
  timeStrToMinutes,
  getPeriodStartTime,
  getPeriodEndTime,
  inferPeriodsFromTimes,
  normalizeDayOfWeek
} from './periodConverter';

export const DAYS = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật'] as const;
export type DayName = (typeof DAYS)[number];

export const DAY_SHORT: Record<DayName, string> = {
  'Thứ 2': 'T2',
  'Thứ 3': 'T3',
  'Thứ 4': 'T4',
  'Thứ 5': 'T5',
  'Thứ 6': 'T6',
  'Thứ 7': 'T7',
  'Chủ nhật': 'CN'
};

export const DAY_LONG: Record<DayName, string> = {
  'Thứ 2': 'Thứ Hai',
  'Thứ 3': 'Thứ Ba',
  'Thứ 4': 'Thứ Tư',
  'Thứ 5': 'Thứ Năm',
  'Thứ 6': 'Thứ Sáu',
  'Thứ 7': 'Thứ Bảy',
  'Chủ nhật': 'Chủ Nhật'
};

/** Ngày đầu học kỳ, dùng để tính "Tuần học thứ mấy" */
export const SEMESTER_START = '2026-09-14';

export function todayDayName(d: Date = new Date()): DayName {
  const map: DayName[] = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
  return map[d.getDay()];
}

export function todayISO(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function nowMinutes(d: Date = new Date()): number {
  return d.getHours() * 60 + d.getMinutes();
}

export function greeting(d: Date = new Date()): string {
  const h = d.getHours();
  if (h < 11) return 'Chào buổi sáng';
  if (h < 13) return 'Chào buổi trưa';
  if (h < 18) return 'Chào buổi chiều';
  return 'Chào buổi tối';
}

export function longDateVN(d: Date = new Date()): string {
  const dn = DAY_LONG[todayDayName(d)];
  return `${dn}, ${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

/** Tuần học thứ mấy kể từ đầu học kỳ (null nếu chưa bắt đầu) */
export function semesterWeek(d: Date = new Date(), start = SEMESTER_START): number | null {
  const s = new Date(start + 'T00:00:00');
  const diff = Math.floor((d.getTime() - s.getTime()) / 86400000);
  if (diff < 0) return null;
  return Math.floor(diff / 7) + 1;
}

/** dd/mm từ YYYY-MM-DD */
export function shortDate(iso?: string): string {
  if (!iso) return '';
  const p = iso.split('-');
  return p.length === 3 ? `${p[2]}/${p[1]}` : iso;
}

/** dd/mm/yyyy từ YYYY-MM-DD */
export function vnDate(iso?: string): string {
  if (!iso) return '';
  const p = iso.split('-');
  return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : iso;
}

const isISO = (s?: string) => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s);
const dayDiff = (a: string, b: Date) => Math.floor((b.getTime() - new Date(a + 'T00:00:00').getTime()) / 86400000);

/**
 * Tuần thứ mấy tính từ một ngày bắt đầu cụ thể. Hệ chất lượng cao (3 kỳ/năm) và chính quy (2 kỳ + hè)
 * có lịch học kỳ khác nhau, nên luôn tính theo ngày bắt đầu thật trong bảng tính, không dùng mốc chung.
 * Trả về null nếu hôm nay nằm ngoài khoảng [start, end].
 */
export function weekOfRange(start?: string, end?: string, d: Date = new Date()): { current: number; total: number } | null {
  if (!isISO(start)) return null;
  const diff = dayDiff(start!, d);
  if (diff < 0) return null;
  let total = 0;
  if (isISO(end)) {
    const span = dayDiff(start!, new Date(end + 'T00:00:00'));
    if (span < 0 || diff > span) return null;
    total = Math.floor(span / 7) + 1;
  }
  return { current: Math.floor(diff / 7) + 1, total };
}

/** Tuần học hiện tại của một môn (theo ngày áp dụng của chính môn đó) */
export function courseWeek(item: ScheduleItem, d: Date = new Date()) {
  return weekOfRange(item.startDate, item.endDate, d);
}

/** Tuần học hiện tại của một lớp: từ ngày bắt đầu sớm nhất đến ngày kết thúc muộn nhất của các môn trong lớp */
export function classWeek(items: ScheduleItem[], d: Date = new Date()) {
  const starts = items.map(i => i.startDate).filter(isISO).sort() as string[];
  const ends = items.map(i => i.endDate).filter(isISO).sort() as string[];
  if (!starts.length) return null;
  const r = weekOfRange(starts[0], ends[ends.length - 1], d);
  return r ? { ...r, start: starts[0] } : null;
}

/** Bỏ tiền tố cơ sở "cs1:" khỏi tên phòng */
export function cleanRoom(room?: string): string {
  const r = (room || '').replace(/^cs[12]:\s*/i, '').trim();
  if (!r || r === 'P.---') return '';
  return r;
}

const VOWELS = /[aăâeêioôơuưyáàảãạắằẳẵặấầẩẫậéèẻẽẹếềểễệíìỉĩịóòỏõọốồổỗộớờởỡợúùủũụứừửữựýỳỷỹỵ]/i;

/**
 * Chuyển tên môn VIẾT HOA TOÀN BỘ sang dạng câu dễ đọc.
 * "HÓA HỌC NANO" -> "Hóa học nano"; giữ nguyên từ viết tắt không nguyên âm (BT, PP, TH) và số (1C).
 */
export function prettySubject(name?: string): string {
  const raw = (name || '').trim();
  if (!raw) return 'Chưa có tên môn';
  const letters = raw.replace(/[^\p{L}]/gu, '');
  const isAllCaps = letters.length > 3 && letters === letters.toLocaleUpperCase('vi');
  if (!isAllCaps) return raw;
  const words = raw.split(/(\s+)/).map((w, i) => {
    if (/^\s+$/.test(w)) return w;
    const core = w.replace(/[^\p{L}\d]/gu, '');
    const keep = /\d/.test(core) || (core.length <= 4 && !VOWELS.test(core));
    if (keep) return w;
    return w.toLocaleLowerCase('vi');
  });
  const joined = words.join('');
  return joined.charAt(0).toLocaleUpperCase('vi') + joined.slice(1);
}

/** Bỏ học hàm học vị: "PGS.TS. Lê Tiến Khoa" -> "Lê Tiến Khoa" */
export function stripTitle(name?: string): string {
  return (name || '')
    .replace(/^((GS|PGS|TS|ThS|CN|KS|BS|DS|NCS|Th\.S)\.?\s*)+/gi, '')
    .replace(/^[.\s]+/, '')
    .trim();
}

/** Chữ viết tắt cho avatar: "Lê Hoài Phong" -> "HP" */
export function initials(name?: string): string {
  const parts = stripTitle(name).split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[parts.length - 2].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

/** Khoá sắp xếp theo tên (tên gọi cuối cùng) đúng kiểu Việt Nam */
export function vnNameSortKey(name?: string): string {
  const parts = stripTitle(name).split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '';
  return [parts[parts.length - 1], ...parts.slice(0, -1)].join(' ');
}

/** Bảng màu avatar ổn định theo tên */
const AVATAR_TONES = [
  'bg-teal-100 text-teal-800',
  'bg-sky-100 text-sky-800',
  'bg-violet-100 text-violet-800',
  'bg-amber-100 text-amber-800',
  'bg-rose-100 text-rose-800',
  'bg-emerald-100 text-emerald-800',
  'bg-indigo-100 text-indigo-800',
  'bg-orange-100 text-orange-800'
];
export function avatarTone(name?: string): string {
  const s = stripTitle(name);
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return AVATAR_TONES[h % AVATAR_TONES.length];
}

export interface CampusMeta {
  short: string;
  place: string;
  full: string;
  dot: string;
  chip: string;
  block: string;
  bar: string;
}

export function campusMeta(campus?: string): CampusMeta {
  if (campus === 'cs2') {
    return {
      short: 'CS2',
      place: 'Đông Hoà',
      full: 'Cơ sở 2 · Phường Đông Hoà, TP.HCM',
      dot: 'bg-amber-500',
      chip: 'bg-amber-50 text-amber-800 ring-amber-200',
      block: 'bg-amber-50 hover:bg-amber-100/80 ring-amber-200 text-amber-950',
      bar: 'bg-amber-500'
    };
  }
  return {
    short: 'CS1',
    place: 'Chợ Quán',
    full: 'Cơ sở 1 · Phường Chợ Quán, TP.HCM',
    dot: 'bg-brand-500',
    chip: 'bg-brand-50 text-brand-800 ring-brand-200',
    block: 'bg-brand-50 hover:bg-brand-100/80 ring-brand-200 text-brand-950',
    bar: 'bg-brand-500'
  };
}

export interface SubjectTone {
  bar: string;
  soft: string;
  text: string;
  label: string;
}

/** Màu nhấn theo phân môn hoá học */
export function subjectTone(name?: string): SubjectTone {
  const n = (name || '').toLocaleLowerCase('vi');
  if (n.includes('hữu cơ') || n.includes('thiên nhiên') || n.includes('phản ứng') || n.includes('lập thể'))
    return { bar: 'bg-emerald-500', soft: 'bg-emerald-50', text: 'text-emerald-700', label: 'Hữu cơ' };
  if (n.includes('phân tích') || n.includes('dụng cụ') || n.includes('thiết bị') || n.includes('xử lý mẫu'))
    return { bar: 'bg-sky-500', soft: 'bg-sky-50', text: 'text-sky-700', label: 'Phân tích' };
  if (n.includes('vô cơ') || n.includes('phức chất') || n.includes('chất rắn') || n.includes('đất hiếm') || n.includes('vật liệu'))
    return { bar: 'bg-indigo-500', soft: 'bg-indigo-50', text: 'text-indigo-700', label: 'Vô cơ' };
  if (n.includes('hóa lý') || n.includes('hoá lý') || n.includes('điện hóa') || n.includes('lượng tử') || n.includes('nano'))
    return { bar: 'bg-violet-500', soft: 'bg-violet-50', text: 'text-violet-700', label: 'Hoá lý' };
  if (n.includes('sinh') || n.includes('dược') || n.includes('độc chất') || n.includes('thực phẩm'))
    return { bar: 'bg-rose-500', soft: 'bg-rose-50', text: 'text-rose-700', label: 'Sinh – Dược' };
  if (n.includes('polyme') || n.includes('polymer') || n.includes('lưu biến'))
    return { bar: 'bg-orange-500', soft: 'bg-orange-50', text: 'text-orange-700', label: 'Polyme' };
  return { bar: 'bg-slate-400', soft: 'bg-slate-50', text: 'text-slate-600', label: 'Khác' };
}

/** Phút bắt đầu/kết thúc thực tế của một buổi học */
export function itemMinutes(item: ScheduleItem): { start: number; end: number } {
  let s = timeStrToMinutes(item.startTime);
  let e = timeStrToMinutes(item.endTime);
  if (!s || s <= 0) {
    s = timeStrToMinutes(getPeriodStartTime(item.campus, Number(item.startPeriod) || 1)) || 7 * 60;
  }
  if (!e || e <= s) {
    e = timeStrToMinutes(getPeriodEndTime(item.campus, Number(item.endPeriod) || 3, Number(item.startPeriod) || 1));
  }
  if (!e || e <= s) e = s + 50;
  return { start: s, end: e };
}

export function minutesToHHMM(m: number): string {
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(Math.round(m % 60)).padStart(2, '0')}`;
}

/** "Tiết 4–6" */
export function periodLabel(item: ScheduleItem): string {
  let s = item.startPeriod;
  let e = item.endPeriod;
  if (!s || !e) {
    const inf = inferPeriodsFromTimes(item.campus, item.startTime, item.endTime);
    s = inf.startPeriod;
    e = inf.endPeriod;
  }
  return `Tiết ${s}–${e}`;
}

export function itemDay(item: ScheduleItem): DayName {
  return normalizeDayOfWeek(item.dayOfWeek) as DayName;
}

/** Buổi học có diễn ra vào ngày ISO này (trong khoảng áp dụng) không */
export function isActiveOnDate(item: ScheduleItem, iso: string): boolean {
  const s = item.startDate;
  const e = item.endDate;
  if (s && /^\d{4}-\d{2}-\d{2}$/.test(s) && iso < s) return false;
  if (e && /^\d{4}-\d{2}-\d{2}$/.test(e) && iso > e) return false;
  return true;
}

export type LiveStatus = 'live' | 'next' | 'done' | 'later';

/** Trạng thái của buổi học trong ngày hôm nay */
export function liveStatus(item: ScheduleItem, now = nowMinutes()): LiveStatus {
  const { start, end } = itemMinutes(item);
  if (now >= start && now < end) return 'live';
  if (now >= end) return 'done';
  if (start - now <= 90) return 'next';
  return 'later';
}

/** Tên giảng viên gọn để hiển thị trên thẻ */
export function lecturerLine(item: ScheduleItem): string {
  const raw = (item.lecturerName || '').trim();
  if (!raw) return '';
  return raw
    .split(/[,;\n]+/)
    .map(s => s.trim())
    .filter(Boolean)
    .join(' · ');
}
