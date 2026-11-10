// Ô chọn giảng viên có tìm kiếm không dấu, điều khiển bằng bàn phím
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Search, Users, X } from 'lucide-react';
import { FacultyMember } from '../types';
import { Avatar, cx } from './ui';
import { vnNameSortKey } from '../utils/display';

const fold = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();

interface Props {
  facultyList: FacultyMember[];
  value: string;
  onChange: (id: string) => void;
  allowAll?: boolean;
  placeholder?: string;
  autoOpen?: boolean;
  size?: 'md' | 'lg';
  className?: string;
}

export const LecturerPicker: React.FC<Props> = ({
  facultyList,
  value,
  onChange,
  allowAll = true,
  placeholder = 'Chọn giảng viên…',
  autoOpen = false,
  size = 'md',
  className
}) => {
  const [open, setOpen] = useState(autoOpen);
  const [q, setQ] = useState('');
  const [cursor, setCursor] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const people = useMemo(
    () =>
      facultyList
        .filter(f => f.id !== 'all')
        .slice()
        .sort((a, b) => vnNameSortKey(a.name).localeCompare(vnNameSortKey(b.name), 'vi')),
    [facultyList]
  );

  const current = facultyList.find(f => f.id === value || f.name === value || f.email === value);
  const isAll = !current || current.id === 'all';

  const filtered = useMemo(() => {
    const t = fold(q.trim());
    if (!t) return people;
    return people.filter(
      f =>
        fold(f.name).includes(t) ||
        (f.code && fold(f.code).includes(t)) ||
        (f.email && fold(f.email).includes(t)) ||
        (f.department && fold(f.department).includes(t))
    );
  }, [people, q]);

  const options = useMemo(
    () => (allowAll && !q.trim() ? [{ id: 'all', name: 'Tất cả giảng viên', email: '', department: '' } as FacultyMember, ...filtered] : filtered),
    [allowAll, filtered, q]
  );

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  useEffect(() => {
    if (open) {
      setCursor(0);
      setTimeout(() => inputRef.current?.focus(), 10);
    } else {
      setQ('');
    }
  }, [open]);

  useEffect(() => setCursor(0), [q]);

  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-idx="${cursor}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [cursor]);

  const pick = (id: string) => {
    onChange(id);
    setOpen(false);
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setCursor(c => Math.min(c + 1, options.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setCursor(c => Math.max(c - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (options[cursor]) pick(options[cursor].id);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div ref={wrapRef} className={cx('relative', className)}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cx(
          'w-full flex items-center gap-2.5 text-left bg-white rounded-xl ring-1 transition-all cursor-pointer',
          size === 'lg' ? 'px-3.5 py-3' : 'px-3 py-2',
          open ? 'ring-2 ring-brand-500' : 'ring-ink-200 hover:ring-ink-300'
        )}
      >
        {isAll ? (
          <span className="grid place-items-center w-7 h-7 rounded-full bg-ink-100 text-ink-500 shrink-0">
            <Users className="w-3.5 h-3.5" />
          </span>
        ) : (
          <Avatar name={current!.name} size="sm" className="w-7 h-7" />
        )}
        <span className="flex-1 min-w-0">
          <span className="block text-[10px] font-semibold uppercase tracking-wider text-ink-400 leading-none mb-0.5">
            Giảng viên
          </span>
          <span className={cx('block truncate font-semibold', size === 'lg' ? 'text-[15px]' : 'text-sm', isAll && value === 'all' ? 'text-ink-700' : 'text-ink-900')}>
            {isAll ? (allowAll ? 'Tất cả giảng viên' : placeholder) : current!.name}
          </span>
        </span>
        {!isAll && allowAll && (
          <span
            role="button"
            tabIndex={0}
            aria-label="Bỏ chọn giảng viên"
            onClick={e => {
              e.stopPropagation();
              onChange('all');
            }}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.stopPropagation();
                onChange('all');
              }
            }}
            className="p-1 rounded-md text-ink-400 hover:text-ink-700 hover:bg-ink-100"
          >
            <X className="w-3.5 h-3.5" />
          </span>
        )}
        <ChevronDown className={cx('w-4 h-4 text-ink-400 shrink-0 transition-transform', open && 'rotate-180 text-brand-600')} />
      </button>

      {open && (
        <div className="absolute z-50 left-0 right-0 mt-2 min-w-[280px] bg-white rounded-2xl shadow-lift ring-1 ring-ink-900/10 overflow-hidden animate-pop origin-top">
          <div className="p-2 border-b border-ink-100">
            <div className="relative">
              <Search className="w-4 h-4 text-ink-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                ref={inputRef}
                value={q}
                onChange={e => setQ(e.target.value)}
                onKeyDown={onKey}
                placeholder="Gõ tên Thầy/Cô, không cần dấu…"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-ink-50 text-sm text-ink-900 placeholder:text-ink-400 outline-none focus:ring-2 focus:ring-brand-500/40"
              />
            </div>
            <div className="px-1 pt-1.5 text-[11px] text-ink-400">
              {filtered.length} giảng viên · dùng ↑ ↓ và Enter để chọn
            </div>
          </div>
          <div ref={listRef} role="listbox" className="max-h-80 overflow-y-auto p-1.5">
            {options.length === 0 ? (
              <div className="py-8 text-center text-sm text-ink-400">Không tìm thấy giảng viên phù hợp</div>
            ) : (
              options.map((f, idx) => {
                const selected = f.id === 'all' ? value === 'all' : f.id === value;
                const active = idx === cursor;
                return (
                  <button
                    key={f.id}
                    type="button"
                    data-idx={idx}
                    role="option"
                    aria-selected={selected}
                    onMouseEnter={() => setCursor(idx)}
                    onClick={() => pick(f.id)}
                    className={cx(
                      'w-full flex items-center gap-3 px-2.5 py-2 rounded-xl text-left cursor-pointer transition-colors',
                      active ? 'bg-brand-50' : 'hover:bg-ink-50'
                    )}
                  >
                    {f.id === 'all' ? (
                      <span className="grid place-items-center w-8 h-8 rounded-full bg-ink-100 text-ink-500 shrink-0">
                        <Users className="w-4 h-4" />
                      </span>
                    ) : (
                      <Avatar name={f.name} />
                    )}
                    <span className="flex-1 min-w-0">
                      <span className={cx('block truncate text-sm', selected ? 'font-bold text-brand-800' : 'font-semibold text-ink-800')}>
                        {f.name}
                      </span>
                      {f.id !== 'all' && f.code && (
                        <span className="block truncate text-[11px] text-ink-400">MSCB {f.code}</span>
                      )}
                    </span>
                    {selected && <Check className="w-4 h-4 text-brand-600 shrink-0" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
