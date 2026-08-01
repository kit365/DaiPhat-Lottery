import React from 'react';

export type StatusVariant = 'success' | 'warning' | 'error' | 'info' | 'neutral';

interface StatusBadgeProps {
  label: string;
  variant?: StatusVariant;
  size?: 'sm' | 'md';
  icon?: React.ReactNode;
}

const variantStyles: Record<StatusVariant, string> = {
  success: 'bg-emerald-50 text-emerald-600 border-emerald-200',
  warning: 'bg-amber-50 text-amber-600 border-amber-200',
  error: 'bg-rose-50 text-rose-600 border-rose-200',
  info: 'bg-sky-50 text-sky-600 border-sky-200',
  neutral: 'bg-slate-50 text-slate-600 border-slate-200',
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  label,
  variant = 'neutral',
  size = 'md',
  icon,
}) => {
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-3 py-1 text-[12px]';

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-bold rounded-lg border ${variantStyles[variant]} ${sizeClasses}`}
    >
      {icon}
      {label}
    </span>
  );
};
