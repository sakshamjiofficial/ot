import React from 'react';
import { cn } from '@/utils/cn';

// ─── Button ────────────────────────────────────────────────────

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
  size?:    'xs' | 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?:    React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, icon, children, className, disabled, ...props }, ref) => {
    const base = 'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-surface-900 disabled:opacity-50 disabled:pointer-events-none';

    const variants = {
      primary:   'bg-brand-500 hover:bg-brand-600 text-white focus:ring-brand-500',
      secondary: 'bg-surface-600 hover:bg-surface-500 text-white focus:ring-surface-400',
      ghost:     'hover:bg-surface-700 text-surface-100 focus:ring-surface-500',
      danger:    'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500',
      outline:   'border border-surface-500 hover:border-surface-400 hover:bg-surface-800 text-surface-100 focus:ring-surface-500',
    };

    const sizes = {
      xs: 'text-xs px-2.5 py-1.5 h-7',
      sm: 'text-sm px-3 py-2 h-8',
      md: 'text-sm px-4 py-2.5 h-9',
      lg: 'text-base px-5 py-3 h-11',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(base, variants[variant], sizes[size], className)}
        {...props}
      >
        {loading ? <Spinner size="sm" /> : icon}
        {children}
      </button>
    );
  },
);
Button.displayName = 'Button';

// ─── Badge ─────────────────────────────────────────────────────

interface BadgeProps {
  children:  React.ReactNode;
  className?: string;
  variant?:  'default' | 'success' | 'warning' | 'danger' | 'info';
}

export function Badge({ children, className, variant = 'default' }: BadgeProps) {
  const variants = {
    default: 'bg-surface-600 text-surface-100',
    success: 'bg-green-500/20 text-green-400 border border-green-500/30',
    warning: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
    danger:  'bg-red-500/20 text-red-400 border border-red-500/30',
    info:    'bg-blue-500/20 text-blue-400 border border-blue-500/30',
  };
  return (
    <span className={cn(
      'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
      variants[variant], className,
    )}>
      {children}
    </span>
  );
}

// ─── Status Badge ──────────────────────────────────────────────

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; variant: BadgeProps['variant'] }> = {
    published:  { label: 'Published',  variant: 'success' },
    processing: { label: 'Processing', variant: 'warning' },
    draft:      { label: 'Draft',      variant: 'default' },
    scheduled:  { label: 'Scheduled',  variant: 'info'    },
    archived:   { label: 'Archived',   variant: 'default' },
    pending:    { label: 'Pending',    variant: 'warning' },
    completed:  { label: 'Completed',  variant: 'success' },
    failed:     { label: 'Failed',     variant: 'danger'  },
    retrying:   { label: 'Retrying',   variant: 'warning' },
    active:     { label: 'Active',     variant: 'info'    },
    queued:     { label: 'Queued',     variant: 'warning' },
    transcoding:{ label: 'Transcoding',variant: 'info'    },
    done:       { label: 'Done',       variant: 'success' },
    error:      { label: 'Error',      variant: 'danger'  },
  };
  const { label, variant } = map[status] ?? { label: status, variant: 'default' };
  return <Badge variant={variant}>{label}</Badge>;
}

// ─── Input ─────────────────────────────────────────────────────

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?:   string;
  error?:   string;
  hint?:    string;
  leftIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, leftIcon, className, ...props }, ref) => (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-sm font-medium text-surface-100">
          {label}
          {props.required && <span className="text-brand-500 ml-1">*</span>}
        </label>
      )}
      <div className="relative">
        {leftIcon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-300">
            {leftIcon}
          </div>
        )}
        <input
          ref={ref}
          className={cn(
            'w-full rounded-lg border bg-surface-700 px-3 py-2.5 text-sm text-white',
            'placeholder:text-surface-300 transition-colors',
            'focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent',
            error
              ? 'border-red-500 focus:ring-red-500'
              : 'border-surface-500 hover:border-surface-400',
            leftIcon && 'pl-10',
            className,
          )}
          {...props}
        />
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
      {hint && !error && <p className="text-xs text-surface-300">{hint}</p>}
    </div>
  ),
);
Input.displayName = 'Input';

// ─── Textarea ──────────────────────────────────────────────────

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?:  string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, hint, className, ...props }, ref) => (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-sm font-medium text-surface-100">
          {label}
          {props.required && <span className="text-brand-500 ml-1">*</span>}
        </label>
      )}
      <textarea
        ref={ref}
        className={cn(
          'w-full rounded-lg border bg-surface-700 px-3 py-2.5 text-sm text-white',
          'placeholder:text-surface-300 transition-colors resize-none',
          'focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent',
          error ? 'border-red-500' : 'border-surface-500 hover:border-surface-400',
          className,
        )}
        rows={4}
        {...props}
      />
      {error && <p className="text-xs text-red-400">{error}</p>}
      {hint && !error && <p className="text-xs text-surface-300">{hint}</p>}
    </div>
  ),
);
Textarea.displayName = 'Textarea';

