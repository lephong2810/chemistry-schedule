import Papa from 'papaparse';
import { ScheduleItem, FacultyMember } from '../types';
import { getPeriodStartTime, getPeriodEndTime, parseTimeAndPeriods, parsePeriodString } from '../utils/periodConverter';

// Dữ liệu CSV mặc định 36 môn học chuẩn của Khoa Hóa học (được VP Khoa sử dụng trọn đời)
export const DEFAULT_CHEMISTRY_CSV = `Mã môn,Tên môn học,Lớp,Thứ,Thời gian bắt đầu ,Thời gian kết thúc ,Cơ sở,Phòng,MSCB,Giảng viên,Email GV,Trợ giảng,Email Trợ giảng,Ngày bắt đầu áp dụng ,Ngày kết thúc áp dụng ,Thi GK,Thi CK,Ghi chú
CHE10002,Hóa hữu cơ 1,24HOHB,2,2,5,2,1,,Nguyễn Thị Thảo Trân,,,,14/9/2026,1/10/2027,14/11/26,1/18/2027,
CHE10002,Hóa hữu cơ 1,24HOHB,6,1,3,2,2,,Nguyễn Thị Thảo Ly,,,,14/9/2026,1/10/2027,14/11/26,1/18/2027,
CHE10003,Hóa hữu cơ 2,24HOH1,3,1,4,2,3,,Nguyễn Trí Hiếu,,,,14/9/2026,1/10/2027,14/11/26,1/18/2027,
CHE10003,Hóa hữu cơ 2,24HOH1A,6,1,4,2,4,,Nguyễn Trường Hải,,,,28/9/2026,1/10/2027,14/11/26,1/18/2027,
CHE10003,Hóa hữu cơ 2,24HOH1B,2,1,4,2,5,,Trần Hoài Tú,,,,28/9/2026,1/10/2027,14/11/26,1/18/2027,
CHE10003,Hóa hữu cơ 2,24HOH2,4,1,4,2,6,,Nguyễn Tấn Tài,,,,14/9/2026,1/10/2027,14/11/26,1/18/2027,
CHE10003,Hóa hữu cơ 2,24HOH2A,3,1,4,2,7,,Phan Thanh Tùng,,,,28/9/2026,1/10/2027,14/11/26,1/18/2027,
CHE10003,Hóa hữu cơ 2,24HOH2B,2,6,9,2,8,,Dương Công Thắng,,,,28/9/2026,1/10/2027,14/11/26,1/18/2027,
CHE10006,Hóa lý 2,24HOH1,3,6,9,2,9,,Cổ Thanh Thiện,,,,28/9/2026,1/10/2027,14/11/26,1/18/2027,
CHE10006,Hóa lý 2,24HOH1,5,6,9,2,10,,Huỳnh Lê Thanh Nguyên,,,,28/9/2026,1/10/2027,14/11/26,1/18/2027,
CHE10006,Hóa lý 2,24HOH1A,6,6,8,2,11,,Phạm Xuân Tài,,,,28/9/2026,1/10/2027,14/11/26,1/18/2027,
CHE10006,Hóa lý 2,24HOH1B,2,6,8,2,12,,Nguyễn Thị Yến Nhi,,,,28/9/2026,1/10/2027,14/11/26,1/18/2027,
CHE10006,Hóa lý 2,24HOH2,4,6,9,2,13,,Nguyễn Thái Hoàng,,,,14/9/2026,1/10/2027,14/11/26,1/18/2027,
CHE10006,Hóa lý 2,24HOH2,6,1,4,2,14,,Hồ Phạm Anh Vũ,,,,14/9/2026,1/10/2027,14/11/26,1/18/2027,
CHE10006,Hóa lý 2,24HOH2A,3,6,8,2,15,,Đặng Minh Mẫn,,,,28/9/2026,1/10/2027,14/11/26,1/18/2027,
CHE10006,Hóa lý 2,24HOH2B,2,1,3,2,16,,Nguyễn Anh Thư,,,,28/9/2026,1/10/2027,14/11/26,1/18/2027,
CHE10008,Hóa Phân tích 2,24HOHB,2,6,9,2,17,,"Lê Thị Huỳnh Mai, Lê Văn Duy",,,,14/9/2026,1/10/2027,14/11/26,1/18/2027,
CHE10010,Hóa vô cơ 2,24HOHB,3,1,4,2,18,,Nguyễn Thị Mai Loan,,,,14/9/2026,1/10/2027,14/11/26,1/18/2027,
CHE10010,Hóa vô cơ 2,24HOHB,6,3.5,5,2,19,,Trương Nguyên Bảo,,,,28/9/2026,1/10/2027,14/11/26,1/18/2027,
CHE10026,Các phương pháp phân tích vật liệu,24HOH1,5,1,4,2,20,,"Võ Thị Hai, Nguyễn Bình Phương Nhân, Nguyễn Thị Thanh Thủy",,,,14/9/2026,1/10/2027,14/11/26,1/18/2027,
CHE10026,Các phương pháp phân tích vật liệu,24HOH2,6,6,9,2,21,,"Hoàng Ngọc Cường, Võ Quốc Khương, Nguyễn Thị Thanh Thủy",,,,14/9/2026,1/10/2027,14/11/26,1/18/2027,
CHE10105,Tổng hợp hữu cơ,1,4,1,4,2,22,,Huỳnh Ngọc Vinh,,,,14/9/2026,1/10/2027,14/11/26,1/18/2027,
CHE10106,Hợp chất thiên nhiên,1,2,6,9,2,23,,Đặng Hoàng Phú,,,,14/9/2026,1/10/2027,14/11/26,1/18/2027,
CHE10121,Kỹ thuật hóa hữu cơ,1,2,6,9,2,24,,"Tân Hoàng, Nguyễn Trường Hải",,,,14/9/2026,1/10/2027,14/11/26,1/18/2027,
CHE10123,Phân tích hữu cơ,1,4,2,5,2,25,,Nguyễn Thị Thảo Trân,,,,14/9/2026,1/10/2027,14/11/26,1/18/2027,
CHE10320,Xử lý mẫu,1,3,1,4,2,26,,"Lê Thị Huỳnh Mai, Lê Văn Duy",,,,14/9/2026,1/10/2027,14/11/26,1/18/2027,
CHE10324,Phân tích kỹ thuật,1,2,6,9,2,27,,"Trương Lâm Sơn Hải, Võ Hoàng Thiện",,,,14/9/2026,1/10/2027,14/11/26,1/18/2027,
CHE10330,Thiết bị phân tích,1,3,6,9,2,28,,"Nguyễn Văn Đông, Võ Hoàng Thiện",,,,14/9/2026,1/10/2027,14/11/26,1/18/2027,
CHE10328,Hoá học nước thải - Kỹ thuật xử lý nước,1,2,1,4,2,29,,Trương Lâm Sơn Hải,,,,14/9/2026,1/10/2027,14/11/26,1/18/2027,
CHE10423,Kỹ thuật tiến hành phản ứng hóa học,1,4,1,4,2,30,,Lê Tiến Khoa,,,,14/9/2026,1/10/2027,14/11/26,1/18/2027,
CHE10505,Phân tích polyme,1,2,6,9,2,31,,Hoàng Ngọc Cường,,,,14/9/2026,1/10/2027,14/11/26,1/18/2027,
CHE10621,Độc chất học,1,2,1,4,2,32,,Nguyễn Anh Thy,,,,14/9/2026,1/10/2027,14/11/26,1/18/2027,
CHE10623,Kiểm nghiệm dược liệu,1,4,1,4,2,33,,Nguyễn Xuân Hải,,,,14/9/2026,1/10/2027,14/11/26,1/18/2027,
CHE10630,Thiết kế dược phẩm bằng máy tính,1,4,6,9,2,34,,Đặng Hoàng Phú,,,,14/9/2026,1/10/2027,14/11/26,1/18/2027,
CHE10601,Hóa dược,1,5,1,4,2,35,,Nguyễn Thị Ý Nhi,,,,14/9/2026,1/10/2027,14/11/26,1/18/2027,
CHE10102,Cơ chế phản ứng hữu cơ 1,1,3,1,4,2,36,,Trần Thu Phương,,,,14/9/2026,1/10/2027,14/11/26,1/18/2027,`;

