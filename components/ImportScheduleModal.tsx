import React, { useState, useMemo, useRef } from 'react';
import { 
  X, 
  Upload, 
  FileSpreadsheet, 
  FileText, 
  Check, 
  AlertTriangle, 
  Sparkles, 
  Download, 
  Copy, 
  Info, 
  CheckCircle2, 
  UserCheck, 
  ChevronRight, 
  ChevronLeft,
  Database, 
  RefreshCw,
  AlertCircle,
  Eye,
  Search,
  LayoutGrid,
  Table as TableIcon,
  Calendar,
  Clock,
  MapPin,
  User,
  GraduationCap,
  Building2,
  FileCheck,
  Tag
} from 'lucide-react';
import { ScheduleItem, FacultyMember } from '../types';
import { STANDARD_DEPARTMENTS, DAYS_OF_WEEK } from '../data/mockSchedule';
import {
  convertPeriodsToTimeRange,
  parsePeriodString,
  formatPeriodWithTime,
  parseMultipleLecturers,
  parseMultipleEmails,
  parseMultipleCodes,
  formatLecturerWithCode,
  extractCodeAndName,
  inferPeriodsFromTimes,
  parseTimeAndPeriods,
  normalizePersonName,
  isPersonNameMatch
} from '../utils/periodConverter';

interface ImportScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  facultyList: FacultyMember[];
  departmentList?: string[];
  onConfirmImport: (
    newSchedules: ScheduleItem[],
    newFaculty: FacultyMember[],
    mode?: 'append' | 'replace'
  ) => void;
}

export interface ParsedRow {
  id: string;
  courseCode: string;
  subjectName: string;
  classCode: string;
  dayOfWeek: 'Thứ 2' | 'Thứ 3' | 'Thứ 4' | 'Thứ 5' | 'Thứ 6' | 'Thứ 7' | 'Chủ nhật';
  startPeriod: number | string;
  endPeriod: number | string;
  startTime: string;
  endTime: string;
  room: string;
  campus: 'cs1' | 'cs2';
  lecturerCode: string; // Mã số cán bộ (MSCB), đứng trước cột Giảng viên
  lecturerName: string;
  lecturerEmail: string;
  assistantName?: string;
  assistantEmail?: string;
  assistantRole?: string;
  department: string;
  durationWeeks: string;
  startDate: string;
  endDate: string;
  notes?: string;
  midtermExamPeriod?: string;
  finalExamPeriod?: string;
  facultyStatus: 'matched' | 'new_complete' | 'missing_info';
  warnings: string[];
  rawRow?: Record<string, any>; // Lưu lại toàn bộ dữ liệu gốc từ file để kiểm tra đối chiếu chi tiết
}

const SAMPLE_CSV = `Mã môn,Tên môn học,Lớp,Thứ,Tiết BĐ,Tiết KT,Cơ sở,Phòng,Mã số cán bộ,Giảng viên,Email,Thời lượng,Bắt đầu,Kết thúc
CHE101,Hóa đại cương A1,24HOH1,Thứ 2,1,3,CS1,C.32,CB01,GS.TS. Nguyễn Văn Hóa,nvhoa@chem.hcmus.edu.vn,17 tuần,2026-09-14,2027-01-20
CHE204,Hóa phân tích thực hành,23HOH2,Thứ 3,7,10,CS1,PTN-D201,"CB02, CB03","TS. Trần Thị Bích Lan, ThS. Đặng Thị Hồng Nhung","tblan@chem.hcmus.edu.vn, dthnhung@chem.hcmus.edu.vn",10 tuần,2026-09-22,2026-11-28
CHE210,Bài tập Hóa lượng tử,23HOH_BT,Thứ 6,1,2.5,CS1,C.32,CB01,TS. Nguyễn Minh Khôi,nmkhoi@chem.hcmus.edu.vn,10 tuần,2026-09-18,2026-11-27
CHE305,Tổng hợp Hóa hữu cơ nâng cao,22HOH_HC,Thứ 5,1,4,CS2,PTN-C.104,"CB04, CB02","TS. Hoàng Minh Trí, PGS.TS. Lê Hoàng Mai","hmtri@chem.hcmus.edu.vn, lhmai@chem.hcmus.edu.vn",15 tuần,2026-10-01,2027-01-15`;

function normalizeVietnameseKey(str: string): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .replace(/[^a-z0-9]/g, '');
}

function splitCsvLine(line: string, delimiter: string = ','): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++; // skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      result.push(current.trim().replace(/^["']|["']$/g, ''));
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim().replace(/^["']|["']$/g, ''));
  return result;
}

// Robust CSV & TSV Text Parser
function parseTextToRows(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (lines.length < 2) return [];

  // Detect delimiter: tab or comma or semicolon
  const headerLine = lines[0];
  let delimiter = ',';
  if (headerLine.includes('\t')) {
    delimiter = '\t';
  } else {
    const semiCount = (headerLine.match(/;/g) || []).length;
    const commaCount = (headerLine.match(/,/g) || []).length;
    if (semiCount > commaCount) delimiter = ';';
  }

  const headers = splitCsvLine(lines[0], delimiter);
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = splitCsvLine(lines[i], delimiter);
    if (values.length === 0 || values.every(v => !v)) continue;
    const rowObj: Record<string, string> = {};
    headers.forEach((h, idx) => {
      rowObj[h] = values[idx] !== undefined ? values[idx] : '';
    });
    rows.push(rowObj);
  }

  return rows;
}

