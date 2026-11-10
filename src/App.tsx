import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { DateRangeFilter } from './components/DateRangeFilter';
import { DayColumn } from './components/DayColumn';
import { ClassDetailModal } from './components/ClassDetailModal';
import { GoogleCalendarSyncModal } from './components/GoogleCalendarSyncModal';
import { RoomScheduleView } from './components/RoomScheduleView';
import { ClassScheduleView } from './components/ClassScheduleView';
import { PersonalScheduleView, MY_LECTURER_KEY } from './components/PersonalScheduleView';
import { LecturerPicker } from './components/LecturerPicker';
import { Button, Segmented, StatTile, cx } from './components/ui';
import { ScheduleItem, TabType, FacultyMember } from './types';
import { DAYS_OF_WEEK } from './data/mockSchedule';
import { isLecturerAssignedToItem, normalizeDayOfWeek } from './utils/periodConverter';
import {
  fetchScheduleFromGoogleSheet,
  getLastSyncTime,
  parseGoogleSheetCSV,
  DEFAULT_CHEMISTRY_CSV,
  ParseResult
} from './services/googleSheetService';
import {
  DAY_SHORT,
  DayName,
  campusMeta,
  cleanRoom,
  greeting,
  isActiveOnDate,
  itemMinutes,
  liveStatus,
  longDateVN,
  minutesToHHMM,
  prettySubject,
  stripTitle,
  todayDayName,
  todayISO
} from './utils/display';
import {
  Search,
  RefreshCw,
  CheckCircle2,
  CalendarCheck,
  SearchX,
  X,
  Eye,
  EyeOff,
  MapPin,
  Sparkles,
  Database
} from 'lucide-react';

const DEFAULT_START = '2026-09-14';
const DEFAULT_END = '2027-01-20';

