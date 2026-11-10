// Tiện ích quy đổi Tiết học và Giờ học chuẩn cho Trường ĐH Khoa học Tự nhiên - Khoa Hóa học

export interface PeriodDefinition {
  period: number;
  start: string;
  end: string;
  startMinutes: number;
  endMinutes: number;
}

// Giờ các tiết tại Cơ sở 1 (Phường Chợ Quán, TPHCM)
export const CS1_PERIODS: PeriodDefinition[] = [
  { period: 1, start: '07:00', end: '07:50', startMinutes: 7 * 60, endMinutes: 7 * 60 + 50 },
  { period: 2, start: '07:50', end: '08:40', startMinutes: 7 * 60 + 50, endMinutes: 8 * 60 + 40 },
  { period: 3, start: '08:40', end: '09:30', startMinutes: 8 * 60 + 40, endMinutes: 9 * 60 + 30 },
  { period: 4, start: '09:40', end: '10:30', startMinutes: 9 * 60 + 40, endMinutes: 10 * 60 + 30 },
  { period: 5, start: '10:30', end: '11:20', startMinutes: 10 * 60 + 30, endMinutes: 11 * 60 + 20 },
  { period: 6, start: '11:20', end: '12:10', startMinutes: 11 * 60 + 20, endMinutes: 12 * 60 + 10 },
  { period: 7, start: '12:50', end: '13:40', startMinutes: 12 * 60 + 50, endMinutes: 13 * 60 + 40 },
  { period: 8, start: '13:40', end: '14:30', startMinutes: 13 * 60 + 40, endMinutes: 14 * 60 + 30 },
  { period: 9, start: '14:30', end: '15:20', startMinutes: 14 * 60 + 30, endMinutes: 15 * 60 + 20 },
  { period: 10, start: '15:30', end: '16:20', startMinutes: 15 * 60 + 30, endMinutes: 16 * 60 + 20 },
  { period: 11, start: '16:20', end: '17:10', startMinutes: 16 * 60 + 20, endMinutes: 17 * 60 + 10 },
  { period: 12, start: '17:10', end: '18:00', startMinutes: 17 * 60 + 10, endMinutes: 18 * 60 },
];

// Giờ các tiết tại Cơ sở 2 (Phường Đông Hoà, TPHCM)
export const CS2_PERIODS: PeriodDefinition[] = [
  { period: 1, start: '07:30', end: '08:20', startMinutes: 7 * 60 + 30, endMinutes: 8 * 60 + 20 },
  { period: 2, start: '08:20', end: '09:10', startMinutes: 8 * 60 + 20, endMinutes: 9 * 60 + 10 },
  { period: 3, start: '09:10', end: '10:00', startMinutes: 9 * 60 + 10, endMinutes: 10 * 60 },
  { period: 4, start: '10:10', end: '11:00', startMinutes: 10 * 60 + 10, endMinutes: 11 * 60 },
  { period: 5, start: '11:00', end: '11:50', startMinutes: 11 * 60, endMinutes: 11 * 60 + 50 },
  { period: 6, start: '12:40', end: '13:30', startMinutes: 12 * 60 + 40, endMinutes: 13 * 60 + 30 },
  { period: 7, start: '13:30', end: '14:20', startMinutes: 13 * 60 + 30, endMinutes: 14 * 60 + 20 },
  { period: 8, start: '14:20', end: '15:10', startMinutes: 14 * 60 + 20, endMinutes: 15 * 60 + 10 },
  { period: 9, start: '15:20', end: '16:10', startMinutes: 15 * 60 + 20, endMinutes: 16 * 60 + 10 },
  { period: 10, start: '16:10', end: '17:00', startMinutes: 16 * 60 + 10, endMinutes: 17 * 60 },
];

export function minutesToTimeStr(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = Math.round(totalMinutes % 60);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

export function timeStrToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const parts = timeStr.trim().split(':');
  if (parts.length < 2) return 0;
  return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
}

