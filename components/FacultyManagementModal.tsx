import React, { useState, useMemo } from 'react';
import { 
  X, Search, Plus, Edit2, Trash2, Check, AlertTriangle, Users, Building, Mail, 
  UserCheck, ShieldAlert, Sparkles, Filter, Layers, CheckCircle2, ArrowRight,
  ChevronDown, ChevronUp, BookOpen, Clock, MapPin, Award
} from 'lucide-react';
import { FacultyMember, ScheduleItem } from '../types';
import { STANDARD_DEPARTMENTS } from '../data/mockSchedule';
import { isLecturerAssignedToItem } from '../utils/periodConverter';

interface FacultyManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  facultyList: FacultyMember[];
  scheduleList: ScheduleItem[];
  departmentList?: string[];
  onSaveFacultyMember: (member: FacultyMember) => void;
  onDeleteFacultyMember: (id: string) => void;
  onAddDepartment?: (deptName: string) => void;
  onEditDepartment?: (oldName: string, newName: string) => void;
  onDeleteDepartment?: (deptName: string) => void;
}

// Helper to normalize department names for robust matching
const normalizeDept = (dept?: string): string => {
  if (!dept) return '';
  return dept
    .toLowerCase()
    .trim()
    .replace(/^bộ\s*môn\s*/i, '')
    .replace(/\s+/g, ' ');
};

const isDeptMatch = (deptA?: string, deptB?: string): boolean => {
  if (!deptA || !deptB) return false;
  const a = deptA.trim().toLowerCase();
  const b = deptB.trim().toLowerCase();
  if (a === b) return true;
  const normA = normalizeDept(deptA);
  const normB = normalizeDept(deptB);
  if (normA && normB && normA === normB) return true;
  if (normA.length >= 4 && normB.length >= 4 && (normA.includes(normB) || normB.includes(normA))) {
    return true;
  }
  return false;
};

// Helper to strip academic titles (GS., PGS., TS., ThS., CN., KS., etc.) for robust lecturer matching
const normalizePersonName = (name?: string): string => {
  if (!name) return '';
  return name
    .toLowerCase()
    .replace(/^(pgs\.?\s*ts\.?|gs\.?\s*ts\.?|ts\.?|ths\.?|cn\.?|ks\.?|gv\.?)\s+/i, '')
    .trim()
    .replace(/\s+/g, ' ');
};

const isPersonNameMatch = (nameA?: string, nameB?: string): boolean => {
  if (!nameA || !nameB) return false;
  const a = nameA.trim().toLowerCase();
  const b = nameB.trim().toLowerCase();
  if (a === b) return true;
  const normA = normalizePersonName(nameA);
  const normB = normalizePersonName(nameB);
  if (normA && normB && (normA === normB || normA.includes(normB) || normB.includes(normA))) {
    return true;
  }
  return false;
};

const isEmailMatch = (emailA?: string, emailB?: string): boolean => {
  if (!emailA || !emailB) return false;
  const a = emailA.trim().toLowerCase();
  const b = emailB.trim().toLowerCase();
  if (!a || !b || a.includes('placeholder') || b.includes('placeholder')) return false;
  if (a === b) return true;
  const listA = a.split(/[,;\s]+/).map(s => s.trim()).filter(Boolean);
  const listB = b.split(/[,;\s]+/).map(s => s.trim()).filter(Boolean);
  return listA.some(x => listB.includes(x));
};

