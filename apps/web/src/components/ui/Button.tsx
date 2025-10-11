import React from 'react';
import { cn } from '../../utils/cn';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'action';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  children: React.ReactNode;
}

const buttonVariants = {
  primary: 'bg-gradient-to-r from-sky-500/80 to-cyan-500/80 border border-sky-400/50 text-white hover:from-sky-500 hover:to-cyan-500 hover:border-sky-400/70',
  secondary: 'bg-gradient-to-r from-slate-700/60 to-slate-800/60 border border-slate-600/50 text-slate-200 hover:from-slate-600/70 hover:to-slate-700/70 hover:border-slate-500/70',
  danger: 'bg-gradient-to-r from-red-600/80 to-red-700/80 border border-red-500/50 text-white hover:from-red-600 hover:to-red-700 hover:border-red-400/70',
  ghost: 'bg-gradient-to-r from-slate-700/30 to-slate-800/30 border border-slate-600/30 text-slate-300 hover:from-slate-600/40 hover:to-slate-700/40 hover:border-slate-500/40',
  action: 'bg-gradient-to-r from-indigo-500/20 to-purple-500/20 border border-indigo-400/30 text-slate-100 hover:from-indigo-500/30 hover:to-purple-500/30 hover:border-indigo-400/50',
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
        className
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