export default function App() {
  // Điều hướng
  const [activeTab, setActiveTab] = useState<TabType>('teaching');
  const [selectedLecturer, setSelectedLecturer] = useState<string>('all');

  // Khoảng ngày xem (mặc định cả học kỳ 1)
  const [startDate, setStartDate] = useState<string>(DEFAULT_START);
  const [endDate, setEndDate] = useState<string>(DEFAULT_END);

  // Tìm kiếm & bộ lọc
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCampus, setSelectedCampus] = useState<'all' | 'cs1' | 'cs2'>('all');
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [showEmptyDays, setShowEmptyDays] = useState<boolean>(false);

  // Dữ liệu
  const initialParsed = useMemo(() => parseGoogleSheetCSV(DEFAULT_CHEMISTRY_CSV), []);
  const [scheduleList, setScheduleList] = useState<ScheduleItem[]>(initialParsed.items);
  const [facultyList, setFacultyList] = useState<FacultyMember[]>(initialParsed.facultyList);
  const [isSyncing, setIsSyncing] = useState<boolean>(true);
  const [hasLoaded, setHasLoaded] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncState] = useState<string>(() => getLastSyncTime());
  const [toast, setToast] = useState<string | null>(null);

  // Hộp thoại
  const [selectedItem, setSelectedItem] = useState<ScheduleItem | null>(null);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState<boolean>(false);

  const loadScheduleData = useCallback(async (silent = false) => {
    setIsSyncing(true);
    try {
      const data: ParseResult = await fetchScheduleFromGoogleSheet();
      if (data.items.length > 0) {
        setScheduleList(data.items);
        setFacultyList(data.facultyList);
        setLastSyncState(getLastSyncTime());
        if (!silent) setToast(`Đã cập nhật ${data.items.length} buổi học mới nhất`);
      }
    } catch (err) {
      console.error('Lỗi khi làm mới dữ liệu:', err);
      if (!silent) setToast('Không tải được dữ liệu mới — đang dùng bản đã lưu');
    } finally {
      setIsSyncing(false);
      setHasLoaded(true);
    }
  }, []);

  useEffect(() => {
    loadScheduleData(true);
  }, [loadScheduleData]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  // Mở tab "Lịch của tôi" → tự chọn giảng viên đã ghi nhớ
  useEffect(() => {
    if (activeTab !== 'personal' || selectedLecturer !== 'all') return;
    try {
      const saved = localStorage.getItem(MY_LECTURER_KEY);
      if (saved && facultyList.some(f => f.id === saved)) setSelectedLecturer(saved);
    } catch {
      /* bỏ qua */
    }
  }, [activeTab, selectedLecturer, facultyList]);

  const activeLecturerObj = useMemo(() => {
    if (selectedLecturer === 'all') return null;
    return facultyList.find(f => f.id === selectedLecturer || f.name === selectedLecturer || f.email === selectedLecturer) || null;
  }, [selectedLecturer, facultyList]);

  // Bộ lọc chính (giữ nguyên logic cũ)
  const activeItems = useMemo(() => {
    return scheduleList.filter(item => {
      if (selectedCampus !== 'all' && item.campus !== selectedCampus) return false;

      if (selectedLecturer !== 'all') {
        if (!isLecturerAssignedToItem(activeLecturerObj || undefined, item, selectedLecturer)) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const hit =
          item.subjectName.toLowerCase().includes(q) ||
          item.room.toLowerCase().includes(q) ||
          (item.lecturerCode || '').toLowerCase().includes(q) ||
          (item.lecturerName || '').toLowerCase().includes(q) ||
          item.lecturerEmail.toLowerCase().includes(q) ||
          (item.assistantName || '').toLowerCase().includes(q) ||
          (item.assistantEmail || '').toLowerCase().includes(q) ||
          item.classCode?.toLowerCase().includes(q) ||
          item.courseCode?.toLowerCase().includes(q);
        if (!hit) return false;
      }

      const s = item.startDate;
      const e = item.endDate;
      if (s && e && /^\d{4}-\d{2}-\d{2}$/.test(s) && /^\d{4}-\d{2}-\d{2}$/.test(e)) {
        if (s > endDate || e < startDate) return false;
      }
      return true;
    });
  }, [scheduleList, selectedCampus, searchQuery, selectedLecturer, activeLecturerObj, startDate, endDate]);

  const groupedByDay = useMemo(() => {
    const map: Record<string, ScheduleItem[]> = Object.fromEntries(DAYS_OF_WEEK.map(d => [d, []]));
    activeItems.forEach(item => {
      const d = normalizeDayOfWeek(item.dayOfWeek);
      if (map[d]) map[d].push(item);
    });
    Object.keys(map).forEach(d => map[d].sort((a, b) => itemMinutes(a).start - itemMinutes(b).start));
    return map;
  }, [activeItems]);

  const daysToDisplay = useMemo(() => {
    if (showEmptyDays) return DAYS_OF_WEEK;
    const withItems = DAYS_OF_WEEK.filter(d => (groupedByDay[d] || []).length > 0);
    return withItems.length > 0 ? withItems : [];
  }, [showEmptyDays, groupedByDay]);

  // Hôm nay
  const tISO = todayISO();
  const tDay = todayDayName();
  const todayInRange = tISO >= startDate && tISO <= endDate;
  const todayItems = useMemo(
    () => (groupedByDay[tDay] || []).filter(it => isActiveOnDate(it, tISO)),
    [groupedByDay, tDay, tISO]
  );

  const stats = useMemo(() => {
    const lecturers = new Set<string>();
    const classes = new Set<string>();
    const rooms = new Set<string>();
    activeItems.forEach(it => {
      (it.lecturerName || '')
        .split(/[,;\n]+/)
        .map(s => stripTitle(s.trim()))
        .filter(Boolean)
        .forEach(n => lecturers.add(n));
      (it.classCode || '')
        .split(/[,;/|\n]+/)
        .map(s => s.trim())
        .filter(Boolean)
        .forEach(c => classes.add(c));
      const r = cleanRoom(it.room);
      if (r) rooms.add(r);
    });
    return { lecturers: lecturers.size, classes: classes.size, rooms: rooms.size };
  }, [activeItems]);

  const resetAll = () => {
    setSearchQuery('');
    setSelectedCampus('all');
    setSelectedLecturer('all');
    setStartDate(DEFAULT_START);
    setEndDate(DEFAULT_END);
  };

  const hasFilters =
    searchQuery.trim() !== '' || selectedCampus !== 'all' || selectedLecturer !== 'all' || startDate !== DEFAULT_START || endDate !== DEFAULT_END;

  const filterSummary = useMemo(() => {
    const parts: string[] = [];
    if (activeLecturerObj) parts.push(`GV: ${activeLecturerObj.name}`);
    if (selectedCampus !== 'all') parts.push(selectedCampus === 'cs1' ? 'CS1 (Chợ Quán)' : 'CS2 (Đông Hoà)');
    if (searchQuery) parts.push(`Tìm: "${searchQuery}"`);
    return parts.length > 0 ? parts.join(' • ') : 'Tất cả môn học Khoa Hóa';
  }, [activeLecturerObj, selectedCampus, searchQuery]);

  // Phạm vi xuất lịch theo tab đang mở (giữ nguyên logic cũ)
  const calendarSyncInfo = useMemo(() => {
    if (activeTab === 'class') {
      if (!selectedClass || selectedClass === 'all') {
        return { items: [] as ScheduleItem[], summary: 'Chưa chọn lớp sinh viên', activeLecturerName: undefined };
      }
      const target = selectedClass.trim().toLowerCase();
      const filtered = scheduleList.filter(it =>
        it.classCode ? it.classCode.split(/[,;/|\n]+/).map(s => s.trim().toLowerCase()).includes(target) : false
      );
      return { items: filtered, summary: `Lớp sinh viên: ${selectedClass}`, activeLecturerName: undefined };
    }
    if (activeTab === 'personal' && activeLecturerObj) {
      return {
        items: scheduleList.filter(it => isLecturerAssignedToItem(activeLecturerObj, it)),
        summary: `Giảng viên: ${activeLecturerObj.name}`,
        activeLecturerName: activeLecturerObj.name
      };
    }
    return { items: activeItems, summary: filterSummary, activeLecturerName: activeLecturerObj?.name };
  }, [activeTab, selectedClass, activeLecturerObj, scheduleList, activeItems, filterSummary]);

  const now = new Date();

  return (
    <div className="min-h-screen pb-24 md:pb-10">
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isSyncing={isSyncing}
        lastSyncTime={lastSyncTime}
        onRefreshSheet={() => loadScheduleData()}
      />

      {/* ===================== LỊCH TOÀN KHOA ===================== */}
      {activeTab === 'teaching' && (
        <main>
          {/* Phần đầu trang */}
          <section className="relative bg-ink-950 text-white overflow-hidden">
            <div className="absolute inset-0 hex-pattern opacity-80" />
            <div className="absolute -top-32 -right-24 w-[28rem] h-[28rem] rounded-full bg-brand-500/25 blur-3xl" />
            <div className="absolute -bottom-40 -left-20 w-[22rem] h-[22rem] rounded-full bg-sky-500/10 blur-3xl" />
            <div className="relative max-w-7xl mx-auto px-4 sm:px-6 pt-7 sm:pt-10 pb-24 sm:pb-28">
              <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
                <div className="animate-rise">
                  <div className="flex items-center gap-2 text-sm text-ink-300 font-medium">
                    <span>{longDateVN(now)}</span>
                  </div>
                  <h1 className="mt-2 text-[26px] sm:text-4xl font-extrabold tracking-tight leading-tight">
                    {activeLecturerObj ? (
                      <>
                        Lịch giảng dạy của
                        <br className="sm:hidden" /> <span className="text-brand-300">{activeLecturerObj.name}</span>
                      </>
                    ) : (
                      <>
                        {greeting(now)}, <span className="text-brand-300">Thầy/Cô</span>
                      </>
                    )}
                  </h1>
                  <p className="mt-2 text-ink-300 text-[15px] max-w-xl">
                    {todayItems.length > 0
                      ? `Hôm nay có ${todayItems.length} buổi học${activeLecturerObj ? '' : ' trong toàn khoa'}. Chạm vào từng buổi để xem chi tiết hoặc thêm vào lịch điện thoại.`
                      : 'Thời khoá biểu giảng dạy của Khoa Hoá học — cập nhật trực tiếp từ bảng tính của Văn phòng Khoa.'}
                  </p>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 lg:w-[520px] animate-rise [animation-delay:80ms]">
                  <StatTile dark label="Buổi / tuần" value={activeItems.length} />
                  <StatTile dark label="Giảng viên" value={stats.lecturers} />
                  <StatTile dark label="Lớp SV" value={stats.classes} />
                  <StatTile dark label="Phòng" value={stats.rooms} />
                </div>
              </div>
            </div>
          </section>

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 -mt-16 sm:-mt-20 space-y-5">
            {/* Hôm nay */}
            <TodayRail
              items={todayItems}
              loading={isSyncing && !hasLoaded}
              lecturerSelected={!!activeLecturerObj}
              onSelect={setSelectedItem}
            />

            {/* Bộ lọc */}
            <section className="surface p-3.5 sm:p-4 space-y-3 no-print">
              <div className="flex flex-col lg:flex-row gap-2.5">
                <LecturerPicker
                  facultyList={facultyList}
                  value={selectedLecturer}
                  onChange={setSelectedLecturer}
                  className="lg:w-80 shrink-0"
                />
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-ink-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Tìm môn, phòng, lớp, mã môn, giảng viên…"
                    className="w-full h-full min-h-[52px] pl-10 pr-10 rounded-xl bg-white ring-1 ring-ink-200 hover:ring-ink-300 focus:ring-2 focus:ring-brand-500 outline-none text-sm text-ink-900 placeholder:text-ink-400 transition-all"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      aria-label="Xoá tìm kiếm"
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-ink-400 hover:text-ink-700 hover:bg-ink-100"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <Segmented
                  value={selectedCampus}
                  onChange={setSelectedCampus}
                  className="self-start lg:self-stretch"
                  options={[
                    { value: 'all', label: 'Cả 2 cơ sở' },
                    { value: 'cs1', label: 'CS1', icon: <span className={cx('w-2 h-2 rounded-full', campusMeta('cs1').dot)} /> },
                    { value: 'cs2', label: 'CS2', icon: <span className={cx('w-2 h-2 rounded-full', campusMeta('cs2').dot)} /> }
                  ]}
                />
              </div>

              <DateRangeFilter startDate={startDate} endDate={endDate} setStartDate={setStartDate} setEndDate={setEndDate} />

              <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-ink-100">
                <div className="text-sm text-ink-500 mr-auto">
                  Đang hiển thị <b className="text-ink-900 tnum">{activeItems.length}</b> buổi học
                  {hasFilters && (
                    <button type="button" onClick={resetAll} className="ml-2 text-brand-700 font-semibold hover:underline cursor-pointer">
                      Xoá bộ lọc
                    </button>
                  )}
                </div>
                <Button size="sm" variant="ghost" onClick={() => setShowEmptyDays(!showEmptyDays)}>
                  {showEmptyDays ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  {showEmptyDays ? 'Ẩn ngày trống' : 'Hiện cả ngày trống'}
                </Button>
                <Button size="sm" variant="primary" onClick={() => setIsSyncModalOpen(true)}>
                  <CalendarCheck className="w-3.5 h-3.5" />
                  Đồng bộ Google Calendar
                </Button>
              </div>
            </section>

            {/* Nhảy nhanh tới ngày */}
            {daysToDisplay.length > 1 && (
              <div className="sticky top-16 z-30 -mx-4 sm:mx-0 px-4 sm:px-0 py-2 bg-[#f3f5f4]/90 backdrop-blur no-print">
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                  {daysToDisplay.map(d => {
                    const isT = todayInRange && d === tDay;
                    return (
                      <a
                        key={d}
                        href={`#day-${d.replace(/\s+/g, '-')}`}
                        className={cx(
                          'shrink-0 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ring-1 transition-colors',
                          isT ? 'bg-brand-600 text-white ring-brand-600' : 'bg-white text-ink-700 ring-ink-200 hover:ring-ink-300'
                        )}
                      >
                        {DAY_SHORT[d as DayName]}
                        <span className={cx('tnum', isT ? 'text-brand-100' : 'text-ink-400')}>{(groupedByDay[d] || []).length}</span>
                      </a>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Lưới theo ngày */}
            {daysToDisplay.length === 0 ? (
              <div className="surface px-6 py-14 text-center animate-rise">
                <div className="mx-auto mb-4 grid place-items-center w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 ring-1 ring-amber-100">
                  <SearchX className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-ink-900">Không tìm thấy buổi học phù hợp</h3>
                <p className="mt-1.5 text-sm text-ink-500 max-w-md mx-auto">
                  {scheduleList.length > 0
                    ? `Có ${scheduleList.length} buổi học trong bảng tính, nhưng không buổi nào khớp với bộ lọc hiện tại.`
                    : 'Bảng tính chưa có dữ liệu. Vui lòng bấm Cập nhật hoặc kiểm tra kết nối mạng.'}
                </p>
                {scheduleList.length > 0 && (
                  <div className="mt-5">
                    <Button variant="primary" onClick={resetAll}>
                      <RefreshCw className="w-4 h-4" /> Xoá bộ lọc & xem tất cả
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 items-start">
                {daysToDisplay.map(dayName => (
                  <DayColumn
                    key={dayName}
                    dayName={dayName}
                    items={groupedByDay[dayName] || []}
                    startDate={startDate}
                    dayIndex={DAYS_OF_WEEK.indexOf(dayName)}
                    todayInRange={todayInRange}
                    isAdmin={false}
                    onSelect={setSelectedItem}
                    onEdit={() => {}}
                    onDelete={() => {}}
                    onAddForDay={() => {}}
                  />
                ))}
              </div>
            )}
          </div>
        </main>
      )}

      {activeTab === 'personal' && (
        <PersonalScheduleView
          scheduleItems={scheduleList}
          facultyList={facultyList}
          selectedLecturer={selectedLecturer}
          setSelectedLecturer={setSelectedLecturer}
          onSelect={setSelectedItem}
          onOpenSyncModal={() => setIsSyncModalOpen(true)}
          startDate={startDate}
          endDate={endDate}
          setStartDate={setStartDate}
          setEndDate={setEndDate}
        />
      )}

      {activeTab === 'room' && <RoomScheduleView scheduleItems={scheduleList} onSelect={setSelectedItem} />}

      {activeTab === 'class' && (
        <ClassScheduleView
          scheduleItems={scheduleList}
          selectedClass={selectedClass}
          setSelectedClass={setSelectedClass}
          onSelect={setSelectedItem}
          onOpenSyncModal={() => setIsSyncModalOpen(true)}
        />
      )}

      {/* Chân trang */}
      <footer className="no-print max-w-7xl mx-auto px-4 sm:px-6 mt-12 mb-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-ink-400">
        <span className="inline-flex items-center gap-1.5">
          <Database className="w-3.5 h-3.5" />
          Dữ liệu từ bảng tính của Văn phòng Khoa
          {lastSyncTime && <> · cập nhật lúc {lastSyncTime}</>}
        </span>
        <span>Khoa Hoá học · Trường ĐH Khoa học Tự nhiên, ĐHQG-HCM</span>
      </footer>

      {/* Thông báo nhỏ */}
      {toast && (
        <div className="no-print fixed z-50 left-1/2 -translate-x-1/2 bottom-24 md:bottom-6 animate-rise">
          <div className="flex items-center gap-2.5 rounded-2xl bg-ink-950 text-white pl-3.5 pr-2 py-2.5 shadow-lift">
            <CheckCircle2 className="w-5 h-5 text-brand-400 shrink-0" />
            <span className="text-sm font-medium">{toast}</span>
            <button type="button" onClick={() => setToast(null)} className="p-1 rounded-lg text-ink-400 hover:text-white" aria-label="Đóng">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <ClassDetailModal item={selectedItem} onClose={() => setSelectedItem(null)} isAdmin={false} onEdit={() => {}} startDate={startDate} />

      <GoogleCalendarSyncModal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
        items={calendarSyncInfo.items}
        startDate={startDate}
        filterSummary={calendarSyncInfo.summary}
        activeLecturerName={calendarSyncInfo.activeLecturerName}
      />
    </div>
  );
}

/* ---------------- Dải "Hôm nay" ---------------- */
const TodayRail: React.FC<{
  items: ScheduleItem[];
  loading: boolean;
  lecturerSelected: boolean;
  onSelect: (it: ScheduleItem) => void;
}> = ({ items, loading, lecturerSelected, onSelect }) => {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick(x => x + 1), 60000);
    return () => clearInterval(t);
  }, []);

  const sorted = useMemo(() => {
    const order = { live: 0, next: 1, later: 2, done: 3 } as const;
    return items
      .map(it => ({ it, st: liveStatus(it) }))
      .sort((a, b) => order[a.st] - order[b.st] || itemMinutes(a.it).start - itemMinutes(b.it).start);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, tick]);

  const liveCount = sorted.filter(s => s.st === 'live').length;

  return (
    <section className="surface p-4 sm:p-5 animate-rise [animation-delay:120ms]">
      <div className="flex items-center justify-between gap-3 mb-3.5">
        <div className="flex items-center gap-2.5">
          <span className="grid place-items-center w-9 h-9 rounded-xl bg-brand-50 text-brand-600 ring-1 ring-brand-100">
            <Sparkles className="w-4.5 h-4.5" />
          </span>
          <div>
            <h2 className="text-base font-extrabold text-ink-900 leading-tight">Hôm nay</h2>
            <p className="text-xs text-ink-500">
              {loading
                ? 'Đang tải dữ liệu mới nhất…'
                : items.length === 0
                ? lecturerSelected
                  ? 'Thầy/Cô không có buổi dạy nào hôm nay'
                  : 'Không có buổi học nào hôm nay'
                : liveCount > 0
                ? `${liveCount} buổi đang diễn ra · ${items.length} buổi trong ngày`
                : `${items.length} buổi trong ngày`}
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex gap-3 overflow-hidden">
          {[0, 1, 2].map(i => (
            <div key={i} className="w-64 h-[104px] shrink-0 rounded-2xl bg-ink-100 animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl bg-ink-50 border border-dashed border-ink-200 py-6 text-center text-sm text-ink-400">
          Một ngày nhẹ nhàng ☕ — kéo xuống để xem lịch cả tuần.
        </div>
      ) : (
        <div className="flex gap-3 overflow-x-auto no-scrollbar -mx-4 px-4 sm:-mx-5 sm:px-5 scroll-px-4 sm:scroll-px-5 pb-1 snap-x">
          {sorted.map(({ it, st }) => {
            const { start, end } = itemMinutes(it);
            const cm = campusMeta(it.campus);
            return (
              <button
                key={it.id}
                type="button"
                onClick={() => onSelect(it)}
                className={cx(
                  'snap-start shrink-0 w-[260px] text-left rounded-2xl p-3.5 ring-1 transition-all cursor-pointer hover:-translate-y-0.5 hover:shadow-lift',
                  st === 'live' ? 'bg-ink-950 text-white ring-ink-950' : 'bg-white ring-ink-200',
                  st === 'done' && 'opacity-55'
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className={cx('text-sm font-extrabold tnum', st === 'live' ? 'text-white' : 'text-ink-900')}>
                    {minutesToHHMM(start)} – {minutesToHHMM(end)}
                  </span>
                  {st === 'live' && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-brand-500 px-2 py-0.5 text-[10px] font-bold uppercase">
                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" /> Đang học
                    </span>
                  )}
                  {st === 'next' && <span className="rounded-full bg-amber-100 text-amber-800 px-2 py-0.5 text-[10px] font-bold uppercase">Sắp tới</span>}
                  {st === 'done' && <span className="text-[10px] font-bold uppercase text-ink-400">Đã xong</span>}
                </div>
                <div className={cx('mt-1.5 font-bold text-sm leading-snug line-clamp-2 min-h-[2.5em]', st === 'live' ? 'text-white' : 'text-ink-900')}>
                  {prettySubject(it.subjectName)}
                </div>
                <div className={cx('mt-2 flex items-center gap-1.5 text-xs truncate', st === 'live' ? 'text-ink-300' : 'text-ink-500')}>
                  <MapPin className="w-3.5 h-3.5 shrink-0" />
                  <span className="font-semibold">{cm.short}</span>
                  <span className="truncate">· {cleanRoom(it.room) || 'Chưa có phòng'} · {it.classCode}</span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
};
