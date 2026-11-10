import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowRightLeft, CalendarCheck, CalendarX2, Pin, PinOff, Printer, UserRound } from 'lucide-react';
import { ScheduleItem, FacultyMember } from '../types';
import { isLecturerAssignedToItem } from '../utils/periodConverter';
import { groupByDay, findConflicts, weekStats } from '../utils/weekLayout';
import { prettySubject } from '../utils/display';
import { WeekTimetable } from './WeekTimetable';
import { LecturerPicker } from './LecturerPicker';
import { Avatar, Button, EmptyState, Notice, StatTile, cx } from './ui';

export const MY_LECTURER_KEY = 'chem_my_lecturer_v1';

interface PersonalScheduleViewProps {
  scheduleItems: ScheduleItem[];
  facultyList: FacultyMember[];
  selectedLecturer: string;
  setSelectedLecturer: (id: string) => void;
  onSelect: (item: ScheduleItem) => void;
  onOpenSyncModal?: () => void;
  startDate?: string;
  endDate?: string;
  setStartDate?: (d: string) => void;
  setEndDate?: (d: string) => void;
}

const readSaved = () => {
  try {
    return localStorage.getItem(MY_LECTURER_KEY) || '';
  } catch {
    return '';
  }
};

export const PersonalScheduleView: React.FC<PersonalScheduleViewProps> = ({
  scheduleItems,
  facultyList,
  selectedLecturer,
  setSelectedLecturer,
  onSelect,
  onOpenSyncModal
}) => {
  const [savedId, setSavedId] = useState<string>(readSaved);
  const [showConflicts, setShowConflicts] = useState(false);

  const current = useMemo(
    () => (selectedLecturer && selectedLecturer !== 'all' ? facultyList.find(f => f.id === selectedLecturer) || null : null),
    [facultyList, selectedLecturer]
  );

  const items = useMemo(
    () => (current ? scheduleItems.filter(it => isLecturerAssignedToItem(current, it)) : []),
    [scheduleItems, current]
  );
  const byDay = useMemo(() => groupByDay(items), [items]);
  const conflicts = useMemo(() => findConflicts(byDay), [byDay]);
  const stats = useMemo(() => weekStats(byDay), [byDay]);

  const isPinned = !!current && savedId === current.id;
  const togglePin = () => {
    if (!current) return;
    try {
      if (isPinned) {
        localStorage.removeItem(MY_LECTURER_KEY);
        setSavedId('');
      } else {
        localStorage.setItem(MY_LECTURER_KEY, current.id);
        setSavedId(current.id);
      }
    } catch {
      /* bỏ qua */
    }
  };

  // Lần đầu chọn tên ở tab này → tự ghi nhớ làm "lịch của tôi"
  const handlePick = (id: string) => {
    setSelectedLecturer(id);
    if (id !== 'all' && !readSaved()) {
      try {
        localStorage.setItem(MY_LECTURER_KEY, id);
        setSavedId(id);
      } catch {
        /* bỏ qua */
      }
    }
  };

  useEffect(() => setShowConflicts(false), [selectedLecturer]);

  /* ---------- Chưa chọn giảng viên: màn hình chào ---------- */
  if (!current) {
    return (
      <main className="max-w-xl mx-auto px-4 sm:px-6 pt-10 sm:pt-16">
        <div className="surface p-6 sm:p-8 text-center animate-rise">
          <div className="mx-auto mb-5 grid place-items-center w-16 h-16 rounded-3xl bg-gradient-to-br from-brand-400 to-brand-700 text-white shadow-lift">
            <UserRound className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-ink-900">Xem lịch dạy của riêng Thầy/Cô</h1>
          <p className="mt-2 text-sm text-ink-500 leading-relaxed">
            Chọn tên một lần — lần sau mở trang, lịch của Thầy/Cô sẽ hiện ra ngay.
            <br className="hidden sm:block" /> Gõ tên không dấu cũng được, ví dụ <i>“tien khoa”</i>.
          </p>
          <div className="mt-6 text-left">
            <LecturerPicker
              facultyList={facultyList}
              value="all"
              onChange={handlePick}
              allowAll={false}
              placeholder="Chạm để tìm tên Thầy/Cô…"
              size="lg"
            />
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-5 sm:pt-7 space-y-4">
      {/* Thẻ hồ sơ */}
      <section className="surface overflow-visible animate-rise">
        <div className="relative rounded-t-2xl bg-ink-950 hex-pattern h-20 sm:h-24 overflow-hidden">
          <div className="absolute -top-20 -right-10 w-72 h-72 rounded-full bg-brand-500/30 blur-3xl" />
        </div>
        <div className="px-4 sm:px-6 pb-5">
          <Avatar name={current.name} size="xl" className="relative -mt-9 sm:-mt-10 w-[72px] h-[72px] sm:w-20 sm:h-20 text-2xl ring-4 ring-white shadow-lift" />
          <div className="mt-3 flex flex-col lg:flex-row lg:items-center gap-4">
            <div className="flex items-center gap-4 min-w-0">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-ink-900 truncate">{current.name}</h1>
                  {isPinned && (
                    <span className="shrink-0 rounded-full bg-brand-50 text-brand-700 ring-1 ring-brand-200 px-2 py-0.5 text-[10px] font-bold uppercase">
                      Lịch của tôi
                    </span>
                  )}
                </div>
                <p className="text-sm text-ink-500 truncate">
                  {[current.code, current.department, current.email].filter(Boolean).join(' · ') || 'Giảng viên Khoa Hoá học'}
                </p>
              </div>
            </div>

            <div className="lg:ml-auto flex flex-wrap items-center gap-2 no-print">
              <LecturerPicker facultyList={facultyList} value={selectedLecturer} onChange={handlePick} allowAll={false} className="w-full sm:w-72" />
              <Button size="sm" variant={isPinned ? 'secondary' : 'ghost'} onClick={togglePin} title="Ghi nhớ để lần sau mở trang hiện ngay lịch này">
                {isPinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
                {isPinned ? 'Bỏ ghi nhớ' : 'Đây là tôi'}
              </Button>
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

          <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <StatTile label="Buổi / tuần" value={stats.total} />
            <StatTile label="Tiết / tuần" value={Number.isInteger(stats.periods) ? stats.periods : stats.periods.toFixed(1)} />
            <StatTile label="Số ngày dạy" value={stats.activeDays} hint="trong tuần" />
            <StatTile label="CS1 · CS2" value={`${stats.cs1} · ${stats.cs2}`} hint="buổi theo cơ sở" />
          </div>
        </div>
      </section>

      {/* Cảnh báo */}
      {(conflicts.length > 0 || stats.multiCampusDays.length > 0) && (
        <div className="space-y-2 no-print">
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
              <b>Có {conflicts.length} chỗ trùng giờ</b> trong lịch dạy — ô màu hồng trên lưới.
              {showConflicts && (
                <ul className="mt-2 space-y-1 text-xs">
                  {conflicts.map((c, i) => (
                    <li key={i}>
                      <b>
                        {c.day} · {c.overlap}
                      </b>
                      : {prettySubject(c.a.subjectName)} ({c.a.classCode || '—'}) và {prettySubject(c.b.subjectName)} ({c.b.classCode || '—'})
                    </li>
                  ))}
                </ul>
              )}
            </Notice>
          )}
          {stats.multiCampusDays.length > 0 && (
            <Notice tone="violet" icon={<ArrowRightLeft className="w-4 h-4" />}>
              <b>Lưu ý di chuyển:</b> Thầy/Cô dạy ở cả CS1 và CS2 vào <b>{stats.multiCampusDays.join(', ')}</b>.
            </Notice>
          )}
        </div>
      )}

      {items.length === 0 ? (
        <EmptyState
          icon={<CalendarX2 className="w-7 h-7" />}
          title="Chưa có lịch giảng dạy trong học kỳ này"
          description="Không tìm thấy buổi học nào được phân công cho Thầy/Cô trong bảng tính. Nếu thấy thiếu, vui lòng liên hệ Văn phòng Khoa."
        />
      ) : (
        <div className={cx('animate-rise')}>
          <WeekTimetable items={items} onSelect={onSelect} secondary="class" />
        </div>
      )}
    </main>
  );
};