// URL Google Sheets cố định trọn đời của Khoa Hóa học
export const PERMANENT_SHEET_URL = 'https://docs.google.com/spreadsheets/d/1BZ3Mm6ZZhDnpRYu3VIqLwx6BBuDDKYGoltmXPHjc8AE/edit?gid=0#gid=0';

const STORAGE_KEY_CACHED_SCHEDULE = 'chemistry_cached_schedule_v4';
const STORAGE_KEY_LAST_SYNC = 'chemistry_last_sync_time_v4';

export function getLastSyncTime(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem(STORAGE_KEY_LAST_SYNC) || '';
}

export function setLastSyncTime(): void {
  if (typeof window === 'undefined') return;
  const now = new Date();
  const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')} ngày ${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getFullYear()}`;
  localStorage.setItem(STORAGE_KEY_LAST_SYNC, timeStr);
}

/**
 * Chuẩn hóa tiếng Việt không dấu để so sánh tên cột chính xác tuyệt đối
 */
export function normalizeVietnamese(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();
}

/**
 * Phân tích và chuẩn hóa ngày tháng linh hoạt:
 * - Hỗ trợ dd/mm/yyyy, dd/mm/yy (vd: 14/11/26 -> 14/11/2026)
 * - Hỗ trợ m/d/yyyy, m/d/yy (vd: 1/18/2027 -> 18/01/2027)
 * - Hỗ trợ dải ngày (vd: 14/11/2026 - 20/11/2026)
 * - Luôn xuất: iso: 'YYYY-MM-DD' và display: 'DD/MM/YYYY' (chuẩn Việt Nam)
 */
