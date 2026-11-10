import React from 'react';
import { ArrowRight, CalendarRange } from 'lucide-react';
import { cx } from './ui';
import { vnDate } from '../utils/display';

interface DateRangeFilterProps {
  startDate: string;
  endDate: string;
  setStartDate: (val: string) => void;
  setEndDate: (val: string) => void;
}

export const DATE_PRESETS = [
  { label: 'Cả học kỳ 1', start: '2026-09-14', end: '2027-01-20' },
  { label: 'Đợt 1', hint: '14/09 – 08/11', start: '2026-09-14', end: '2026-11-08' },
  { label: 'Đợt 2', hint: '09/11 – 20/01', start: '2026-11-09', end: '2027-01-20' },
  { label: 'Học kỳ 2', hint: '15/02 – 25/06', start: '2027-02-15', end: '2027-06-25' }
];

const DateBox: React.FC<{ label: string; value: string; onChange: (v: string) => void }> = ({ label, value, onChange }) => (
  <label className="relative flex-1 min-w-0 rounded-xl bg-ink-50 ring-1 ring-ink-200 hover:ring-ink-300 px-3 py-1.5 cursor-pointer transition-all focus-within:ring-2 focus-within:ring-brand-500">
    <span className="block text-[10px] font-semibold uppercase tracking-wider text-ink-400">{label}</span>
    <span className="block text-sm font-bold text-ink-900 tnum">{vnDate(value) || '—'}</span>
    <input
      type="date"
      value={value}
      onChange={e => e.target.value && onChange(e.target.value)}
      className="absolute inset-0 opacity-0 cursor-pointer"
      aria-label={label}
    />
  </label>
);

export const DateRangeFilter: React.FC<DateRangeFilterProps> = ({ startDate, endDate, setStartDate, setEndDate }) => {
  return (
    <div className="flex flex-col lg:flex-row lg:items-center gap-2.5">
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar -mx-1 px-1">
        <CalendarRange className="w-4 h-4 text-ink-400 shrink-0 mr-0.5 hidden sm:block" />
        {DATE_PRESETS.map(p => {
          const active = startDate === p.start && endDate === p.end;
          return (
            <button
              key={p.label}
              type="button"
              onClick={() => {
                setStartDate(p.start);
                setEndDate(p.end);
              }}
              title={p.hint}
              className={cx(
                'shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ring-1',
                active ? 'bg-ink-900 text-white ring-ink-900' : 'bg-white text-ink-600 ring-ink-200 hover:ring-ink-300 hover:text-ink-900'
              )}
            >
              {p.label}
              {p.hint && <span className={cx('ml-1 font-medium', active ? 'text-ink-300' : 'text-ink-400')}>{p.hint}</span>}
            </button>
          );
        })}
      </div>
      <div className="flex items-center gap-2 lg:ml-auto lg:w-80">
        <DateBox label="Từ ngày" value={startDate} onChange={setStartDate} />
        <ArrowRight className="w-4 h-4 text-ink-300 shrink-0" />
        <DateBox label="Đến ngày" value={endDate} onChange={setEndDate} />
      </div>
    </div>
  );
};
