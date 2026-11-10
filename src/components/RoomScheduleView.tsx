import React, { useEffect, useMemo, useState } from 'react';
import { FlaskConical, LayoutGrid, Rows3 } from 'lucide-react';
import { ScheduleItem } from '../types';
import { groupByDay, weekStats } from '../utils/weekLayout';
import { DAYS, DAY_LONG, campusMeta, cleanRoom } from '../utils/display';
import { WeekTimetable } from './WeekTimetable';
import { ScheduleCard } from './ScheduleCard';
import { EmptyState, PrintHeader, Segmented, StatTile, cx } from './ui';

interface RoomScheduleViewProps {
  scheduleItems: ScheduleItem[];
  onSelect: (item: ScheduleItem) => void;
}

// Kiểm tra phòng có phải Phòng thí nghiệm (PTN) không — giữ nguyên quy tắc cũ
export const isPTNRoom = (room: string) => {
  const r = (room || '').toLowerCase();
  return (
    (r.includes('ptn') || r.includes('lab') || r.includes('thực hành') || r.includes('thí nghiệm') || r.includes('tn-')) &&
    !r.includes('gd-') &&
    !r.includes('giảng đường')
  );
};

export const RoomScheduleView: React.FC<RoomScheduleViewProps> = ({ scheduleItems, onSelect }) => {
  const [campus, setCampus] = useState<'all' | 'cs1' | 'cs2'>('all');
  const [selectedRoom, setSelectedRoom] = useState<string>('');
  const [layout, setLayout] = useState<'timetable' | 'cards'>('timetable');

  const ptnItems = useMemo(() => scheduleItems.filter(it => isPTNRoom(it.room)), [scheduleItems]);

  const rooms = useMemo(() => {
    const count = new Map<string, number>();
    ptnItems.forEach(it => count.set(it.room, (count.get(it.room) || 0) + 1));
    return Array.from(count.entries())
      .filter(([r]) => campus === 'all' || r.toLowerCase().startsWith(campus))
      .sort((a, b) => a[0].localeCompare(b[0], 'vi'));
  }, [ptnItems, campus]);

  useEffect(() => {
    if (rooms.length && !rooms.some(([r]) => r === selectedRoom)) setSelectedRoom(rooms[0][0]);
  }, [rooms, selectedRoom]);

  const items = useMemo(() => ptnItems.filter(it => it.room === selectedRoom), [ptnItems, selectedRoom]);
  const byDay = useMemo(() => groupByDay(items), [items]);
  const stats = useMemo(() => weekStats(byDay), [byDay]);
  const timed = items.filter(it => it.startTime && it.endTime).length;
  const cm = campusMeta(selectedRoom.toLowerCase().startsWith('cs2') ? 'cs2' : 'cs1');

  return (
    <main>
      <section className="relative bg-ink-950 text-white overflow-hidden print:hidden">
        <div className="absolute inset-0 hex-pattern opacity-80" />
        <div className="absolute -bottom-32 right-10 w-96 h-96 rounded-full bg-emerald-500/20 blur-3xl" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 pt-7 sm:pt-10 pb-8">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5">
            <div className="animate-rise">
              <div className="inline-flex items-center gap-2 text-sm text-brand-200 font-semibold">
                <FlaskConical className="w-4 h-4" /> Lịch phòng thí nghiệm
              </div>
              <h1 className="mt-1.5 text-[28px] sm:text-4xl font-extrabold tracking-tight">
                {selectedRoom ? <span className="text-brand-300">{cleanRoom(selectedRoom)}</span> : 'Phòng thí nghiệm'}
              </h1>
              <p className="mt-1.5 text-ink-300 text-[15px]">
                {rooms.length} phòng thực hành · chỉ hiển thị PTN, đã lọc bỏ giảng đường lý thuyết
              </p>
            </div>
            <Segmented
              value={campus}
              onChange={setCampus}
              className="bg-white/10! [&_button[aria-selected=false]]:text-ink-300 [&_button[aria-selected=false]:hover]:text-white"
              options={[
                { value: 'all', label: 'Tất cả' },
                { value: 'cs1', label: 'PTN CS1' },
                { value: 'cs2', label: 'PTN CS2' }
              ]}
            />
          </div>

          {rooms.length > 0 && (
            <div className="mt-6 flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap">
              {rooms.map(([r, n]) => {
                const active = r === selectedRoom;
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setSelectedRoom(r)}
                    className={cx(
                      'shrink-0 max-w-[280px] inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold ring-1 transition-all cursor-pointer',
                      active ? 'bg-white text-ink-950 ring-white shadow-lift' : 'bg-white/5 text-ink-200 ring-white/10 hover:bg-white/10'
                    )}
                  >
                    <FlaskConical className={cx('w-4 h-4 shrink-0', active ? 'text-brand-600' : 'text-brand-300')} />
                    <span className="truncate">{cleanRoom(r)}</span>
                    <span className={cx('text-[11px] tnum', active ? 'text-ink-400' : 'text-ink-400')}>{n}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-5 space-y-4 print:p-0 print:max-w-none">
        {rooms.length === 0 ? (
          <EmptyState
            icon={<FlaskConical className="w-7 h-7" />}
            title="Chưa có lịch phòng thí nghiệm"
            description="Không tìm thấy buổi học nào được xếp tại phòng thí nghiệm (tên phòng có chữ PTN / Lab / Thực hành) trong bảng tính."
          />
        ) : (
          <>
            <section className="surface p-3.5 sm:p-4 animate-rise print:hidden">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <StatTile label="Ca thực hành" value={items.length} />
                <StatTile label="Có giờ cụ thể" value={timed} />
                <StatTile label="Ngày sử dụng" value={stats.activeDays} hint="trong tuần" />
                <StatTile label="Cơ sở" value={cm.short} hint={cm.place} />
              </div>
              <div className="mt-3.5 pt-3.5 border-t border-ink-100">
                <Segmented
                  size="sm"
                  value={layout}
                  onChange={setLayout}
                  options={[
                    { value: 'timetable', label: 'Lưới tuần', icon: <Rows3 className="w-3.5 h-3.5" /> },
                    { value: 'cards', label: 'Danh sách ca', icon: <LayoutGrid className="w-3.5 h-3.5" /> }
                  ]}
                />
              </div>
            </section>

            {layout === 'timetable' && timed > 0 ? (
              <div>
                <PrintHeader title={`Lịch phòng thí nghiệm · ${cleanRoom(selectedRoom)}`} subtitle={`${items.length} ca thực hành`} />
                <WeekTimetable items={items} onSelect={onSelect} secondary="lecturer" />
              </div>
            ) : (
              <div className="space-y-6">
                {DAYS.filter(d => byDay[d].length).map(d => (
                  <section key={d}>
                    <h3 className="mb-2.5 px-1 text-sm font-extrabold text-ink-900">
                      {DAY_LONG[d]} <span className="text-ink-400 font-semibold">· {byDay[d].length} ca</span>
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                      {byDay[d].map(it => (
                        <ScheduleCard key={it.id} item={it} onSelect={onSelect} onEdit={() => {}} onDelete={() => {}} startDate={it.startDate || '2026-09-14'} showDay={false} />
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
