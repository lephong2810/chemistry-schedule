import React from 'react';
import { Coffee, Plus } from 'lucide-react';
import { ScheduleItem } from '../types';
import { ScheduleCard } from './ScheduleCard';
import { DAY_LONG, DayName, todayDayName } from '../utils/display';
import { cx } from './ui';

interface DayColumnProps {
  dayName: string;
  items: ScheduleItem[];
  startDate: string;
  dayIndex: number;
  isAdmin?: boolean;
  /** Ngày hôm nay có nằm trong khoảng ngày đang xem không */
  todayInRange?: boolean;
  onSelect: (item: ScheduleItem) => void;
  onEdit: (item: ScheduleItem) => void;
  onDelete: (id: string) => void;
  onAddForDay: (dayName: any) => void;
}

export const DayColumn: React.FC<DayColumnProps> = ({
  dayName,
  items,
  startDate,
  isAdmin = false,
  todayInRange = true,
  onSelect,
  onEdit,
  onDelete,
  onAddForDay
}) => {
  const isToday = todayInRange && todayDayName() === dayName;
  const long = DAY_LONG[dayName as DayName] || dayName;

  return (
    <section
      id={`day-${dayName.replace(/\s+/g, '-')}`}
      className={cx(
        'rounded-3xl p-2.5 sm:p-3 flex flex-col scroll-mt-28 animate-rise',
        isToday ? 'bg-brand-50/70 ring-2 ring-brand-300/70' : 'bg-ink-100/50 ring-1 ring-ink-900/[0.04]'
      )}
    >
      <header className="flex items-center justify-between px-1.5 pt-0.5 pb-2.5">
        <div className="flex items-center gap-2">
          <h3 className={cx('font-extrabold tracking-tight text-[15px]', isToday ? 'text-brand-900' : 'text-ink-900')}>{long}</h3>
          {isToday && (
            <span className="rounded-full bg-brand-600 text-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide">
              Hôm nay
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <span className="text-xs font-semibold text-ink-500 tnum">{items.length} buổi</span>
          {isAdmin && (
            <button
              type="button"
              onClick={() => onAddForDay(dayName)}
              className="p-1 rounded-md text-ink-400 hover:text-brand-700 hover:bg-white"
              title={`Thêm môn cho ${dayName}`}
            >
              <Plus className="w-4 h-4" />
            </button>
          )}
        </div>
      </header>

      <div className="space-y-2.5 flex-1">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-1.5 py-8 rounded-2xl border border-dashed border-ink-200 text-ink-400">
            <Coffee className="w-5 h-5" />
            <p className="text-xs font-medium">Không có buổi học</p>
          </div>
        ) : (
          items.map(item => (
            <ScheduleCard
              key={item.id}
              item={item}
              isAdmin={isAdmin}
              isToday={isToday}
              onSelect={onSelect}
              onEdit={onEdit}
              onDelete={onDelete}
              startDate={startDate}
            />
          ))
        )}
      </div>
    </section>
  );
};