export const FacultyManagementModal: React.FC<FacultyManagementModalProps> = ({
  isOpen,
  onClose,
  facultyList = [],
  scheduleList = [],
  departmentList = STANDARD_DEPARTMENTS,
  onSaveFacultyMember,
  onDeleteFacultyMember,
  onAddDepartment,
  onEditDepartment,
  onDeleteDepartment
}) => {
  const [activeTab, setActiveTab] = useState<'faculty' | 'departments'>('faculty');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState('all');
  const [filterMissingInfoOnly, setFilterMissingInfoOnly] = useState(false);

  // Faculty Edit / Add state
  const [editingMember, setEditingMember] = useState<FacultyMember | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [formData, setFormData] = useState<{
    id?: string;
    code?: string;
    name: string;
    email: string;
    department: string;
  }>({
    code: '',
    name: '',
    email: '',
    department: departmentList[0] || 'Bộ môn Hóa Hữu cơ'
  });

  // Department Management State
  const [newDeptInput, setNewDeptInput] = useState('');
  const [editingDeptOldName, setEditingDeptOldName] = useState<string | null>(null);
  const [editingDeptNewName, setEditingDeptNewName] = useState('');
  const [expandedDept, setExpandedDept] = useState<string | null>(null);
  const [deptActiveSubTab, setDeptActiveSubTab] = useState<'faculty' | 'classes'>('faculty');

  // Real faculty without 'all'
  const realFaculty = useMemo(() => {
    return (facultyList || []).filter(f => f.id !== 'all');
  }, [facultyList]);

  // Calculate lecture counts per faculty accurately without duplicate summing
  const facultyClassCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    realFaculty.forEach(f => {
      counts[f.id] = 0;
    });

    (scheduleList || []).forEach(item => {
      realFaculty.forEach(f => {
        if (isLecturerAssignedToItem(f, item)) {
          counts[f.id] = (counts[f.id] || 0) + 1;
        }
      });
    });
    return counts;
  }, [realFaculty, scheduleList]);

  // Dynamic list of all departments scanned from both configured departmentList and realFaculty
  const allScannedDepartments = useMemo(() => {
    const list: string[] = [];
    const addedNormalized = new Set<string>();

    const addDept = (name: string) => {
      if (!name || !name.trim()) return;
      const trimmed = name.trim();
      const norm = normalizeDept(trimmed);
      if (!addedNormalized.has(norm)) {
        addedNormalized.add(norm);
        list.push(trimmed);
      }
    };

    // 1. Initial configured departments
    departmentList.forEach(addDept);

    // 2. Any departments existing in faculty directory
    realFaculty.forEach(f => {
      if (f.department && f.department.trim() && f.department !== 'Khoa Hóa học') {
        const existing = list.find(d => isDeptMatch(f.department, d));
        if (!existing) {
          addDept(f.department);
        }
      }
    });

    // 3. Check if any faculty members are unassigned or just 'Khoa Hóa học'
    const hasUnassigned = realFaculty.some(f => {
      if (!f.department || f.department === 'Khoa Hóa học') return true;
      return !list.some(d => isDeptMatch(f.department, d));
    });
    if (hasUnassigned) {
      list.push('Khoa Hóa học (Chung / Chưa phân BM)');
    }

    return list;
  }, [departmentList, realFaculty]);

  // Comprehensive scan of Faculty & Schedules per Department
  const departmentDetailedStats = useMemo(() => {
    const statsMap: Record<string, {
      deptName: string;
      facultyMembers: FacultyMember[];
      facultyCount: number;
      teachingFacultyCount: number;
      nonTeachingFacultyCount: number;
      classes: ScheduleItem[];
      classCount: number;
      uniqueSubjects: string[];
      uniqueSubjectCount: number;
    }> = {};

    // 1. Initialize all departments
    allScannedDepartments.forEach(dept => {
      statsMap[dept] = {
        deptName: dept,
        facultyMembers: [],
        facultyCount: 0,
        teachingFacultyCount: 0,
        nonTeachingFacultyCount: 0,
        classes: [],
        classCount: 0,
        uniqueSubjects: [],
        uniqueSubjectCount: 0
      };
    });

    // 2. Scan Faculty Directory to assign faculty to their exact department
    realFaculty.forEach(f => {
      let matchedDept = allScannedDepartments.find(
        d => d !== 'Khoa Hóa học (Chung / Chưa phân BM)' && isDeptMatch(f.department, d)
      );
      if (!matchedDept) {
        matchedDept = 'Khoa Hóa học (Chung / Chưa phân BM)';
      }
      if (statsMap[matchedDept]) {
        statsMap[matchedDept].facultyMembers.push(f);
      }
    });

    // 3. Scan Schedule items and bind with Department & Faculty
    allScannedDepartments.forEach(dept => {
      const stat = statsMap[dept];
      if (!stat) return;

      stat.facultyCount = stat.facultyMembers.length;
      const deptFaculty = stat.facultyMembers;

      // Scan all schedules:
      // A course is assigned to this department if:
      // - The schedule item's department matches this department, OR
      // - Any lecturer in this department's directory matches item.lecturerName / item.lecturerEmail, OR
      // - Any assistant in this department's directory matches item.assistantName / item.assistantEmail!
      const matchedClasses = (scheduleList || []).filter(item => {
        // Direct department match
        if (dept !== 'Khoa Hóa học (Chung / Chưa phân BM)' && isDeptMatch(item.department, dept)) {
          return true;
        }

        // Match lecturer or assistant in this department's directory
        const hasFacultyInDept = deptFaculty.some(f => isLecturerAssignedToItem(f, item));
        if (hasFacultyInDept) return true;

        // If unassigned department: match if item has no recognized department and no recognized lecturer
        if (dept === 'Khoa Hóa học (Chung / Chưa phân BM)') {
          const isItemRecognized = allScannedDepartments.some(
            d => d !== 'Khoa Hóa học (Chung / Chưa phân BM)' && isDeptMatch(item.department, d)
          );
          if (!isItemRecognized && !hasFacultyInDept) {
            return true;
          }
        }

        return false;
      });

      stat.classes = matchedClasses;
      stat.classCount = matchedClasses.length;

      // Teaching faculty: faculty members who are actively teaching in the schedule
      stat.teachingFacultyCount = deptFaculty.filter(f => {
        return matchedClasses.some(c => isLecturerAssignedToItem(f, c));
      }).length;

      stat.nonTeachingFacultyCount = stat.facultyCount - stat.teachingFacultyCount;

      // Extract unique subjects (môn học)
      const subjectMap = new Map<string, boolean>();
      matchedClasses.forEach(c => {
        const sName = (c.subjectName || '').trim();
        if (sName) subjectMap.set(sName, true);
      });
      stat.uniqueSubjects = Array.from(subjectMap.keys());
      stat.uniqueSubjectCount = stat.uniqueSubjects.length;
    });

    return statsMap;
  }, [allScannedDepartments, realFaculty, scheduleList]);

  // Overall Department Totals
  const departmentOverview = useMemo(() => {
    let totalAssignedFaculty = 0;
    allScannedDepartments.forEach(dept => {
      const s = departmentDetailedStats[dept];
      if (s) {
        totalAssignedFaculty += s.facultyCount;
      }
    });

    const totalClassesScanned = (scheduleList || []).length;
    const totalSubjectsScanned = new Set(
      (scheduleList || []).map(s => s.subjectName?.trim()).filter(Boolean)
    ).size;

    return {
      totalDepts: allScannedDepartments.length,
      totalFaculty: realFaculty.length,
      totalAssignedFaculty,
      totalClassesScanned,
      totalSubjectsScanned
    };
  }, [allScannedDepartments, realFaculty, scheduleList, departmentDetailedStats]);

  // Filtered members for Faculty tab
  const filteredFaculty = useMemo(() => {
    return realFaculty.filter(member => {
      const term = searchTerm.toLowerCase().trim();
      const matchesSearch =
        !term ||
        (member.code && member.code.toLowerCase().includes(term)) ||
        member.name.toLowerCase().includes(term) ||
        (member.email && member.email.toLowerCase().includes(term));

      const isMissingInfo = !member.email || member.email.includes('placeholder');
      const matchesMissing = !filterMissingInfoOnly || isMissingInfo;

      return matchesSearch && matchesMissing;
    });
  }, [realFaculty, searchTerm, filterMissingInfoOnly]);

  // Statistics for Faculty tab
  const stats = useMemo(() => {
    const total = realFaculty.length;
    const missingEmail = realFaculty.filter(f => !f.email || f.email.includes('placeholder')).length;
    const needsAttention = missingEmail;
    return { total, missingEmail, missingDept: 0, needsAttention };
  }, [realFaculty]);

  if (!isOpen) return null;

  const handleStartAdd = () => {
    setActiveTab('faculty');
    setEditingMember(null);
    const nextCode = `CB${String(realFaculty.length + 1).padStart(2, '0')}`;
    setFormData({
      code: nextCode,
      name: '',
      email: '',
      department: 'Khoa Hóa học'
    });
    setIsAddingNew(true);
  };

  const handleStartEdit = (member: FacultyMember) => {
    setActiveTab('faculty');
    setIsAddingNew(false);
    setEditingMember(member);
    setFormData({
      id: member.id,
      code: member.code || '',
      name: member.name,
      email: member.email || '',
      department: member.department || 'Khoa Hóa học'
    });
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert('Vui lòng nhập Họ & Tên giảng viên.');
      return;
    }

    const emailToSave = formData.email.trim() || `${formData.name.toLowerCase().replace(/[^a-z0-9]/g, '')}@chem.hcmus.edu.vn`;
    const memberId = formData.id || (editingMember ? editingMember.id : `fac-${Date.now()}`);

    const memberToSave: FacultyMember = {
      id: memberId,
      code: formData.code?.trim() || undefined,
      name: formData.name.trim(),
      email: emailToSave,
      department: formData.department.trim() || 'Khoa Hóa học'
    };

    onSaveFacultyMember(memberToSave);
    setIsAddingNew(false);
    setEditingMember(null);
  };

  // Handle Add Department
  const handleAddNewDepartmentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newDeptInput.trim();
    if (!trimmed) {
      alert('Vui lòng nhập tên bộ môn.');
      return;
    }
    if (departmentList.some(d => d.toLowerCase() === trimmed.toLowerCase())) {
      alert('Bộ môn này đã có trong danh sách.');
      return;
    }
    if (onAddDepartment) {
      onAddDepartment(trimmed);
    }
    setNewDeptInput('');
  };

  // Handle Save Edit Department
  const handleSaveEditDept = (oldName: string) => {
    const trimmed = editingDeptNewName.trim();
    if (!trimmed) {
      alert('Tên bộ môn không được để trống.');
      return;
    }
    if (trimmed.toLowerCase() !== oldName.toLowerCase() && departmentList.some(d => d.toLowerCase() === trimmed.toLowerCase())) {
      alert('Tên bộ môn này đã tồn tại.');
      return;
    }
    if (onEditDepartment) {
      onEditDepartment(oldName, trimmed);
    }
    setEditingDeptOldName(null);
    setEditingDeptNewName('');
  };

  // Handle Delete Department
  const handleDeleteDeptClick = (deptName: string) => {
    const stat = departmentDetailedStats[deptName];
    const currentFacultyInDept = stat ? stat.facultyCount : 0;
    const currentClassesInDept = stat ? stat.classCount : 0;

    let warningMsg = `Bạn có chắc muốn xóa "${deptName}"?`;
    if (currentFacultyInDept > 0 || currentClassesInDept > 0) {
      warningMsg += `\n\nLưu ý: Đang có ${currentFacultyInDept} giảng viên và ${currentClassesInDept} lớp học phân công thuộc bộ môn này. Khi xóa, tất cả sẽ được chuyển về "Khoa Hóa học".`;
    }

    if (confirm(warningMsg)) {
      if (onDeleteDepartment) {
        onDeleteDepartment(deptName);
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
      <div 
        className="bg-white rounded-2xl w-full max-w-4xl max-h-[92vh] overflow-hidden shadow-2xl border border-slate-200 flex flex-col animate-scaleUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-slate-900 text-white p-4 sm:p-5 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base sm:text-lg">Quản lý Danh bạ Giảng viên</h3>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                  Khoa Hóa học
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Danh bạ thông tin giảng viên Khoa Hóa học (chức danh, họ tên, email liên hệ)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* FACULTY DIRECTORY */}
        <>
            {/* Action & Stats Bar */}
            <div className="p-4 bg-slate-50 border-b border-slate-200 space-y-3 shrink-0">
              <div className="flex flex-wrap items-center justify-between gap-2.5">
                {/* Quick Stats Badges */}
                <div className="flex items-center gap-2 flex-wrap text-xs">
                  <span className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 font-semibold text-slate-700 shadow-2xs">
                    Tổng số Giảng viên: <strong className="text-indigo-600 font-bold">{stats.total}</strong>
                  </span>
                  {stats.missingEmail > 0 && (
                    <button
                      type="button"
                      onClick={() => setFilterMissingInfoOnly(!filterMissingInfoOnly)}
                      className={`px-2.5 py-1 rounded-lg border font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                        filterMissingInfoOnly
                          ? 'bg-amber-100 border-amber-300 text-amber-900 ring-2 ring-amber-400'
                          : 'bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100'
                      }`}
                    >
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                      <span>Chưa có email: <strong>{stats.missingEmail}</strong></span>
                    </button>
                  )}
                </div>

                {/* Add Faculty Button */}
                <button
                  type="button"
                  onClick={() => handleStartAdd()}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-xs hover:shadow transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Thêm Giảng viên mới</span>
                </button>
              </div>

              {/* Search */}
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="🔍 Tìm theo chức danh, họ tên hoặc email thầy cô..."
                    className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-800"
                  />
                </div>
              </div>
            </div>

            {/* Content Body: Table or Form */}
            <div className="flex-1 overflow-y-auto p-4">
              {(isAddingNew || editingMember) ? (
                <div className="bg-indigo-50/70 border border-indigo-200 rounded-xl p-5 mb-4 max-w-xl mx-auto animate-fadeIn shadow-xs">
                  <div className="flex items-center justify-between mb-4 border-b border-indigo-100 pb-2">
                    <h4 className="font-bold text-sm text-indigo-950 flex items-center gap-1.5">
                      <UserCheck className="w-4 h-4 text-indigo-600" />
                      <span>{isAddingNew ? 'Thêm mới Giảng viên vào Danh bạ' : `Chỉnh sửa thông tin: ${editingMember?.name}`}</span>
                    </h4>
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddingNew(false);
                        setEditingMember(null);
                      }}
                      className="text-xs text-slate-500 hover:text-slate-700 font-medium cursor-pointer"
                    >
                      Hủy
                    </button>
                  </div>

                  <form onSubmit={handleSave} className="space-y-3 text-xs">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">
                          Mã số cán bộ (MSCB):
                        </label>
                        <input
                          type="text"
                          value={formData.code || ''}
                          onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                          placeholder="VD: CB01, CB02..."
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white font-mono font-bold text-indigo-700 focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          Phân biệt Thầy/Cô trùng tên.
                        </p>
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block font-semibold text-slate-700 mb-1">
                          Chức danh, Họ & Tên Thầy/Cô: <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          placeholder="VD: PGS.TS. Trần Văn Hóa, TS. Nguyễn Minh Khôi..."
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white font-semibold text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Email Thầy/Cô:
                      </label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="VD: tvhoa@chem.hcmus.edu.vn"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white font-mono text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        Nếu để trống, hệ thống sẽ tự sinh email mẫu theo tên của thầy cô.
                      </p>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-3 border-t border-indigo-100">
                      <button
                        type="button"
                        onClick={() => {
                          setIsAddingNew(false);
                          setEditingMember(null);
                        }}
                        className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold cursor-pointer"
                      >
                        Hủy bỏ
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-xs cursor-pointer"
                      >
                        Lưu thông tin
                      </button>
                    </div>
                  </form>
                </div>
              ) : null}

              {/* Table of Faculty */}
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-700 font-semibold">
                      <th className="py-2.5 px-3">Mã số cán bộ – Họ & Tên Thầy Cô</th>
                      <th className="py-2.5 px-3">Email liên hệ</th>
                      <th className="py-2.5 px-3 text-center">Lớp phụ trách</th>
                      <th className="py-2.5 px-3 text-center">Trạng thái email</th>
                      <th className="py-2.5 px-3 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {filteredFaculty.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-slate-400">
                          Không tìm thấy giảng viên nào phù hợp với bộ lọc.
                        </td>
                      </tr>
                    ) : (
                      filteredFaculty.map((member) => {
                        const classCount = facultyClassCounts[member.id] || 0;
                        const isMissingEmail = !member.email || member.email.includes('placeholder');

                        return (
                          <tr key={member.id} className="hover:bg-indigo-50/40 transition-colors">
                            <td className="py-2.5 px-3">
                              <div className="font-bold text-slate-900 flex items-center gap-1.5 flex-wrap">
                                {member.code ? (
                                  <span className="px-1.5 py-0.5 rounded bg-indigo-50 border border-indigo-200 text-indigo-700 font-mono text-[11px] font-bold">
                                    {member.code}
                                  </span>
                                ) : (
                                  <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-400 font-mono text-[10px]">
                                    Chưa có mã
                                  </span>
                                )}
                                <span className="text-slate-400 font-normal">–</span>
                                <span>{member.name}</span>
                              </div>
                              <div className="text-[10px] text-slate-400 font-mono mt-0.5">ID: {member.id}</div>
                            </td>
                            <td className="py-2.5 px-3">
                              {isMissingEmail ? (
                                <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 font-mono text-[11px]">
                                  <AlertTriangle className="w-3 h-3 text-amber-600" />
                                  <span>Chưa có email</span>
                                </span>
                              ) : (
                                <span className="font-mono text-slate-600 flex items-center gap-1 text-[11px]">
                                  <Mail className="w-3 h-3 text-slate-400" />
                                  <span>{member.email}</span>
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <span className="inline-block px-2 py-0.5 rounded-full font-bold font-mono text-[11px] bg-slate-100 text-slate-800 border border-slate-200">
                                {classCount} môn
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              {isMissingEmail ? (
                                <span 
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200"
                                  title="Chưa cập nhật địa chỉ Email liên hệ"
                                >
                                  <AlertTriangle className="w-3 h-3 text-amber-600" />
                                  <span>Chưa có email</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                  <Check className="w-3 h-3 text-emerald-600" />
                                  <span>Đầy đủ email</span>
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleStartEdit(member)}
                                  title="Chỉnh sửa thông tin giảng viên"
                                  className="p-1 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors cursor-pointer"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (confirm(`Bạn có chắc muốn xóa giảng viên "${member.name}" khỏi danh bạ?`)) {
                                      onDeleteFacultyMember(member.id);
                                    }
                                  }}
                                  title="Xóa giảng viên"
                                  className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0 text-xs text-slate-500">
          <span>* Các thay đổi trong danh bạ giảng viên sẽ được lưu tự động lên hệ thống.</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

