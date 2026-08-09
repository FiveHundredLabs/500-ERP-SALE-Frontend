import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

// ============= Types =============

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
}

interface ToastContextType {
  showToast: (type: ToastType, title: string, message?: string) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
}

// ============= Context =============

const ToastContext = createContext<ToastContextType | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside ToastProvider');
  return ctx;
}

// ============= Icons =============

const ICON_MAP: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle size={16} className="text-emerald-400 flex-shrink-0 mt-0.5" />,
  error:   <XCircle    size={16} className="text-red-400    flex-shrink-0 mt-0.5" />,
  warning: <AlertTriangle size={16} className="text-amber-400  flex-shrink-0 mt-0.5" />,
  info:    <Info       size={16} className="text-blue-400   flex-shrink-0 mt-0.5" />,
};

// ============= Single Toast Item =============

const ToastItem: React.FC<{ toast: Toast; onClose: (id: string) => void }> = ({ toast, onClose }) => {
  return (
    <div className={`erp-toast erp-toast-${toast.type}`}>
      {ICON_MAP[toast.type]}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-slate-200 text-sm leading-tight">{toast.title}</p>
        {toast.message && <p className="text-slate-400 text-xs mt-0.5 leading-snug">{toast.message}</p>}
      </div>
      <button
        onClick={() => onClose(toast.id)}
        className="text-slate-500 hover:text-slate-300 transition-colors flex-shrink-0"
      >
        <X size={14} />
      </button>
    </div>
  );
};

// ============= Provider =============

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const showToast = useCallback((type: ToastType, title: string, message?: string) => {
    const id = Math.random().toString(36).substr(2, 9);
    const toast: Toast = { id, type, title, message };
    setToasts(prev => [...prev, toast]);
    setTimeout(() => removeToast(id), 4500);
  }, [removeToast]);

  const value: ToastContextType = {
    showToast,
    success: (t, m) => showToast('success', t, m),
    error:   (t, m) => showToast('error',   t, m),
    warning: (t, m) => showToast('warning', t, m),
    info:    (t, m) => showToast('info',    t, m),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* Toast container */}
      <div className="erp-toast-container">
        {toasts.map(toast => (
          <ToastItem key={toast.id} toast={toast} onClose={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export default ToastProvider;
