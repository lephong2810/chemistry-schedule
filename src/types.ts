export interface FacultyMember {
  id: string;
  code?: string; // Mã số cán bộ (MSCB), e.g. 'CB01', 'HCMUS042'
  name: string;
  email: string;
  department: string;
}

export interface ScheduleItem {
  id: string;
  dayOfWeek: 'Thứ 2' | 'Thứ 3' | 'Thứ 4' | 'Thứ 5' | 'Thứ 6' | 'Thứ 7' | 'Chủ nhật';
  startTime: string; // e.g. '07:00'
  endTime: string;   // e.g. '09:30'
  startPeriod?: number | string; // e.g. 1, 2.5, 4
  endPeriod?: number | string;   // e.g. 3, 2.5, 6
  subjectName: string;
  room: string;      // e.g. 'cs1:PTN-D201' or 'cs2:GD-B.29'
  lecturerCode?: string; // Mã số cán bộ (MSCB), e.g. 'CB01' hoặc 'CB01, CB02'
  lecturerName?: string; // e.g. 'TS. Nguyễn Minh Khôi'
  lecturerEmail: string; // e.g. 'nmkhoi@chem.hcmus.edu.vn'
  assistantName?: string; // e.g. 'ThS. Đặng Thị Hồng Nhung' (Trợ giảng / TA)
  assistantEmail?: string; // e.g. 'dthnhung@chem.hcmus.edu.vn'
  assistantRole?: string; // e.g. 'Trợ giảng PTN'
  department?: string; // e.g. 'Bộ môn Hóa Phân tích'
  durationWeeks: string; // e.g. '17 tuần' or '8 tuần'
  startDate?: string; // e.g. '2026-09-14' (YYYY-MM-DD)
  endDate?: string;   // e.g. '2027-01-20' (YYYY-MM-DD)
  campus: 'cs1' | 'cs2';
  classCode?: string;
  courseCode?: string; // e.g. 'CHE101'
  notes?: string;

  // Thời gian thi dự kiến (GK & CK theo lịch của Trường/Khoa, do VPK thêm khi import Excel hoặc phân công)
  midtermExamPeriod?: string;  // e.g. '26/10/2026 – 08/11/2026' hoặc '26/10/2026 – 01/11/2026'
  finalExamPeriod?: string;    // e.g. '04/01/2027 – 17/01/2027' hoặc '04/01/2027 – 10/01/2027'
}

export type TabType = 'teaching' | 'personal' | 'room' | 'class';


