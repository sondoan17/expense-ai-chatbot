import React from 'react';
import { cn } from '../../utils/cn';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'action';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  children: React.ReactNode;
}

const buttonVariants = {
  primary:
    'bg-gradient-to-r from-sky-400 to-blue-600 border border-sky-400/50 text-white hover:shadow-lg hover:shadow-sky-500/25',
  secondary:
    'bg-[var(--bg-surface)]/60 border border-white/10 text-[var(--text-primary)] hover:bg-[var(--bg-surface)]/80 hover:border-white/20',
  danger:
    'bg-gradient-to-r from-red-500 to-red-600 border border-red-400/50 text-white hover:shadow-lg hover:shadow-red-500/25',
  ghost:
    'bg-transparent border border-white/10 text-[var(--text-muted)] hover:bg-[var(--bg-surface)]/40 hover:border-white/20 hover:text-[var(--text-primary)]',
  action:
    'bg-[var(--bg-surface)]/50 border border-white/10 text-[var(--text-primary)] hover:bg-[var(--bg-surface)]/80 hover:border-sky-500/30',
};

const buttonSizes = {
  sm: 'px-3 py-2 text-sm',
  md: 'px-4 py-3 text-base',
  lg: 'px-6 py-4 text-lg',
};

export function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled,
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        // Base styles
        'inline-flex items-center justify-center gap-2 font-semibold rounded-xl transition-all duration-200 shadow-lg backdrop-blur-sm disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900',
        // Variant styles
        buttonVariants[variant],
        // Size styles
        buttonSizes[size],
        // Focus ring colors based on variant
        {
          'focus:ring-sky-500/50': variant === 'primary',
          'focus:ring-slate-500/50': variant === 'secondary' || variant === 'ghost',
          'focus:ring-red-500/50': variant === 'danger',
          'focus:ring-indigo-500/50': variant === 'action',
        },
        className,
      )}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && (
        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      )}
      {children}
    </button>
  );
}

// Specialized button components for common use cases
export function PrimaryButton(props: Omit<ButtonProps, 'variant'>) {
  return <Button variant="primary" {...props} />;
}

export function SecondaryButton(props: Omit<ButtonProps, 'variant'>) {
  return <Button variant="secondary" {...props} />;
}

export function DangerButton(props: Omit<ButtonProps, 'variant'>) {
  return <Button variant="danger" {...props} />;
}

export function GhostButton(props: Omit<ButtonProps, 'variant'>) {
  return <Button variant="ghost" {...props} />;
}

export function ActionButton(props: Omit<ButtonProps, 'variant'>) {
  return <Button variant="action" {...props} />;
}
