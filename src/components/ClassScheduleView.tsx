import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowRightLeft,
  CalendarCheck,
  Check,
  ChevronDown,
  GraduationCap,
  LayoutGrid,
  Printer,
  Rows3,
  Search,
  X
} from 'lucide-react';
import { ScheduleItem } from '../types';
import { groupByDay, findConflicts, weekStats } from '../utils/weekLayout';
import { DAYS, DAY_LONG, classWeek, prettySubject, vnDate } from '../utils/display';
import { WeekTimetable } from './WeekTimetable';
import { ScheduleCard } from './ScheduleCard';
import { Button, EmptyState, Notice, PrintHeader, Segmented, StatTile, cx } from './ui';

interface ClassScheduleViewProps {
  scheduleItems: ScheduleItem[];
  selectedClass?: string;
  setSelectedClass?: (cls: string) => void;
  onSelect: (item: ScheduleItem) => void;
  onOpenSyncModal?: () => void;
}

function parseClassCodes(raw?: string): string[] {
  if (!raw) return [];
  return raw
    .split(/[,;/|\n]+/)
    .map(s => s.trim())
    .filter(Boolean);
}

/** Nhóm lớp theo khoá (2 số đầu): 26, 25, 24, 23… */
function cohortOf(code: string): string {
  const m = code.match(/^(\d{2})/);
  return m ? `K${m[1]}` : 'Khác';
}

