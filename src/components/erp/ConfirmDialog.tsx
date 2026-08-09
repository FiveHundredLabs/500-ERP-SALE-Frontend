import React, { useEffect } from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'warning' | 'danger' | 'info';
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title = 'Confirm Action',
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'warning',
  onConfirm,
  onCancel,
}) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  const typeStyles = {
    warning: { icon: <AlertTriangle size={22} className="text-[#FBBF24]" />, iconBg: 'bg-[#F59E0B]/15 border-[#F59E0B]/30', btnCls: 'erp-btn erp-btn-primary' },
    danger:  { icon: <Trash2       size={22} className="text-[#F87171]" />, iconBg: 'bg-[#EF4444]/15 border-[#EF4444]/30', btnCls: 'erp-btn erp-btn-danger' },
    info:    { icon: <AlertTriangle size={22} className="text-[#38BDF8]" />, iconBg: 'bg-[#38BDF8]/15 border-[#38BDF8]/30', btnCls: 'erp-btn erp-btn-primary' },
  };

  const { icon, iconBg, btnCls } = typeStyles[type];

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onCancel}
      />

      {/* Dialog Card */}
      <div className="relative bg-[#1E293B] border border-[#334155] rounded-[10px] shadow-xl w-full max-w-sm p-5 animate-slideIn z-10">
        {/* Close button */}
        <button
          onClick={onCancel}
          className="absolute top-3.5 right-3.5 text-[#94A3B8] hover:text-[#F8FAFC] transition-colors"
        >
          <X size={18} />
        </button>

        {/* Content */}
        <div className="flex flex-col items-center text-center gap-3 pt-1">
          <div className={`p-3 rounded-full border ${iconBg}`}>
            {icon}
          </div>
          <div>
            <h3 className="text-base font-semibold text-[#F8FAFC]">{title}</h3>
            <p className="text-sm text-[#CBD5E1] mt-1 leading-relaxed">{message}</p>
          </div>
          <div className="flex gap-2 w-full mt-3">
            <button onClick={onCancel} className="erp-btn erp-btn-secondary flex-1 justify-center">
              {cancelText}
            </button>
            <button onClick={onConfirm} className={`${btnCls} flex-1 justify-center`}>
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