/**
 * Tính giờ bắt đầu theo số tiết và cơ sở (hỗ trợ số nguyên và số thập phân như 1, 2.5, 3.5)
 */
export function getPeriodStartTime(campus: 'cs1' | 'cs2', startPeriod: number): string {
  const periods = campus === 'cs2' ? CS2_PERIODS : CS1_PERIODS;
  if (!startPeriod || startPeriod <= 0) return campus === 'cs2' ? '07:30' : '07:00';

  const floorPeriod = Math.floor(startPeriod);
  const fraction = startPeriod - floorPeriod;

  // Lấy tiết tương ứng (giới hạn trong bảng)
  const targetPeriod = periods.find(p => p.period === (floorPeriod || 1)) || periods[0];

  if (fraction > 0) {
    // Nằm giữa tiết, ví dụ 1.5 -> bắt đầu lúc giữa tiết 1 (cộng 25 phút)
    const midMin = targetPeriod.startMinutes + Math.round((targetPeriod.endMinutes - targetPeriod.startMinutes) * fraction);
    return minutesToTimeStr(midMin);
  }

  return targetPeriod.start;
}

/**
 * Tính giờ kết thúc theo số tiết và cơ sở (hỗ trợ tiết 2.5, 3, 4.5)
 * Ví dụ: Tiết bắt đầu: 1, Tiết kết thúc: 2.5
 * -> Lớp bài tập diễn ra 2.5 tiết kể từ tiết 1, kết thúc ở giữa tiết 3 (+ 25 phút từ đầu tiết 3)
 */
export function getPeriodEndTime(campus: 'cs1' | 'cs2', endPeriod: number, startPeriod?: number): string {
  const periods = campus === 'cs2' ? CS2_PERIODS : CS1_PERIODS;
  if (!endPeriod || endPeriod <= 0) return campus === 'cs2' ? '11:50' : '11:20';

  const floorPeriod = Math.floor(endPeriod);
  const fraction = endPeriod - floorPeriod;

  if (fraction > 0) {
    // Có phần lẻ 0.5 (ví dụ 2.5 tiết)
    // Nếu kết thúc là 2.5: tức là trọn 2 tiết đầu + nửa tiết thứ 3
    const nextPeriodNum = floorPeriod + 1;
    const nextPeriod = periods.find(p => p.period === nextPeriodNum);
    if (nextPeriod) {
      // Giờ bắt đầu của tiết thứ (floorPeriod + 1) + 25 phút
      const halfTimeMin = nextPeriod.startMinutes + Math.round((nextPeriod.endMinutes - nextPeriod.startMinutes) * fraction);
      return minutesToTimeStr(halfTimeMin);
    } else {
      // Nếu vượt quá danh sách tiết, lấy tiết cuối + 25 phút
      const lastP = periods[periods.length - 1];
      return minutesToTimeStr(lastP.endMinutes);
    }
  }

  // Số nguyên chẵn tiết (ví dụ 3 tiết -> kết thúc tiết 3)
  const targetPeriod = periods.find(p => p.period === floorPeriod);
  if (targetPeriod) {
    return targetPeriod.end;
  }
  return periods[periods.length - 1].end;
}

/**
 * Quy đổi từ Tiết bắt đầu & Tiết kết thúc sang khoảng giờ { startTime, endTime }
 */
export function convertPeriodsToTimeRange(
  campus: 'cs1' | 'cs2',
  startPeriod: number,
  endPeriod: number
): { startTime: string; endTime: string } {
  const startTime = getPeriodStartTime(campus, startPeriod);
  const endTime = getPeriodEndTime(campus, endPeriod, startPeriod);
  return { startTime, endTime };
}

/**
 * Suy luận Tiết bắt đầu và Tiết kết thúc từ Giờ bắt đầu & Giờ kết thúc và Cơ sở
 */