export const ClassScheduleView: React.FC<ClassScheduleViewProps> = ({
  scheduleItems,
  selectedClass: controlled,
  setSelectedClass: setControlled,
  onSelect,
  onOpenSyncModal
}) => {
  const [internal, setInternal] = useState('');
  const selectedClass = controlled !== undefined ? controlled : internal;
  const setSelected = (c: string) => (setControlled ? setControlled(c) : setInternal(c));

  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(0);
  const [layout, setLayout] = useState<'timetable' | 'cards'>('timetable');
  const [showConflicts, setShowConflicts] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const allClasses = useMemo(() => {
    const s = new Set<string>();
    scheduleItems.forEach(it => parseClassCodes(it.classCode).forEach(c => s.add(c)));
    return Array.from(s).sort((a, b) => b.localeCompare(a, 'vi', { numeric: true }));
  }, [scheduleItems]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase().replace(/^lớp\s+/, '');
    return q ? allClasses.filter(c => c.toLowerCase().includes(q)) : allClasses;
  }, [allClasses, query]);

  const cohorts = useMemo(() => {
    const map = new Map<string, string[]>();
    allClasses.forEach(c => {
      const k = cohortOf(c);
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(c);
    });
    return Array.from(map.entries());
  }, [allClasses]);

  useEffect(() => setCursor(0), [query]);
  useEffect(() => setShowConflicts(false), [selectedClass]);

  const pick = (c: string) => {
    setSelected(c);
    setQuery('');
    setOpen(false);
    inputRef.current?.blur();
  };

  const items = useMemo(() => {
    if (!selectedClass) return [];
    const t = selectedClass.trim().toLowerCase();
    return scheduleItems.filter(it => parseClassCodes(it.classCode).map(c => c.toLowerCase()).includes(t));
  }, [scheduleItems, selectedClass]);

  const byDay = useMemo(() => groupByDay(items), [items]);
  const conflicts = useMemo(() => findConflicts(byDay), [byDay]);
  const stats = useMemo(() => weekStats(byDay), [byDay]);
  const subjects = useMemo(() => new Set(items.map(i => i.subjectName.trim().toLowerCase())).size, [items]);
  // Tuần học của riêng lớp này (CLC 3 kỳ/năm và chính quy 2 kỳ + hè có mốc khác nhau)
  const wk = useMemo(() => classWeek(items), [items]);

  return (
    <main>
      {/* Phần đầu: chọn lớp */}
      <section className="relative bg-ink-950 text-white print:hidden">
        <div className="absolute inset-0 hex-pattern opacity-80 overflow-hidden" />
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-28 left-1/3 w-96 h-96 rounded-full bg-brand-500/20 blur-3xl" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 pt-7 sm:pt-10 pb-8 sm:pb-10">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5">
            <div className="animate-rise">
              <div className="inline-flex items-center gap-2 text-sm text-brand-200 font-semibold">
                <GraduationCap className="w-4 h-4" /> Thời khoá biểu lớp sinh viên
              </div>
              <h1 className="mt-1.5 text-[28px] sm:text-4xl font-extrabold tracking-tight">
                {selectedClass ? (
                  <>
                    Lớp <span className="text-brand-300">{selectedClass}</span>
                  </>
                ) : (
                  'Lớp nào học gì, ở đâu?'
                )}
              </h1>
              <p className="mt-1.5 text-ink-300 text-[15px]">
                {selectedClass
                  ? `${subjects} môn · ${stats.total} buổi mỗi tuần`
                  : `Chọn một trong ${allClasses.length} lớp để xem lưới thời khoá biểu tuần.`}
              </p>
              {selectedClass && wk && (
                <span
                  className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/10 ring-1 ring-white/10 px-3 py-1 text-xs font-semibold text-brand-200"
                  title="Tính từ ngày bắt đầu sớm nhất của các môn trong lớp này"
                >
                  Lớp đang ở tuần {wk.current}
                  {wk.total ? `/${wk.total}` : ''}
                  <span className="font-medium text-ink-400">· bắt đầu {vnDate(wk.start)}</span>
                </span>
              )}
            </div>

            {/* Ô chọn lớp */}
            <div ref={wrapRef} className="relative w-full lg:w-[380px] animate-rise [animation-delay:80ms]">
              <div className="relative">
                <Search className="w-4.5 h-4.5 text-ink-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  ref={inputRef}
                  value={open ? query : selectedClass ? `Lớp ${selectedClass}` : query}
                  onChange={e => {
                    setQuery(e.target.value);
                    setOpen(true);
                  }}
                  onFocus={() => {
                    setQuery('');
                    setOpen(true);
                  }}
                  onKeyDown={e => {
                    if (e.key === 'ArrowDown') {
                      e.preventDefault();
                      setCursor(c => Math.min(c + 1, filtered.length - 1));
                    } else if (e.key === 'ArrowUp') {
                      e.preventDefault();
                      setCursor(c => Math.max(c - 1, 0));
                    } else if (e.key === 'Enter') {
                      e.preventDefault();
                      if (filtered[cursor]) pick(filtered[cursor]);
                    } else if (e.key === 'Escape') {
                      setOpen(false);
                      inputRef.current?.blur();
                    }
                  }}
                  placeholder="Nhập mã lớp, ví dụ 24CKH, 23HOH…"
                  className="w-full pl-11 pr-20 py-3.5 rounded-2xl bg-white text-ink-900 text-[15px] font-semibold placeholder:text-ink-400 placeholder:font-normal outline-none ring-4 ring-white/10 focus:ring-brand-400/40 shadow-lift"
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center">
                  {selectedClass && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelected('');
                        setQuery('');
                        inputRef.current?.focus();
                      }}
                      aria-label="Bỏ chọn lớp"
                      className="p-1.5 rounded-lg text-ink-400 hover:text-ink-700 hover:bg-ink-100"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setOpen(o => !o)}
                    aria-label="Mở danh sách lớp"
                    className="p-1.5 rounded-lg text-ink-500 hover:text-brand-700 hover:bg-ink-100"
                  >
                    <ChevronDown className={cx('w-4 h-4 transition-transform', open && 'rotate-180')} />
                  </button>
                </div>
              </div>

              {open && (
                <div className="absolute z-50 left-0 right-0 mt-2 bg-white rounded-2xl shadow-lift ring-1 ring-ink-900/10 overflow-hidden animate-pop text-ink-900">
                  <div className="px-3.5 py-2 text-[11px] text-ink-400 border-b border-ink-100">
                    {filtered.length} lớp · ↑ ↓ Enter để chọn
                  </div>
                  <div className="max-h-72 overflow-y-auto p-1.5">
                    {filtered.length === 0 ? (
                      <div className="py-8 text-center text-sm text-ink-400">Không có lớp khớp “{query}”</div>
                    ) : (
                      filtered.map((c, i) => {
                        const sel = c.toLowerCase() === selectedClass.toLowerCase();
                        return (
                          <button
                            key={c}
                            type="button"
                            onMouseEnter={() => setCursor(i)}
                            onClick={() => pick(c)}
                            className={cx(
                              'w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm text-left cursor-pointer',
                              i === cursor ? 'bg-brand-50' : 'hover:bg-ink-50',
                              sel ? 'font-bold text-brand-800' : 'font-semibold text-ink-700'
                            )}
                          >
                            <span>
                              Lớp {c}
                              <span className="ml-2 text-[11px] font-medium text-ink-400">{cohortOf(c)}</span>
                            </span>
                            {sel && <Check className="w-4 h-4 text-brand-600" />}
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-5 space-y-4 print:p-0 print:max-w-none">
        {!selectedClass ? (
          /* Chưa chọn lớp: duyệt theo khoá */
          <section className="surface p-4 sm:p-6 animate-rise">
            <h2 className="text-base font-extrabold text-ink-900">Chọn nhanh theo khoá</h2>
            <p className="text-sm text-ink-500 mt-0.5">Chạm vào mã lớp để mở thời khoá biểu.</p>
            <div className="mt-4 space-y-4">
              {cohorts.map(([k, list]) => (
                <div key={k} className="flex flex-col sm:flex-row gap-2 sm:gap-4">
                  <div className="sm:w-16 shrink-0 text-xs font-bold uppercase tracking-wider text-ink-400 pt-1.5">{k}</div>
                  <div className="flex flex-wrap gap-1.5">
                    {list.map(c => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => pick(c)}
                        className="rounded-full bg-ink-50 ring-1 ring-ink-200 px-3 py-1.5 text-[13px] font-semibold text-ink-700 hover:bg-brand-50 hover:ring-brand-300 hover:text-brand-800 transition-colors cursor-pointer"
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : (
          <>
            {/* Thanh công cụ */}
            <section className="surface p-3.5 sm:p-4 animate-rise no-print">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <StatTile label="Số môn" value={subjects} />
                <StatTile label="Buổi / tuần" value={stats.total} />
                <StatTile label="Tiết / tuần" value={Number.isInteger(stats.periods) ? stats.periods : stats.periods.toFixed(1)} />
                <StatTile label="CS1 · CS2" value={`${stats.cs1} · ${stats.cs2}`} />
              </div>
              <div className="mt-3.5 pt-3.5 border-t border-ink-100 flex flex-wrap items-center gap-2">
                <Segmented
                  size="sm"
                  value={layout}
                  onChange={setLayout}
                  options={[
                    { value: 'timetable', label: 'Lưới tuần', icon: <Rows3 className="w-3.5 h-3.5" /> },
                    { value: 'cards', label: 'Dạng thẻ', icon: <LayoutGrid className="w-3.5 h-3.5" /> }
                  ]}
                />
                <div className="ml-auto flex items-center gap-2">
                  <Button size="sm" variant="secondary" onClick={() => window.print()}>
                    <Printer className="w-3.5 h-3.5" /> In
                  </Button>
                  {onOpenSyncModal && (
                    <Button size="sm" variant="primary" onClick={onOpenSyncModal}>
                      <CalendarCheck className="w-3.5 h-3.5" /> Đồng bộ Google Calendar
                    </Button>
                  )}
                </div>
              </div>
            </section>

            {conflicts.length > 0 && (
              <Notice
                tone="rose"
                icon={<AlertTriangle className="w-4 h-4" />}
                action={
                  <button type="button" onClick={() => setShowConflicts(s => !s)} className="shrink-0 text-xs font-bold underline cursor-pointer">
                    {showConflicts ? 'Thu gọn' : 'Xem chi tiết'}
                  </button>
                }
              >
                <b>{conflicts.length} cặp môn trùng giờ</b> trong lớp {selectedClass}.
                {showConflicts && (
                  <ul className="mt-2 space-y-1 text-xs">
                    {conflicts.map((c, i) => (
                      <li key={i}>
                        <b>
                          {c.day} · {c.overlap}
                        </b>
                        : {prettySubject(c.a.subjectName)} và {prettySubject(c.b.subjectName)}
                      </li>
                    ))}
                  </ul>
                )}
              </Notice>
            )}
            {stats.multiCampusDays.length > 0 && (
              <Notice tone="amber" icon={<ArrowRightLeft className="w-4 h-4" />}>
                <b>Lưu ý di chuyển:</b> lớp học ở cả CS1 và CS2 vào <b>{stats.multiCampusDays.join(', ')}</b>.
              </Notice>
            )}

            {items.length === 0 ? (
              <EmptyState
                icon={<GraduationCap className="w-7 h-7" />}
                title={`Lớp ${selectedClass} chưa có lịch`}
                description="Lớp này chưa được xếp môn nào trong bảng tính."
              />
            ) : layout === 'timetable' ? (
              <div>
                <PrintHeader
                  title={`Thời khoá biểu lớp ${selectedClass}`}
                  subtitle={`${subjects} môn · ${stats.total} buổi/tuần${wk ? ` · tuần ${wk.current}${wk.total ? '/' + wk.total : ''}` : ''}`}
                />
                <WeekTimetable items={items} onSelect={onSelect} secondary="lecturer" />
              </div>
            ) : (
              <div className="space-y-6">
                {DAYS.filter(d => byDay[d].length).map(d => (
                  <section key={d}>
                    <h3 className="mb-2.5 px-1 text-sm font-extrabold text-ink-900">
                      {DAY_LONG[d]} <span className="text-ink-400 font-semibold">· {byDay[d].length} buổi</span>
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                      {byDay[d].map(it => (
                        <ScheduleCard key={it.id} item={it} onSelect={onSelect} onEdit={() => {}} onDelete={() => {}} startDate={it.startDate || '2026-09-14'} />
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
};
