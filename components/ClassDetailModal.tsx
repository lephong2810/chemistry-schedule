import React, { useEffect } from 'react';
import { CalendarDays, CalendarPlus, Clock, Download, GraduationCap, Mail, MapPin, StickyNote, Users, X } from 'lucide-react';
import { ScheduleItem } from '../types';
import { openGoogleCalendarEvent, calculateEventRecurrence, downloadSingleClassIcs } from '../utils/calendarExport';
import { parseMultipleLecturers, parseMultipleEmails, parseMultipleCodes, inferPeriodsFromTimes, parsePeriodString } from '../utils/periodConverter';
import { DAY_LONG, DayName, cleanRoom, courseWeek, itemDay, prettySubject, subjectTone, vnDate } from '../utils/display';
import { Avatar, CampusChip, cx } from './ui';

interface ClassDetailModalProps {
  item: ScheduleItem | null;
  onClose: () => void;
  onEdit: (item: ScheduleItem) => void;
  startDate: string;
  isAdmin?: boolean;
  onOpenAdminModal?: () => void;
}

const InfoTile: React.FC<{ icon: React.ReactNode; label: string; children: React.ReactNode; className?: string }> = ({
  icon,
  label,
  children,
  className
}) => (
  <div className={cx('rounded-2xl bg-ink-50 ring-1 ring-ink-100 p-3', className)}>
    <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-ink-400">
      {icon}
      {label}
    </div>
    <div className="mt-1 text-sm font-bold text-ink-900">{children}</div>
  </div>
);

