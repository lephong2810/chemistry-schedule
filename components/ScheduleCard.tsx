import React from 'react';
import { CalendarPlus, Edit3, GraduationCap, MapPin, Trash2, Users } from 'lucide-react';
import { ScheduleItem } from '../types';
import { openGoogleCalendarEvent } from '../utils/calendarExport';
import { formatLecturerWithCode } from '../utils/periodConverter';
import {
  cleanRoom,
  courseWeek,
  itemMinutes,
  liveStatus,
  minutesToHHMM,
  periodLabel,
  prettySubject,
  shortDate,
  subjectTone
} from '../utils/display';
import { Avatar, CampusChip, cx } from './ui';

interface ScheduleCardProps {
  item: ScheduleItem;
  onSelect: (item: ScheduleItem) => void;
  onEdit: (item: ScheduleItem) => void;
  onDelete: (id: string) => void;
  startDate: string;
  isAdmin?: boolean;
  /** Thẻ thuộc ngày hôm nay → hiển thị trạng thái Đang diễn ra / Sắp tới */
  isToday?: boolean;
  showDay?: boolean;
}

export const ScheduleCard: React.FC<ScheduleCardProps> = ({
  item,
  onSelect,
  onEdit,
  onDelete,
  startDate,
  isAdmin = false,
  isToday = false,
  showDay = false
}) => {
  const { start, end } = itemMinutes(item);
  const tone = subjectTone(item.subjectName);
  const room = cleanRoom(item.room);
  const lecturer = formatLecturerWithCode(item.lecturerName, item.lecturerCode) || item.lecturerEmail;
  const multi = /[,;]/.test(item.lecturerName || '');
  const status = isToday ? liveStatus(item) : null;
  const wk = courseWeek(item);

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={() => onSelect(item)}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(item);
        }
      }}
      className={cx(
        'group relative flex gap-3 bg-white rounded-2xl p-3 pr-3.5 ring-1 cursor-pointer transition-all duration-200',
        'hover:-translate-y-0.5 hover:shadow-lift',
        status === 'live' ? 'ring-2 ring-brand-500 shadow-[0_8px_24px_-10px_rgb(18_168_138/0.5)]' : 'ring-ink-900/[0.07] shadow-soft',
        status === 'done' && 'opacity-60 hover:opacity-100'
      )}
    >
      {/* Cột thời gian */}
      <div className="w-[58px] shrink-0 flex flex-col items-center pt-0.5">
        <div className="text-[15px] font-extrabold text-ink-900 tnum leading-none">{minutesToHHMM(start)}</div>
        <div className="text-[11px] text-ink-400 tnum mt-1">{minutesToHHMM(end)}</div>
        <div className={cx('mt-2 w-1 flex-1 min-h-6 rounded-full', tone.bar)} />
      </div>

      {/* Nội dung */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap mb-1">
          {status === 'live' && (
            <span className="inline-flex items-center gap-1 rounded-full bg-brand-600 text-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide">
              <span className="relative flex w-1.5 h-1.5">
                <span className="absolute inset-0 rounded-full bg-white animate-ping opacity-75" />
                <span className="relative w-1.5 h-1.5 rounded-full bg-white" />
              </span>
              Đang diễn ra
            </span>
          )}
          {status === 'next' && (
            <span className="rounded-full bg-amber-100 text-amber-800 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide">
              Sắp bắt đầu
            </span>
          )}
          <span className="text-[11px] font-semibold text-ink-500">
            {showDay && <>{item.dayOfWeek} · </>}
            {periodLabel(item)}
          </span>
          {item.courseCode && <span className="text-[11px] font-medium text-ink-400 tnum">· {item.courseCode}</span>}
        </div>

        <h4 className="font-bold text-ink-900 text-[15px] leading-snug line-clamp-2 group-hover:text-brand-700 transition-colors">
          {prettySubject(item.subjectName)}
        </h4>

        <div className="mt-2 flex items-center gap-1.5 flex-wrap">
          <CampusChip campus={item.campus} />
          <span className="inline-flex items-center gap-1 rounded-full bg-ink-50 ring-1 ring-inset ring-ink-200 px-2 py-0.5 text-[11px] font-semibold text-ink-700">
            <MapPin className="w-3 h-3 text-ink-400" />
            {room || 'Chưa có phòng'}
          </span>
          {item.classCode && (
            <span className="inline-flex items-center rounded-full bg-white ring-1 ring-inset ring-ink-200 px-2 py-0.5 text-[11px] font-semibold text-ink-600">
              {item.classCode}
            </span>
          )}
        </div>

        {lecturer && (
          <div className="mt-2.5 flex items-center gap-2 text-[13px] text-ink-700 min-w-0">
            {multi ? (
              <span className="grid place-items-center w-6 h-6 rounded-full bg-ink-100 text-ink-500 shrink-0">
                <Users className="w-3.5 h-3.5" />
              </span>
            ) : (
              <Avatar name={item.lecturerName} size="sm" />
            )}
            <span className="truncate font-medium" title={lecturer}>
              {lecturer}
            </span>
          </div>
        )}

        {item.assistantName && (
          <div className="mt-1.5 flex items-center gap-2 text-xs text-ink-500 min-w-0">
            <span className="grid place-items-center w-6 h-6 rounded-full bg-violet-50 text-violet-600 shrink-0">
              <GraduationCap className="w-3.5 h-3.5" />
            </span>
            <span className="truncate">
              <span className="font-semibold text-violet-700">Trợ giảng</span> · {item.assistantName}
            </span>
          </div>
        )}

        {(item.midtermExamPeriod || item.finalExamPeriod) && (
          <div className="mt-2.5 flex items-center gap-1.5 flex-wrap text-[11px]">
            {item.midtermExamPeriod && (
              <span className="rounded-md bg-amber-50 text-amber-800 px-1.5 py-0.5 font-medium">
                <b>Thi GK</b> {item.midtermExamPeriod}
              </span>
            )}
            {item.finalExamPeriod && (
              <span className="rounded-md bg-indigo-50 text-indigo-800 px-1.5 py-0.5 font-medium">
                <b>Thi CK</b> {item.finalExamPeriod}
              </span>
            )}
          </div>
        )}

        <div className="mt-2.5 pt-2 border-t border-dashed border-ink-100 flex items-center justify-between gap-2">
          <span className="text-[11px] text-ink-400 truncate tnum" title="Tuần học tính theo ngày bắt đầu của chính môn này">
            {wk ? (
              <span className="font-semibold text-brand-700">
                Tuần {wk.current}
                {wk.total ? `/${wk.total}` : ''}
              </span>
            ) : (
              item.durationWeeks || '—'
            )}{' '}
            · {shortDate(item.startDate)} → {shortDate(item.endDate)}
          </span>
          <div className="flex items-center gap-0.5 shrink-0">
            <button
              type="button"
              onClick={e => {
                e.stopPropagation();
                openGoogleCalendarEvent(item, startDate);
              }}
              title="Thêm buổi học này vào Google Calendar (lặp lại cả học kỳ)"
              aria-label="Thêm vào Google Calendar"
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold text-ink-500 hover:text-brand-700 hover:bg-brand-50 transition-colors cursor-pointer"
            >
              <CalendarPlus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Thêm vào lịch</span>
            </button>
            {isAdmin && (
              <>
                <button
                  type="button"
                  onClick={e => {
                    e.stopPropagation();
                    onEdit(item);
                  }}
                  title="Chỉnh sửa"
                  className="p-1.5 rounded-lg text-ink-400 hover:text-brand-700 hover:bg-brand-50"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={e => {
                    e.stopPropagation();
                    if (confirm(`Xoá lịch "${item.subjectName}"?`)) onDelete(item.id);
                  }}
                  title="Xoá"
                  className="p-1.5 rounded-lg text-ink-400 hover:text-rose-600 hover:bg-rose-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </article>
  );
};
