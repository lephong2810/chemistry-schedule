import { ScheduleItem } from '../types';

export interface EventRecurrenceInfo {
  firstOccurrence: Date;
  endDate: Date;
  weeksCount: number;
  byDay: string;
  untilStr: string;
  formattedStart: string;
  formattedEnd: string;
  summaryText: string;
}

const DAY_CODE_MAP: Record<string, { byDay: string; offset: number; viName: string }> = {
  'Thứ 2': { byDay: 'MO', offset: 0, viName: 'Thứ Hai' },
  'Thứ 3': { byDay: 'TU', offset: 1, viName: 'Thứ Ba' },
  'Thứ 4': { byDay: 'WE', offset: 2, viName: 'Thứ Tư' },
  'Thứ 5': { byDay: 'TH', offset: 3, viName: 'Thứ Năm' },
  'Thứ 6': { byDay: 'FR', offset: 4, viName: 'Thứ Sáu' },
  'Thứ 7': { byDay: 'SA', offset: 5, viName: 'Thứ Bảy' },
  'Chủ nhật': { byDay: 'SU', offset: 6, viName: 'Chủ Nhật' }
};

/**
 * Calculate the exact recurrence parameters, first occurrence date, end date, and weeks count.
 */
export function calculateEventRecurrence(
  item: ScheduleItem,
  defaultStartDate = '2026-09-14'
): EventRecurrenceInfo {
  const dayInfo = DAY_CODE_MAP[item.dayOfWeek] || { byDay: 'MO', offset: 0, viName: item.dayOfWeek };

  // 1. Parse start date
  let sYear = 2026, sMonth = 9, sDay = 14;
  const startStr = item.startDate || defaultStartDate;
  const sParts = startStr.split('-').map(Number);
  if (sParts.length === 3 && !isNaN(sParts[0])) {
    sYear = sParts[0];
    sMonth = sParts[1];
    sDay = sParts[2];
  }
  const startBase = new Date(sYear, sMonth - 1, sDay);

  // Calculate day difference to reach the first class occurrence
  const currentDay = (startBase.getDay() + 6) % 7; // Monday = 0
  let dayDiff = dayInfo.offset - currentDay;
  if (dayDiff < 0) dayDiff += 7;

  const firstOccurrence = new Date(startBase);
  firstOccurrence.setDate(firstOccurrence.getDate() + dayDiff);

  // 2. Parse end date
  let eYear = 2027, eMonth = 1, eDay = 10;
  const endStr = item.endDate || '2027-01-10';
  const eParts = endStr.split('-').map(Number);
  if (eParts.length === 3 && !isNaN(eParts[0])) {
    eYear = eParts[0];
    eMonth = eParts[1];
    eDay = eParts[2];
  }
  const endDate = new Date(eYear, eMonth - 1, eDay);

  // Calculate weeks count
  const diffMs = Math.max(0, endDate.getTime() - firstOccurrence.getTime());
  const calculatedWeeks = Math.max(1, Math.floor(diffMs / (7 * 24 * 3600 * 1000)) + 1);

  // Check if item has durationWeeks explicitly written
  const parsedDuration = item.durationWeeks ? parseInt(item.durationWeeks, 10) : 0;
  const weeksCount = !isNaN(parsedDuration) && parsedDuration > 0 ? parsedDuration : calculatedWeeks;

  const pad = (n: number) => String(n).padStart(2, '0');
  const untilStr = `${eYear}${pad(eMonth)}${pad(eDay)}T235959Z`;

  const formattedStart = `${pad(firstOccurrence.getDate())}/${pad(firstOccurrence.getMonth() + 1)}/${firstOccurrence.getFullYear()}`;
  const formattedEnd = `${pad(endDate.getDate())}/${pad(endDate.getMonth() + 1)}/${endDate.getFullYear()}`;

  const summaryText = `Lặp lại hàng tuần vào ${dayInfo.viName} (${weeksCount} tuần, từ ${formattedStart} đến ${formattedEnd})`;

  return {
    firstOccurrence,
    endDate,
    weeksCount,
    byDay: dayInfo.byDay,
    untilStr,
    formattedStart,
    formattedEnd,
    summaryText
  };
}

/**
 * Generate iCalendar (.ics) string for a list of schedule items
 */