export const ImportScheduleModal: React.FC<ImportScheduleModalProps> = ({
  isOpen,
  onClose,
  facultyList = [],
  departmentList = STANDARD_DEPARTMENTS,
  onConfirmImport
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'paste'>('upload');
  const [pasteContent, setPasteContent] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [step, setStep] = useState<'input' | 'preview'>('input');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [importMode, setImportMode] = useState<'append' | 'replace'>('replace');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // States for preview filtering, search, and inspecting full details
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'warning' | 'new' | 'matched'>('all');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [inspectingRowIndex, setInspectingRowIndex] = useState<number | null>(null);
  const [inspectorTab, setInspectorTab] = useState<'parsed' | 'raw'>('parsed');
  const [rawSearchQuery, setRawSearchQuery] = useState<string>('');

  // Preview stats calculation (Hook before any early return)
  const previewStats = useMemo(() => {
    const total = parsedRows.length;
    const matched = parsedRows.filter(r => r.facultyStatus === 'matched').length;
    const newFaculty = parsedRows.filter(r => r.facultyStatus === 'new_complete').length;
    const missing = parsedRows.filter(r => r.facultyStatus === 'missing_info').length;
    const cs1Count = parsedRows.filter(r => r.campus === 'cs1').length;
    const cs2Count = parsedRows.filter(r => r.campus === 'cs2').length;
    const withExamCount = parsedRows.filter(r => r.midtermExamPeriod || r.finalExamPeriod).length;
    return { total, matched, newFaculty, missing, cs1Count, cs2Count, withExamCount };
  }, [parsedRows]);

  // Filtered rows based on search and status
  const filteredRows = useMemo(() => {
    return parsedRows.filter((r) => {
      // Status filter
      if (statusFilter === 'warning' && r.facultyStatus !== 'missing_info') return false;
      if (statusFilter === 'new' && r.facultyStatus !== 'new_complete') return false;
      if (statusFilter === 'matched' && r.facultyStatus !== 'matched') return false;

      // Text search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const match =
          (r.subjectName && r.subjectName.toLowerCase().includes(q)) ||
          (r.courseCode && r.courseCode.toLowerCase().includes(q)) ||
          (r.classCode && r.classCode.toLowerCase().includes(q)) ||
          (r.lecturerName && r.lecturerName.toLowerCase().includes(q)) ||
          (r.lecturerCode && r.lecturerCode.toLowerCase().includes(q)) ||
          (r.lecturerEmail && r.lecturerEmail.toLowerCase().includes(q)) ||
          (r.assistantName && r.assistantName.toLowerCase().includes(q)) ||
          (r.room && r.room.toLowerCase().includes(q)) ||
          (r.department && r.department.toLowerCase().includes(q)) ||
          (r.notes && r.notes.toLowerCase().includes(q));
        if (!match) return false;
      }

      return true;
    });
  }, [parsedRows, statusFilter, searchQuery]);

  // Day normalizer helper
  const normalizeDayOfWeek = (raw: string): ParsedRow['dayOfWeek'] => {
    if (!raw) return 'Thứ 2';
    const clean = String(raw).trim().toLowerCase();
    if (clean.includes('cn') || clean.includes('nhật') || clean.includes('nhat') || clean.includes('sun') || clean === '8') return 'Chủ nhật';
    // Bảy phải kiểm tra trước Thứ 3 vì "bảy" có chứa "ba"
    if (clean.includes('7') || clean.includes('bảy') || clean.includes('bay') || clean.includes('sat')) return 'Thứ 7';
    if (clean.includes('6') || clean.includes('sáu') || clean.includes('sau') || clean.includes('fri')) return 'Thứ 6';
    if (clean.includes('5') || clean.includes('năm') || clean.includes('nam') || clean.includes('thu5')) return 'Thứ 5';
    if (clean.includes('4') || clean.includes('tư') || clean.includes('tu') || clean.includes('wed')) return 'Thứ 4';
    if (clean.includes('3') || clean.includes('ba') || clean.includes('tue')) return 'Thứ 3';
    if (clean.includes('2') || clean.includes('hai') || clean.includes('mon')) return 'Thứ 2';
    return 'Thứ 2';
  };

  // Convert raw row objects into ParsedRow items
  const mapRawDataToParsedRows = (rawList: Record<string, any>[]): ParsedRow[] => {
    const results: ParsedRow[] = [];

    // Bảng theo dõi cấp phát Mã số cán bộ (MSCB) và Email duy nhất cho từng Thầy/Cô
    const facultyCodeMap = new Map<string, string>(); // key: normalized name -> code
    const facultyEmailMap = new Map<string, string>(); // key: normalized name -> email
    const facultyFullObjMap = new Map<string, FacultyMember>();

    // 1. Nạp các Thầy/Cô hiện có trong danh bạ
    let maxCodeNum = 0;
    (facultyList || []).forEach(f => {
      if (!f || f.id === 'all') return;
      const norm = normalizePersonName(f.name);
      if (norm) {
        if (f.code) {
          facultyCodeMap.set(norm, f.code.trim());
          const m = f.code.match(/\d+/);
          if (m) {
            const num = parseInt(m[0], 10);
            if (num > maxCodeNum) maxCodeNum = num;
          }
        }
        if (f.email) {
          facultyEmailMap.set(norm, f.email.trim());
        }
        facultyFullObjMap.set(norm, f);
      }
    });

    rawList.forEach((row, index) => {
      // Find value by strictly ordered aliases to prevent false substring collisions
      const findVal = (aliases: string[]) => {
        const rowKeys = Object.keys(row);
        
        // 1st pass: Exact normalized key match
        for (const alias of aliases) {
          const cleanAlias = normalizeVietnameseKey(alias);
          for (const key of rowKeys) {
            const cleanKey = normalizeVietnameseKey(key);
            if (cleanKey === cleanAlias) {
              const val = row[key];
              if (val !== undefined && val !== null && String(val).trim() !== '') {
                return String(val).trim();
              }
            }
          }
        }

        // 2nd pass: Strict prefix match for aliases with length >= 4
        for (const alias of aliases) {
          const cleanAlias = normalizeVietnameseKey(alias);
          if (cleanAlias.length < 4) continue;
          for (const key of rowKeys) {
            const cleanKey = normalizeVietnameseKey(key);
            if (cleanKey.startsWith(cleanAlias) || cleanAlias.startsWith(cleanKey)) {
              const val = row[key];
              if (val !== undefined && val !== null && String(val).trim() !== '') {
                return String(val).trim();
              }
            }
          }
        }

        return '';
      };

      const subjectName = findVal(['tenmonhoc', 'tenmon', 'tenhocphan', 'tenhp', 'subject', 'monhoc', 'hocphan', 'coursename']);
      if (!subjectName) return; // skip empty rows

      const courseCode = findVal(['mamon', 'mamonhoc', 'mahocphan', 'mahp', 'code', 'coursecode', 'mamon_hoc']);
      const classCode = findVal(['lop', 'malop', 'class', 'classcode', 'lopsv', 'lophoc']);
      const rawDay = findVal(['thu', 'day', 'dayofweek', 'thutrongtuan']);
      const dayOfWeek = normalizeDayOfWeek(rawDay);

      // Campus & Room (Tách riêng biệt theo yêu cầu của VP Khoa)
      const rawCampus = findVal(['coso', 'campus', 'co_so', 'diadiemcoso']);
      let rawRoom = findVal(['phong', 'room', 'phonghoc', 'diadiem', 'phonghocptn', 'ptn']) || 'PTN-D201';

      let campus: 'cs1' | 'cs2' = 'cs1';
      if (rawCampus) {
        if (
          rawCampus.toLowerCase().includes('2') ||
          rawCampus.toLowerCase().includes('đông hoà') ||
          rawCampus.toLowerCase().includes('dong hoa') ||
          rawCampus.toLowerCase().includes('linh trung')
        ) {
          campus = 'cs2';
        } else {
          campus = 'cs1';
        }
      } else {
        // Fallback kiểm tra tiền tố nếu cột cơ sở không có
        if (
          rawRoom.toLowerCase().includes('cs2') ||
          rawRoom.toLowerCase().includes('đông hoà') ||
          rawRoom.toLowerCase().includes('dong hoa') ||
          rawRoom.toLowerCase().includes('linh trung')
        ) {
          campus = 'cs2';
        }
      }

      // Xử lý Tiết bắt đầu & Tiết kết thúc (Hỗ trợ định dạng "Thời gian bắt đầu ", "Thời gian kết thúc ", số nguyên và số thập phân như 3.5)
      // Theo giờ chuẩn của 2 cơ sở:
      // CS1: Tiết 1: 07:00-07:50, Tiết 2: 07:50-08:40, Tiết 3: 08:40-09:30...
      // CS2: Tiết 1: 07:30-08:20, Tiết 2: 08:20-09:10, Tiết 3: 09:10-10:00...
      const rawStartPeriod = findVal(['thoigianbatdau', 'thoigianbd', 'batdau', 'tietbatdau', 'tietbd', 'startperiod', 'tiet_bd', 'tietdau', 'tietbđ']);
      const rawEndPeriod = findVal(['thoigianketthuc', 'thoigiankt', 'ketthuc', 'tietketthuc', 'tietkt', 'endperiod', 'tiet_kt', 'tietcuoi', 'tietket']);
      const rawPeriodCombined = findVal(['tiet', 'tiethoc', 'periods', 'tiet_hoc', 'sotiet', 'cahoc', 'ca']);
      const rawTime = findVal(['giohoc', 'thoigian', 'time']);

      let startPeriod: number | string = 1;
      let endPeriod: number | string = 3;
      let startTime = campus === 'cs2' ? '07:30' : '07:00';
      let endTime = campus === 'cs2' ? '10:00' : '09:30';

      if (rawStartPeriod || rawEndPeriod) {
        const tp = parseTimeAndPeriods(campus, rawStartPeriod, rawEndPeriod);
        startPeriod = tp.startPeriod;
        endPeriod = tp.endPeriod;
        startTime = tp.startTime;
        endTime = tp.endTime;
      } else if (rawPeriodCombined) {
        const tp = parseTimeAndPeriods(campus, rawPeriodCombined);
        startPeriod = tp.startPeriod;
        endPeriod = tp.endPeriod;
        startTime = tp.startTime;
        endTime = tp.endTime;
      } else if (rawTime) {
        const tp = parseTimeAndPeriods(campus, rawTime);
        startPeriod = tp.startPeriod;
        endPeriod = tp.endPeriod;
        startTime = tp.startTime;
        endTime = tp.endTime;
      } else {
        const rawStart = findVal(['giobatdau', 'giobd', 'starttime']);
        const rawEnd = findVal(['gioketthuc', 'giokt', 'endtime']);
        if (rawStart || rawEnd) {
          const tp = parseTimeAndPeriods(campus, rawStart, rawEnd);
          startPeriod = tp.startPeriod;
          endPeriod = tp.endPeriod;
          startTime = tp.startTime;
          endTime = tp.endTime;
        }
      }

      // Chuẩn hóa tên phòng (VD: số "1" -> "P.1", "cs2:1" -> "cs2:P.1")
      let cleanRoomName = rawRoom.replace(/^cs[12]:/i, '').trim() || 'PTN-D201';
      if (/^\d+$/.test(cleanRoomName)) {
        cleanRoomName = `P.${cleanRoomName}`;
      }
      const room = `${campus}:${cleanRoomName}`;

      // Mã số cán bộ (MSCB) & Giảng viên (Hỗ trợ 1 môn có nhiều giảng viên, ngăn cách bởi dấu phẩy ",")
      const rawLecturerCode = findVal([
        'masocanbo', 'macanbo', 'mscb', 'macbgd', 'staffid', 'lecturercode',
        'macb', 'idcanbo', 'maso', 'cbgd_code', 'magiangvien', 'magv', 'idcanbogd'
      ]);
      const rawLecturerName = findVal(['giangvien', 'cbgd', 'lecturer', 'tengiangvien', 'tengv', 'canbo', 'teacher', 'gv']);
      let rawLecturerEmail = findVal(['email', 'emailgv', 'lectureremail', 'mail']);
      let department = findVal(['bomon', 'department', 'khoa', 'dept', 'donvi']) || 'Khoa Hóa học';

      // Trợ giảng / TA
      const assistantName = findVal(['trogiang', 'ta', 'tro_giang', 'tengiangvientrogiang', 'tengvtrogiang', 'tengv2', 'gv2', 'assistant', 'teachingassistant', 'tatrogiang']);
      const assistantEmail = findVal(['emailtrogiang', 'email_ta', 'taemail', 'emailta', 'mailta', 'mailtrogiang', 'emailgv2']);
      const assistantRole = findVal(['vaitro_ta', 'vaitrotrogiang', 'nhiemvuta', 'role_ta', 'tarole']);

      // Duration & Teaching Dates (Hỗ trợ "Ngày bắt đầu áp dụng ", "Ngày kết thúc áp dụng ")
      let rawDuration = findVal(['thoiluong', 'duration', 'sotuan', 'tuanhoc', 'sotuanhoc']);
      let rawStart = findVal(['ngaybatdauapdung', 'ngaybatdau', 'ngaybd', 'startdate', 'batdau', 'apdungtu']);
      let rawEnd = findVal(['ngayketthucapdung', 'ngayketthuc', 'ngaykt', 'enddate', 'ketthuc', 'apdungden']);

      let durationWeeks = '17 tuần';
      if (rawDuration) {
        if (/^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/.test(rawDuration) || /^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(rawDuration)) {
          if (!rawStart) rawStart = rawDuration;
        } else if (/^\d+$/.test(rawDuration)) {
          durationWeeks = `${rawDuration} tuần`;
        } else if (rawDuration.toLowerCase().includes('tuần') || rawDuration.toLowerCase().includes('tuan')) {
          durationWeeks = rawDuration;
        } else {
          durationWeeks = `${rawDuration} tuần`;
        }
      }

      let startDate = '2026-09-14';
      let endDate = '2027-01-20';

      // Parser ngày tháng vạn năng: nhận diện yyyy-mm-dd, yyyy/mm/dd, d/m/yyyy, d/m/yy
      const parseDateStr = (str: string): string | null => {
        if (!str) return null;
        const trimmed = str.trim();
        // 1. yyyy-mm-dd
        if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
        // 2. yyyy/m/d hoặc yyyy/mm/dd (ví dụ: 2027/01/10)
        if (/^\d{4}\/\d{1,2}\/\d{1,2}$/.test(trimmed)) {
          const parts = trimmed.split('/');
          return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
        }
        // 3. d/m/yyyy (ví dụ: 14/9/2026)
        if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(trimmed)) {
          const parts = trimmed.split('/');
          return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        }
        // 4. d/m/yy (ví dụ: 14/11/26)
        if (/^\d{1,2}\/\d{1,2}\/\d{2}$/.test(trimmed)) {
          const parts = trimmed.split('/');
          const yr = parseInt(parts[2], 10);
          const fullYr = yr < 50 ? `20${parts[2].padStart(2, '0')}` : `19${parts[2].padStart(2, '0')}`;
          return `${fullYr}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        }
        return null;
      };

      const validStart = parseDateStr(rawStart);
      if (validStart) startDate = validStart;

      const validEnd = parseDateStr(rawEnd);
      if (validEnd) endDate = validEnd;

      const notes = findVal(['ghichu', 'notes', 'note', 'luuy']);

      // Ưu tiên: nếu cột ghi chú có chỉ định tiết học rõ ràng (VD: Tiết 1-2.5)
      if (notes) {
        const periodFromNotes = parsePeriodString(notes);
        if (periodFromNotes) {
          startPeriod = periodFromNotes.startPeriod;
          endPeriod = periodFromNotes.endPeriod;
        }
      }

      // Kế hoạch thi (Hỗ trợ "Thi GK", "Thi CK", "14/11/26", "2027/01/18")
      const rawMidterm = findVal([
        'thigk', 'khoangthoigianthigk', 'lichthigk', 'tuanthigk', 'ngaythigk', 'gk',
        'midterm', 'midtermexam', 'thoigianthigk', 'tuanthigiaki', 'thigiaki', 'midtermexamperiod'
      ]);
      const rawFinal = findVal([
        'thick', 'khoangthoigianthick', 'lichthick', 'tuanthick', 'ngaythick', 'ck',
        'final', 'finalexam', 'thoigianthick', 'tuanthicuoiki', 'thicuoiki', 'finalexamperiod'
      ]);

      const formatExamDate = (raw?: string) => {
        if (!raw) return '';
        const parsed = parseDateStr(raw);
        if (parsed) {
          const parts = parsed.split('-');
          return `${parts[2]}/${parts[1]}/${parts[0]}`;
        }
        return raw;
      };

      const midtermExamPeriod = formatExamDate(rawMidterm);
      const finalExamPeriod = formatExamDate(rawFinal);

      // Xử lý đối soát Đa Giảng Viên (tách bởi dấu phẩy ",") và gán Mã số cán bộ (MSCB) chuẩn xác
      const warnings: string[] = [];
      let facultyStatus: ParsedRow['facultyStatus'] = 'matched';

      const lecturerList = parseMultipleLecturers(rawLecturerName);
      const emailList = parseMultipleEmails(rawLecturerEmail);
      const codeList = parseMultipleCodes(rawLecturerCode);

      let finalLecturerName = rawLecturerName || 'Chưa phân công';
      const resolvedEmails: string[] = [];
      const resolvedCodes: string[] = [];

      if (lecturerList.length === 0) {
        warnings.push('Chưa có tên giảng viên phụ trách');
        facultyStatus = 'missing_info';
      } else {
        let hasMissingEmail = false;
        let hasNewMember = false;

        lecturerList.forEach((rawLecturer, idx) => {
          // Bóc tách nếu tên có chứa sẵn mã (VD: "CB01 - TS. Nguyễn Văn A")
          const extracted = extractCodeAndName(rawLecturer);
          let lecturer = extracted.name.trim();
          let explicitCode = codeList[idx] || (codeList.length === 1 && lecturerList.length === 1 ? codeList[0] : '') || extracted.code || '';

          const normName = normalizePersonName(lecturer);

          // 1. Tìm trong danh bạ hiện có (Ưu tiên theo code nếu có, sau đó theo tên chuẩn hoặc email)
          let existing = facultyFullObjMap.get(normName);
          if (!existing && explicitCode) {
            existing = (facultyList || []).find(f => f.code && f.code.toLowerCase().trim() === explicitCode.toLowerCase().trim());
          }
          if (!existing) {
            existing = (facultyList || []).find(f => isPersonNameMatch(f.name, lecturer));
          }

          let codeForThis = explicitCode;
          let emailForThisLecturer = '';

          if (existing) {
            // Giảng viên đã có trong danh bạ Khoa
            emailForThisLecturer = existing.email || '';
            if (existing.code && !codeForThis) {
              codeForThis = existing.code;
            }
            if (existing.name) {
              lecturer = existing.name;
            }
          } else {
            hasNewMember = true;
            // Kiểm tra xem đã từng gặp giảng viên mới này ở các hàng trước trong file import chưa
            if (!codeForThis && facultyCodeMap.has(normName)) {
              codeForThis = facultyCodeMap.get(normName)!;
            }
            if (facultyEmailMap.has(normName)) {
              emailForThisLecturer = facultyEmailMap.get(normName)!;
            } else if (emailList[idx]) {
              emailForThisLecturer = emailList[idx];
            } else if (emailList.length === 1 && lecturerList.length === 1) {
              emailForThisLecturer = emailList[0];
            } else {
              // Tự sinh email công vụ gợi ý theo họ tên
              const slug = normName.replace(/[^a-z0-9]/g, '');
              emailForThisLecturer = `${slug || 'gv'}@chem.hcmus.edu.vn`;
              hasMissingEmail = true;
              warnings.push(`Cần xác nhận email cho: ${lecturer}`);
            }
          }

          // Cấp mã số cán bộ duy nhất cho giảng viên mới nếu chưa có
          if (!codeForThis) {
            maxCodeNum++;
            codeForThis = `CB${String(maxCodeNum).padStart(2, '0')}`;
          }

          // Ghi nhớ lại mã và email cho Thầy/Cô này
          if (normName) {
            facultyCodeMap.set(normName, codeForThis);
            if (emailForThisLecturer) facultyEmailMap.set(normName, emailForThisLecturer);
          }

          resolvedCodes.push(codeForThis);
          resolvedEmails.push(emailForThisLecturer);
        });

        if (hasMissingEmail) {
          facultyStatus = 'missing_info';
        } else if (hasNewMember) {
          facultyStatus = 'new_complete';
        } else {
          facultyStatus = 'matched';
        }

        finalLecturerName = lecturerList.join(', ');
      }

      const finalLecturerEmail = resolvedEmails.length > 0 ? resolvedEmails.join(', ') : (rawLecturerEmail || '');
      const finalLecturerCode = resolvedCodes.length > 0 ? resolvedCodes.join(', ') : (rawLecturerCode || '');

      results.push({
        id: `sch-imp-${Date.now()}-${index}`,
        courseCode: courseCode || '',
        subjectName,
        classCode: classCode || '',
        dayOfWeek,
        startPeriod,
        endPeriod,
        startTime,
        endTime,
        room,
        campus,
        lecturerCode: finalLecturerCode,
        lecturerName: finalLecturerName,
        lecturerEmail: finalLecturerEmail,
        assistantName: assistantName || undefined,
        assistantEmail: assistantEmail || undefined,
        assistantRole: assistantRole || undefined,
        department,
        durationWeeks,
        startDate,
        endDate,
        notes: notes || '',
        midtermExamPeriod: midtermExamPeriod || undefined,
        finalExamPeriod: finalExamPeriod || undefined,
        facultyStatus,
        warnings,
        rawRow: row
      });
    });

    return results;
  };

  // Safe Excel parsing with dynamic SheetJS fallback
  const parseExcelArrayBuffer = async (buffer: ArrayBuffer): Promise<Record<string, any>[]> => {
    try {
      const xlsxModule = await import('xlsx');
      const XLSX = (xlsxModule as any).default || xlsxModule;
      const data = new Uint8Array(buffer);
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      return XLSX.utils.sheet_to_json(worksheet, { defval: '' });
    } catch (err: any) {
      console.error('SheetJS parse failed, attempting PapaParse fallback:', err);
      // Fallback: try decoding as text in case it's a CSV with .xls/.xlsx extension
      const text = new TextDecoder().decode(buffer);
      return parseTextToRows(text);
    }
  };

  // Handle File Upload (Excel or CSV)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setErrorMessage(null);
    const fileName = file.name.toLowerCase();

    try {
      if (fileName.endsWith('.csv') || fileName.endsWith('.txt')) {
        const text = await file.text();
        const rows = parseTextToRows(text);
        const parsed = mapRawDataToParsedRows(rows);
        if (parsed.length === 0) {
          setErrorMessage('Không nhận diện được dòng dữ liệu môn học hợp lệ. Vui lòng kiểm tra lại các cột tiêu đề trong file CSV.');
        } else {
          setParsedRows(parsed);
          setStep('preview');
        }
      } else {
        // Excel file (.xlsx, .xls)
        const buffer = await file.arrayBuffer();
        const json = await parseExcelArrayBuffer(buffer);
        const parsed = mapRawDataToParsedRows(json);
        if (parsed.length === 0) {
          setErrorMessage('Không đọc được dữ liệu môn học từ file Excel. Vui lòng đảm bảo bảng tính có các cột: Tên môn, Thứ, Giờ học, Giảng viên...');
        } else {
          setParsedRows(parsed);
          setStep('preview');
        }
      }
    } catch (err: any) {
      setErrorMessage(`Lỗi khi đọc file: ${err.message || 'Vui lòng kiểm tra định dạng file.'}`);
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Handle Pasted Text Parsing
  const handleParsePaste = () => {
    if (!pasteContent.trim()) {
      setErrorMessage('Vui lòng dán dữ liệu bảng từ Excel hoặc Google Sheets vào ô.');
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const rows = parseTextToRows(pasteContent.trim());
      const parsed = mapRawDataToParsedRows(rows);
      if (parsed.length === 0) {
        setErrorMessage('Không tìm thấy dòng môn học hợp lệ. Vui lòng sao chép cả hàng tiêu đề (Mã môn, Tên môn học, Thứ, Giờ học, Giảng viên...)');
      } else {
        setParsedRows(parsed);
        setStep('preview');
      }
    } catch (e: any) {
      setErrorMessage(`Lỗi phân tích dữ liệu: ${e.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Sample CSV Download
  const handleDownloadSample = () => {
    const blob = new Blob([SAMPLE_CSV], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'mau_thoi_khoa_bieu_khoa_hoa_hoc.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Copy sample template to clipboard
  const handleCopySample = () => {
    setPasteContent(SAMPLE_CSV);
    setErrorMessage(null);
  };

  // Modify row inline in preview
  const handleUpdateRow = (index: number, field: keyof ParsedRow, val: any) => {
    setParsedRows(prev => {
      const copy = [...prev];
      const target = { ...copy[index], [field]: val };

      // Tự động tính lại startTime và endTime nếu sửa Tiết bắt đầu, Tiết kết thúc hoặc Cơ sở
      if (field === 'startPeriod' || field === 'endPeriod' || field === 'campus') {
        const sPeriod = parseFloat(String(target.startPeriod)) || 1;
        const ePeriod = parseFloat(String(target.endPeriod)) || 3;
        const timeRange = convertPeriodsToTimeRange(target.campus, sPeriod, ePeriod);
        target.startTime = timeRange.startTime;
        target.endTime = timeRange.endTime;
      }

      copy[index] = target;
      return copy;
    });
  };

  // Delete row in preview
  const handleDeleteRow = (index: number) => {
    setParsedRows(prev => prev.filter((_, i) => i !== index));
  };

  // Confirm and Execute Append-Only Import
  const handleConfirm = () => {
    if (parsedRows.length === 0) {
      setErrorMessage('Không có dữ liệu môn học để nhập.');
      return;
    }

    // Collect new faculty members from the import list (hỗ trợ nhiều giảng viên trên 1 lớp, phân tách bởi dấu phẩy ",")
    const newFacultyToRegister: FacultyMember[] = [];
    const registeredFacultyNames = new Set<string>();

    (facultyList || []).forEach(f => {
      if (!f || f.id === 'all') return;
      const n = normalizePersonName(f.name);
      if (n) registeredFacultyNames.add(n);
    });

    parsedRows.forEach(row => {
      const lecturers = parseMultipleLecturers(row.lecturerName);
      const emails = parseMultipleEmails(row.lecturerEmail);
      const codes = parseMultipleCodes(row.lecturerCode);

      lecturers.forEach((lecturer, idx) => {
        const normName = normalizePersonName(lecturer);
        if (!normName) return;

        // Nếu Thầy/Cô này chưa có trong danh bạ và chưa được thêm vào batch này
        if (!registeredFacultyNames.has(normName)) {
          const emailVal = emails[idx] || (emails.length === 1 && lecturers.length === 1 ? emails[0] : '');
          const codeVal = codes[idx] || (codes.length === 1 && lecturers.length === 1 ? codes[0] : '');

          const newMember: FacultyMember = {
            id: `fac-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
            code: codeVal,
            name: lecturer,
            email: emailVal || `${normName.replace(/[^a-z0-9]/g, '') || 'gv'}@chem.hcmus.edu.vn`,
            department: row.department || 'Khoa Hóa học'
          };
          newFacultyToRegister.push(newMember);
          registeredFacultyNames.add(normName);
        }
      });
    });

    // Convert to ScheduleItem[] (kèm startPeriod, endPeriod và lecturerCode)
    const finalSchedules: ScheduleItem[] = parsedRows.map(row => ({
      id: row.id,
      dayOfWeek: row.dayOfWeek,
      startTime: row.startTime,
      endTime: row.endTime,
      startPeriod: row.startPeriod,
      endPeriod: row.endPeriod,
      subjectName: row.subjectName,
      room: row.room,
      campus: row.campus,
      lecturerCode: row.lecturerCode || undefined,
      lecturerName: row.lecturerName,
      lecturerEmail: row.lecturerEmail,
      assistantName: row.assistantName,
      assistantEmail: row.assistantEmail,
      assistantRole: row.assistantRole,
      department: row.department,
      durationWeeks: row.durationWeeks,
      startDate: row.startDate,
      endDate: row.endDate,
      classCode: row.classCode,
      courseCode: row.courseCode,
      notes: row.notes,
      midtermExamPeriod: row.midtermExamPeriod,
      finalExamPeriod: row.finalExamPeriod
    }));

    onConfirmImport(finalSchedules, newFacultyToRegister, importMode);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 z-50 animate-fadeIn">
      <div 
        className={`bg-white rounded-2xl w-full overflow-hidden shadow-2xl border border-slate-200 flex flex-col transition-all duration-200 animate-scaleUp ${
          step === 'preview' ? 'max-w-[97vw] max-h-[96vh]' : 'max-w-5xl max-h-[92vh]'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-slate-900 text-white p-4 sm:p-5 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base sm:text-lg">Nhập Lịch Giảng dạy & Danh bạ (Excel / CSV)</h3>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                  Dành cho VP Khoa
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Tự động nhận diện môn học, phòng, thời gian và đối soát thông tin giảng viên
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Notification Banner if any */}
        {errorMessage && (
          <div className="p-3 bg-rose-50 border-b border-rose-200 flex items-center justify-between gap-3 text-xs text-rose-900 shrink-0">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setErrorMessage(null)}
              className="text-rose-700 hover:text-rose-900 font-bold"
            >
              ✕
            </button>
          </div>
        )}

        {/* STEP 1: Input (Upload or Paste) */}
        {step === 'input' && (
          <div className="p-5 flex-1 overflow-y-auto space-y-4">
            {/* Tabs */}
            <div className="flex items-center gap-2 border-b border-slate-200 pb-3 flex-wrap">
              <button
                type="button"
                onClick={() => { setActiveTab('upload'); setErrorMessage(null); }}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeTab === 'upload'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <Upload className="w-4 h-4" />
                <span>Tải file Excel (.xlsx, .xls) / CSV</span>
              </button>

              <button
                type="button"
                onClick={() => { setActiveTab('paste'); setErrorMessage(null); }}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeTab === 'paste'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>Dán bảng từ Excel / Google Sheets</span>
              </button>

              <div className="ml-auto flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDownloadSample}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg border border-indigo-200 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Tải file mẫu (.csv)</span>
                </button>
              </div>
            </div>

            {/* Tab 1: Upload */}
            {activeTab === 'upload' && (
              <div className="space-y-4">
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-indigo-300 hover:border-indigo-500 rounded-2xl p-8 text-center bg-indigo-50/40 hover:bg-indigo-50/80 cursor-pointer transition-all flex flex-col items-center justify-center space-y-3"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx, .xls, .csv, .txt"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                  <div className="w-14 h-14 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center shadow-inner">
                    <FileSpreadsheet className="w-7 h-7" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">
                      {isProcessing ? 'Đang đọc và phân tích file...' : 'Nhấn để chọn file Excel (.xlsx, .xls) hoặc CSV'}
                    </h4>
                    <p className="text-xs text-slate-500 mt-1">
                      Hệ thống tự động nhận diện các cột: Tên môn học, Thứ, Giờ học, Cơ sở, Phòng, Giảng viên, Email, Trợ giảng...
                    </p>
                  </div>
                  <span className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold shadow-sm hover:bg-indigo-700 transition-colors">
                    {isProcessing ? 'Đang xử lý...' : 'Chọn file từ máy tính'}
                  </span>
                </div>
              </div>
            )}

            {/* Tab 2: Paste */}
            {activeTab === 'paste' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-600">
                  <span>Dán trực tiếp bảng sao chép từ Excel hoặc Google Sheets:</span>
                  <button
                    type="button"
                    onClick={handleCopySample}
                    className="text-indigo-600 hover:underline font-semibold flex items-center gap-1"
                  >
                    <Copy className="w-3 h-3" />
                    <span>Dán thử dữ liệu mẫu</span>
                  </button>
                </div>
                <textarea
                  rows={8}
                  value={pasteContent}
                  onChange={(e) => setPasteContent(e.target.value)}
                  placeholder={`Mã môn\tTên môn học\tLớp\tThứ\tGiờ học\tCơ sở\tPhòng\tGiảng viên\tEmail\nCHE101\tHóa đại cương A1\t24HOH1\tThứ 2\t07:00 – 09:30\tCS1\tC.32\tGS.TS. Nguyễn Văn Hóa\tnvhoa@chem.hcmus.edu.vn\n...`}
                  className="w-full p-3 font-mono text-xs border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                />
                <div className="flex justify-end">
                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={handleParsePaste}
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-sm transition-colors"
                  >
                    {isProcessing ? 'Đang phân tích...' : 'Phân tích dữ liệu & Xem trước'}
                  </button>
                </div>
              </div>
            )}

            {/* Smart Matching Explanation */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs text-slate-600">
              <h5 className="font-bold text-slate-900 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                <span>Cơ chế nhận diện thông minh của hệ thống:</span>
              </h5>
              <ul className="list-disc list-inside space-y-1 pl-1 text-[11px] leading-relaxed text-slate-600">
                <li><strong>Cột Mã số cán bộ (MSCB) trước tên Thầy Cô:</strong> Hỗ trợ cột mã số cán bộ đặt trước tên giảng viên (hoặc định dạng <code>CB01 - TS. Tên Thầy Cô</code>). Trong hiển thị và bộ lọc tìm kiếm, hệ thống hiển thị rõ ràng <strong>"Mã số cán bộ" - "Tên thầy cô"</strong> để tránh nhầm lẫn khi trùng tên.</li>
                <li><strong>Tự động tính Giờ từ Tiết học & Cơ sở:</strong> Hệ thống tự động quy đổi Tiết BĐ & Tiết KT sang giờ học chuẩn của CS1 (Tiết 1 từ 07:00) hoặc CS2 (Tiết 1 từ 07:30).</li>
                <li><strong>Hỗ trợ lớp bài tập 2.5 tiết:</strong> Cho phép nhập số thập phân (như 2.5), hệ thống sẽ tự động lấy mốc thời gian chính giữa tiết.</li>
                <li><strong>Đa giảng viên phụ trách:</strong> Nếu 1 môn có nhiều thầy cô, để chung 1 cột và ngăn cách bằng dấu phẩy <code>,</code> (ví dụ: <code>TS. Hoàng Minh Trí, PGS.TS. Lê Hoàng Mai</code>). Hệ thống sẽ tự động nhận diện và cập nhật vào danh bạ Khoa.</li>
                <li><strong>Cơ sở & Phòng học độc lập:</strong> Cột <em>Cơ sở</em> (CS1 / CS2) được tách riêng độc lập với cột <em>Phòng</em> giúp VP Khoa thao tác thuận tiện, không cần gõ tiền tố phức tạp.</li>
              </ul>
            </div>
          </div>
        )}

        {/* STEP 2: Preview & Reconciliation */}
        {step === 'preview' && (
          <div className="p-3 sm:p-5 flex-1 overflow-y-auto space-y-3.5 flex flex-col min-h-0">
            {/* Top Summary Badges */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 p-3 bg-indigo-50/90 border border-indigo-200 rounded-xl shrink-0 shadow-sm">
              <div className="flex items-center gap-2 flex-wrap text-xs">
                <span className="px-2.5 py-1 rounded-lg bg-white border border-indigo-200 font-semibold text-slate-800 shadow-sm flex items-center gap-1.5">
                  <FileSpreadsheet className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Tổng số môn đọc được: <strong className="text-indigo-600 font-bold">{previewStats.total}</strong></span>
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 font-semibold text-emerald-800 flex items-center gap-1">
                  <Check className="w-3 h-3 text-emerald-600" />
                  <span>Khớp danh bạ: <strong>{previewStats.matched}</strong></span>
                </span>
                {previewStats.newFaculty > 0 && (
                  <span className="px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-200 font-semibold text-blue-800 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-blue-600" />
                    <span>GV mới: <strong>{previewStats.newFaculty}</strong></span>
                  </span>
                )}
                {previewStats.missing > 0 && (
                  <span className="px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-300 font-semibold text-amber-900 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                    <span>Cần bổ sung/kiểm tra: <strong>{previewStats.missing}</strong></span>
                  </span>
                )}
                <span className="px-2 py-0.5 rounded-lg bg-slate-100 border border-slate-200 text-slate-600 text-[11px]">
                  CS1: <strong>{previewStats.cs1Count}</strong> | CS2: <strong>{previewStats.cs2Count}</strong>
                </span>
                {previewStats.withExamCount > 0 && (
                  <span className="px-2 py-0.5 rounded-lg bg-purple-50 border border-purple-200 text-purple-700 text-[11px] font-medium">
                    📅 Có lịch thi: <strong>{previewStats.withExamCount}</strong>
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => { setStep('input'); setErrorMessage(null); setInspectingRowIndex(null); }}
                  className="px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:text-indigo-900 hover:bg-white/80 rounded-lg transition-colors flex items-center gap-1 border border-indigo-200 bg-white/50"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Tải file / Dán lại</span>
                </button>
              </div>
            </div>

            {/* Toolbar: Search, Filter & Layout View Switcher */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 shrink-0 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
              <div className="flex items-center gap-2 flex-1 min-w-[260px] max-w-md">
                <div className="relative w-full">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Tìm theo tên môn, mã môn, lớp, giảng viên, MSCB, phòng, bộ môn..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>

              {/* Status Filter Chips */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] font-semibold text-slate-500 mr-1 hidden sm:inline">Lọc:</span>
                <button
                  type="button"
                  onClick={() => setStatusFilter('all')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                    statusFilter === 'all'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  Tất cả ({parsedRows.length})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('warning')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ${
                    statusFilter === 'warning'
                      ? 'bg-amber-600 text-white shadow-sm'
                      : 'bg-white text-amber-800 hover:bg-amber-50 border border-amber-200'
                  }`}
                >
                  <AlertTriangle className="w-3 h-3" />
                  <span>Cần kiểm tra ({previewStats.missing})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('new')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ${
                    statusFilter === 'new'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-white text-blue-800 hover:bg-blue-50 border border-blue-200'
                  }`}
                >
                  <Sparkles className="w-3 h-3" />
                  <span>GV Mới ({previewStats.newFaculty})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('matched')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ${
                    statusFilter === 'matched'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-white text-emerald-800 hover:bg-emerald-50 border border-emerald-200'
                  }`}
                >
                  <Check className="w-3 h-3" />
                  <span>Đã khớp ({previewStats.matched})</span>
                </button>
              </div>

              {/* View Mode Switcher */}
              <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200 ml-auto">
                <button
                  type="button"
                  onClick={() => setViewMode('table')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold transition-all ${
                    viewMode === 'table'
                      ? 'bg-indigo-50 text-indigo-700 font-bold border border-indigo-200'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Hiển thị dạng bảng toàn bộ các cột"
                >
                  <TableIcon className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Bảng đầy đủ</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('cards')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold transition-all ${
                    viewMode === 'cards'
                      ? 'bg-indigo-50 text-indigo-700 font-bold border border-indigo-200'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Hiển thị dạng thẻ chi tiết từng môn"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Thẻ chi tiết</span>
                </button>
              </div>
            </div>

            {/* Instruction bar */}
            <div className="p-2.5 bg-sky-50/80 border border-sky-200 rounded-xl flex items-center justify-between gap-3 text-xs text-sky-950 shrink-0">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-sky-600 shrink-0" />
                <span>
                  <strong>Kiểm tra toàn diện trước khi nhập:</strong> Bạn có thể chỉnh sửa trực tiếp các ô trên bảng, hoặc bấm nút <strong className="text-indigo-700">👁️ Chi tiết</strong> ở bất kỳ dòng nào để xem và đối chiếu 100% tất cả các trường dữ liệu gốc đọc từ file Excel/CSV.
                </span>
              </div>
              <span className="text-[11px] font-mono font-bold text-sky-800 shrink-0 bg-white/80 px-2 py-0.5 rounded border border-sky-200">
                Hiển thị: {filteredRows.length}/{parsedRows.length} môn
              </span>
            </div>

            {/* VIEW MODE 1: Full Interactive Table */}
            {viewMode === 'table' && (
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm flex-1 overflow-x-auto overflow-y-auto min-h-[320px] max-h-[56vh]">
                <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
                  <thead>
                    <tr className="bg-slate-100/95 border-b border-slate-200 text-slate-700 font-semibold sticky top-0 z-10 shadow-sm">
                      <th className="py-2.5 px-2.5 text-center w-10">#</th>
                      <th className="py-2.5 px-2 text-center w-12">Chi tiết</th>
                      <th className="py-2.5 px-2.5 text-center">Trạng thái</th>
                      <th className="py-2.5 px-3">Mã HP</th>
                      <th className="py-2.5 px-3 min-w-[200px]">Tên môn học</th>
                      <th className="py-2.5 px-3 min-w-[100px]">Lớp HP</th>
                      <th className="py-2.5 px-3 min-w-[170px]">Bộ môn</th>
                      <th className="py-2.5 px-3 min-w-[150px]">Thứ & Tiết học</th>
                      <th className="py-2.5 px-3">Cơ sở</th>
                      <th className="py-2.5 px-3 min-w-[110px]">Phòng</th>
                      <th className="py-2.5 px-3 min-w-[90px]">Mã số CB</th>
                      <th className="py-2.5 px-3 min-w-[170px]">Giảng viên chính</th>
                      <th className="py-2.5 px-3 min-w-[160px]">Email GV</th>
                      <th className="py-2.5 px-3 min-w-[150px]">Trợ giảng (TA)</th>
                      <th className="py-2.5 px-3 min-w-[160px]">Email TA</th>
                      <th className="py-2.5 px-3 min-w-[140px]">Số tuần & Ngày áp dụng</th>
                      <th className="py-2.5 px-3 min-w-[130px]">Thi GK</th>
                      <th className="py-2.5 px-3 min-w-[130px]">Thi CK</th>
                      <th className="py-2.5 px-3 min-w-[150px]">Ghi chú</th>
                      <th className="py-2.5 px-2.5 text-center">Xóa</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {filteredRows.length === 0 ? (
                      <tr>
                        <td colSpan={20} className="py-12 text-center text-slate-400">
                          <AlertCircle className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                          <p className="font-semibold text-slate-600">Không tìm thấy môn học nào phù hợp</p>
                          <p className="text-xs text-slate-400 mt-0.5">Thử xóa từ khóa tìm kiếm hoặc chọn lọc trạng thái "Tất cả"</p>
                        </td>
                      </tr>
                    ) : (
                      filteredRows.map((row) => {
                        const originalIndex = parsedRows.findIndex(r => r.id === row.id);
                        const isMissing = row.facultyStatus === 'missing_info';
                        return (
                          <tr
                            key={row.id}
                            className={`hover:bg-indigo-50/40 transition-colors ${
                              isMissing ? 'bg-amber-50/30' : ''
                            }`}
                          >
                            {/* STT */}
                            <td className="py-2 px-2.5 text-center text-slate-400 font-mono text-[11px]">
                              {originalIndex + 1}
                            </td>

                            {/* View full details button */}
                            <td className="py-2 px-2 text-center">
                              <button
                                type="button"
                                onClick={() => {
                                  setInspectingRowIndex(originalIndex);
                                  setInspectorTab('parsed');
                                }}
                                className="p-1.5 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-100/70 rounded-lg transition-colors inline-flex items-center justify-center shadow-xs border border-indigo-200/60 bg-indigo-50/40"
                                title="Xem và kiểm tra toàn bộ thông tin môn học & đối chiếu file gốc"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                            </td>

                            {/* Status */}
                            <td className="py-2 px-2.5 text-center">
                              {row.facultyStatus === 'matched' ? (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                  <Check className="w-3 h-3 text-emerald-600" />
                                  <span>Khớp</span>
                                </span>
                              ) : row.facultyStatus === 'new_complete' ? (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
                                  <Sparkles className="w-3 h-3 text-blue-600" />
                                  <span>GV Mới</span>
                                </span>
                              ) : (
                                <span
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300"
                                  title={(row.warnings || []).join('; ')}
                                >
                                  <AlertTriangle className="w-3 h-3 text-amber-600" />
                                  <span>Cần ktra</span>
                                </span>
                              )}
                            </td>

                            {/* Course Code */}
                            <td className="py-2 px-3">
                              <input
                                type="text"
                                value={row.courseCode || ''}
                                onChange={(e) => handleUpdateRow(originalIndex, 'courseCode', e.target.value)}
                                placeholder="Mã HP"
                                className="font-mono text-xs font-semibold text-slate-700 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-500 outline-none w-20"
                              />
                            </td>

                            {/* Subject Name */}
                            <td className="py-2 px-3">
                              <input
                                type="text"
                                value={row.subjectName || ''}
                                onChange={(e) => handleUpdateRow(originalIndex, 'subjectName', e.target.value)}
                                className="font-bold text-slate-900 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-500 outline-none w-full min-w-[190px]"
                                title={row.subjectName}
                              />
                            </td>

                            {/* Class Code */}
                            <td className="py-2 px-3">
                              <input
                                type="text"
                                value={row.classCode || ''}
                                onChange={(e) => handleUpdateRow(originalIndex, 'classCode', e.target.value)}
                                placeholder="Lớp"
                                className="font-mono text-xs font-bold text-indigo-700 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-500 outline-none w-24"
                              />
                            </td>

                            {/* Department */}
                            <td className="py-2 px-3">
                              <select
                                value={row.department || 'Khoa Hóa học (Chung / Chưa phân BM)'}
                                onChange={(e) => handleUpdateRow(originalIndex, 'department', e.target.value)}
                                className="text-xs text-slate-800 bg-transparent border border-transparent hover:border-slate-300 rounded px-1.5 py-0.5 outline-none max-w-[180px] truncate"
                              >
                                {departmentList.map(dept => (
                                  <option key={dept} value={dept}>{dept}</option>
                                ))}
                              </select>
                            </td>

                            {/* Day & Period & Time */}
                            <td className="py-2 px-3">
                              <div className="flex items-center gap-1.5 mb-1">
                                <select
                                  value={row.dayOfWeek}
                                  onChange={(e) => handleUpdateRow(originalIndex, 'dayOfWeek', e.target.value as any)}
                                  className="font-bold text-indigo-700 bg-transparent border border-transparent hover:border-slate-300 rounded text-xs outline-none"
                                >
                                  {DAYS_OF_WEEK.map(d => (
                                    <option key={d} value={d}>{d}</option>
                                  ))}
                                </select>

                                <div className="flex items-center gap-1 text-[11px]">
                                  <span className="text-slate-400">T:</span>
                                  <input
                                    type="number"
                                    step="0.5"
                                    min="1"
                                    max="12"
                                    value={row.startPeriod}
                                    onChange={(e) => handleUpdateRow(originalIndex, 'startPeriod', e.target.value)}
                                    className="w-9 px-1 py-0.5 border border-slate-200 rounded text-center font-bold text-slate-800 bg-slate-50 focus:bg-white focus:border-indigo-500 outline-none"
                                    title="Tiết bắt đầu"
                                  />
                                  <span className="text-slate-400">–</span>
                                  <input
                                    type="number"
                                    step="0.5"
                                    min="1"
                                    max="12"
                                    value={row.endPeriod}
                                    onChange={(e) => handleUpdateRow(originalIndex, 'endPeriod', e.target.value)}
                                    className="w-9 px-1 py-0.5 border border-slate-200 rounded text-center font-bold text-slate-800 bg-slate-50 focus:bg-white focus:border-indigo-500 outline-none"
                                    title="Tiết kết thúc"
                                  />
                                </div>
                              </div>

                              <div className="text-[10px] font-mono text-indigo-600 font-semibold bg-indigo-50/60 px-1.5 py-0.5 rounded border border-indigo-100 inline-block" title="Giờ tính tự động theo chuẩn cơ sở">
                                ⏱ {row.startTime} – {row.endTime}
                              </div>
                            </td>

                            {/* Campus */}
                            <td className="py-2 px-3">
                              <select
                                value={row.campus}
                                onChange={(e) => {
                                  const newCamp = e.target.value as 'cs1' | 'cs2';
                                  const currentRoom = (row.room || '').replace(/^cs[12]:/i, '');
                                  handleUpdateRow(originalIndex, 'campus', newCamp);
                                  handleUpdateRow(originalIndex, 'room', `${newCamp}:${currentRoom}`);
                                }}
                                className={`font-semibold text-xs px-2 py-1 rounded border outline-none ${
                                  row.campus === 'cs1'
                                    ? 'bg-indigo-50/70 text-indigo-700 border-indigo-200'
                                    : 'bg-emerald-50/70 text-emerald-700 border-emerald-200'
                                }`}
                              >
                                <option value="cs1">CS1 (P. Chợ Quán)</option>
                                <option value="cs2">CS2 (P. Đông Hoà)</option>
                              </select>
                            </td>

                            {/* Room */}
                            <td className="py-2 px-3">
                              <input
                                type="text"
                                value={(row.room || '').replace(/^cs[12]:/i, '')}
                                onChange={(e) => {
                                  const clean = e.target.value.trim();
                                  handleUpdateRow(originalIndex, 'room', `${row.campus}:${clean}`);
                                }}
                                placeholder="VD: PTN-D201"
                                className="font-mono text-xs font-semibold text-slate-800 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-500 outline-none w-24"
                              />
                            </td>

                            {/* Lecturer Code (MSCB) */}
                            <td className="py-2 px-3">
                              <input
                                type="text"
                                value={row.lecturerCode || ''}
                                onChange={(e) => handleUpdateRow(originalIndex, 'lecturerCode', e.target.value)}
                                placeholder="VD: CB01"
                                className="font-mono text-xs font-bold text-indigo-700 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-500 outline-none w-20"
                                title="Mã số cán bộ (phân tách dấu phẩy nếu nhiều giảng viên)"
                              />
                            </td>

                            {/* Lecturer Name */}
                            <td className="py-2 px-3">
                              <input
                                type="text"
                                value={row.lecturerName || ''}
                                onChange={(e) => handleUpdateRow(originalIndex, 'lecturerName', e.target.value)}
                                placeholder="VD: Thầy A, Thầy B"
                                className="font-bold text-slate-900 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-500 outline-none w-full min-w-[160px]"
                              />
                              {row.lecturerName && row.lecturerName.includes(',') && (
                                <div className="text-[10px] text-indigo-600 font-medium mt-0.5">
                                  ✓ Đa giảng viên ({parseMultipleLecturers(row.lecturerName).length} Thầy/Cô)
                                </div>
                              )}
                            </td>

                            {/* Lecturer Email */}
                            <td className="py-2 px-3">
                              <input
                                type="text"
                                value={row.lecturerEmail || ''}
                                onChange={(e) => handleUpdateRow(originalIndex, 'lecturerEmail', e.target.value)}
                                placeholder="Email giảng viên"
                                className={`font-mono text-[11px] bg-transparent border-b outline-none w-full min-w-[150px] ${
                                  !row.lecturerEmail || row.lecturerEmail.includes('chem.hcmus')
                                    ? 'border-transparent hover:border-slate-300 text-slate-600'
                                    : 'border-amber-300 text-amber-900'
                                }`}
                              />
                            </td>

                            {/* Assistant Name */}
                            <td className="py-2 px-3">
                              <input
                                type="text"
                                value={row.assistantName || ''}
                                onChange={(e) => handleUpdateRow(originalIndex, 'assistantName', e.target.value)}
                                placeholder="+ Thêm trợ giảng"
                                className="text-xs text-indigo-900 placeholder:text-slate-400 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-500 outline-none w-full min-w-[130px]"
                              />
                            </td>

                            {/* Assistant Email */}
                            <td className="py-2 px-3">
                              <input
                                type="text"
                                value={row.assistantEmail || ''}
                                onChange={(e) => handleUpdateRow(originalIndex, 'assistantEmail', e.target.value)}
                                placeholder="Email trợ giảng"
                                className="font-mono text-[11px] text-slate-600 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-500 outline-none w-full min-w-[140px]"
                              />
                            </td>

                            {/* Teaching Period & Dates */}
                            <td className="py-2 px-3">
                              <div className="flex items-center gap-1 text-[11px] font-mono text-slate-600 mb-0.5">
                                <input
                                  type="text"
                                  value={row.durationWeeks || ''}
                                  onChange={(e) => handleUpdateRow(originalIndex, 'durationWeeks', e.target.value)}
                                  placeholder="17 tuần"
                                  className="w-16 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-500 outline-none text-slate-800 font-semibold"
                                />
                              </div>
                              <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                                <input
                                  type="text"
                                  value={row.startDate || ''}
                                  onChange={(e) => handleUpdateRow(originalIndex, 'startDate', e.target.value)}
                                  placeholder="YYYY-MM-DD"
                                  className="w-20 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-500 outline-none"
                                />
                                <span>→</span>
                                <input
                                  type="text"
                                  value={row.endDate || ''}
                                  onChange={(e) => handleUpdateRow(originalIndex, 'endDate', e.target.value)}
                                  placeholder="YYYY-MM-DD"
                                  className="w-20 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-500 outline-none"
                                />
                              </div>
                            </td>

                            {/* Midterm Exam Period */}
                            <td className="py-2 px-3">
                              <input
                                type="text"
                                placeholder="VD: 26/10 – 08/11/2026"
                                value={row.midtermExamPeriod || ''}
                                onChange={(e) => handleUpdateRow(originalIndex, 'midtermExamPeriod', e.target.value)}
                                className="text-[11px] text-amber-950 font-medium bg-transparent border-b border-transparent hover:border-amber-300 focus:border-amber-500 outline-none w-full min-w-[125px]"
                              />
                            </td>

                            {/* Final Exam Period */}
                            <td className="py-2 px-3">
                              <input
                                type="text"
                                placeholder="VD: 04/01 – 17/01/2027"
                                value={row.finalExamPeriod || ''}
                                onChange={(e) => handleUpdateRow(originalIndex, 'finalExamPeriod', e.target.value)}
                                className="text-[11px] text-indigo-950 font-medium bg-transparent border-b border-transparent hover:border-indigo-300 focus:border-indigo-500 outline-none w-full min-w-[125px]"
                              />
                            </td>

                            {/* Notes */}
                            <td className="py-2 px-3">
                              <input
                                type="text"
                                placeholder="Ghi chú thêm"
                                value={row.notes || ''}
                                onChange={(e) => handleUpdateRow(originalIndex, 'notes', e.target.value)}
                                className="text-xs text-slate-700 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-500 outline-none w-full min-w-[130px]"
                              />
                            </td>

                            {/* Delete row */}
                            <td className="py-2 px-2.5 text-center">
                              <button
                                type="button"
                                onClick={() => handleDeleteRow(originalIndex)}
                                className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded"
                                title="Xóa dòng này khỏi danh sách nhập"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* VIEW MODE 2: Rich Detailed Cards */}
            {viewMode === 'cards' && (
              <div className="border border-slate-200 rounded-xl bg-slate-50/50 p-3 flex-1 overflow-y-auto min-h-[320px] max-h-[56vh]">
                {filteredRows.length === 0 ? (
                  <div className="py-12 text-center text-slate-400">
                    <AlertCircle className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    <p className="font-semibold text-slate-600">Không tìm thấy môn học nào phù hợp</p>
                    <p className="text-xs text-slate-400 mt-0.5">Thử xóa từ khóa tìm kiếm hoặc chọn lọc trạng thái "Tất cả"</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
                    {filteredRows.map((row) => {
                      const originalIndex = parsedRows.findIndex(r => r.id === row.id);
                      return (
                        <div
                          key={row.id}
                          className="bg-white rounded-xl border border-slate-200 shadow-xs hover:shadow-md transition-all p-3.5 flex flex-col justify-between space-y-3"
                        >
                          {/* Card Top */}
                          <div>
                            <div className="flex items-start justify-between gap-2 mb-1.5">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 font-mono text-[10px] font-bold rounded">
                                  #{originalIndex + 1}
                                </span>
                                {row.courseCode && (
                                  <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-700 font-mono text-[10px] font-bold rounded border border-indigo-200">
                                    {row.courseCode}
                                  </span>
                                )}
                                {row.classCode && (
                                  <span className="px-1.5 py-0.5 bg-slate-100 text-slate-800 font-mono text-[10px] font-bold rounded">
                                    Lớp: {row.classCode}
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setInspectingRowIndex(originalIndex);
                                    setInspectorTab('parsed');
                                  }}
                                  className="p-1 text-indigo-600 hover:bg-indigo-50 rounded"
                                  title="Xem toàn bộ thông tin chi tiết & file gốc"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteRow(originalIndex)}
                                  className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded"
                                  title="Xóa môn này"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>

                            <h4 className="font-bold text-slate-900 text-sm leading-snug line-clamp-2">
                              {row.subjectName || 'Chưa đặt tên môn'}
                            </h4>

                            {/* Status badge */}
                            <div className="mt-1.5">
                              {row.facultyStatus === 'matched' ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                  <Check className="w-3 h-3 text-emerald-600" />
                                  <span>Đã khớp danh bạ Khoa</span>
                                </span>
                              ) : row.facultyStatus === 'new_complete' ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
                                  <Sparkles className="w-3 h-3 text-blue-600" />
                                  <span>Giảng viên mới (tự tạo)</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                                  <AlertTriangle className="w-3 h-3 text-amber-600" />
                                  <span>Cần bổ sung thông tin</span>
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Card Middle: Detailed Specs */}
                          <div className="space-y-2 text-xs border-t border-slate-100 pt-2.5">
                            {/* Schedule & Location */}
                            <div className="flex items-center justify-between text-slate-700 bg-slate-50 p-2 rounded-lg">
                              <div className="flex items-center gap-1.5 font-medium">
                                <Clock className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                                <span>{row.dayOfWeek}, Tiết {row.startPeriod}–{row.endPeriod}</span>
                                <span className="text-[10px] font-mono text-slate-500">({row.startTime}–{row.endTime})</span>
                              </div>
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                row.campus === 'cs1' ? 'bg-indigo-100 text-indigo-800' : 'bg-emerald-100 text-emerald-800'
                              }`}>
                                {row.campus.toUpperCase()} • {(row.room || '').replace(/^cs[12]:/i, '') || 'Chưa xếp phòng'}
                              </span>
                            </div>

                            {/* Lecturer */}
                            <div className="p-2 rounded-lg border border-slate-100 space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="text-[11px] font-bold text-slate-800 flex items-center gap-1">
                                  <User className="w-3.5 h-3.5 text-indigo-600" />
                                  {row.lecturerCode && <span className="font-mono text-indigo-700">[{row.lecturerCode}]</span>}
                                  <span>{row.lecturerName || 'Chưa phân công'}</span>
                                </span>
                              </div>
                              {row.lecturerEmail && (
                                <p className="text-[10px] font-mono text-slate-500 truncate pl-4">
                                  ✉ {row.lecturerEmail}
                                </p>
                              )}
                              {row.assistantName && (
                                <p className="text-[11px] text-indigo-900 font-medium pl-4 pt-0.5 border-t border-slate-100 mt-1">
                                  Trợ giảng: <strong>{row.assistantName}</strong>
                                </p>
                              )}
                            </div>

                            {/* Department & Exam Schedule */}
                            <div className="text-[11px] text-slate-500 space-y-1 pl-1">
                              <div className="flex items-center justify-between">
                                <span>Bộ môn:</span>
                                <span className="font-semibold text-slate-700 truncate max-w-[170px]">{row.department}</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span>Thời lượng:</span>
                                <span className="font-mono text-slate-700">{row.durationWeeks || '17 tuần'} ({row.startDate} → {row.endDate})</span>
                              </div>
                              {(row.midtermExamPeriod || row.finalExamPeriod) && (
                                <div className="text-[10px] bg-purple-50 text-purple-900 p-1.5 rounded border border-purple-200">
                                  {row.midtermExamPeriod && <div>GK: {row.midtermExamPeriod}</div>}
                                  {row.finalExamPeriod && <div>CK: {row.finalExamPeriod}</div>}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Card Bottom Button */}
                          <button
                            type="button"
                            onClick={() => {
                              setInspectingRowIndex(originalIndex);
                              setInspectorTab('parsed');
                            }}
                            className="w-full py-1.5 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5 border border-indigo-200"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Xem toàn bộ thông tin & Đối chiếu file gốc</span>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* FULL DETAIL & RAW FILE DATA INSPECTOR MODAL */}
            {inspectingRowIndex !== null && parsedRows[inspectingRowIndex] && (() => {
              const row = parsedRows[inspectingRowIndex];
              const rawObj = row.rawRow || {};
              const rawKeys = Object.keys(rawObj);
              const filteredRawKeys = rawKeys.filter(k => 
                !rawSearchQuery || 
                k.toLowerCase().includes(rawSearchQuery.toLowerCase()) || 
                String(rawObj[k]).toLowerCase().includes(rawSearchQuery.toLowerCase())
              );

              return (
                <div 
                  className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 z-60 animate-fadeIn"
                  onClick={() => setInspectingRowIndex(null)}
                >
                  <div 
                    className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl border border-slate-200 flex flex-col animate-scaleUp"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Modal Inspector Header */}
                    <div className="bg-slate-900 text-white p-4 flex items-center justify-between border-b border-slate-800 shrink-0">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
                          <Eye className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-base">
                              Môn học #{inspectingRowIndex + 1} / {parsedRows.length}: {row.subjectName || 'Chưa đặt tên'}
                            </h4>
                            {row.classCode && (
                              <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-xs border border-slate-700">
                                Lớp {row.classCode}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-400">
                            Kiểm tra toàn bộ 100% dữ liệu đã bóc tách và đối chiếu dữ liệu gốc từ file Excel/CSV
                          </p>
                        </div>
                      </div>

                      {/* Navigation & Close */}
                      <div className="flex items-center gap-2">
                        <div className="inline-flex items-center bg-slate-800 rounded-lg p-0.5 border border-slate-700 text-xs">
                          <button
                            type="button"
                            onClick={() => setInspectingRowIndex(prev => (prev !== null && prev > 0 ? prev - 1 : parsedRows.length - 1))}
                            className="px-2 py-1 hover:bg-slate-700 rounded text-slate-300 hover:text-white flex items-center gap-1"
                            title="Dòng trước"
                          >
                            <ChevronLeft className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Trước</span>
                          </button>
                          <span className="px-2 text-slate-500 font-mono text-[11px]">
                            {inspectingRowIndex + 1}/{parsedRows.length}
                          </span>
                          <button
                            type="button"
                            onClick={() => setInspectingRowIndex(prev => (prev !== null && prev < parsedRows.length - 1 ? prev + 1 : 0))}
                            className="px-2 py-1 hover:bg-slate-700 rounded text-slate-300 hover:text-white flex items-center gap-1"
                            title="Dòng kế tiếp"
                          >
                            <span className="hidden sm:inline">Tiếp</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => setInspectingRowIndex(null)}
                          className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                    </div>

                    {/* Tabs inside Inspector */}
                    <div className="flex items-center gap-2 border-b border-slate-200 px-5 pt-3 bg-slate-50 shrink-0">
                      <button
                        type="button"
                        onClick={() => setInspectorTab('parsed')}
                        className={`flex items-center gap-2 px-4 py-2 border-b-2 text-xs font-bold transition-all ${
                          inspectorTab === 'parsed'
                            ? 'border-indigo-600 text-indigo-600 bg-white rounded-t-lg shadow-xs'
                            : 'border-transparent text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <FileCheck className="w-4 h-4" />
                        <span>Toàn bộ thông tin môn học (20+ trường)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setInspectorTab('raw')}
                        className={`flex items-center gap-2 px-4 py-2 border-b-2 text-xs font-bold transition-all ${
                          inspectorTab === 'raw'
                            ? 'border-indigo-600 text-indigo-600 bg-white rounded-t-lg shadow-xs'
                            : 'border-transparent text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <Database className="w-4 h-4" />
                        <span>Đối chiếu dữ liệu gốc từ file ({rawKeys.length} cột)</span>
                      </button>
                    </div>

                    {/* Tab Content */}
                    <div className="p-5 flex-1 overflow-y-auto">
                      {/* TAB 1: Parsed & Structured Fields */}
                      {inspectorTab === 'parsed' && (
                        <div className="space-y-5">
                          {/* Warnings Banner if any */}
                          {row.warnings && row.warnings.length > 0 && (
                            <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl space-y-1">
                              <h5 className="font-bold text-xs text-amber-900 flex items-center gap-1.5">
                                <AlertTriangle className="w-4 h-4 text-amber-600" />
                                <span>Cảnh báo cần kiểm tra cho dòng này:</span>
                              </h5>
                              <ul className="list-disc list-inside text-xs text-amber-800 pl-2 space-y-0.5">
                                {row.warnings.map((w, i) => (
                                  <li key={i}>{w}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Section 1: Course & Class */}
                          <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200 space-y-3">
                            <h5 className="font-bold text-xs text-slate-900 flex items-center gap-1.5 uppercase tracking-wide">
                              <GraduationCap className="w-4 h-4 text-indigo-600" />
                              <span>1. Học phần & Lớp sinh hoạt</span>
                            </h5>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                              <div className="sm:col-span-2">
                                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Tên học phần / Môn học</label>
                                <input
                                  type="text"
                                  value={row.subjectName || ''}
                                  onChange={(e) => handleUpdateRow(inspectingRowIndex, 'subjectName', e.target.value)}
                                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:border-indigo-500 outline-none"
                                />
                              </div>
                              <div>
                                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Mã học phần</label>
                                <input
                                  type="text"
                                  value={row.courseCode || ''}
                                  onChange={(e) => handleUpdateRow(inspectingRowIndex, 'courseCode', e.target.value)}
                                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-indigo-700 focus:border-indigo-500 outline-none"
                                />
                              </div>
                              <div>
                                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Mã lớp học phần</label>
                                <input
                                  type="text"
                                  value={row.classCode || ''}
                                  onChange={(e) => handleUpdateRow(inspectingRowIndex, 'classCode', e.target.value)}
                                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-800 focus:border-indigo-500 outline-none"
                                />
                              </div>
                              <div className="sm:col-span-2">
                                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Bộ môn quản lý</label>
                                <select
                                  value={row.department || 'Khoa Hóa học (Chung / Chưa phân BM)'}
                                  onChange={(e) => handleUpdateRow(inspectingRowIndex, 'department', e.target.value)}
                                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-800 focus:border-indigo-500 outline-none"
                                >
                                  {departmentList.map(d => (
                                    <option key={d} value={d}>{d}</option>
                                  ))}
                                </select>
                              </div>
                            </div>
                          </div>

                          {/* Section 2: Time & Classroom */}
                          <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200 space-y-3">
                            <h5 className="font-bold text-xs text-slate-900 flex items-center gap-1.5 uppercase tracking-wide">
                              <Clock className="w-4 h-4 text-indigo-600" />
                              <span>2. Thời gian giảng dạy & Giảng đường</span>
                            </h5>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                              <div>
                                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Thứ</label>
                                <select
                                  value={row.dayOfWeek}
                                  onChange={(e) => handleUpdateRow(inspectingRowIndex, 'dayOfWeek', e.target.value as any)}
                                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-indigo-700 focus:border-indigo-500 outline-none"
                                >
                                  {DAYS_OF_WEEK.map(d => (
                                    <option key={d} value={d}>{d}</option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Tiết BĐ – KT</label>
                                <div className="flex items-center gap-1">
                                  <input
                                    type="number"
                                    step="0.5"
                                    min="1"
                                    max="12"
                                    value={row.startPeriod}
                                    onChange={(e) => handleUpdateRow(inspectingRowIndex, 'startPeriod', e.target.value)}
                                    className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-center font-bold text-slate-800 outline-none"
                                  />
                                  <span>–</span>
                                  <input
                                    type="number"
                                    step="0.5"
                                    min="1"
                                    max="12"
                                    value={row.endPeriod}
                                    onChange={(e) => handleUpdateRow(inspectingRowIndex, 'endPeriod', e.target.value)}
                                    className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-center font-bold text-slate-800 outline-none"
                                  />
                                </div>
                              </div>
                              <div>
                                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Cơ sở</label>
                                <select
                                  value={row.campus}
                                  onChange={(e) => {
                                    const newCamp = e.target.value as 'cs1' | 'cs2';
                                    const currentRoom = (row.room || '').replace(/^cs[12]:/i, '');
                                    handleUpdateRow(inspectingRowIndex, 'campus', newCamp);
                                    handleUpdateRow(inspectingRowIndex, 'room', `${newCamp}:${currentRoom}`);
                                  }}
                                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800 focus:border-indigo-500 outline-none"
                                >
                                  <option value="cs1">CS1 (P. Chợ Quán)</option>
                                  <option value="cs2">CS2 (P. Đông Hoà)</option>
                                </select>
                              </div>
                              <div>
                                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Phòng học</label>
                                <input
                                  type="text"
                                  value={(row.room || '').replace(/^cs[12]:/i, '')}
                                  onChange={(e) => handleUpdateRow(inspectingRowIndex, 'room', `${row.campus}:${e.target.value.trim()}`)}
                                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-800 outline-none"
                                />
                              </div>
                            </div>
                            <div className="bg-indigo-50 p-2.5 rounded-lg text-xs text-indigo-900 font-medium flex items-center justify-between">
                              <span>⏱ Khung giờ học quy đổi tự động:</span>
                              <span className="font-mono font-bold text-indigo-700 bg-white px-2 py-0.5 rounded border border-indigo-200">
                                {row.startTime} – {row.endTime}
                              </span>
                            </div>
                          </div>

                          {/* Section 3: Faculty & Assistants */}
                          <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200 space-y-3">
                            <h5 className="font-bold text-xs text-slate-900 flex items-center gap-1.5 uppercase tracking-wide">
                              <User className="w-4 h-4 text-indigo-600" />
                              <span>3. Cán bộ & Đội ngũ giảng dạy</span>
                            </h5>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                              <div>
                                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Mã số cán bộ (MSCB)</label>
                                <input
                                  type="text"
                                  value={row.lecturerCode || ''}
                                  onChange={(e) => handleUpdateRow(inspectingRowIndex, 'lecturerCode', e.target.value)}
                                  placeholder="CB01, CB02..."
                                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-indigo-700 outline-none"
                                />
                              </div>
                              <div className="sm:col-span-2">
                                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Họ và tên Giảng viên chính (phân tách dấu ",")</label>
                                <input
                                  type="text"
                                  value={row.lecturerName || ''}
                                  onChange={(e) => handleUpdateRow(inspectingRowIndex, 'lecturerName', e.target.value)}
                                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900 outline-none"
                                />
                              </div>
                              <div className="sm:col-span-3">
                                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Email công vụ giảng viên</label>
                                <input
                                  type="text"
                                  value={row.lecturerEmail || ''}
                                  onChange={(e) => handleUpdateRow(inspectingRowIndex, 'lecturerEmail', e.target.value)}
                                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono text-slate-800 outline-none"
                                />
                              </div>
                              <div>
                                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Trợ giảng (TA) nếu có</label>
                                <input
                                  type="text"
                                  value={row.assistantName || ''}
                                  onChange={(e) => handleUpdateRow(inspectingRowIndex, 'assistantName', e.target.value)}
                                  placeholder="Họ tên trợ giảng"
                                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 outline-none"
                                />
                              </div>
                              <div className="sm:col-span-2">
                                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Email trợ giảng</label>
                                <input
                                  type="text"
                                  value={row.assistantEmail || ''}
                                  onChange={(e) => handleUpdateRow(inspectingRowIndex, 'assistantEmail', e.target.value)}
                                  placeholder="Email trợ giảng"
                                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono text-slate-800 outline-none"
                                />
                              </div>
                            </div>
                          </div>

                          {/* Section 4: Academic Plan & Exams */}
                          <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200 space-y-3">
                            <h5 className="font-bold text-xs text-slate-900 flex items-center gap-1.5 uppercase tracking-wide">
                              <Calendar className="w-4 h-4 text-indigo-600" />
                              <span>4. Kế hoạch giảng dạy & Lịch thi</span>
                            </h5>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                              <div>
                                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Thời lượng (Số tuần)</label>
                                <input
                                  type="text"
                                  value={row.durationWeeks || ''}
                                  onChange={(e) => handleUpdateRow(inspectingRowIndex, 'durationWeeks', e.target.value)}
                                  placeholder="17 tuần"
                                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 outline-none"
                                />
                              </div>
                              <div>
                                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Ngày bắt đầu kỳ học</label>
                                <input
                                  type="text"
                                  value={row.startDate || ''}
                                  onChange={(e) => handleUpdateRow(inspectingRowIndex, 'startDate', e.target.value)}
                                  placeholder="YYYY-MM-DD"
                                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono text-slate-800 outline-none"
                                />
                              </div>
                              <div>
                                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Ngày kết thúc kỳ học</label>
                                <input
                                  type="text"
                                  value={row.endDate || ''}
                                  onChange={(e) => handleUpdateRow(inspectingRowIndex, 'endDate', e.target.value)}
                                  placeholder="YYYY-MM-DD"
                                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono text-slate-800 outline-none"
                                />
                              </div>
                              <div>
                                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Đợt thi Giữa kì (GK)</label>
                                <input
                                  type="text"
                                  value={row.midtermExamPeriod || ''}
                                  onChange={(e) => handleUpdateRow(inspectingRowIndex, 'midtermExamPeriod', e.target.value)}
                                  placeholder="VD: 26/10 – 08/11/2026"
                                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-amber-950 font-medium outline-none"
                                />
                              </div>
                              <div>
                                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Đợt thi Cuối kì (CK)</label>
                                <input
                                  type="text"
                                  value={row.finalExamPeriod || ''}
                                  onChange={(e) => handleUpdateRow(inspectingRowIndex, 'finalExamPeriod', e.target.value)}
                                  placeholder="VD: 04/01 – 17/01/2027"
                                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-indigo-950 font-medium outline-none"
                                />
                              </div>
                              <div>
                                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Ghi chú thêm</label>
                                <input
                                  type="text"
                                  value={row.notes || ''}
                                  onChange={(e) => handleUpdateRow(inspectingRowIndex, 'notes', e.target.value)}
                                  placeholder="Ghi chú thêm nếu có"
                                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-700 outline-none"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* TAB 2: Raw Data From File */}
                      {inspectorTab === 'raw' && (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between gap-3">
                            <div className="relative w-full max-w-sm">
                              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                              <input
                                type="text"
                                placeholder="Tìm kiếm cột hoặc giá trị gốc..."
                                value={rawSearchQuery}
                                onChange={(e) => setRawSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 outline-none"
                              />
                            </div>
                            <span className="text-xs text-slate-500">
                              Đọc được <strong>{rawKeys.length}</strong> cột từ file gốc
                            </span>
                          </div>

                          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                            <table className="w-full text-left border-collapse text-xs">
                              <thead>
                                <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-semibold">
                                  <th className="py-2.5 px-4 w-1/3">Tên cột trong File Excel/CSV</th>
                                  <th className="py-2.5 px-4 w-2/3">Giá trị nguyên bản đọc được</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 bg-white">
                                {filteredRawKeys.length === 0 ? (
                                  <tr>
                                    <td colSpan={2} className="py-8 text-center text-slate-400">
                                      Không tìm thấy cột phù hợp
                                    </td>
                                  </tr>
                                ) : (
                                  filteredRawKeys.map((k) => (
                                    <tr key={k} className="hover:bg-slate-50">
                                      <td className="py-2.5 px-4 font-semibold text-slate-800 bg-slate-50/50">
                                        <div className="flex items-center gap-1.5">
                                          <Tag className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                                          <span className="font-mono text-xs">{k}</span>
                                        </div>
                                      </td>
                                      <td className="py-2.5 px-4 font-mono text-xs text-slate-900 break-all">
                                        {rawObj[k] !== undefined && rawObj[k] !== null && String(rawObj[k]).trim() !== '' ? (
                                          <span className="bg-indigo-50/40 text-indigo-950 px-2 py-0.5 rounded border border-indigo-100/60 inline-block">
                                            {String(rawObj[k])}
                                          </span>
                                        ) : (
                                          <span className="text-slate-300 italic">(Trống / Không có dữ liệu)</span>
                                        )}
                                      </td>
                                    </tr>
                                  ))
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Modal Inspector Footer */}
                    <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
                      <div className="text-xs text-slate-500">
                        ✓ Mọi thay đổi được cập nhật trực tiếp vào danh sách nhập
                      </div>
                      <button
                        type="button"
                        onClick={() => setInspectingRowIndex(null)}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors"
                      >
                        Hoàn tất kiểm tra dòng này
                      </button>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Bottom notification */}
            <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-amber-700 shrink-0" />
                <span>
                  Bạn có thể chỉnh sửa trực tiếp các ô trên bảng trước khi lưu. Giảng viên mới sẽ được tự động đồng bộ vào Danh bạ Khoa.
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-semibold"
            >
              Đóng
            </button>

            {step === 'preview' && (
              <div className="inline-flex items-center bg-slate-200/80 p-1 rounded-xl text-xs">
                <button
                  type="button"
                  onClick={() => setImportMode('replace')}
                  className={`px-3 py-1 rounded-lg font-medium transition-all ${
                    importMode === 'replace'
                      ? 'bg-white text-indigo-700 font-bold shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Xóa thời khóa biểu cũ, thay thế bằng dữ liệu mới trong file này"
                >
                  Ghi đè / Thay thế TKB
                </button>
                <button
                  type="button"
                  onClick={() => setImportMode('append')}
                  className={`px-3 py-1 rounded-lg font-medium transition-all ${
                    importMode === 'append'
                      ? 'bg-white text-indigo-700 font-bold shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Giữ nguyên thời khóa biểu hiện có và cộng thêm các môn từ file này"
                >
                  Bổ sung vào TKB hiện tại
                </button>
              </div>
            )}
          </div>

          {step === 'preview' && (
            <button
              type="button"
              onClick={handleConfirm}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all"
            >
              <Database className="w-4 h-4" />
              <span>
                {importMode === 'replace' ? 'Thay thế toàn bộ TKB' : 'Bổ sung thêm'} ({parsedRows.length} môn)
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
