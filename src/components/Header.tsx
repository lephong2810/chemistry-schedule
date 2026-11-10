import React from 'react';
import { CalendarDays, FlaskConical, GraduationCap, RefreshCw, UserRound } from 'lucide-react';
import { TabType } from '../types';
import { cx } from './ui';

export const TABS: { id: TabType; label: string; short: string; icon: React.ElementType }[] = [
  { id: 'teaching', label: 'Lịch toàn khoa', short: 'Toàn khoa', icon: CalendarDays },
  { id: 'personal', label: 'Lịch của tôi', short: 'Của tôi', icon: UserRound },
  { id: 'class', label: 'Lịch lớp SV', short: 'Lớp SV', icon: GraduationCap },
  { id: 'room', label: 'Phòng thí nghiệm', short: 'PTN', icon: FlaskConical }
];

interface HeaderProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  isSyncing: boolean;
  lastSyncTime: string;
  onRefreshSheet: () => void;
}

export const BrandMark: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
    <defs>
      <linearGradient id="bm" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#34c7a6" />
        <stop offset="1" stopColor="#0b8a72" />
      </linearGradient>
    </defs>
    <rect width="40" height="40" rx="12" fill="url(#bm)" />
    <path d="M20 8.5 29.5 14v11L20 30.5 10.5 25V14z" fill="none" stroke="#fff" strokeOpacity=".9" strokeWidth="2" strokeLinejoin="round" />
    <circle cx="20" cy="19.5" r="4.2" fill="none" stroke="#fff" strokeOpacity=".9" strokeWidth="2" />
  </svg>
);

export const Header: React.FC<HeaderProps> = ({ activeTab, setActiveTab, isSyncing, lastSyncTime, onRefreshSheet }) => {
  return (
    <>
      <header className="no-print sticky top-0 z-40 bg-ink-950/95 backdrop-blur-md text-white border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-4">
          <button
            type="button"
            onClick={() => setActiveTab('teaching')}
            className="flex items-center gap-2.5 shrink-0 cursor-pointer"
          >
            <BrandMark className="w-9 h-9" />
            <div className="text-left leading-tight">
              <div className="text-[15px] font-extrabold tracking-tight">
                Lịch giảng dạy <span className="text-brand-300">Khoa Hoá</span>
              </div>
              <div className="text-[11px] text-ink-400 font-medium hidden sm:block">Trường ĐH Khoa học Tự nhiên · ĐHQG-HCM</div>
            </div>
          </button>

          <nav className="hidden md:flex items-center gap-1 mx-auto bg-white/5 rounded-2xl p-1 ring-1 ring-white/10">
            {TABS.map(t => {
              const Icon = t.icon;
              const active = activeTab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setActiveTab(t.id)}
                  className={cx(
                    'flex items-center gap-2 px-3.5 lg:px-4 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer whitespace-nowrap',
                    active ? 'bg-white text-ink-950 shadow-soft' : 'text-ink-300 hover:text-white hover:bg-white/5'
                  )}
                >
                  <Icon className={cx('w-4 h-4', active ? 'text-brand-600' : '')} />
                  {t.label}
                </button>
              );
            })}
          </nav>

          <button
            type="button"
            onClick={onRefreshSheet}
            disabled={isSyncing}
            title={lastSyncTime ? `Cập nhật lần cuối: ${lastSyncTime}` : 'Tải lại dữ liệu mới nhất từ Google Sheet'}
            className="ml-auto md:ml-0 flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-ink-200 hover:text-white hover:bg-white/10 ring-1 ring-white/10 transition-all cursor-pointer disabled:opacity-60"
          >
            <RefreshCw className={cx('w-4 h-4', isSyncing && 'animate-spin text-brand-300')} />
            <span className="hidden lg:inline">{isSyncing ? 'Đang cập nhật…' : 'Cập nhật'}</span>
          </button>
        </div>
      </header>

      {/* Thanh điều hướng dưới cùng cho điện thoại */}
      <nav className="no-print md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-ink-100 pb-safe">
        <div className="grid grid-cols-4">
          {TABS.map(t => {
            const Icon = t.icon;
            const active = activeTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  setActiveTab(t.id);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className={cx('flex flex-col items-center gap-1 pt-2.5 pb-1.5 cursor-pointer', active ? 'text-brand-700' : 'text-ink-400')}
              >
                <span className={cx('grid place-items-center w-12 h-7 rounded-full transition-colors', active && 'bg-brand-100')}>
                  <Icon className="w-5 h-5" />
                </span>
                <span className="text-[11px] font-semibold">{t.short}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
};
