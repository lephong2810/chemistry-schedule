// Tính toán bố cục lưới tuần, phát hiện trùng giờ và thống kê — dùng chung cho Lịch cá nhân, Lịch lớp, Lịch PTN
import { ScheduleItem } from '../types';
import { DAYS, DayName, itemDay, itemMinutes, minutesToHHMM } from './display';

export const GRID_START = 7 * 60; // 07:00
export const GRID_END = 18 * 60; // 18:00

export interface PositionedItem {
  item: ScheduleItem;
  start: number;
  end: number;
  lane: number;
  lanes: number;
  conflict: boolean;
}

export function groupByDay(items: ScheduleItem[]): Record<DayName, ScheduleItem[]> {
  const map = Object.fromEntries(DAYS.map(d => [d, [] as ScheduleItem[]])) as Record<DayName, ScheduleItem[]>;
  items.forEach(it => {
    const d = itemDay(it);
    if (map[d]) map[d].push(it);
  });
  DAYS.forEach(d => map[d].sort((a, b) => itemMinutes(a).start - itemMinutes(b).start));
  return map;
}

/** Xếp các buổi trong một ngày thành các "làn" song song khi trùng giờ */
export function layoutDay(items: ScheduleItem[]): PositionedItem[] {
  const parsed = items
    .map(item => ({ item, ...itemMinutes(item) }))
    .filter(p => p.start < GRID_END && p.end > GRID_START)
    .sort((a, b) => a.start - b.start || b.end - b.start - (a.end - a.start));

  const result: PositionedItem[] = [];
  let cluster: typeof parsed = [];
  let clusterEnd = -1;

  const flush = () => {
    if (!cluster.length) return;
    const lanes: number[] = [];
    const placed = cluster.map(p => {
      let lane = lanes.findIndex(endAt => endAt <= p.start);
      if (lane === -1) {
        lane = lanes.length;
        lanes.push(p.end);
      } else {
        lanes[lane] = p.end;
      }
      return { ...p, lane };
    });
    placed.forEach(p =>
      result.push({ item: p.item, start: p.start, end: p.end, lane: p.lane, lanes: lanes.length, conflict: cluster.length > 1 })
    );
    cluster = [];
  };

  parsed.forEach(p => {
    if (cluster.length && p.start >= clusterEnd) flush();
    cluster.push(p);
    clusterEnd = Math.max(clusterEnd, p.end);
    if (cluster.length === 1) clusterEnd = p.end;
  });
  flush();
  return result;
}

export interface Conflict {
  day: DayName;
  a: ScheduleItem;
  b: ScheduleItem;
  overlap: string;
}

export function findConflicts(byDay: Record<DayName, ScheduleItem[]>): Conflict[] {
  const list: Conflict[] = [];
  DAYS.forEach(day => {
    const arr = byDay[day] || [];
    for (let i = 0; i < arr.length; i++) {
      for (let j = i + 1; j < arr.length; j++) {
        const A = itemMinutes(arr[i]);
        const B = itemMinutes(arr[j]);
        if (A.start < B.end && A.end > B.start) {
          list.push({
            day,
            a: arr[i],
            b: arr[j],
            overlap: `${minutesToHHMM(Math.max(A.start, B.start))}–${minutesToHHMM(Math.min(A.end, B.end))}`
          });
        }
      }
    }
  });
  return list;
}

export interface WeekStats {
  total: number;
  periods: number;
  cs1: number;
  cs2: number;
  activeDays: number;
  multiCampusDays: DayName[];
}

export function weekStats(byDay: Record<DayName, ScheduleItem[]>): WeekStats {
  let periods = 0;
  let cs1 = 0;
  let cs2 = 0;
  let total = 0;
  let activeDays = 0;
  const multiCampusDays: DayName[] = [];
  DAYS.forEach(day => {
    const arr = byDay[day] || [];
    if (arr.length) activeDays++;
    let has1 = false;
    let has2 = false;
    arr.forEach(it => {
      total++;
      if (it.campus === 'cs2') {
        cs2++;
        has2 = true;
      } else {
        cs1++;
        has1 = true;
      }
      const s = parseFloat(String(it.startPeriod ?? ''));
      const e = parseFloat(String(it.endPeriod ?? ''));
      if (!isNaN(s) && !isNaN(e) && e >= s) periods += e - s + 1;
    });
    if (has1 && has2) multiCampusDays.push(day);
  });
  return { total, periods, cs1, cs2, activeDays, multiCampusDays };
}