export const ClassDetailModal: React.FC<ClassDetailModalProps> = ({ item, onClose, onEdit, startDate, isAdmin = false }) => {
  useEffect(() => {
    if (!item) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [item, onClose]);

  if (!item) return null;

  const recurrence = calculateEventRecurrence(item, startDate);

  let sPeriod = item.startPeriod;
  let ePeriod = item.endPeriod;
  if (item.notes) {
    const p = parsePeriodString(item.notes);
    if (p) {
      sPeriod = p.startPeriod;
      ePeriod = p.endPeriod;
    }
  }
  if (!sPeriod || !ePeriod) {
    const inf = inferPeriodsFromTimes(item.campus, item.startTime, item.endTime);
    sPeriod = inf.startPeriod;
    ePeriod = inf.endPeriod;
  }
  const nPeriods = Number(ePeriod) - Number(sPeriod) + 1;

  const lecturers = parseMultipleLecturers(item.lecturerName);
  const emails = parseMultipleEmails(item.lecturerEmail);
  const codes = parseMultipleCodes(item.lecturerCode);
  const room = cleanRoom(item.room);
  const tone = subjectTone(item.subjectName);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center sm:p-4 bg-ink-950/50 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={prettySubject(item.subjectName)}
    >
      <div
        className="w-full sm:max-w-xl max-h-[92vh] flex flex-col bg-white rounded-t-3xl sm:rounded-3xl shadow-lift overflow-hidden animate-sheet sm:animate-pop"
        onClick={e => e.stopPropagation()}
      >
        {/* Đầu thẻ */}
        <div className="relative bg-ink-950 text-white px-5 sm:px-6 pt-4 pb-5 overflow-hidden shrink-0">
          <div className="absolute inset-0 hex-pattern opacity-70" />
          <div className={cx('absolute -top-16 -right-10 w-56 h-56 rounded-full blur-3xl opacity-40', tone.bar)} />
          <div className="relative">
            <div className="sm:hidden mx-auto mb-3 w-10 h-1 rounded-full bg-white/25" />
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap text-xs">
                  <span className={cx('rounded-full px-2 py-0.5 font-bold text-white/90', tone.bar)}>{tone.label}</span>
                  {item.courseCode && <span className="text-ink-300 font-semibold tnum">{item.courseCode}</span>}
                  {item.classCode && <span className="text-ink-300">· Lớp {item.classCode}</span>}
                </div>
                <h2 className="mt-2 text-xl sm:text-2xl font-extrabold leading-snug tracking-tight">{prettySubject(item.subjectName)}</h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Đóng"
                className="p-2 -mr-2 -mt-1 rounded-xl text-ink-300 hover:text-white hover:bg-white/10 transition-colors shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Nội dung */}
        <div className="overflow-y-auto px-5 sm:px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-2.5">
            <InfoTile icon={<Clock className="w-3.5 h-3.5" />} label="Thời gian" className="col-span-2 sm:col-span-1">
              {DAY_LONG[itemDay(item) as DayName]} · {item.startTime}–{item.endTime}
              <div className="text-xs font-medium text-ink-500 mt-0.5">
                Tiết {sPeriod}–{ePeriod} ({Number.isFinite(nPeriods) ? nPeriods : '?'} tiết)
              </div>
            </InfoTile>
            <InfoTile icon={<MapPin className="w-3.5 h-3.5" />} label="Địa điểm" className="col-span-2 sm:col-span-1">
              {room || 'Chưa có phòng'}
              <div className="mt-1">
                <CampusChip campus={item.campus} withPlace />
              </div>
            </InfoTile>
            <InfoTile icon={<CalendarDays className="w-3.5 h-3.5" />} label="Thời gian áp dụng" className="col-span-2">
              <span className="tnum">
                {vnDate(item.startDate) || '—'} → {vnDate(item.endDate) || '—'}
              </span>
              <span className="ml-2 text-xs font-semibold text-brand-700 bg-brand-50 rounded-full px-2 py-0.5">
                {item.durationWeeks || `${recurrence.weeksCount} tuần`}
              </span>
              {(() => {
                const wk = courseWeek(item);
                if (!wk) return null;
                const pct = wk.total ? Math.min(100, Math.round((wk.current / wk.total) * 100)) : 0;
                return (
                  <div className="mt-2.5">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-brand-800">
                        Đang ở tuần {wk.current}
                        {wk.total ? ` / ${wk.total}` : ''} của môn
                      </span>
                      {wk.total > 0 && <span className="text-ink-400 tnum">{pct}%</span>}
                    </div>
                    {wk.total > 0 && (
                      <div className="mt-1.5 h-1.5 rounded-full bg-ink-200 overflow-hidden">
                        <div className="h-full rounded-full bg-brand-500" style={{ width: `${pct}%` }} />
                      </div>
                    )}
                  </div>
                );
              })()}
            </InfoTile>
          </div>

          {/* Giảng viên */}
          <section>
            <h3 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-ink-400 mb-2">
              <Users className="w-3.5 h-3.5" /> Giảng viên phụ trách
              {lecturers.length > 1 && <span className="normal-case tracking-normal text-ink-500">· {lecturers.length} Thầy/Cô</span>}
            </h3>
            {lecturers.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-ink-200 p-3 text-sm text-ink-400 italic">Chưa phân công giảng viên</div>
            ) : (
              <div className="space-y-2">
                {lecturers.map((name, idx) => {
                  const email = emails[idx] || (emails.length === 1 ? emails[0] : '');
                  const code = codes[idx] || (codes.length === 1 && lecturers.length === 1 ? codes[0] : '');
                  return (
                    <div key={idx} className="flex items-center gap-3 rounded-2xl ring-1 ring-ink-100 p-2.5 pr-3">
                      <Avatar name={name} size="lg" />
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-ink-900 truncate">{name}</div>
                        <div className="text-xs text-ink-400 truncate">{[code, email].filter(Boolean).join(' · ') || 'Khoa Hoá học'}</div>
                      </div>
                      {email && (
                        <a
                          href={`mailto:${email}`}
                          className="shrink-0 inline-flex items-center gap-1.5 rounded-xl bg-ink-50 hover:bg-brand-50 hover:text-brand-700 px-3 py-2 text-xs font-semibold text-ink-600 transition-colors"
                        >
                          <Mail className="w-3.5 h-3.5" /> Email
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {item.assistantName && (
            <section className="flex items-center gap-3 rounded-2xl bg-violet-50 ring-1 ring-violet-100 p-3">
              <span className="grid place-items-center w-11 h-11 rounded-full bg-violet-100 text-violet-700 shrink-0">
                <GraduationCap className="w-5 h-5" />
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-violet-500">{item.assistantRole || 'Trợ giảng'}</div>
                <div className="font-bold text-ink-900 truncate">{item.assistantName}</div>
                {item.assistantEmail && (
                  <a href={`mailto:${item.assistantEmail.split(',')[0]}`} className="text-xs text-violet-700 hover:underline truncate block">
                    {item.assistantEmail}
                  </a>
                )}
              </div>
            </section>
          )}

          {(item.midtermExamPeriod || item.finalExamPeriod) && (
            <section className="grid grid-cols-2 gap-2.5">
              <div className="rounded-2xl bg-amber-50 ring-1 ring-amber-100 p-3">
                <div className="text-[11px] font-bold uppercase tracking-wider text-amber-700">Thi giữa kỳ</div>
                <div className="mt-1 text-sm font-bold text-ink-900">{item.midtermExamPeriod || 'Chưa có lịch'}</div>
              </div>
              <div className="rounded-2xl bg-indigo-50 ring-1 ring-indigo-100 p-3">
                <div className="text-[11px] font-bold uppercase tracking-wider text-indigo-700">Thi cuối kỳ</div>
                <div className="mt-1 text-sm font-bold text-ink-900">{item.finalExamPeriod || 'Chưa có lịch'}</div>
              </div>
            </section>
          )}

          {item.notes && (
            <section className="flex gap-2.5 rounded-2xl bg-ink-50 ring-1 ring-ink-100 p-3 text-sm text-ink-700 leading-relaxed">
              <StickyNote className="w-4 h-4 text-ink-400 shrink-0 mt-0.5" />
              <p>{item.notes}</p>
            </section>
          )}
        </div>

        {/* Hành động */}
        <div className="shrink-0 px-5 sm:px-6 py-4 border-t border-ink-100 bg-white pb-safe flex flex-col-reverse sm:flex-row gap-2">
          {isAdmin && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onEdit(item);
              }}
              className="rounded-xl px-4 py-2.5 text-sm font-semibold text-ink-700 ring-1 ring-ink-200 hover:bg-ink-50"
            >
              Chỉnh sửa phân công
            </button>
          )}
          <button
            type="button"
            onClick={() => downloadSingleClassIcs(item, startDate)}
            title="Tải tệp .ics để mở trên Lịch iPhone / Android / Outlook"
            className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-ink-700 ring-1 ring-ink-200 hover:bg-ink-50 transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4" /> Tải tệp .ics
          </button>
          <button
            type="button"
            onClick={() => openGoogleCalendarEvent(item, startDate)}
            className="sm:ml-auto inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 sm:py-2.5 text-sm font-bold text-white bg-brand-600 hover:bg-brand-700 shadow-[0_6px_16px_-6px_rgb(11_138_114/0.6)] transition-colors cursor-pointer"
            title={`Lặp lại ${recurrence.weeksCount} tuần trên Google Calendar`}
          >
            <CalendarPlus className="w-4 h-4" /> Thêm vào Google Calendar
          </button>
        </div>
      </div>
    </div>
  );
};