export function generateIcsFile(items: ScheduleItem[], semesterStartDate = '2026-09-14'): string {
  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Chemistry Schedule//HCMUS Faculty of Chemistry//VI',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Thời khóa biểu Khoa Hóa học - HCMUS',
    'X-WR-TIMEZONE:Asia/Ho_Chi_Minh'
  ];

  items.forEach((item) => {
    const recurrence = calculateEventRecurrence(item, semesterStartDate);
    const itemDate = recurrence.firstOccurrence;

    const [startH, startM] = (item.startTime || '07:30').split(':').map(Number);
    const [endH, endM] = (item.endTime || '11:00').split(':').map(Number);

    const pad = (n: number) => String(n).padStart(2, '0');
    const y = itemDate.getFullYear();
    const m = pad(itemDate.getMonth() + 1);
    const d = pad(itemDate.getDate());

    const dtStart = `${y}${m}${d}T${pad(startH)}${pad(startM)}00`;
    const dtEnd = `${y}${m}${d}T${pad(endH)}${pad(endM)}00`;

    const formatIcsTime = (date: Date) => {
      return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };

    const lecturerInfo = item.lecturerName ? `${item.lecturerName} (${item.lecturerEmail || 'VP Khoa'})` : item.lecturerEmail || '';
    const assistantInfo = item.assistantName ? `\\nTrợ giảng (TA): ${item.assistantName}${item.assistantEmail ? ` (${item.assistantEmail})` : ''}` : '';
    const deptInfo = item.department ? `Bộ môn: ${item.department}\\n` : '';
    const classInfo = item.classCode ? `Lớp SV: ${item.classCode}\\n` : '';
    const courseCodeInfo = item.courseCode ? `[${item.courseCode}] ` : '';

    const rrule = `RRULE:FREQ=WEEKLY;WKST=MO;BYDAY=${recurrence.byDay};UNTIL=${recurrence.untilStr}`;

    icsContent.push(
      'BEGIN:VEVENT',
      `UID:chem-${item.id}-${Date.now()}@chem.hcmus.edu.vn`,
      `DTSTAMP:${formatIcsTime(new Date())}`,
      `DTSTART;TZID=Asia/Ho_Chi_Minh:${dtStart}`,
      `DTEND;TZID=Asia/Ho_Chi_Minh:${dtEnd}`,
      rrule,
      `SUMMARY:${courseCodeInfo}${item.subjectName}`,
      `LOCATION:${item.room} (${item.campus === 'cs1' ? 'CS1: Phường Chợ Quán, TPHCM' : 'CS2: Phường Đông Hoà, TPHCM'})`,
      `DESCRIPTION:Giảng viên: ${lecturerInfo}${assistantInfo}\\n${deptInfo}${classInfo}Lịch học: ${recurrence.summaryText}\\n${item.notes || ''}`,
      'STATUS:CONFIRMED',
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      `DESCRIPTION:Nhắc nhở: Sắp đến giờ giảng dạy môn ${item.subjectName} tại ${item.room}`,
      'TRIGGER:-PT30M',
      'END:VALARM',
      'END:VEVENT'
    );
  });

  icsContent.push('END:VCALENDAR');
  return icsContent.join('\r\n');
}

/**
 * Generate .ics for a single schedule item with 30-minute reminder
 */
export function generateSingleClassIcs(item: ScheduleItem, defaultStartDate = '2026-09-14'): string {
  return generateIcsFile([item], defaultStartDate);
}

/**
 * Trigger .ics download for a single class
 */
export function downloadSingleClassIcs(item: ScheduleItem, defaultStartDate = '2026-09-14') {
  const icsData = generateSingleClassIcs(item, defaultStartDate);
  const blob = new Blob([icsData], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const cleanSubject = (item.subjectName || 'Lich_GiangDay')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]/g, '_');
  link.setAttribute('download', `Lich_${cleanSubject}_${item.dayOfWeek.replace(/\s+/g, '')}.ics`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Trigger .ics download in browser with custom filename and date
 */
export function downloadIcsFile(items: ScheduleItem[], semesterStartDate = '2026-09-14', customFileName?: string) {
  const icsData = generateIcsFile(items, semesterStartDate);
  const blob = new Blob([icsData], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const fileName = customFileName || 'ThoiKhoaBieu_KhoaHoa.ics';
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Open Google Calendar Add Event for a specific schedule item
 * with recurring weekly schedule spanning the entire course duration.
 */
export function openGoogleCalendarEvent(item: ScheduleItem, dateStr = '2026-09-14') {
  const recurrence = calculateEventRecurrence(item, dateStr);
  const itemDate = recurrence.firstOccurrence;

  const [startH, startM] = (item.startTime || '07:30').split(':');
  const [endH, endM] = (item.endTime || '11:00').split(':');

  const pad = (n: number) => String(n).padStart(2, '0');
  const y = itemDate.getFullYear();
  const m = pad(itemDate.getMonth() + 1);
  const d = pad(itemDate.getDate());

  const startUtc = `${y}${m}${d}T${startH}${startM}00`;
  const endUtc = `${y}${m}${d}T${endH}${endM}00`;

  const coursePrefix = item.courseCode ? `[${item.courseCode}] ` : '';
  const title = encodeURIComponent(`${coursePrefix}${item.subjectName}`);
  const lecturer = item.lecturerName ? `${item.lecturerName} (${item.lecturerEmail || ''})` : item.lecturerEmail || '';
  const assistant = item.assistantName ? `\nTrợ giảng (TA): ${item.assistantName}${item.assistantEmail ? ` (${item.assistantEmail})` : ''}` : '';
  const dept = item.department ? `\nBộ môn: ${item.department}` : '';
  const cls = item.classCode ? `\nLớp SV: ${item.classCode}` : '';
  const periodInfo = `\nThời gian: ${recurrence.summaryText}`;
  const examInfo = (item.midtermExamPeriod || item.finalExamPeriod) 
    ? `\nLịch thi: ${item.midtermExamPeriod ? `Thi GK: ${item.midtermExamPeriod}` : ''} ${item.finalExamPeriod ? `| Thi CK: ${item.finalExamPeriod}` : ''}`
    : '';

  const details = encodeURIComponent(`Giảng viên: ${lecturer}${assistant}${dept}${cls}${periodInfo}${examInfo}\n${item.notes || ''}`);
  const location = encodeURIComponent(`${item.room} (${item.campus === 'cs1' ? 'CS1: Phường Chợ Quán, TPHCM' : 'CS2: Phường Đông Hoà, TPHCM'})`);

  // Crucial: RRULE with FREQ=WEEKLY, BYDAY, and UNTIL, URL-ENCODED!
  const rrule = `RRULE:FREQ=WEEKLY;WKST=MO;BYDAY=${recurrence.byDay};UNTIL=${recurrence.untilStr}`;
  const encodedRecur = encodeURIComponent(rrule);

  const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startUtc}/${endUtc}&ctz=Asia/Ho_Chi_Minh&details=${details}&location=${location}&recur=${encodedRecur}`;
  window.open(url, '_blank');
}