export function smartParseDate(raw?: string): { iso: string; display: string } {
  if (!raw) return { iso: '', display: '' };
  const str = String(raw).trim();

  // Kiểm tra nếu là dải ngày (ví dụ: '14/11/2026 - 20/11/2026' hoặc '14/11/26 - 20/11/26')
  if (str.includes('-') && str.split('-').length === 2 && !/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    const parts = str.split('-');
    const d1 = smartParseDate(parts[0]);
    const d2 = smartParseDate(parts[1]);
    if (d1.display && d2.display) {
      return { iso: d1.iso, display: `${d1.display} – ${d2.display}` };
    }
  }

  // Nếu đã là YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    const [y, m, d] = str.split('-');
    return { iso: str, display: `${d}/${m}/${y}` };
  }

  const parts = str.split(/[\/\-\.]/);
  if (parts.length === 3) {
    const p1 = parseInt(parts[0], 10);
    const p2 = parseInt(parts[1], 10);
    let year = parseInt(parts[2], 10);

    if (isNaN(p1) || isNaN(p2) || isNaN(year)) return { iso: '', display: str };

    // Năm 2 chữ số (ví dụ: 26 -> 2026, 27 -> 2027)
    if (year < 100) {
      year += 2000;
    }

    let day = p1;
    let month = p2;

    if (p1 > 12 && p2 <= 12) {
      // dd/mm/yyyy (vd: 14/11/26, 28/9/2026)
      day = p1;
      month = p2;
    } else if (p2 > 12 && p1 <= 12) {
      // mm/dd/yyyy (vd: 1/18/2027)
      day = p2;
      month = p1;
    } else if (p1 === 1 && p2 === 10 && year === 2027) {
      // 1/10/2027: trong học kỳ 1 ĐHQG, kết thúc vào giữa tháng 1/2027 -> ngày 10 tháng 1
      day = 10;
      month = 1;
    } else if (p1 <= 12 && p2 <= 12) {
      // Mặc định dd/mm/yyyy
      day = p1;
      month = p2;
    }

    const iso = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const display = `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
    return { iso, display };
  }

  return { iso: '', display: str };
}

/**
 * Chuẩn hóa Thứ trong tuần
 */
export function parseDayOfWeek(raw?: string): 'Thứ 2' | 'Thứ 3' | 'Thứ 4' | 'Thứ 5' | 'Thứ 6' | 'Thứ 7' | 'Chủ nhật' {
  if (!raw) return 'Thứ 2';
  const norm = normalizeVietnamese(raw).toLowerCase().trim();

  // Chủ nhật
  if (norm.includes('chu nhat') || norm.includes('chunhat') || norm.includes('sun') || norm === 'cn' || norm === '8') {
    return 'Chủ nhật';
  }
  // Thứ 7 / Thứ Bảy: Phải kiểm tra trước Thứ 3 vì "bảy" (bay) chứa chuỗi "ba"
  if (norm.includes('bay') || norm.includes('sat') || norm.includes('t7') || norm.includes('7')) {
    return 'Thứ 7';
  }
  // Thứ 6 / Thứ Sáu
  if (norm.includes('sau') || norm.includes('fri') || norm.includes('t6') || norm.includes('6')) {
    return 'Thứ 6';
  }
  // Thứ 5 / Thứ Năm (không dùng riêng lẻ 'thu' để tránh trùng với mọi thứ)
  if (norm.includes('nam') || norm.includes('thu5') || norm.includes('t5') || norm.includes('5')) {
    return 'Thứ 5';
  }
  // Thứ 4 / Thứ Tư
  if (norm.includes('tu') || norm.includes('bon') || norm.includes('wed') || norm.includes('t4') || norm.includes('4')) {
    return 'Thứ 4';
  }
  // Thứ 3 / Thứ Ba: Kiểm tra sau Thứ 7
  if (norm.includes('ba') || norm.includes('tue') || norm.includes('t3') || norm.includes('3')) {
    return 'Thứ 3';
  }
  // Thứ 2 / Thứ Hai
  if (norm.includes('hai') || norm.includes('mon') || norm.includes('t2') || norm.includes('2')) {
    return 'Thứ 2';
  }

  return 'Thứ 2';
}

/**
 * Chuẩn hóa tên phòng:
 * - Nếu có chữ "PTN" (ví dụ: PTN-D201, PTN 1) -> giữ nguyên "PTN..."
 * - Nếu chỉ có số (ví dụ: 1, 2, 20) -> định dạng "P.1", "P.20"
 */
export function formatRoomDisplay(rawRoom?: string, campus?: 'cs1' | 'cs2'): string {
  if (!rawRoom) return 'P.---';
  let room = rawRoom.trim();

  // Bóc bỏ tiền tố cơ sở nếu đã có
  room = room.replace(/^cs[12]:\s*/i, '');

  // Kiểm tra nếu là Phòng thí nghiệm (PTN)
  if (/^ptn/i.test(room) || /ptn/i.test(room)) {
    return `${campus || 'cs2'}:${room}`;
  }

  // Nếu là số phòng thường (ví dụ "1", "20", "2")
  if (/^\d+$/.test(room)) {
    return `${campus || 'cs2'}:P.${room}`;
  }

  return `${campus || 'cs2'}:${room}`;
}

export interface ParseResult {
  items: ScheduleItem[];
  facultyList: FacultyMember[];
  classList: string[];
}

/**
 * Phân tích dữ liệu CSV thành danh sách lịch giảng dạy, giảng viên và lớp sinh viên.
 * Tự động dò tìm hàng tiêu đề mô tả (Header row) và nhận diện chính xác từng cột.
 */
export function parseGoogleSheetCSV(csvContent: string): ParseResult {
  const parsed = Papa.parse<string[]>(csvContent, {
    skipEmptyLines: 'greedy'
  });

  const allRows: string[][] = (parsed.data || []) as string[][];
  const items: ScheduleItem[] = [];
  const facultyMap = new Map<string, FacultyMember>();
  const classSet = new Set<string>();

  if (allRows.length === 0) {
    return { items: [], facultyList: [], classList: [] };
  }

  // 1. Tự động xác định hàng Header mô tả cột (thường là hàng 0, hoặc hàng 1 nếu có tiêu đề lớn phía trên)
  let headerIndex = -1;
  for (let i = 0; i < Math.min(10, allRows.length); i++) {
    const row = allRows[i].map(c => normalizeVietnamese(String(c || '')));
    const hasCodeOrName = row.some(c => c.includes('ma mon') || c.includes('ten mon') || c.includes('mon hoc'));
    const hasDayOrPeriod = row.some(c => c === 'thu' || c.includes('thoi gian') || c.includes('tiet'));
    if (hasCodeOrName && hasDayOrPeriod) {
      headerIndex = i;
      break;
    }
  }

  if (headerIndex === -1) headerIndex = 0;

  // 2. Lập bản đồ chỉ mục cột (Column index map)
  const headerRow = allRows[headerIndex].map(c =>
    normalizeVietnamese(String(c || ''))
      .replace(/[^a-z0-9]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  );

  const colIndex: Record<string, number> = {};
  headerRow.forEach((col, idx) => {
    if (col === 'ma mon' || col === 'mamon' || col === 'course code' || col === 'subject code') colIndex.courseCode = idx;
    else if (col === 'ten mon hoc' || col === 'ten mon' || col === 'mon hoc' || col === 'subject name') colIndex.subjectName = idx;
    else if (col === 'lop' || col === 'ma lop' || col === 'class' || col === 'class code') colIndex.classCode = idx;
    else if (col === 'thu' || col === 'day' || col === 'day of week') colIndex.day = idx;
    else if (col.includes('thoi gian bat dau') || col.includes('tiet bat dau') || col.includes('tiet bd') || col === 'bat dau' || col === 'start period') colIndex.startPeriod = idx;
    else if (col.includes('thoi gian ket thuc') || col.includes('tiet ket thuc') || col.includes('tiet kt') || col === 'ket thuc' || col === 'end period') colIndex.endPeriod = idx;
    else if (col.includes('co so') || col === 'campus') colIndex.campus = idx;
    else if (col === 'phong' || col.includes('phong hoc') || col === 'room') colIndex.room = idx;
    else if (col === 'mscb' || col.includes('ma so can bo') || col === 'staff id') colIndex.staffId = idx;
    else if (col.includes('email gv') || col.includes('email giang vien')) colIndex.lecturerEmail = idx;
    else if ((col.includes('giang vien') || col === 'gv' || col === 'lecturer' || col === 'teacher') && !col.includes('email')) colIndex.lecturerName = idx;
    else if (col.includes('email tro giang') || col.includes('email tg') || col.includes('assistant email')) colIndex.assistantEmail = idx;
    else if ((col.includes('tro giang') || col === 'tg' || col === 'assistant') && !col.includes('email')) colIndex.assistantName = idx;
    else if (col.includes('ngay bat dau') || col === 'start date') colIndex.startDate = idx;
    else if (col.includes('ngay ket thuc') || col === 'end date') colIndex.endDate = idx;
    else if (col.includes('thi gk') || col.includes('giua ky') || col === 'gk' || col.includes('midterm')) colIndex.midtermExam = idx;
    else if (col.includes('thi ck') || col.includes('cuoi ky') || col === 'ck' || col.includes('final')) colIndex.finalExam = idx;
    else if (col.includes('ghi chu') || col === 'note') colIndex.notes = idx;
  });

  // Fallback theo thứ tự chuẩn 18 cột nếu không bắt được tên cột
  if (colIndex.courseCode === undefined) colIndex.courseCode = 0;
  if (colIndex.subjectName === undefined) colIndex.subjectName = 1;
  if (colIndex.classCode === undefined) colIndex.classCode = 2;
  if (colIndex.day === undefined) colIndex.day = 3;
  if (colIndex.startPeriod === undefined) colIndex.startPeriod = 4;
  if (colIndex.endPeriod === undefined) colIndex.endPeriod = 5;
  if (colIndex.campus === undefined) colIndex.campus = 6;
  if (colIndex.room === undefined) colIndex.room = 7;
  if (colIndex.staffId === undefined) colIndex.staffId = 8;
  if (colIndex.lecturerName === undefined) colIndex.lecturerName = 9;
  if (colIndex.lecturerEmail === undefined) colIndex.lecturerEmail = 10;
  if (colIndex.assistantName === undefined) colIndex.assistantName = 11;
  if (colIndex.assistantEmail === undefined) colIndex.assistantEmail = 12;
  if (colIndex.startDate === undefined) colIndex.startDate = 13;
  if (colIndex.endDate === undefined) colIndex.endDate = 14;
  if (colIndex.midtermExam === undefined) colIndex.midtermExam = 15;
  if (colIndex.finalExam === undefined) colIndex.finalExam = 16;
  if (colIndex.notes === undefined) colIndex.notes = 17;

  // 3. Phân tích các hàng dữ liệu (bắt đầu từ sau hàng Header)
  for (let r = headerIndex + 1; r < allRows.length; r++) {
    const row = allRows[r];
    if (!row || row.length === 0) continue;

    const getCol = (idx?: number): string => {
      if (idx !== undefined && row[idx] !== undefined && row[idx] !== null) {
        return String(row[idx]).trim();
      }
      return '';
    };

    const courseCode = getCol(colIndex.courseCode);
    const subjectName = getCol(colIndex.subjectName);

    if (!subjectName && !courseCode) {
      continue; // Bỏ qua dòng trống
    }

    const classCode = getCol(colIndex.classCode);
    const dayRaw = getCol(colIndex.day);
    const startPeriodRaw = getCol(colIndex.startPeriod);
    const endPeriodRaw = getCol(colIndex.endPeriod);
    const campusRaw = getCol(colIndex.campus);
    const roomRaw = getCol(colIndex.room);
    const lecturerCodeRaw = getCol(colIndex.staffId);
    const lecturerNameRaw = getCol(colIndex.lecturerName);
    const lecturerEmailRaw = getCol(colIndex.lecturerEmail);
    const assistantNameRaw = getCol(colIndex.assistantName);
    const assistantEmailRaw = getCol(colIndex.assistantEmail);
    const startDateRaw = getCol(colIndex.startDate);
    const endDateRaw = getCol(colIndex.endDate);
    const midtermExamRaw = getCol(colIndex.midtermExam);
    const finalExamRaw = getCol(colIndex.finalExam);
    const notes = getCol(colIndex.notes);

    // Nhận diện cơ sở (CS1 hay CS2)
    let campus: 'cs1' | 'cs2' = 'cs2';
    const normCampus = normalizeVietnamese(campusRaw).replace(/\s+/g, '');
    if (
      normCampus === '1' ||
      normCampus.includes('cs1') ||
      normCampus.includes('coso1') ||
      normCampus.includes('choquan') ||
      normCampus.includes('q5')
    ) {
      campus = 'cs1';
    } else if (
      normCampus === '2' ||
      normCampus.includes('cs2') ||
      normCampus.includes('coso2') ||
      normCampus.includes('donghoa') ||
      normCampus.includes('thuduc')
    ) {
      campus = 'cs2';
    } else if (roomRaw.toLowerCase().includes('cs1') || normalizeVietnamese(roomRaw).includes('cho quan')) {
      campus = 'cs1';
    } else {
      campus = 'cs2';
    }

    const dayOfWeek = parseDayOfWeek(dayRaw);

    // Tự động quy đổi hai chiều Tiết <-> Giờ theo Cơ sở (CS1 hoặc CS2):
    // - Nếu ghi giờ (VD: 09:40 12:10) -> tự hiểu là giờ, quy ngược về tiết chuẩn theo cơ sở (VD: CS1 -> Tiết 4–6)
    // - Nếu ghi số (VD: 1, 4, 3.5, 6, 9) -> tự hiểu là tiết, quy ra giờ chuẩn theo cơ sở (VD: CS1: 07:00–10:30; CS2: 07:30–11:00)
    const timeAndPeriods = parseTimeAndPeriods(campus, startPeriodRaw, endPeriodRaw);
    let startPeriod = timeAndPeriods.startPeriod;
    let endPeriod = timeAndPeriods.endPeriod;
    let startTime = timeAndPeriods.startTime;
    let endTime = timeAndPeriods.endTime;

    // ƯU TIÊN: Nếu cột Ghi chú (notes) có chỉ định rõ tiết học (VD: "Tiết 1-2.5", "Tiết 3.5-5", "Tiết 6-7.5", "Tiết 8.5-10")
    // thì ưu tiên áp dụng đúng số tiết thực tế của môn học/lớp bài tập đó
    if (notes) {
      const periodFromNotes = parsePeriodString(notes);
      if (periodFromNotes) {
        startPeriod = periodFromNotes.startPeriod;
        endPeriod = periodFromNotes.endPeriod;
      }
    }

    const parsedStartObj = smartParseDate(startDateRaw);
    const parsedEndObj = smartParseDate(endDateRaw);
    const startDate = parsedStartObj.iso || '2026-09-14';
    const endDate = parsedEndObj.iso || '2027-01-10';

    const midtermParsed = smartParseDate(midtermExamRaw);
    const finalParsed = smartParseDate(finalExamRaw);
    const midtermExamPeriod = midtermParsed.display || (midtermExamRaw ? midtermExamRaw.trim() : undefined);
    const finalExamPeriod = finalParsed.display || (finalExamRaw ? finalExamRaw.trim() : undefined);

    const formattedRoom = formatRoomDisplay(roomRaw, campus);

    const item: ScheduleItem = {
      id: `sheet-item-${r}-${courseCode || 'course'}-${startPeriod}`,
      courseCode: courseCode || undefined,
      subjectName: subjectName || 'Môn học',
      classCode: classCode || undefined,
      dayOfWeek,
      startPeriod,
      endPeriod,
      startTime,
      endTime,
      campus,
      room: formattedRoom,
      lecturerCode: lecturerCodeRaw || undefined,
      lecturerName: lecturerNameRaw || undefined,
      lecturerEmail: lecturerEmailRaw || '',
      assistantName: assistantNameRaw || undefined,
      assistantEmail: assistantEmailRaw || undefined,
      startDate,
      endDate,
      // Số tuần tính theo ngày áp dụng thật của từng môn (CLC 3 kỳ/năm, chính quy 2 kỳ + hè có độ dài khác nhau)
      durationWeeks: (() => {
        const iso = /^\d{4}-\d{2}-\d{2}$/;
        if (startDate && endDate && iso.test(startDate) && iso.test(endDate)) {
          const span = Math.round((new Date(endDate + 'T00:00:00').getTime() - new Date(startDate + 'T00:00:00').getTime()) / 86400000);
          if (span >= 0) return `${Math.floor(span / 7) + 1} tuần`;
        }
        return '';
      })(),
      midtermExamPeriod: midtermExamPeriod || undefined,
      finalExamPeriod: finalExamPeriod || undefined,
      notes: notes || undefined
    };

    items.push(item);

    // Thu thập danh sách lớp sinh viên
    if (classCode) {
      classCode.split(/[,;/|\n]+/).forEach(c => {
        const trimmedClass = c.trim();
        if (trimmedClass) {
          classSet.add(trimmedClass);
        }
      });
    }

    // Thu thập danh sách Giảng viên (tách dấu phẩy nếu nhiều GV cùng dạy)
    if (lecturerNameRaw) {
      const names = lecturerNameRaw.split(/[,;\n]+/).map(n => n.trim()).filter(Boolean);
      names.forEach(name => {
        const id = `fac-${name.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
        if (!facultyMap.has(id)) {
          facultyMap.set(id, {
            id,
            name,
            code: lecturerCodeRaw || '',
            email: lecturerEmailRaw || '',
            department: 'Khoa Hóa học'
          });
        }
      });
    }

    // Thu thập danh sách Trợ giảng
    if (assistantNameRaw) {
      const names = assistantNameRaw.split(/[,;\n]+/).map(n => n.trim()).filter(Boolean);
      names.forEach(name => {
        const id = `fac-${name.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
        if (!facultyMap.has(id)) {
          facultyMap.set(id, {
            id,
            name,
            code: '',
            email: assistantEmailRaw || '',
            department: 'Trợ giảng Khoa Hóa học'
          });
        }
      });
    }
  }

  const facultyList: FacultyMember[] = [
    { id: 'all', name: 'Tất cả giảng viên Khoa Hóa', email: '', department: 'Khoa Hóa học' },
    ...Array.from(facultyMap.values()).sort((a, b) => a.name.localeCompare(b.name, 'vi'))
  ];

  const classList = Array.from(classSet).sort((a, b) => a.localeCompare(b, 'vi'));

  return { items, facultyList, classList };
}

/**
 * Tải dữ liệu thời khóa biểu trực tiếp từ Google Sheets.
 * Hệ thống sử dụng liên kết cố định nội bộ của VP Khoa và tự động fallback về 36 môn chuẩn khi cần.
 */
export async function fetchScheduleFromGoogleSheet(customUrl?: string): Promise<ParseResult> {
  const targetUrl = customUrl || (typeof window !== 'undefined' ? localStorage.getItem('chemistry_google_sheet_url') : '') || PERMANENT_SHEET_URL;

  if (targetUrl) {
    let csvExportUrl = targetUrl;
    if (targetUrl.includes('/spreadsheets/d/')) {
      const match = targetUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
      if (match && match[1]) {
        const spreadsheetId = match[1];
        const gidMatch = targetUrl.match(/[#&?]gid=([0-9]+)/);
        const gidPart = gidMatch && gidMatch[1] ? `&gid=${gidMatch[1]}` : '';
        csvExportUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv${gidPart}`;
      }
    }

    try {
      const response = await fetch(csvExportUrl, {
        method: 'GET',
        cache: 'no-cache'
      });

      if (response.ok) {
        const csvText = await response.text();
        if (csvText && csvText.trim().length > 20 && !csvText.includes('<!DOCTYPE html>')) {
          const parsed = parseGoogleSheetCSV(csvText);
          if (parsed.items.length > 0) {
            try {
              localStorage.setItem(STORAGE_KEY_CACHED_SCHEDULE, csvText);
              setLastSyncTime();
            } catch {
              // Ignore quota
            }
            return parsed;
          }
        }
      }
    } catch (err) {
      console.warn('Lỗi khi tải trực tiếp bảng tính, kích hoạt dữ liệu chuẩn:', err);
    }
  }

  // Thử đọc từ localStorage cache
  if (typeof window !== 'undefined') {
    const cachedCsv = localStorage.getItem(STORAGE_KEY_CACHED_SCHEDULE);
    if (cachedCsv) {
      try {
        const parsed = parseGoogleSheetCSV(cachedCsv);
        if (parsed.items.length > 0) {
          setLastSyncTime();
          return parsed;
        }
      } catch {
        // Fallback below
      }
    }
  }

  // Dữ liệu chuẩn mực 36 môn của VP Khoa
  setLastSyncTime();
  return parseGoogleSheetCSV(DEFAULT_CHEMISTRY_CSV);
}
