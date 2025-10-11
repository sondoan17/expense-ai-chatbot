import { useEffect, useState } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastProps {
  toast: Toast;
  onRemove: (id: string) => void;
}

const toastConfig = {
  success: {
    icon: CheckCircle,
    bgColor: 'bg-green-900/90',
    borderColor: 'border-green-500/30',
    iconColor: 'text-green-400',
  },
  error: {
    icon: XCircle,
    bgColor: 'bg-red-900/90',
    borderColor: 'border-red-500/30',
    iconColor: 'text-red-400',
  },
  warning: {
    icon: AlertTriangle,
    bgColor: 'bg-yellow-900/90',
    borderColor: 'border-yellow-500/30',
    iconColor: 'text-yellow-400',
  },
  info: {
    icon: Info,
    bgColor: 'bg-blue-900/90',
    borderColor: 'border-blue-500/30',
    iconColor: 'text-blue-400',
  },
};

export function ToastComponent({ toast, onRemove }: ToastProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const config = toastConfig[toast.type];
  const Icon = config.icon;

  useEffect(() => {
    // Animate in
    const timer = setTimeout(() => setIsVisible(true), 10);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // Auto dismiss
    const duration = toast.duration || 5000;
    const timer = setTimeout(() => {
      handleRemove();
    }, duration);

    return () => clearTimeout(timer);
  }, [toast.duration]);

  const handleRemove = () => {
    setIsLeaving(true);
    setTimeout(() => {
      onRemove(toast.id);
    }, 300); // Match animation duration
  };

  return (
    <div
      className={`
        relative max-w-sm w-full bg-slate-800/95 backdrop-blur-sm border rounded-lg shadow-lg
        transform transition-all duration-300 ease-in-out
        ${isVisible && !isLeaving ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
        ${config.bgColor} ${config.borderColor}
      `}
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          <Icon size={20} className={`flex-shrink-0 mt-0.5 ${config.iconColor}`} />
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold text-slate-100">{toast.title}</h4>
            {toast.message && (
              <p className="text-sm text-slate-300 mt-1">{toast.message}</p>
            )}
          </div>
          <button
            onClick={handleRemove}
            className="flex-shrink-0 p-1 rounded-md hover:bg-slate-700/50 text-slate-400 hover:text-slate-200 transition"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
