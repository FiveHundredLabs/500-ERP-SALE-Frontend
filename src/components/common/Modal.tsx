import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  closeButton?: boolean;
  backdrop?: boolean;
  className?: string;
}

const sizeMap = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-2xl',
};

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  icon,
  children,
  size = 'md',
  closeButton = true,
  backdrop = true,
  className = ''
}) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
      };
      document.addEventListener('keydown', handleEscape);
      return () => {
        document.body.style.overflow = 'unset';
        document.removeEventListener('keydown', handleEscape);
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div
      className={`fixed inset-0 flex items-center justify-center z-[9999] p-4 transition-opacity duration-200 ${
        backdrop ? 'bg-black/75 backdrop-blur-sm' : ''
      }`}
      onClick={(e) => {
        if (backdrop && e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        className={`bg-[#1e293b] border border-[#334155] rounded-xl w-full ${sizeMap[size]} overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 ${className}`}
      >
        {title && (
          <div className="px-4 sm:px-6 py-4 sm:py-5 flex items-center justify-between gap-3 border-b border-[#334155]">
            <h2 id="modal-title" className="text-lg font-semibold text-gray-200 flex items-center gap-2">
              {icon && <span className="flex-shrink-0">{icon}</span>}
              <span>{title}</span>
            </h2>
            {closeButton && (
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-200 transition-colors p-1 hover:bg-[#334155]/30 rounded"
                aria-label="Close modal"
                type="button"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        )}

        <div className="p-4 sm:p-6 overflow-y-auto max-h-[calc(100vh-200px)]">
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default Modal;