export function inferPeriodsFromTimes(
  campus: 'cs1' | 'cs2',
  startTime: string,
  endTime: string
): { startPeriod: number; endPeriod: number; periodStr: string } {
  const periods = campus === 'cs2' ? CS2_PERIODS : CS1_PERIODS;
  const startMin = timeStrToMinutes(startTime);
  const endMin = timeStrToMinutes(endTime);

  if (!startMin || !endMin) {
    return { startPeriod: 1, endPeriod: 4, periodStr: 'Tiết 1 – 4' };
  }

  // Tìm tiết bắt đầu gần nhất
  let matchedStart = 1;
  let minStartDiff = 99999;
  for (const p of periods) {
    const diffExact = Math.abs(p.startMinutes - startMin);
    if (diffExact < minStartDiff) {
      minStartDiff = diffExact;
      matchedStart = p.period;
    }
    // Kiểm tra mốc giữa tiết (fraction 0.5)
    const midMin = p.startMinutes + 25;
    const diffMid = Math.abs(midMin - startMin);
    if (diffMid < minStartDiff && diffMid < 8) {
      minStartDiff = diffMid;
      matchedStart = p.period - 0.5;
    }
  }

  // Tìm tiết kết thúc gần nhất
  let matchedEnd = matchedStart + 2;
  let minEndDiff = 99999;
  for (const p of periods) {
    // Kết thúc nguyên tiết
    const diffExact = Math.abs(p.endMinutes - endMin);
    if (diffExact < minEndDiff) {
      minEndDiff = diffExact;
      matchedEnd = p.period;
    }
    // Kết thúc ở nửa tiết (ví dụ 2.5 tiết: giữa tiết p)
    const midMin = p.startMinutes + 25;
    const diffMid = Math.abs(midMin - endMin);
    if (diffMid < minEndDiff && diffMid < 8) {
      minEndDiff = diffMid;
      matchedEnd = p.period - 0.5;
    }
  }

  if (matchedEnd < matchedStart) {
    matchedEnd = matchedStart;
  }

  const periodStr = `Tiết ${matchedStart} – ${matchedEnd}`;
  return { startPeriod: matchedStart, endPeriod: matchedEnd, periodStr };
}

/**
 * Kiểm tra xem chuỗi đầu vào có phải là định dạng giờ (HH:mm, H:mm, 9h40, 12g10, 09:40:00, vv) thay vì số tiết hay không
 */
export function isTimeString(raw?: string | number): boolean {
  if (raw === undefined || raw === null) return false;
  const str = String(raw).trim();
  if (!str) return false;

  // Chứa dấu hai chấm ':' (VD: "09:40", "9:40", "12:10", "07:30:00")
  if (str.includes(':')) return true;

  // Chứa 'h' hoặc 'g' kèm số (VD: "9h40", "09h40", "12h10", "9g40")
  if (/\d+\s*[hg]\s*\d+/i.test(str)) return true;

  // Nếu có dạng "9.40", "12.10" (phần sau dấu chấm >= 10, biểu thị phút)
  const dotTimeMatch = str.match(/^(\d{1,2})\.(\d{2})$/);
  if (dotTimeMatch) {
    const min = parseInt(dotTimeMatch[2], 10);
    const hr = parseInt(dotTimeMatch[1], 10);
    if (min >= 10 && min < 60 && hr >= 6 && hr <= 22) {
      return true;
    }
  }

  return false;
}

/**
 * Chuẩn hóa chuỗi giờ sang định dạng chuẩn HH:mm
 * Hỗ trợ: "9:40" -> "09:40", "9h40" -> "09:40", "9.40" -> "09:40", "09:40:00" -> "09:40"
 */
