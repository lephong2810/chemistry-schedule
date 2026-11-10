// Lưới thời khoá biểu tuần (máy tính) + danh sách theo ngày (điện thoại)
import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Coffee, MapPin } from 'lucide-react';
import { ScheduleItem } from '../types';
import {
  DAYS,
  DAY_LONG,
  DAY_SHORT,
  DayName,
  campusMeta,
  cleanRoom,
  itemMinutes,
  lecturerLine,
  liveStatus,
  minutesToHHMM,
  nowMinutes,
  periodLabel,
  prettySubject,
  subjectTone,
  todayDayName
} from '../utils/display';
import { GRID_END, GRID_START, groupByDay, layoutDay } from '../utils/weekLayout';
import { cx } from './ui';

const HOUR_H = 64;
const HOURS = Array.from({ length: (GRID_END - GRID_START) / 60 + 1 }, (_, i) => 7 + i);
const px = (min: number) => ((min - GRID_START) / 60) * HOUR_H;

interface Props {
  items: ScheduleItem[];
  onSelect: (item: ScheduleItem) => void;
  /** Thông tin phụ hiển thị trên ô: lớp SV hay giảng viên */
  secondary?: 'class' | 'lecturer';
}

export const WeekTimetable: React.FC<Props> = ({ items, onSelect, secondary = 'class' }) => {
  const byDay = useMemo(() => groupByDay(items), [items]);
  const today = todayDayName();
  const [now, setNow] = useState(nowMinutes());
  useEffect(() => {
    const t = setInterval(() => setNow(nowMinutes()), 60000);
    return () => clearInterval(t);
  }, []);

  const visibleDays = DAYS.filter(d => d !== 'Chủ nhật' || byDay[d].length > 0);
  const firstWithItems = (DAYS.find(d => byDay[d].length > 0) || 'Thứ 2') as DayName;
  const [mobileDay, setMobileDay] = useState<DayName>(byDay[today]?.length ? today : firstWithItems);
  useEffect(() => {
    if (!byDay[mobileDay]?.length) setMobileDay(byDay[today]?.length ? today : firstWithItems);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  const totalH = px(GRID_END);

  return (
    <>
      {/* ============ Điện thoại: chọn ngày + danh sách ============ */}
      <div className="md:hidden print:hidden space-y-3">
        <div className="surface p-1.5 grid grid-cols-7 gap-1">
          {DAYS.map(d => {
            const n = byDay[d].length;
            const active = d === mobileDay;
            return (
              <button
                key={d}
                type="button"
                onClick={() => setMobileDay(d)}
                className={cx(
                  'relative flex flex-col items-center rounded-xl py-2 transition-all cursor-pointer',
                  active ? 'bg-ink-900 text-white shadow-soft' : n ? 'text-ink-800 hover:bg-ink-50' : 'text-ink-300'
                )}
              >
                <span className="text-[13px] font-bold">{DAY_SHORT[d]}</span>
                <span className={cx('text-[10px] font-semibold tnum', active ? 'text-brand-300' : 'text-ink-400')}>
                  {n ? `${n} buổi` : '–'}
                </span>
                {d === today && <span className={cx('absolute top-1 right-1.5 w-1.5 h-1.5 rounded-full', active ? 'bg-brand-300' : 'bg-brand-500')} />}
              </button>
            );
          })}
        </div>

        <div className="flex items-baseline justify-between px-1">
          <h3 className="text-base font-extrabold text-ink-900">
            {DAY_LONG[mobileDay]}
            {mobileDay === today && <span className="ml-2 text-xs font-bold text-brand-600">Hôm nay</span>}
          </h3>
          <span className="text-xs text-ink-400">{byDay[mobileDay].length} buổi</span>
        </div>

        {byDay[mobileDay].length === 0 ? (
          <div className="surface py-10 flex flex-col items-center gap-2 text-ink-400">
            <Coffee className="w-6 h-6" />
            <span className="text-sm font-medium">Không có lịch trong ngày này</span>
          </div>
        ) : (
          <ol className="relative space-y-2.5 pl-4 before:absolute before:left-[5px] before:top-2 before:bottom-2 before:w-px before:bg-ink-200">
            {byDay[mobileDay].map(it => {
              const { start, end } = itemMinutes(it);
              const cm = campusMeta(it.campus);
              const st = mobileDay === today ? liveStatus(it, now) : null;
              return (
                <li key={it.id} className="relative animate-rise">
                  <span
                    className={cx(
                      'absolute -left-4 top-4 w-[11px] h-[11px] rounded-full ring-[3px] ring-[#f3f5f4]',
                      st === 'live' ? 'bg-brand-500' : cm.dot
                    )}
                  />
                  <button
                    type="button"
                    onClick={() => onSelect(it)}
                    className={cx(
                      'w-full text-left surface p-3.5 active:scale-[0.99] transition-transform cursor-pointer',
                      st === 'live' && 'ring-2 ring-brand-500',
                      st === 'done' && 'opacity-60'
                    )}
                  >
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="font-bold text-ink-900 tnum">
                        {minutesToHHMM(start)} – {minutesToHHMM(end)}
                      </span>
                      <span className="text-ink-400">{periodLabel(it)}</span>
                    </div>
                    <div className="mt-1 font-bold text-[15px] text-ink-900 leading-snug">{prettySubject(it.subjectName)}</div>
                    <div className="mt-1.5 flex items-center gap-1.5 text-xs text-ink-500 flex-wrap">
                      <span className={cx('inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold ring-1 ring-inset', cm.chip)}>
                        <MapPin className="w-3 h-3" />
                        {cm.short} · {cleanRoom(it.room) || 'Chưa có phòng'}
                      </span>
                      <span className="truncate">{secondary === 'class' ? it.classCode : lecturerLine(it)}</span>
                    </div>
                  </button>
                </li>
              );
            })}
          </ol>
        )}
      </div>

      {/* ============ Máy tính: lưới tuần theo giờ ============ */}
      <div className="hidden md:block print:block surface overflow-hidden print-fit">
        <div className="overflow-x-auto print:overflow-visible">
          <div style={{ minWidth: visibleDays.length * 132 + 64 }}>
            {/* Hàng tiêu đề thứ */}
            <div className="flex border-b border-ink-100 bg-white sticky top-0 z-20">
              <div className="w-16 shrink-0" />
              <div className="flex-1 grid" style={{ gridTemplateColumns: `repeat(${visibleDays.length}, minmax(0, 1fr))` }}>
                {visibleDays.map(d => {
                  const n = byDay[d].length;
                  const isToday = d === today;
                  return (
                    <div key={d} className="px-2 py-3 text-center">
                      <div
                        className={cx(
                          'inline-flex flex-col items-center rounded-xl px-3 py-1',
                          isToday && 'bg-ink-900 text-white print:bg-transparent print:text-ink-900'
                        )}
                      >
                        <span className={cx('text-sm font-extrabold', !isToday && 'text-ink-900')}>{DAY_LONG[d]}</span>
                        <span className={cx('text-[10px] font-semibold', isToday ? 'text-brand-300 print:text-ink-500' : n ? 'text-ink-400' : 'text-ink-300')}>
                          {isToday ? <span className="print:hidden">Hôm nay · </span> : ''}
                          {n ? `${n} buổi` : 'Trống'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Thân lưới */}
            <div className="flex relative" style={{ height: totalH + 8 }}>
              {/* Trục giờ */}
              <div className="w-16 shrink-0 relative select-none">
                {HOURS.map(h => (
                  <div
                    key={h}
                    className="absolute right-2.5 -translate-y-1/2 text-[11px] font-semibold text-ink-400 tnum"
                    style={{ top: px(h * 60) + 4 }}
                  >
                    {String(h).padStart(2, '0')}:00
                  </div>
                ))}
              </div>

              <div
                className="flex-1 grid relative"
                style={{ gridTemplateColumns: `repeat(${visibleDays.length}, minmax(0, 1fr))`, marginTop: 4 }}
              >
                {/* Đường kẻ giờ */}
                <div className="absolute inset-0 pointer-events-none">
                  {HOURS.map(h => (
                    <div key={h} className="absolute left-0 right-0 border-t border-ink-100" style={{ top: px(h * 60) }} />
                  ))}
                  <div
                    className="absolute left-0 right-0 bg-[repeating-linear-gradient(135deg,transparent,transparent_6px,rgb(11_20_36/0.025)_6px,rgb(11_20_36/0.025)_12px)] flex items-center justify-center"
                    style={{ top: px(11 * 60 + 50), height: px(12 * 60 + 40) - px(11 * 60 + 50) }}
                  >
                    <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-ink-300">Nghỉ trưa</span>
                  </div>
                </div>

                {visibleDays.map(d => {
                  const isToday = d === today;
                  const positioned = layoutDay(byDay[d]);
                  return (
                    <div key={d} className={cx('relative border-l border-ink-100', isToday && 'bg-brand-50/40 print:bg-transparent')}>
                      {isToday && now >= GRID_START && now <= GRID_END && (
                        <div className="absolute left-0 right-0 z-10 pointer-events-none print:hidden" style={{ top: px(now) }}>
                          <div className="relative h-0.5 bg-rose-500">
                            <span className="absolute -left-1 -top-[3px] w-2 h-2 rounded-full bg-rose-500" />
                          </div>
                        </div>
                      )}
                      {positioned.map(p => {
                        const h = Math.max(px(p.end) - px(p.start), 44);
                        const w = 100 / p.lanes;
                        const cm = campusMeta(p.item.campus);
                        const tone = subjectTone(p.item.subjectName);
                        const compact = h < 96 || p.lanes > 1;
                        const room = cleanRoom(p.item.room);
                        const sub = secondary === 'class' ? p.item.classCode : lecturerLine(p.item);
                        return (
                          <button
                            key={p.item.id}
                            type="button"
                            onClick={() => onSelect(p.item)}
                            title={`${prettySubject(p.item.subjectName)}\n${minutesToHHMM(p.start)}–${minutesToHHMM(p.end)} · ${cm.short} ${room}\n${sub || ''}`}
                            className={cx(
                              'absolute rounded-xl ring-1 ring-inset text-left overflow-hidden transition-all cursor-pointer',
                              'hover:z-10 hover:shadow-lift hover:-translate-y-px focus-visible:z-10',
                              p.conflict ? 'bg-rose-50 hover:bg-rose-100 ring-rose-300 text-rose-950' : cm.block
                            )}
                            style={{
                              top: px(p.start) + 1,
                              height: h - 2,
                              left: `calc(${p.lane * w}% + 3px)`,
                              width: `calc(${w}% - 6px)`
                            }}
                          >
                            <span className={cx('absolute left-0 top-0 bottom-0 w-1', p.conflict ? 'bg-rose-500' : tone.bar)} />
                            <span className="block pl-2.5 pr-2 py-1.5 h-full">
                              <span className="flex items-center justify-between gap-1 text-[10px] font-bold tnum opacity-80">
                                <span>
                                  {minutesToHHMM(p.start)}–{minutesToHHMM(p.end)}
                                </span>
                                {p.conflict && <AlertTriangle className="w-3 h-3 text-rose-600 shrink-0" />}
                              </span>
                              <span className={cx('block font-bold leading-snug text-ink-900 mt-0.5', compact ? 'text-[11px] line-clamp-2' : 'text-[12.5px] line-clamp-3')}>
                                {prettySubject(p.item.subjectName)}
                              </span>
                              {(!compact || h >= 70) && (
                                <span className="block mt-1 text-[11px] font-semibold opacity-80 truncate">
                                  {compact ? room || '—' : `${cm.short} · ${room || 'Chưa có phòng'}`}
                                </span>
                              )}
                              {!compact && sub && <span className="block text-[10.5px] opacity-70 truncate">{sub}</span>}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Chú giải */}
        <div className="flex items-center justify-between flex-wrap gap-2 px-4 py-2.5 border-t border-ink-100 bg-ink-50/50 text-[11px] text-ink-500 print:hidden">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-brand-100 ring-1 ring-brand-300" /> CS1 · Chợ Quán
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-amber-100 ring-1 ring-amber-300" /> CS2 · Đông Hoà
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-rose-100 ring-1 ring-rose-300" /> Trùng giờ
            </span>
          </div>
          <span className="inline-flex items-center gap-1.5 print:hidden">
            <span className="w-3 h-0.5 bg-rose-500 rounded" /> Thời điểm hiện tại
          </span>
        </div>
      </div>
    </>
  );
};