// ─── Select ────────────────────────────────────────────────────

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?:   string;
  error?:   string;
  options:  { value: string | number; label: string }[];
  placeholder?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, placeholder, className, ...props }, ref) => (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-sm font-medium text-surface-100">
          {label}
          {props.required && <span className="text-brand-500 ml-1">*</span>}
        </label>
      )}
      <select
        ref={ref}
        className={cn(
          'w-full rounded-lg border bg-surface-700 px-3 py-2.5 text-sm text-white',
          'focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent',
          error ? 'border-red-500' : 'border-surface-500 hover:border-surface-400',
          className,
        )}
        {...props}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  ),
);
Select.displayName = 'Select';

// ─── Card ──────────────────────────────────────────────────────

export function Card({
  children, className, padding = true,
}: {
  children: React.ReactNode;
  className?: string;
  padding?: boolean;
}) {
  return (
    <div className={cn(
      'rounded-xl border border-surface-700 bg-surface-800',
      padding && 'p-6',
      className,
    )}>
      {children}
    </div>
  );
}

// ─── Stat Card ─────────────────────────────────────────────────

export function StatCard({
  label, value, icon, trend, color = 'default',
}: {
  label:  string;
  value:  string | number;
  icon:   React.ReactNode;
  trend?: { value: number; label: string };
  color?: 'default' | 'red' | 'green' | 'blue' | 'yellow';
}) {
  const iconColors = {
    default: 'bg-surface-600 text-surface-100',
    red:     'bg-brand-500/20 text-brand-400',
    green:   'bg-green-500/20 text-green-400',
    blue:    'bg-blue-500/20 text-blue-400',
    yellow:  'bg-yellow-500/20 text-yellow-400',
  };

  return (
    <Card>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-surface-200">{label}</p>
          <p className="mt-1 text-3xl font-bold text-white">{value}</p>
          {trend && (
            <p className={cn('mt-1 text-xs', trend.value >= 0 ? 'text-green-400' : 'text-red-400')}>
              {trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value)}% {trend.label}
            </p>
          )}
        </div>
        <div className={cn('rounded-lg p-3', iconColors[color])}>
          {icon}
        </div>
      </div>
    </Card>
  );
}

// ─── Spinner ───────────────────────────────────────────────────

export function Spinner({ size = 'md', className }: { size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const sizes = { sm: 'h-4 w-4', md: 'h-6 w-6', lg: 'h-10 w-10' };
  return (
    <svg
      className={cn('animate-spin text-current', sizes[size], className)}
      fill="none" viewBox="0 0 24 24"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  );
}

// ─── Progress Bar ──────────────────────────────────────────────

export function ProgressBar({
  value, className, color = 'brand',
}: {
  value: number;
  className?: string;
  color?: 'brand' | 'green' | 'yellow' | 'blue';
}) {
  const colors = {
    brand:  'bg-brand-500',
    green:  'bg-green-500',
    yellow: 'bg-yellow-500',
    blue:   'bg-blue-500',
  };
  return (
    <div className={cn('h-2 w-full rounded-full bg-surface-600 overflow-hidden', className)}>
      <div
        className={cn('h-full rounded-full transition-all duration-300', colors[color])}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

// ─── Empty State ───────────────────────────────────────────────

export function EmptyState({
  icon, title, description, action,
}: {
  icon:         React.ReactNode;
  title:        string;
  description?: string;
  action?:      React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-4 rounded-full bg-surface-700 p-5 text-surface-300">
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-white">{title}</h3>
      {description && <p className="mt-1 text-sm text-surface-300 max-w-sm">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

// ─── Confirm Dialog ────────────────────────────────────────────

export function ConfirmDialog({
  open, title, description, confirmLabel = 'Confirm',
  onConfirm, onCancel, danger = false,
}: {
  open:          boolean;
  title:         string;
  description:   string;
  confirmLabel?: string;
  onConfirm:     () => void;
  onCancel:      () => void;
  danger?:       boolean;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative z-10 w-full max-w-md rounded-xl border border-surface-600 bg-surface-800 p-6 shadow-2xl animate-slide-up">
        <h3 className="text-lg font-semibold text-white">{title}</h3>
        <p className="mt-2 text-sm text-surface-200">{description}</p>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="ghost" onClick={onCancel}>Cancel</Button>
          <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm}>{confirmLabel}</Button>
        </div>
      </div>
    </div>
  );
}