export function normalizeTimeFormat(raw?: string | number): string | null {
  if (raw === undefined || raw === null) return null;
  const str = String(raw).trim();
  if (!str) return null;

  // Định dạng HH:mm:ss hoặc HH:mm
  const colonMatch = str.match(/(\d{1,2}):(\d{2})/);
  if (colonMatch) {
    const h = parseInt(colonMatch[1], 10);
    const m = parseInt(colonMatch[2], 10);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  }

  // Định dạng 9h40 hoặc 9g40
  const hgMatch = str.match(/(\d{1,2})\s*[hg]\s*(\d{1,2})/i);
  if (hgMatch) {
    const h = parseInt(hgMatch[1], 10);
    const m = parseInt(hgMatch[2], 10);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  }

  // Định dạng 9.40
  const dotMatch = str.match(/(\d{1,2})\.(\d{2})/);
  if (dotMatch) {
    const h = parseInt(dotMatch[1], 10);
    const m = parseInt(dotMatch[2], 10);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  }

  return null;
}

export interface ParsedTimeAndPeriod {
  startPeriod: number;
  endPeriod: number;
  startTime: string;
  endTime: string;
  periodStr: string;
  isFromClockTime: boolean;
}

/**
 * Tự động quy đổi thông minh hai chiều giữa Tiết học và Giờ học theo Cơ sở (CS1 hoặc CS2):
 * - Nếu file Google Sheet ghi giờ (VD: "09:40" và "12:10"): Tự động nhận biết là giờ bắt đầu/kết thúc,
 *   quy ngược về Tiết học chuẩn theo cơ sở (VD: CS1 -> Tiết 4 – 6).
 * - Nếu file Google Sheet ghi số (VD: 1 và 4, hoặc 6 và 9, hoặc 3.5 và 5): Tự động nhận biết là số tiết,
 *   quy ra Giờ học chuẩn theo cơ sở tương ứng (CS1: 07:00–10:30; CS2: 07:30–11:00).
 */
export function parseTimeAndPeriods(
  campus: 'cs1' | 'cs2',
  startRaw?: string | number,
  endRaw?: string | number
): ParsedTimeAndPeriod {
  const sStr = startRaw !== undefined && startRaw !== null ? String(startRaw).trim() : '';
  const eStr = endRaw !== undefined && endRaw !== null ? String(endRaw).trim() : '';

  // 1. Trường hợp cả khoảng giờ hoặc khoảng tiết nằm chung trong 1 ô (vd: "09:40 - 12:10" hoặc "1 - 4")
  if (sStr && !eStr && (sStr.includes('-') || sStr.includes('–') || sStr.includes('->') || sStr.includes('đến'))) {
    const parts = sStr.split(/[-–—>đến]+/);
    if (parts.length >= 2) {
      return parseTimeAndPeriods(campus, parts[0].trim(), parts[1].trim());
    }
  }

  // 2. Kiểm tra nếu một trong hai hoặc cả hai là GIỜ HỌC (Clock Time, ví dụ "09:40", "12:10", "9h40")
  if (isTimeString(sStr) || isTimeString(eStr)) {
    const normStart = normalizeTimeFormat(sStr);
    const normEnd = normalizeTimeFormat(eStr);

    const startTime = normStart || (campus === 'cs2' ? '07:30' : '07:00');
    let endTime = normEnd || (campus === 'cs2' ? '11:00' : '10:30');

    // Nếu chỉ có giờ bắt đầu, kết thúc mặc định sau 3.5 tiếng
    if (normStart && !normEnd) {
      const sMin = timeStrToMinutes(normStart);
      endTime = minutesToTimeStr(sMin + 210);
    }

    // Tự động quy ngược về TIẾT HỌC chuẩn theo Cơ sở tương ứng (CS1 hoặc CS2)
    const inferred = inferPeriodsFromTimes(campus, startTime, endTime);

    return {
      startPeriod: inferred.startPeriod,
      endPeriod: inferred.endPeriod,
      startTime,
      endTime,
      periodStr: inferred.periodStr,
      isFromClockTime: true,
    };
  }

  // 3. Ngược lại: là SỐ TIẾT HỌC (ví dụ 1, 2, 3, 4, 3.5, 6, 9, ...)
  // Hỗ trợ cả trường hợp số thập phân như 3.5 (tiết lẻ)
  let sPeriod = 1;
  let ePeriod = 4;

  const parsedS = parseFloat(sStr.replace(',', '.'));
  const parsedE = parseFloat(eStr.replace(',', '.'));

  if (!isNaN(parsedS) && parsedS > 0) {
    sPeriod = parsedS;
  }
  if (!isNaN(parsedE) && parsedE >= sPeriod) {
    ePeriod = parsedE;
  } else if (!isNaN(parsedS)) {
    // Nếu chỉ nhập tiết bắt đầu (ví dụ 1), mặc định 3 tiết (tiết 1-3) hoặc 4 tiết
    ePeriod = sPeriod + 3;
  }

  // Tự động tính Giờ bắt đầu & Giờ kết thúc chuẩn theo Cơ sở (CS1 hoặc CS2)
  const startTime = getPeriodStartTime(campus, sPeriod);
  const endTime = getPeriodEndTime(campus, ePeriod, sPeriod);

  return {
    startPeriod: sPeriod,
    endPeriod: ePeriod,
    startTime,
    endTime,
    periodStr: `Tiết ${sPeriod} – ${ePeriod}`,
    isFromClockTime: false,
  };
}

