import React from "react";
import { AlertTriangle, X } from "lucide-react";
import { createPortal } from "react-dom";

interface CustomConfirmProps {
  isOpen: boolean;
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  type?: "warning" | "danger" | "info";
}

const CustomConfirm: React.FC<CustomConfirmProps> = ({
  isOpen,
  title = "Confirm Action",
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  onConfirm,
  onCancel,
  type = "warning",
}) => {
  if (!isOpen) return null;

  const typeStyles = {
    warning: {
      border: "border-yellow-500",
      confirmBg: "bg-yellow-600 hover:bg-yellow-700",
      confirmText: "text-white",
    },
    danger: {
      border: "border-red-500",
      confirmBg: "bg-red-600 hover:bg-red-700",
      confirmText: "text-white",
    },
    info: {
      border: "border-blue-500",
      confirmBg: "bg-blue-600 hover:bg-blue-700",
      confirmText: "text-white",
    },
  };

  const styles = typeStyles[type];

  return createPortal(
    <div className="fixed inset-0 z-[1000] flex items-center justify-center animate-fade-in">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onCancel}
      />

      {/* Dialog */}
      <div className="relative bg-[#1e293b] border border-[#334155] rounded-xl shadow-2xl max-w-md w-full mx-4 animate-scale-in">
        <div className="flex items-center gap-3 p-5 border-b border-[#334155]">
          <div className={`p-2 rounded-full ${type === "warning" ? "bg-yellow-600/20" : type === "danger" ? "bg-red-600/20" : "bg-blue-600/20"}`}>
            <AlertTriangle
              className={
                type === "warning"
                  ? "text-yellow-400"
                  : type === "danger"
                  ? "text-red-400"
                  : "text-blue-400"
              }
              size={24}
            />
          </div>
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          <button
            onClick={onCancel}
            className="ml-auto text-gray-400 hover:text-white transition"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-5 text-gray-300">
          <p>{message}</p>
        </div>

        <div className="flex justify-end gap-3 p-5 border-t border-[#334155]">
          <button
            onClick={onCancel}
            className="px-5 py-2 rounded-lg bg-[#0f172a] border border-[#334155] text-gray-300 hover:bg-[#1e293b] transition"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`px-5 py-2 rounded-lg font-medium ${styles.confirmBg} ${styles.confirmText} transition`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default CustomConfirm;