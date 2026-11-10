import React, { useState } from 'react';
import { X, Lock, ShieldCheck, KeyRound, LogOut, CheckCircle2, AlertCircle, Sparkles, UserCheck } from 'lucide-react';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  isAdmin: boolean;
  onLogin: (pin: string) => boolean;
  onLogout: () => void;
  onChangePin: (oldPin: string, newPin: string) => boolean;
}

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({
  isOpen,
  onClose,
  isAdmin,
  onLogin,
  onLogout,
  onChangePin
}) => {
  const [pinInput, setPinInput] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Change PIN sub-form
  const [showChangePin, setShowChangePin] = useState(false);
  const [oldPin, setOldPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');

  if (!isOpen) return null;

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const success = onLogin(pinInput.trim());
    if (success) {
      setPinInput('');
      onClose();
    } else {
      setErrorMsg('Mã PIN không chính xác. Vui lòng kiểm tra lại mã của Văn phòng Khoa.');
    }
  };

  const handleChangePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!newPin.trim() || newPin.trim().length < 4) {
      setErrorMsg('Mã PIN mới phải có ít nhất 4 ký tự.');
      return;
    }
    if (newPin !== confirmPin) {
      setErrorMsg('Mã PIN mới và xác nhận mã PIN không trùng khớp.');
      return;
    }

    const ok = onChangePin(oldPin.trim(), newPin.trim());
    if (ok) {
      setSuccessMsg('Đã đổi mã PIN Văn phòng Khoa thành công!');
      setOldPin('');
      setNewPin('');
      setConfirmPin('');
      setShowChangePin(false);
    } else {
      setErrorMsg('Mã PIN hiện tại không chính xác.');
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
      <div 
        className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl border border-slate-200 animate-scaleUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white leading-snug">
                {isAdmin ? 'Quản trị Văn phòng Khoa' : 'Đăng nhập Quản trị VP Khoa'}
              </h2>
              <p className="text-[11px] text-slate-400">
                Khoa Hóa học • Trường ĐH Khoa học Tự nhiên
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 text-sm">
          {/* Notifications */}
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2 animate-fadeIn font-medium">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2 animate-fadeIn font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {isAdmin ? (
            /* Logged in as Admin State */
            <div className="space-y-4">
              <div className="p-4 bg-emerald-50/80 border border-emerald-200 rounded-xl text-emerald-950 flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-bold text-xs sm:text-sm text-emerald-900">
                    Đang ở Chế độ Quản trị VP Khoa
                  </div>
                  <p className="text-xs text-emerald-800 leading-relaxed">
                    Bạn hiện có toàn quyền <strong>phân công môn học mới, chỉnh sửa thông tin lớp, giảng viên, bộ môn, phòng học</strong> và quản lý thời khóa biểu.
                  </p>
                </div>
              </div>

              {!showChangePin ? (
                <div className="space-y-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowChangePin(true)}
                    className="w-full py-2.5 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center justify-center gap-2 transition-colors shadow-2xs"
                  >
                    <KeyRound className="w-4 h-4 text-slate-500" />
                    <span>Đổi mã PIN Quản trị VP Khoa</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onLogout();
                      onClose();
                    }}
                    className="w-full py-2.5 px-4 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold flex items-center justify-center gap-2 transition-colors shadow-2xs"
                  >
                    <LogOut className="w-4 h-4 text-rose-600" />
                    <span>Đăng xuất (Trở về Chế độ Xem cho Thầy Cô)</span>
                  </button>
                </div>
              ) : (
                /* Change PIN Sub-form */
                <form onSubmit={handleChangePinSubmit} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 animate-fadeIn">
                  <div className="font-bold text-xs text-slate-800 flex items-center justify-between">
                    <span>Đổi mã PIN Quản trị</span>
                    <button
                      type="button"
                      onClick={() => setShowChangePin(false)}
                      className="text-[11px] text-slate-400 hover:text-slate-600 font-normal"
                    >
                      Hủy
                    </button>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">
                      Mã PIN hiện tại
                    </label>
                    <input
                      type="password"
                      required
                      value={oldPin}
                      onChange={(e) => setOldPin(e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">
                      Mã PIN mới
                    </label>
                    <input
                      type="password"
                      required
                      value={newPin}
                      onChange={(e) => setNewPin(e.target.value)}
                      placeholder="Tối thiểu 4 ký tự"
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">
                      Xác nhận mã PIN mới
                    </label>
                    <input
                      type="password"
                      required
                      value={confirmPin}
                      onChange={(e) => setConfirmPin(e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition-colors shadow-2xs"
                  >
                    Lưu mã PIN mới
                  </button>
                </form>
              )}
            </div>
          ) : (
            /* Login Form */
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 text-xs leading-relaxed space-y-1.5">
                <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Cơ chế bảo vệ thời khóa biểu:</span>
                </div>
                <p>
                  Mặc định hệ thống ở <strong>Chế độ Xem (Chỉ đọc)</strong> dành cho Thầy Cô và Sinh viên để tránh chỉnh sửa nhầm lẫn.
                </p>
                <p className="text-slate-600">
                  Cán bộ Văn phòng Khoa vui lòng nhập mã PIN quản trị để mở khóa chức năng thêm, sửa, xóa lịch.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5 flex items-center justify-between">
                  <span>Mã PIN Quản trị VP Khoa</span>
                  <span className="text-[11px] font-normal text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                    Mặc định: <strong>vpkhoa2026</strong>
                  </span>
                </label>
                <div className="relative">
                  <input
                    type="password"
                    autoFocus
                    required
                    value={pinInput}
                    onChange={(e) => setPinInput(e.target.value)}
                    placeholder="Nhập mã PIN (VD: vpkhoa2026)..."
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-2xs"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2.5 border border-slate-300 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-100 transition-colors"
                >
                  Đóng (Tiếp tục xem)
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold transition-colors shadow-xs flex items-center justify-center gap-1.5"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Mở khóa Quản trị</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