/**
 * Parse chuỗi tiết từ dữ liệu Excel người dùng nhập
 * Hỗ trợ các định dạng:
 * - "1-3", "1 - 3", "1 – 3", "1->3", "1,2,3"
 * - "1-2.5", "1 - 2,5", "1 -> 2.5"
 * - "Tiết 1 - 3", "T1-3", "1 to 3"
 * - Số nguyên đơn: 3 -> tiết 1 đến 3
 */
export function parsePeriodString(periodInput: string | number): { startPeriod: number; endPeriod: number } | null {
  if (periodInput === undefined || periodInput === null) return null;
  const str = String(periodInput).trim().replace(/,/g, '.');

  // Match định dạng "Tiết 1 - 2.5", "Tiết 1-3", "Tiết 1 đến 3", "1 - 2.5", "3.5-5"
  const rangeMatch = str.match(/(?:tiết|tiết|tiet)?\s*(\d+(?:\.\d+)?)\s*(?:-|–|—|->|đến|to)\s*(\d+(?:\.\d+)?)/i);
  if (rangeMatch) {
    const s = parseFloat(rangeMatch[1]);
    const e = parseFloat(rangeMatch[2]);
    if (!isNaN(s) && !isNaN(e) && s >= 1 && s <= 12 && e >= s && e <= 12) {
      return { startPeriod: s, endPeriod: e };
    }
  }

  // Match chuỗi liệt kê các tiết "1, 2, 3" hoặc "1. 2"
  const numbers = str.match(/\b\d+(?:\.\d+)?\b/g);
  if (numbers && numbers.length >= 2) {
    const s = parseFloat(numbers[0]);
    const e = parseFloat(numbers[numbers.length - 1]);
    if (!isNaN(s) && !isNaN(e) && s >= 1 && s <= 12 && e >= s && e <= 12) {
      return { startPeriod: s, endPeriod: e };
    }
  }

  // Nếu chỉ có 1 số, ví dụ "3" -> mặc định từ tiết 1 đến tiết đó (hoặc 3 tiết)
  if (numbers && numbers.length === 1) {
    const val = parseFloat(numbers[0]);
    if (val >= 1 && val <= 12) {
      return { startPeriod: 1, endPeriod: val };
    }
  }

  return null;
}

/**
 * Trả về chuỗi hiển thị chuẩn kết hợp cả Tiết học và Giờ học:
 * VD: "Tiết 1 – 3 (07:00 – 09:30)" hoặc "Tiết 1 – 2.5 (07:00 – 09:05)"
 */
