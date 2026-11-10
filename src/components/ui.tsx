// Các thành phần giao diện nhỏ dùng chung
import React from 'react';
import { avatarTone, campusMeta, initials } from '../utils/display';

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');

export const Avatar: React.FC<{ name?: string; size?: 'sm' | 'md' | 'lg' | 'xl'; className?: string }> = ({
  name,
  size = 'md',
  className
}) => {
  const sz = {
    sm: 'w-6 h-6 text-[10px]',
    md: 'w-8 h-8 text-xs',
    lg: 'w-11 h-11 text-sm',
    xl: 'w-14 h-14 text-lg'
  }[size];
  return (
    <span
      className={cx(
        'inline-flex items-center justify-center rounded-full font-bold shrink-0 select-none',
        avatarTone(name),
        sz,
        className
      )}
      aria-hidden="true"
    >
      {initials(name)}
    </span>
  );
};

export const CampusChip: React.FC<{ campus?: string; withPlace?: boolean; className?: string }> = ({
  campus,
  withPlace,
  className
}) => {
  const m = campusMeta(campus);
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset whitespace-nowrap',
        m.chip,
        className
      )}
    >
      <span className={cx('w-1.5 h-1.5 rounded-full', m.dot)} />
      {m.short}
      {withPlace && <span className="font-medium opacity-75">· {m.place}</span>}
    </span>
  );
};

export interface SegmentOption<T extends string> {
  value: T;
  label: React.ReactNode;
  icon?: React.ReactNode;
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  size = 'md',
  className
}: {
  value: T;
  onChange: (v: T) => void;
  options: SegmentOption<T>[];
  size?: 'sm' | 'md';
  className?: string;
}) {
  return (
    <div
      role="tablist"
      className={cx('inline-flex items-center gap-0.5 rounded-xl bg-ink-100/80 p-1 overflow-x-auto no-scrollbar', className)}
    >
      {options.map(o => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.value)}
            className={cx(
              'inline-flex items-center justify-center gap-1.5 rounded-lg font-semibold whitespace-nowrap transition-all cursor-pointer',
              size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3.5 py-1.5 text-[13px]',
              active ? 'bg-white text-ink-900 shadow-soft' : 'text-ink-500 hover:text-ink-900'
            )}
          >
            {o.icon}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export const Button: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' | 'dark'; size?: 'sm' | 'md' }
> = ({ variant = 'secondary', size = 'md', className, children, ...rest }) => (
  <button
    type="button"
    {...rest}
    className={cx(
      'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]',
      size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-4 py-2.5 text-sm',
      variant === 'primary' && 'bg-brand-600 text-white hover:bg-brand-700 shadow-[0_6px_16px_-6px_rgb(11_138_114/0.6)]',
      variant === 'secondary' && 'bg-white text-ink-800 ring-1 ring-ink-200 hover:bg-ink-50 hover:ring-ink-300',
      variant === 'ghost' && 'text-ink-600 hover:bg-ink-100 hover:text-ink-900',
      variant === 'dark' && 'bg-white/10 text-white ring-1 ring-white/15 hover:bg-white/20 backdrop-blur',
      className
    )}
  >
    {children}
  </button>
);

export const EmptyState: React.FC<{
  icon: React.ReactNode;
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}> = ({ icon, title, description, action, className }) => (
  <div className={cx('surface px-6 py-12 sm:py-16 text-center animate-rise', className)}>
    <div className="mx-auto mb-4 grid place-items-center w-14 h-14 rounded-2xl bg-brand-50 text-brand-600 ring-1 ring-brand-100">
      {icon}
    </div>
    <h3 className="text-base sm:text-lg font-bold text-ink-900">{title}</h3>
    {description && <p className="mt-1.5 text-sm text-ink-500 max-w-md mx-auto leading-relaxed">{description}</p>}
    {action && <div className="mt-5 flex flex-wrap items-center justify-center gap-2">{action}</div>}
  </div>
);

export const Notice: React.FC<{
  tone: 'rose' | 'amber' | 'violet' | 'brand';
  icon: React.ReactNode;
  children: React.ReactNode;
  action?: React.ReactNode;
}> = ({ tone, icon, children, action }) => {
  const t = {
    rose: 'bg-rose-50 ring-rose-200 text-rose-900 [&_svg]:text-rose-600',
    amber: 'bg-amber-50 ring-amber-200 text-amber-900 [&_svg]:text-amber-600',
    violet: 'bg-violet-50 ring-violet-200 text-violet-900 [&_svg]:text-violet-600',
    brand: 'bg-brand-50 ring-brand-200 text-brand-900 [&_svg]:text-brand-600'
  }[tone];
  return (
    <div className={cx('rounded-xl ring-1 ring-inset px-3.5 py-2.5 text-[13px] leading-relaxed', t)}>
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5 shrink-0">{icon}</span>
        <div className="flex-1 min-w-0">{children}</div>
        {action}
      </div>
    </div>
  );
};

export const StatTile: React.FC<{ label: string; value: React.ReactNode; hint?: string; dark?: boolean }> = ({
  label,
  value,
  hint,
  dark
}) => (
  <div
    className={cx(
      'rounded-2xl px-3.5 py-2.5 sm:px-4 sm:py-3',
      dark ? 'bg-white/[0.06] ring-1 ring-white/10 backdrop-blur' : 'bg-ink-50 ring-1 ring-ink-100'
    )}
  >
    <div className={cx('text-[11px] font-semibold uppercase tracking-wider', dark ? 'text-ink-300' : 'text-ink-500')}>
      {label}
    </div>
    <div className={cx('mt-0.5 text-xl sm:text-2xl font-extrabold tnum tracking-tight', dark ? 'text-white' : 'text-ink-900')}>
      {value}
    </div>
    {hint && <div className={cx('text-[11px] mt-0.5', dark ? 'text-ink-400' : 'text-ink-400')}>{hint}</div>}
  </div>
);
