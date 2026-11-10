import React, { useState, useEffect, useMemo, useRef } from 'react';
import { X, Save, FlaskConical, UserPlus, Check, Sparkles, Building, Mail, UserCheck, Calendar, CalendarDays, Clock, Info, User, Layers, Search, ChevronDown, GraduationCap, CalendarCheck } from 'lucide-react';
import { ScheduleItem, FacultyMember } from '../types';
import { DAYS_OF_WEEK, STANDARD_DEPARTMENTS } from '../data/mockSchedule';
import {
  convertPeriodsToTimeRange,
  inferPeriodsFromTimes,
  parseMultipleLecturers,
  parseMultipleEmails
} from '../utils/periodConverter';

interface AddEditScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: ScheduleItem) => void;
  facultyList: FacultyMember[];
  departmentList?: string[];
  onAddFacultyMember?: (member: Omit<FacultyMember, 'id'>) => FacultyMember;
  editItem?: ScheduleItem | null;
  defaultDay?: string;
  selectedLecturerId?: string;
}

export const AddEditScheduleModal: React.FC<AddEditScheduleModalProps> = ({
  isOpen,
  onClose,
  onSave,
  facultyList = [],
  departmentList = STANDARD_DEPARTMENTS,
  onAddFacultyMember,
  editItem,
  defaultDay,
  selectedLecturerId
}) => {
  const [formData, setFormData] = useState<Omit<ScheduleItem, 'id'>>({
    dayOfWeek: (defaultDay as any) || 'Thứ 2',
    startTime: '07:00',
    endTime: '09:30',
    startPeriod: 1,
    endPeriod: 3,
    subjectName: '',
    room: 'cs1:PTN-D201',
    lecturerCode: '',
    lecturerName: '',
    lecturerEmail: '',
    assistantName: '',
    assistantEmail: '',
    assistantRole: '',
    department: 'Khoa Hóa học',
    durationWeeks: '17 tuần',
    startDate: '2026-09-14',
    endDate: '2027-01-20',
    campus: 'cs1',
    classCode: '',
    courseCode: '',
    notes: '',
    midtermExamPeriod: '',
    finalExamPeriod: ''
  });

  const [lecturerSearchTerm, setLecturerSearchTerm] = useState<string>('');
  const [isLecturerDropdownOpen, setIsLecturerDropdownOpen] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [assistantSearchTerm, setAssistantSearchTerm] = useState<string>('');
  const [isAssistantDropdownOpen, setIsAssistantDropdownOpen] = useState<boolean>(false);
  const [hasCustomAssistant, setHasCustomAssistant] = useState<boolean>(false);
  const assistantDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsLecturerDropdownOpen(false);
      }
      if (assistantDropdownRef.current && !assistantDropdownRef.current.contains(event.target as Node)) {
        setIsAssistantDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filtered faculty list based on search term
  const filteredFaculty = useMemo(() => {
    const list = facultyList.filter(f => f.id !== 'all');
    if (!lecturerSearchTerm.trim()) return list;
    const term = lecturerSearchTerm.toLowerCase().trim();
    return list.filter(
      f =>
        (f.code && f.code.toLowerCase().includes(term)) ||
        f.name.toLowerCase().includes(term) ||
        f.department?.toLowerCase().includes(term) ||
        f.email.toLowerCase().includes(term)
    );
  }, [facultyList, lecturerSearchTerm]);

  // Filtered faculty list for assistants
  const filteredAssistants = useMemo(() => {
    const list = facultyList.filter(f => f.id !== 'all');
    if (!assistantSearchTerm.trim()) return list;
    const term = assistantSearchTerm.toLowerCase().trim();
    return list.filter(
      f =>
        (f.code && f.code.toLowerCase().includes(term)) ||
        f.name.toLowerCase().includes(term) ||
        f.department?.toLowerCase().includes(term) ||
        f.email.toLowerCase().includes(term)
    );
  }, [facultyList, assistantSearchTerm]);

  useEffect(() => {
    if (editItem) {
      const editCampus = editItem.campus || (editItem.room?.toLowerCase().startsWith('cs2') ? 'cs2' : 'cs1');
      let sPeriod = editItem.startPeriod;
      let ePeriod = editItem.endPeriod;
      if (!sPeriod || !ePeriod) {
        const inferred = inferPeriodsFromTimes(editCampus, editItem.startTime, editItem.endTime);
        sPeriod = inferred.startPeriod;
        ePeriod = inferred.endPeriod;
      }

      setFormData({
        dayOfWeek: editItem.dayOfWeek,
        startTime: editItem.startTime,
        endTime: editItem.endTime,
        startPeriod: sPeriod,
        endPeriod: ePeriod,
        subjectName: editItem.subjectName,
        room: editItem.room,
        lecturerCode: editItem.lecturerCode || '',
        lecturerName: editItem.lecturerName || '',
        lecturerEmail: editItem.lecturerEmail || '',
        assistantName: editItem.assistantName || '',
        assistantEmail: editItem.assistantEmail || '',
        assistantRole: editItem.assistantRole || '',
        department: editItem.department || 'Khoa Hóa học',
        durationWeeks: editItem.durationWeeks || '17 tuần',
        startDate: editItem.startDate || '2026-09-14',
        endDate: editItem.endDate || '2027-01-20',
        campus: editCampus,
        classCode: editItem.classCode || '',
        courseCode: editItem.courseCode || '',
        notes: editItem.notes || '',
        midtermExamPeriod: editItem.midtermExamPeriod || '',
        finalExamPeriod: editItem.finalExamPeriod || ''
      });
      setLecturerSearchTerm(editItem.lecturerName || '');
      setAssistantSearchTerm(editItem.assistantName || '');
    } else {
      // Mặc định tạo mới
      const defaultCampus = 'cs1';
      const tr = convertPeriodsToTimeRange(defaultCampus, 1, 3);
      setFormData({
        dayOfWeek: (defaultDay as any) || 'Thứ 2',
        startTime: tr.startTime,
        endTime: tr.endTime,
        startPeriod: 1,
        endPeriod: 3,
        subjectName: '',
        room: 'cs1:PTN-D201',
        lecturerName: '',
        lecturerEmail: '',
        assistantName: '',
        assistantEmail: '',
        assistantRole: '',
        department: 'Khoa Hóa học',
        durationWeeks: '17 tuần',
        startDate: '2026-09-14',
        endDate: '2027-01-20',
        campus: defaultCampus,
        classCode: '',
        courseCode: '',
        notes: '',
        midtermExamPeriod: '',
        finalExamPeriod: ''
      });
      setLecturerSearchTerm('');
      setAssistantSearchTerm('');
    }
  }, [editItem, defaultDay, isOpen]);

  if (!isOpen) return null;

  const handleSelectLecturer = (f: FacultyMember) => {
    setFormData(prev => ({
      ...prev,
      lecturerCode: f.code || '',
      lecturerName: f.name,
      lecturerEmail: f.email,
      department: f.department || 'Khoa Hóa học'
    }));
    setLecturerSearchTerm(f.name);
    setIsLecturerDropdownOpen(false);
  };

  const handleSelectAssistant = (f: FacultyMember) => {
    setFormData(prev => ({
      ...prev,
      assistantName: f.name,
      assistantEmail: f.email,
      assistantRole: prev.assistantRole || 'Trợ giảng (TA)'
    }));
    setAssistantSearchTerm(f.name);
    setIsAssistantDropdownOpen(false);
  };

  const handleDateChange = (field: 'startDate' | 'endDate', value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const applyDatePreset = (start: string, end: string) => {
    setFormData(prev => ({
      ...prev,
      startDate: start,
      endDate: end
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.subjectName.trim()) {
      alert('Vui lòng nhập tên môn học hoặc nội dung phân công.');
      return;
    }

    if (!formData.lecturerName?.trim()) {
      alert('Vui lòng chọn Giảng viên phụ trách từ danh bạ.');
      return;
    }

    if (formData.startDate && formData.endDate && formData.startDate > formData.endDate) {
      alert('Ngày bắt đầu không được lớn hơn ngày kết thúc!');
      return;
    }

    const newItem: ScheduleItem = {
      id: editItem ? editItem.id : `sch-${Date.now()}`,
      ...formData,
      startPeriod: formData.startPeriod,
      endPeriod: formData.endPeriod,
      lecturerCode: formData.lecturerCode?.trim() || undefined,
      lecturerName: formData.lecturerName.trim(),
      lecturerEmail: formData.lecturerEmail.trim().toLowerCase(),
      assistantName: formData.assistantName?.trim() || undefined,
      assistantEmail: formData.assistantEmail?.trim().toLowerCase() || undefined,
      assistantRole: formData.assistantRole?.trim() || undefined,
      department: formData.department?.trim() || 'Khoa Hóa học',
      durationWeeks: formData.durationWeeks || `${formData.startDate} – ${formData.endDate}`,
      campus: formData.campus || (formData.room.toLowerCase().startsWith('cs2') ? 'cs2' : 'cs1')
    };

    onSave(newItem);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
      <div 
        className="bg-white rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl border border-slate-200 animate-scaleUp"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-slate-900 text-white p-4 sm:p-5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5 font-bold text-base sm:text-lg">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
              <FlaskConical className="w-4 h-4" />
            </div>
            <div>
              <span>{editItem ? 'Chỉnh sửa Lịch Giảng dạy' : 'Phân công Lịch Giảng dạy'}</span>
              <p className="text-[11px] text-slate-400 font-normal">Quản lý giảng viên, bộ môn & thời gian học</p>
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

        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[78vh] overflow-y-auto text-sm">
          {/* Section: Lecturer & Department Information */}
          <div className="p-4 bg-indigo-50/70 border border-indigo-200/80 rounded-xl space-y-3">
            <div className="flex items-center justify-between border-b border-indigo-100 pb-2">
              <label className="text-xs font-bold text-indigo-950 flex items-center gap-1.5 uppercase tracking-wide">
                <UserCheck className="w-4 h-4 text-indigo-600" />
                <span>Giảng viên phụ trách</span>
                <span className="text-rose-500">*</span>
              </label>

              <span className="text-[11px] font-medium text-slate-500">
                (Chỉnh sửa thông tin tại mục <em>Danh bạ Giảng viên</em>)
              </span>
            </div>

            {/* Quick Lecturer Selector with Search & Filter */}
            <div className="relative" ref={dropdownRef}>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[11px] font-semibold text-slate-700">
                  Chọn / Tìm kiếm Giảng viên từ danh bạ:
                </label>
                <span className="text-[10px] font-medium text-slate-500">
                  {filteredFaculty.length} giảng viên
                </span>
              </div>

              <div className="relative">
                <div className="relative flex items-center">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 pointer-events-none" />
                  <input
                    type="text"
                    value={lecturerSearchTerm}
                    onChange={(e) => {
                      setLecturerSearchTerm(e.target.value);
                      setIsLecturerDropdownOpen(true);
                    }}
                    onFocus={() => setIsLecturerDropdownOpen(true)}
                    placeholder="🔍 Gõ chức danh, họ tên thầy cô hoặc email để chọn..."
                    className="w-full pl-8 pr-14 py-2 border border-indigo-200 rounded-lg bg-white text-xs font-semibold text-slate-800 placeholder:text-slate-400 placeholder:font-normal focus:ring-2 focus:ring-indigo-500 outline-none shadow-2xs"
                  />
                  <div className="absolute right-2 flex items-center gap-0.5">
                    {lecturerSearchTerm && (
                      <button
                        type="button"
                        onClick={() => {
                          setLecturerSearchTerm('');
                        }}
                        className="p-1 text-slate-400 hover:text-slate-600 rounded transition-colors"
                        title="Xóa tìm kiếm"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setIsLecturerDropdownOpen(!isLecturerDropdownOpen)}
                      className="p-1 text-slate-400 hover:text-indigo-600 rounded transition-colors"
                    >
                      <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isLecturerDropdownOpen ? 'rotate-180 text-indigo-600' : ''}`} />
                    </button>
                  </div>
                </div>

                {/* Dropdown Results */}
                {isLecturerDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-30 max-h-56 overflow-y-auto divide-y divide-slate-100 animate-fadeIn">
                    {filteredFaculty.length === 0 ? (
                      <div className="p-3 text-center text-xs text-slate-500">
                        <p>Không tìm thấy giảng viên "{lecturerSearchTerm}".</p>
                      </div>
                    ) : (
                      filteredFaculty.map((f) => {
                        const isSelected = formData.lecturerName === f.name;
                        return (
                          <button
                            key={f.id || f.email}
                            type="button"
                            onClick={() => handleSelectLecturer(f)}
                            className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between gap-2 hover:bg-indigo-50 transition-colors ${
                              isSelected ? 'bg-indigo-50/80 font-semibold text-indigo-900' : 'text-slate-700'
                            }`}
                          >
                            <div className="min-w-0 flex-1">
                              <div className="font-bold text-slate-900 flex items-center gap-1.5 truncate">
                                {f.code && (
                                  <span className="px-1.5 py-0.5 rounded bg-indigo-50 border border-indigo-200 text-indigo-700 font-mono text-[10px] font-bold shrink-0">
                                    {f.code}
                                  </span>
                                )}
                                {f.code && <span className="text-slate-400 font-normal">–</span>}
                                <span>{f.name}</span>
                                {isSelected && <Check className="w-3.5 h-3.5 text-indigo-600 shrink-0 ml-auto" />}
                              </div>
                              {f.email && (
                                <div className="text-[11px] text-slate-500 font-mono truncate">
                                  {f.email}
                                </div>
                              )}
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Selected Lecturer Card Display (Clean, Read-only) */}
            {formData.lecturerName ? (
              <div className="bg-white border border-indigo-200/90 rounded-xl p-3 flex items-center justify-between gap-3 shadow-2xs animate-fadeIn">
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5 truncate flex-wrap">
                    <User className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                    {formData.lecturerCode && (
                      <span className="px-1.5 py-0.5 rounded bg-indigo-50 border border-indigo-200 text-indigo-700 font-mono text-[10px] font-bold shrink-0">
                        {formData.lecturerCode}
                      </span>
                    )}
                    {formData.lecturerCode && <span className="text-slate-400 font-normal">–</span>}
                    <span className="truncate">{formData.lecturerName}</span>
                  </div>
                  <div className="text-[11px] text-slate-500 truncate mt-0.5 font-mono">
                    {formData.lecturerEmail || 'Chưa có email'}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded border border-emerald-200">
                    Đã gán
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setFormData(prev => ({
                        ...prev,
                        lecturerName: '',
                        lecturerEmail: '',
                        department: 'Khoa Hóa học'
                      }));
                      setLecturerSearchTerm('');
                    }}
                    className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    title="Bỏ chọn giảng viên"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-slate-50/80 border border-dashed border-slate-300 rounded-xl p-2.5 flex items-center justify-between gap-2 text-slate-500">
                <div className="flex items-center gap-2 min-w-0">
                  <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="text-xs italic truncate">Chưa chọn giảng viên phụ trách (chọn từ danh sách trên)</span>
                </div>
                <span className="px-2 py-0.5 bg-slate-200 text-slate-600 text-[10px] font-bold rounded shrink-0">
                  Chưa gán
                </span>
              </div>
            )}
          </div>

          {/* Section: Teaching Assistant (Trợ giảng / TA) */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wide">
                <GraduationCap className="w-4 h-4 text-indigo-600" />
                <span>Trợ giảng môn học / TA</span>
                <span className="text-[11px] font-normal text-slate-400 lowercase">(nếu có)</span>
              </label>

              <button
                type="button"
                onClick={() => setHasCustomAssistant(!hasCustomAssistant)}
                className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 hover:underline"
              >
                {hasCustomAssistant ? '← Chọn từ danh bạ' : '+ Nhập tay thông tin TA'}
              </button>
            </div>

            {!hasCustomAssistant ? (
              /* Quick TA Selector from Directory */
              <div className="relative" ref={assistantDropdownRef}>
                <div className="relative flex items-center">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 pointer-events-none" />
                  <input
                    type="text"
                    value={assistantSearchTerm}
                    onChange={(e) => {
                      setAssistantSearchTerm(e.target.value);
                      setIsAssistantDropdownOpen(true);
                    }}
                    onFocus={() => setIsAssistantDropdownOpen(true)}
                    placeholder="🔍 Gõ tìm trợ giảng từ danh bạ Khoa..."
                    className="w-full pl-8 pr-14 py-2 border border-slate-300 rounded-lg bg-white text-xs text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 outline-none shadow-2xs"
                  />
                  <div className="absolute right-2 flex items-center gap-0.5">
                    {assistantSearchTerm && (
                      <button
                        type="button"
                        onClick={() => {
                          setAssistantSearchTerm('');
                        }}
                        className="p-1 text-slate-400 hover:text-slate-600 rounded transition-colors"
                        title="Xóa tìm kiếm"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setIsAssistantDropdownOpen(!isAssistantDropdownOpen)}
                      className="p-1 text-slate-400 hover:text-indigo-600 rounded transition-colors"
                    >
                      <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isAssistantDropdownOpen ? 'rotate-180 text-indigo-600' : ''}`} />
                    </button>
                  </div>
                </div>

                {/* Assistant Dropdown Results */}
                {isAssistantDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-30 max-h-48 overflow-y-auto divide-y divide-slate-100 animate-fadeIn">
                    {filteredAssistants.length === 0 ? (
                      <div className="p-3 text-center text-xs text-slate-500">
                        <p>Không tìm thấy cán bộ/trợ giảng "{assistantSearchTerm}".</p>
                      </div>
                    ) : (
                      filteredAssistants.map((f) => {
                        const isSelected = formData.assistantName === f.name;
                        return (
                          <button
                            key={`asst-${f.id || f.email}`}
                            type="button"
                            onClick={() => handleSelectAssistant(f)}
                            className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between gap-2 hover:bg-indigo-50 transition-colors ${
                              isSelected ? 'bg-indigo-50/80 font-semibold text-indigo-900' : 'text-slate-700'
                            }`}
                          >
                            <div className="min-w-0 flex-1">
                              <div className="font-bold text-slate-900 flex items-center gap-1.5 truncate">
                                <span>{f.name}</span>
                                {isSelected && <Check className="w-3.5 h-3.5 text-indigo-600 shrink-0" />}
                              </div>
                              {f.email && (
                                <div className="text-[11px] text-slate-500 font-mono truncate">
                                  {f.email}
                                </div>
                              )}
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            ) : (
              /* Custom TA Inputs */
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Họ tên Trợ giảng
                  </label>
                  <input
                    type="text"
                    value={formData.assistantName || ''}
                    onChange={(e) => setFormData({ ...formData, assistantName: e.target.value })}
                    placeholder="VD: ThS. Đặng Thị Hồng Nhung"
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Email Trợ giảng
                  </label>
                  <input
                    type="email"
                    value={formData.assistantEmail || ''}
                    onChange={(e) => setFormData({ ...formData, assistantEmail: e.target.value })}
                    placeholder="dthnhung@chem.hcmus.edu.vn"
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white text-slate-800 font-mono focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Vai trò / Nhiệm vụ TA
                  </label>
                  <input
                    type="text"
                    value={formData.assistantRole || ''}
                    onChange={(e) => setFormData({ ...formData, assistantRole: e.target.value })}
                    placeholder="VD: Trợ giảng PTN / Chấm BT"
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>
            )}

            {/* Selected TA Card Display */}
            {formData.assistantName && (
              <div className="bg-white border border-indigo-200/90 rounded-xl p-2.5 flex items-center justify-between gap-3 shadow-2xs animate-fadeIn">
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5 truncate">
                    <GraduationCap className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                    <span className="truncate">{formData.assistantName}</span>
                    <span className="px-1.5 py-0.2 bg-indigo-50 text-indigo-800 text-[10px] font-medium rounded border border-indigo-100">
                      {formData.assistantRole || 'Trợ giảng (TA)'}
                    </span>
                  </div>
                  {formData.assistantEmail && (
                    <div className="text-[11px] text-slate-500 font-mono truncate mt-0.5">
                      {formData.assistantEmail}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setFormData(prev => ({
                      ...prev,
                      assistantName: '',
                      assistantEmail: '',
                      assistantRole: ''
                    }));
                    setAssistantSearchTerm('');
                  }}
                  className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                  title="Bỏ gán trợ giảng"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Subject Name & Course Code */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tên môn / Học phần / Nhiệm vụ <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.subjectName}
                onChange={(e) => setFormData({ ...formData, subjectName: e.target.value })}
                placeholder="VD: TH-Hóa phân tích dụng cụ, Hóa đại cương 1..."
                className="w-full px-3.5 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-slate-800"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Mã học phần
              </label>
              <input
                type="text"
                value={formData.courseCode}
                onChange={(e) => setFormData({ ...formData, courseCode: e.target.value })}
                placeholder="VD: CHE204"
                className="w-full px-3.5 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-slate-800 font-mono text-xs"
              />
            </div>
          </div>

          {/* Campus & Room (Tách riêng biệt theo yêu cầu của VP Khoa) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Cơ sở giảng dạy <span className="text-rose-500">*</span>
              </label>
              <select
                value={formData.campus}
                onChange={(e) => {
                  const newCampus = e.target.value as 'cs1' | 'cs2';
                  let updatedRoom = formData.room;
                  if (updatedRoom.toLowerCase().startsWith('cs1:') || updatedRoom.toLowerCase().startsWith('cs2:')) {
                    updatedRoom = `${newCampus}:${updatedRoom.substring(4)}`;
                  }
                  // Tự động tính lại giờ theo cơ sở mới cho cùng số tiết
                  const sPeriod = parseFloat(String(formData.startPeriod)) || 1;
                  const ePeriod = parseFloat(String(formData.endPeriod)) || 3;
                  const tr = convertPeriodsToTimeRange(newCampus, sPeriod, ePeriod);

                  setFormData({
                    ...formData,
                    campus: newCampus,
                    room: updatedRoom,
                    startTime: tr.startTime,
                    endTime: tr.endTime
                  });
                }}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white text-slate-800 text-xs font-semibold"
              >
                <option value="cs1">CS1: Phường Chợ Quán, TPHCM</option>
                <option value="cs2">CS2: Phường Đông Hoà, TPHCM</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Phòng / PTN (VD: PTN-D201, C.32)
              </label>
              <input
                type="text"
                value={formData.room.replace(/^cs[12]:/i, '')}
                onChange={(e) => {
                  const rawVal = e.target.value.trim();
                  const prefix = formData.campus === 'cs2' ? 'cs2:' : 'cs1:';
                  setFormData({ ...formData, room: `${prefix}${rawVal}` });
                }}
                placeholder="VD: PTN-D201, GD-B.29..."
                className="w-full px-3.5 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-slate-800 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Lớp sinh viên phụ trách
              </label>
              <input
                type="text"
                value={formData.classCode}
                onChange={(e) => setFormData({ ...formData, classCode: e.target.value })}
                placeholder="VD: 21HOH1_PT, 22HOH_HC2..."
                className="w-full px-3.5 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-slate-800 text-xs"
              />
            </div>
          </div>

          {/* Day of Week, Period (Tiết học) & Time */}
          <div className="p-3 bg-indigo-50/50 border border-indigo-100 rounded-xl space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Thứ trong tuần
                </label>
                <select
                  value={formData.dayOfWeek}
                  onChange={(e) => setFormData({ ...formData, dayOfWeek: e.target.value as any })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white text-slate-800 text-xs"
                >
                  {DAYS_OF_WEEK.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tiết bắt đầu
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="1"
                  max="12"
                  value={formData.startPeriod || 1}
                  onChange={(e) => {
                    const s = parseFloat(e.target.value) || 1;
                    const ePeriod = parseFloat(String(formData.endPeriod)) || 3;
                    const tr = convertPeriodsToTimeRange(formData.campus, s, ePeriod);
                    setFormData({
                      ...formData,
                      startPeriod: s,
                      startTime: tr.startTime,
                      endTime: tr.endTime
                    });
                  }}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white text-slate-800 text-xs font-bold text-center"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tiết kết thúc <span className="text-indigo-600 font-normal">(hỗ trợ 2.5)</span>
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="1"
                  max="12"
                  value={formData.endPeriod || 3}
                  onChange={(e) => {
                    const ep = parseFloat(e.target.value) || 3;
                    const sPeriod = parseFloat(String(formData.startPeriod)) || 1;
                    const tr = convertPeriodsToTimeRange(formData.campus, sPeriod, ep);
                    setFormData({
                      ...formData,
                      endPeriod: ep,
                      startTime: tr.startTime,
                      endTime: tr.endTime
                    });
                  }}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white text-slate-800 text-xs font-bold text-center"
                />
              </div>
            </div>

            {/* Auto-calculated Time Badge & Direct Override */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-indigo-100 text-xs">
              <div className="flex items-center gap-1.5 text-indigo-900 font-semibold">
                <Clock className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                <span>Giờ học theo chuẩn {formData.campus.toUpperCase()}:</span>
                <span className="font-mono bg-white px-2 py-0.5 rounded border border-indigo-200 text-indigo-700 font-bold">
                  {formData.startTime} – {formData.endTime}
                </span>
                <span className="text-[11px] text-slate-500 font-normal">
                  (Tiết {formData.startPeriod} – {formData.endPeriod})
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-400">Tùy chỉnh giờ:</span>
                <input
                  type="time"
                  value={formData.startTime}
                  onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                  className="px-1.5 py-0.5 border border-slate-200 rounded text-[11px] font-mono bg-white outline-none"
                  title="Giờ bắt đầu chi tiết"
                />
                <span className="text-slate-400">–</span>
                <input
                  type="time"
                  value={formData.endTime}
                  onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                  className="px-1.5 py-0.5 border border-slate-200 rounded text-[11px] font-mono bg-white outline-none"
                  title="Giờ kết thúc chi tiết"
                />
              </div>
            </div>
          </div>

          {/* Teaching Schedule Period (Start Date & End Date) */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-indigo-600" />
                <label className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Thời gian áp dụng (Ngày bắt đầu & Ngày kết thúc) <span className="text-rose-500">*</span>
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Start Date */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Ngày bắt đầu dạy
                </label>
                <input
                  type="date"
                  required
                  value={formData.startDate || '2026-09-14'}
                  onChange={(e) => handleDateChange('startDate', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none shadow-2xs font-mono"
                />
              </div>

              {/* End Date */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Ngày kết thúc lớp
                </label>
                <input
                  type="date"
                  required
                  value={formData.endDate || '2027-01-20'}
                  onChange={(e) => handleDateChange('endDate', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none shadow-2xs font-mono"
                />
              </div>
            </div>

            {/* Quick Presets */}
            <div>
              <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                Chọn nhanh theo đợt giảng dạy:
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => applyDatePreset('2026-09-14', '2027-01-20')}
                  className="px-2 py-1 text-[11px] font-medium bg-white text-slate-700 border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 rounded-md transition-colors shadow-2xs"
                >
                  📅 14/09/2026 – 20/01/2027
                </button>
                <button
                  type="button"
                  onClick={() => applyDatePreset('2026-09-14', '2026-11-08')}
                  className="px-2 py-1 text-[11px] font-medium bg-white text-slate-700 border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 rounded-md transition-colors shadow-2xs"
                >
                  🔬 Đợt 1 (14/09 – 08/11/2026)
                </button>
                <button
                  type="button"
                  onClick={() => applyDatePreset('2026-11-09', '2027-01-20')}
                  className="px-2 py-1 text-[11px] font-medium bg-white text-slate-700 border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 rounded-md transition-colors shadow-2xs"
                >
                  🧪 Đợt 2 (09/11/2026 – 20/01/2027)
                </button>
              </div>
            </div>
          </div>

          {/* Exam Schedule Section */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs text-indigo-950 font-bold uppercase tracking-wider">
                <CalendarCheck className="w-4 h-4 text-indigo-600" />
                <span>Thời gian thi dự kiến (GK & CK)</span>
              </div>
              <span className="text-[11px] text-slate-500 font-medium">(Tùy chọn)</span>
            </div>

            <p className="text-[11px] text-slate-600 leading-relaxed">
              Thời gian thi Giữa Kì và Cuối Kì theo kế hoạch của Trường / Khoa (VP Khoa thêm khi import file Excel hoặc phân công).
            </p>

            {/* Midterm Exam Period */}
            <div className="bg-white p-3 rounded-xl border border-amber-200 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                  <span>1. Thời gian thi Giữa Kì (GK)</span>
                </label>
                {formData.midtermExamPeriod && (
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, midtermExamPeriod: '' })}
                    className="text-[10px] text-slate-400 hover:text-red-600 transition-colors"
                  >
                    Xóa
                  </button>
                )}
              </div>
              <input
                type="text"
                placeholder="VD: 26/10/2026 – 01/11/2026 hoặc 26/10 – 08/11/2026"
                value={formData.midtermExamPeriod || ''}
                onChange={(e) => setFormData({ ...formData, midtermExamPeriod: e.target.value })}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs text-slate-800 focus:ring-2 focus:ring-amber-500 outline-none"
              />
              <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                <span className="text-[10px] text-slate-400">Gợi ý nhanh:</span>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, midtermExamPeriod: '26/10/2026 – 01/11/2026' })}
                  className="px-2 py-0.5 text-[10.5px] rounded bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 transition-colors"
                >
                  26/10 – 01/11/2026
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, midtermExamPeriod: '26/10/2026 – 08/11/2026' })}
                  className="px-2 py-0.5 text-[10.5px] rounded bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 transition-colors"
                >
                  26/10 – 08/11/2026
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, midtermExamPeriod: '19/10/2026 – 25/10/2026' })}
                  className="px-2 py-0.5 text-[10.5px] rounded bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 transition-colors"
                >
                  19/10 – 25/10/2026
                </button>
              </div>
            </div>

            {/* Final Exam Period */}
            <div className="bg-white p-3 rounded-xl border border-indigo-200 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
                  <span>2. Thời gian thi Cuối Kì (CK)</span>
                </label>
                {formData.finalExamPeriod && (
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, finalExamPeriod: '' })}
                    className="text-[10px] text-slate-400 hover:text-red-600 transition-colors"
                  >
                    Xóa
                  </button>
                )}
              </div>
              <input
                type="text"
                placeholder="VD: 04/01/2027 – 17/01/2027 hoặc 04/01 – 24/01/2027"
                value={formData.finalExamPeriod || ''}
                onChange={(e) => setFormData({ ...formData, finalExamPeriod: e.target.value })}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none"
              />
              <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                <span className="text-[10px] text-slate-400">Gợi ý nhanh:</span>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, finalExamPeriod: '04/01/2027 – 10/01/2027' })}
                  className="px-2 py-0.5 text-[10.5px] rounded bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200 transition-colors"
                >
                  04/01 – 10/01/2027
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, finalExamPeriod: '04/01/2027 – 17/01/2027' })}
                  className="px-2 py-0.5 text-[10.5px] rounded bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200 transition-colors"
                >
                  04/01 – 17/01/2027
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, finalExamPeriod: '11/01/2027 – 24/01/2027' })}
                  className="px-2 py-0.5 text-[10.5px] rounded bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200 transition-colors"
                >
                  11/01 – 24/01/2027
                </button>
              </div>
            </div>
          </div>

          {/* Notes & Lab safety */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Ghi chú (Hóa chất, thiết bị PTN, an toàn phòng thí nghiệm...)
            </label>
            <textarea
              rows={2}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="VD: Chuẩn bị mẫu đo AAS/HPLC, đeo kính bảo hộ..."
              className="w-full px-3.5 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-slate-800"
            />
          </div>

          {/* Form Actions */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs sm:text-sm font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl transition-colors shadow-2xs"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs sm:text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors flex items-center gap-1.5 shadow-xs"
            >
              <Save className="w-4 h-4" />
              <span>{editItem ? 'Cập nhật phân công' : 'Lưu vào lịch'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