export function formatPeriodWithTime(
  campus: 'cs1' | 'cs2',
  startPeriod?: number | string,
  endPeriod?: number | string,
  startTime?: string,
  endTime?: string
): string {
  const sPeriod = startPeriod ? parseFloat(String(startPeriod)) : undefined;
  const ePeriod = endPeriod ? parseFloat(String(endPeriod)) : undefined;

  let calculatedStart = startTime || '';
  let calculatedEnd = endTime || '';

  if (sPeriod && ePeriod && (!calculatedStart || !calculatedEnd)) {
    const range = convertPeriodsToTimeRange(campus, sPeriod, ePeriod);
    calculatedStart = range.startTime;
    calculatedEnd = range.endTime;
  }

  if (sPeriod && ePeriod) {
    const periodLabel = `Tiết ${sPeriod} – ${ePeriod}`;
    if (calculatedStart && calculatedEnd) {
      return `${periodLabel} (${calculatedStart} – ${calculatedEnd})`;
    }
    return periodLabel;
  }

  if (calculatedStart && calculatedEnd) {
    const inferred = inferPeriodsFromTimes(campus, calculatedStart, calculatedEnd);
    return `${inferred.periodStr} (${calculatedStart} – ${calculatedEnd})`;
  }

  return '';
}

/**
 * Tách danh sách giảng viên từ chuỗi có dấu phẩy ","
 */
export function parseMultipleLecturers(lecturerString?: string): string[] {
  if (!lecturerString) return [];
  return lecturerString
    .split(/[,;\n]+/)
    .map(s => s.trim())
    .filter(s => s.length > 0);
}

/**
 * Tách danh sách email từ chuỗi có dấu phẩy ","
 */
export function parseMultipleEmails(emailString?: string): string[] {
  if (!emailString) return [];
  return emailString
    .split(/[,;\n\s]+/)
    .map(s => s.trim())
    .filter(s => s.includes('@'));
}

/**
 * Tách danh sách mã số cán bộ từ chuỗi phân cách bởi dấu phẩy ","
 */
export function parseMultipleCodes(codeString?: string): string[] {
  if (!codeString) return [];
  return codeString
    .split(/[,;\n]+/)
    .map(s => s.trim())
    .filter(s => s.length > 0);
}

/**
 * Định dạng tên hiển thị của Thầy/Cô kèm Mã số cán bộ:
 * "Mã số cán bộ" - "Tên thầy cô" (ví dụ: "CB01 - TS. Nguyễn Minh Khôi")
 */
export function formatFacultyDisplayName(faculty?: { code?: string; name: string } | null): string {
  if (!faculty) return '';
  if (faculty.code && faculty.code.trim()) {
    const code = faculty.code.trim();
    const name = faculty.name.trim();
    // Tránh lặp lại nếu name đã có code ở đầu
    if (name.toLowerCase().startsWith(code.toLowerCase())) {
      return name;
    }
    return `${code} - ${name}`;
  }
  return faculty.name || '';
}

/**
 * Định dạng chuỗi giảng viên kèm mã cán bộ:
 * Hỗ trợ cả 1 giảng viên và nhiều giảng viên (ngăn cách bởi dấu phẩy)
 * Ví dụ: name: "TS. Nguyễn Văn A, ThS. Trần Thị B", code: "CB01, CB02"
 * -> "CB01 - TS. Nguyễn Văn A, CB02 - ThS. Trần Thị B"
 */
export function formatLecturerWithCode(name?: string, code?: string): string {
  if (!name && !code) return '';
  if (!code || !code.trim()) return name || '';
  if (!name || !name.trim()) return code.trim();

  const lecturers = parseMultipleLecturers(name);
  const codes = parseMultipleCodes(code);

  if (lecturers.length === 0) return code.trim();

  // Ghép từng cặp tương ứng
  const combined = lecturers.map((lecturer, idx) => {
    const c = codes[idx] || (codes.length === 1 && lecturers.length === 1 ? codes[0] : '');
    if (!c) return lecturer;
    // Kiểm tra xem lecturer đã có c ở đầu chưa
    if (lecturer.toLowerCase().startsWith(c.toLowerCase())) return lecturer;
    return `${c} - ${lecturer}`;
  });

  return combined.join(', ');
}

