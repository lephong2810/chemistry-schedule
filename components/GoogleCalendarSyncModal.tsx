import React, { useEffect } from 'react';
import { CalendarCheck, Download, ExternalLink, Smartphone, Repeat, MapPin, X } from 'lucide-react';
import { ScheduleItem } from '../types';
import { downloadIcsFile } from '../utils/calendarExport';
import { cleanRoom, prettySubject, vnDate } from '../utils/display';
import { cx } from './ui';

interface GoogleCalendarSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: ScheduleItem[];
  startDate: string;
  filterSummary?: string;
  activeLecturerName?: string;
}

export const GoogleCalendarSyncModal: React.FC<GoogleCalendarSyncModalProps> = ({
  isOpen,
  onClose,
  items,
  startDate,
  filterSummary,
  activeLecturerName
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const fileName = (() => {
    const clean = (s: string) =>
      s
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/đ/g, 'd')
        .replace(/Đ/g, 'D')
        .replace(/[^a-zA-Z0-9]/g, '_')
        .replace(/_+/g, '_');
    if (activeLecturerName && activeLecturerName !== 'all') return `Lich_GiangDay_${clean(activeLecturerName)}.ics`;
    if (filterSummary) return `ThoiKhoaBieu_${clean(filterSummary)}.ics`;
    return 'ThoiKhoaBieu_KhoaHoa_HCMUS.ics';
  })();

  const steps = [
    { icon: Download, title: 'Tải tệp lịch', text: `Một tệp .ics chứa ${items.length} buổi học sẽ được tải về.` },
    { icon: Smartphone, title: 'Mở tệp', text: 'Trên điện thoại: chạm vào tệp vừa tải. Trên máy tính: dùng nút “Nhập vào Google Calendar”.' },
    { icon: Repeat, title: 'Xong!', text: `Các buổi tự lặp lại hằng tuần từ ${vnDate(startDate)}, kèm phòng học và giảng viên.` }
  ];

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center sm:p-4 bg-ink-950/50 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Đồng bộ Google Calendar"
    >
      <div
        className="w-full sm:max-w-lg max-h-[92vh] flex flex-col bg-white rounded-t-3xl sm:rounded-3xl shadow-lift overflow-hidden animate-sheet sm:animate-pop"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-5 sm:px-6 pt-5 pb-4 flex items-start gap-3 border-b border-ink-100">
          <span className="grid place-items-center w-11 h-11 rounded-2xl bg-brand-50 text-brand-600 ring-1 ring-brand-100 shrink-0">
            <CalendarCheck className="w-5 h-5" />
          </span>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-extrabold text-ink-900">Đưa lịch vào điện thoại</h2>
            <p className="text-sm text-ink-500 truncate">{filterSummary || 'Toàn bộ thời khoá biểu'}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Đóng" className="p-2 -mr-2 rounded-xl text-ink-400 hover:text-ink-800 hover:bg-ink-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto px-5 sm:px-6 py-5 space-y-5">
          <ol className="space-y-3">
            {steps.map((s, i) => {
              const Icon = s.icon;
              return (
                <li key={i} className="flex gap-3">
                  <span className="relative grid place-items-center w-9 h-9 rounded-full bg-ink-900 text-white shrink-0">
                    <Icon className="w-4 h-4" />
                    <span className="absolute -top-1 -right-1 grid place-items-center w-4 h-4 rounded-full bg-brand-500 text-[10px] font-bold">{i + 1}</span>
                  </span>
                  <div>
                    <div className="text-sm font-bold text-ink-900">{s.title}</div>
                    <div className="text-[13px] text-ink-500 leading-relaxed">{s.text}</div>
                  </div>
                </li>
              );
            })}
          </ol>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-400">Sẽ xuất {items.length} buổi học</span>
            </div>
            {items.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-ink-200 py-6 text-center text-sm text-ink-400">
                Chưa có buổi học nào trong phạm vi đang chọn.
              </div>
            ) : (
              <div className="max-h-48 overflow-y-auto rounded-2xl ring-1 ring-ink-100 divide-y divide-ink-100">
                {items.map(it => (
                  <div key={it.id} className="px-3 py-2.5 flex items-center gap-3">
                    <span className="w-10 shrink-0 text-center text-[11px] font-bold text-ink-500">{it.dayOfWeek.replace('Thứ ', 'T').replace('Chủ nhật', 'CN')}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-ink-900 truncate">{prettySubject(it.subjectName)}</div>
                      <div className="text-xs text-ink-400 flex items-center gap-1 truncate">
                        <span className="tnum">
                          {it.startTime}–{it.endTime}
                        </span>
                        <MapPin className="w-3 h-3 ml-1" />
                        {cleanRoom(it.room) || '—'}
                        {it.classCode && <> · {it.classCode}</>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="shrink-0 px-5 sm:px-6 py-4 border-t border-ink-100 pb-safe flex flex-col sm:flex-row gap-2">
          <a
            href="https://calendar.google.com/calendar/u/0/r/settings/export"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-ink-700 ring-1 ring-ink-200 hover:bg-ink-50"
          >
            <ExternalLink className="w-4 h-4" /> Nhập vào Google Calendar
          </a>
          <button
            type="button"
            disabled={items.length === 0}
            onClick={() => downloadIcsFile(items, startDate, fileName)}
            className={cx(
              'sm:ml-auto inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 sm:py-2.5 text-sm font-bold text-white bg-brand-600 hover:bg-brand-700 transition-colors cursor-pointer',
              'disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_6px_16px_-6px_rgb(11_138_114/0.6)]'
            )}
          >
            <Download className="w-4 h-4" /> Tải tệp lịch ({items.length} buổi)
          </button>
        </div>
      </div>
    </div>
  );
};