/**
 * Tự động phân tách chuỗi có chứa mã và tên, ví dụ: "CB01 - TS. Nguyễn Minh Khôi" hoặc "[CB01] TS. Nguyễn Minh Khôi"
 */
export function extractCodeAndName(input: string): { code?: string; name: string } {
  if (!input) return { name: '' };
  const trimmed = input.trim();

  // Khớp định dạng: CB01 - Tên Thầy Cô
  const dashMatch = trimmed.match(/^([A-Za-z0-9_-]+)\s*[-–:]\s*(.+)$/);
  if (dashMatch) {
    return {
      code: dashMatch[1].trim(),
      name: dashMatch[2].trim()
    };
  }

  // Khớp định dạng: [CB01] Tên Thầy Cô
  const bracketMatch = trimmed.match(/^\[([A-Za-z0-9_-]+)\]\s*(.+)$/);
  if (bracketMatch) {
    return {
      code: bracketMatch[1].trim(),
      name: bracketMatch[2].trim()
    };
  }

  return { name: trimmed };
}

/**
 * Chuẩn hóa tên người để so sánh (loại bỏ học hàm, học vị, tiền tố mã cán bộ, dấu tiếng Việt để tránh lệch Unicode)
 */
export function normalizePersonName(name?: string): string {
  if (!name) return '';
  let clean = name.trim();

  // 1. Loại bỏ tiền tố mã cán bộ dạng [CB20], CB20 -, CB01:, vv.
  clean = clean.replace(/^\[[^\]]+\]\s*/i, '');
  clean = clean.replace(/^[a-z0-9_-]+\s*[-–:.]\s*/i, '');

  // 2. Chuẩn hóa tiếng Việt NFD và loại bỏ học hàm / danh xưng
  return clean
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/^(pgs\.?\s*ts\.?|gs\.?\s*ts\.?|ts\.?|ths\.?|cn\.?|ks\.?|gv\.?|dr\.?|mr\.?|ms\.?|mrs\.?|thay\.?|co\.?)\s+/i, '')
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
    .replace(/\s+/g, ' ');
}

/**
 * So sánh 2 tên có cùng là 1 người hay không
 */
export function isPersonNameMatch(nameA?: string, nameB?: string): boolean {
  if (!nameA || !nameB) return false;
  const a = nameA.trim().toLowerCase();
  const b = nameB.trim().toLowerCase();
  if (a === b) return true;

  const normA = normalizePersonName(nameA);
  const normB = normalizePersonName(nameB);
  if (!normA || !normB) return false;
  return normA === normB;
}

/**
 * Kiểm tra xem một môn học (item) có do giảng viên (target) phụ trách hay không.
 * Hỗ trợ môn có nhiều giảng viên (phân tách bởi dấu phẩy) và trợ giảng.
 *
 * QUAN TRỌNG: Tên giảng viên (name) luôn là tiêu chí quyết định tuyệt đối khi cả 2 bên
 * đều có tên. Nếu nhiều giảng viên có chung tiền tố mã (ví dụ cùng mang mã CB20),
 * hệ thống TUYỆT ĐỐI KHÔNG coi là một người nếu họ tên khác nhau.
 */
export function isLecturerAssignedToItem(
  target: { id?: string; code?: string; name?: string; email?: string } | string | undefined | null,
  item: {
    lecturerCode?: string;
    lecturerName?: string;
    lecturerEmail?: string;
    assistantName?: string;
    assistantEmail?: string;
  },
  fallbackIdentifier?: string
): boolean {
  if (!target && !fallbackIdentifier) return true;
  if (target === 'all' || fallbackIdentifier === 'all') return true;

  let targetObj: { id?: string; code?: string; name?: string; email?: string };
  if (!target) {
    targetObj = { id: fallbackIdentifier, name: fallbackIdentifier, email: fallbackIdentifier, code: '' };
  } else if (typeof target === 'string') {
    targetObj = { id: target, name: target, email: target, code: '' };
  } else {
    targetObj = target;
  }

  const tCode = (targetObj.code || '').trim().toLowerCase();
  const tName = (targetObj.name || '').trim();
  const tEmail = (targetObj.email || '').trim().toLowerCase();
  const tId = (targetObj.id || '').trim().toLowerCase();

  const itemLecturers = parseMultipleLecturers(item.lecturerName);
  const itemAssistants = parseMultipleLecturers(item.assistantName);
  const hasItemLecturerNames = itemLecturers.length > 0 || itemAssistants.length > 0;

  // 1. So khớp theo Email (nếu cả 2 đều có email công vụ hợp lệ và không phải placeholder)
  if (tEmail && !tEmail.includes('placeholder') && tEmail.includes('@')) {
    if (item.lecturerEmail) {
      const itemEmails = parseMultipleEmails(item.lecturerEmail).map(e => e.toLowerCase());
      if (itemEmails.includes(tEmail)) return true;
    }
    if (item.assistantEmail) {
      const asstEmails = parseMultipleEmails(item.assistantEmail).map(e => e.toLowerCase());
      if (asstEmails.includes(tEmail)) return true;
    }
  }

  // 2. So khớp theo TÊN GIẢNG VIÊN (Tiêu chí then chốt nhất khi người dùng chọn một Thầy/Cô)
  if (tName) {
    // Đối soát trong danh sách giảng viên chính của môn
    for (const lName of itemLecturers) {
      if (isPersonNameMatch(tName, lName)) return true;
    }

    // Đối soát trong danh sách trợ giảng của môn
    for (const aName of itemAssistants) {
      if (isPersonNameMatch(tName, aName)) return true;
    }

    // NẾU môn học có tên giảng viên nhưng KHÔNG CÓ TÊN NÀO KHỚP với target:
    // -> TUYỆT ĐỐI TRẢ VỀ FALSE! Không được để mã cán bộ (ví dụ cùng mang mã CB20) gây match sai.
    if (hasItemLecturerNames) {
      return false;
    }
  }

  // 3. So khớp theo MSCB (Chỉ dùng khi item hoặc target KHÔNG CÓ TÊN để đối chiếu)
  if (tCode && item.lecturerCode && !tName) {
    const itemCodes = parseMultipleCodes(item.lecturerCode).map(c => c.trim().toLowerCase());
    if (itemCodes.includes(tCode)) return true;
  }

  // 4. Fallback đối chiếu với ID
  if (tId && tId !== 'all') {
    for (const lName of itemLecturers) {
      if (isPersonNameMatch(tId, lName)) return true;
    }
  }

  return false;
}

/**
 * Chuẩn hóa chuỗi Thứ trong tuần về 1 trong 7 giá trị chuẩn của hệ thống
 */
export function normalizeDayOfWeek(raw?: string): 'Thứ 2' | 'Thứ 3' | 'Thứ 4' | 'Thứ 5' | 'Thứ 6' | 'Thứ 7' | 'Chủ nhật' {
  if (!raw) return 'Thứ 2';
  const clean = String(raw).trim().toLowerCase();
  if (clean.includes('2') || clean.includes('hai') || clean.includes('mon')) return 'Thứ 2';
  if (clean.includes('3') || clean.includes('ba') || clean.includes('tue')) return 'Thứ 3';
  if (clean.includes('4') || clean.includes('tư') || clean.includes('tu') || clean.includes('wed')) return 'Thứ 4';
  if (clean.includes('5') || clean.includes('năm') || clean.includes('nam') || clean.includes('thu')) return 'Thứ 5';
  if (clean.includes('6') || clean.includes('sáu') || clean.includes('sau') || clean.includes('fri')) return 'Thứ 6';
  if (clean.includes('7') || clean.includes('bảy') || clean.includes('bay') || clean.includes('sat')) return 'Thứ 7';
  if (clean.includes('cn') || clean.includes('nhật') || clean.includes('nhat') || clean.includes('sun')) return 'Chủ nhật';
  return 'Thứ 2';
}
