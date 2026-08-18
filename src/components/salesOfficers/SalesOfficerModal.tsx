import React, { useState, useEffect } from "react";
import { X, UserCheck, Shield, Phone, Calendar, Mail, MapPin, Percent, Lock, User } from "lucide-react";
import type { SalesOfficer } from "../../types/salesOfficer";

interface SalesOfficerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Omit<SalesOfficer, "id" | "createdAt" | "updatedAt">) => void;
  initialData?: SalesOfficer | null;
  mode: "create" | "edit";
}

export const SalesOfficerModal: React.FC<SalesOfficerModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  mode,
}) => {
  const [formData, setFormData] = useState({
    fullName: "",
    officerId: "",
    contactNumber: "+94",
    joiningDate: new Date().toISOString().split("T")[0],
    username: "",
    password: "",
    email: "",
    status: "Active" as "Active" | "Inactive",
    designation: "Sales Officer",
    assignedTerritory: "",
    commissionRate: 3.0,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (initialData && mode === "edit") {
      setFormData({
        fullName: initialData.fullName || "",
        officerId: initialData.officerId || "",
        contactNumber: initialData.contactNumber || "+94",
        joiningDate: initialData.joiningDate || new Date().toISOString().split("T")[0],
        username: initialData.username || "",
        password: initialData.password || "",
        email: initialData.email || "",
        status: initialData.status || "Active",
        designation: initialData.designation || "Sales Officer",
        assignedTerritory: initialData.assignedTerritory || "",
        commissionRate: initialData.commissionRate || 3.0,
      });
    } else {
      // Auto-generate next Officer ID (e.g. SO-011)
      setFormData({
        fullName: "",
        officerId: `SO-${Math.floor(100 + Math.random() * 900)}`,
        contactNumber: "+94",
        joiningDate: new Date().toISOString().split("T")[0],
        username: "",
        password: "",
        email: "",
        status: "Active",
        designation: "Sales Officer",
        assignedTerritory: "",
        commissionRate: 3.0,
      });
    }
    setErrors({});
  }, [initialData, mode, isOpen]);

  if (!isOpen) return null;

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.fullName.trim()) newErrors.fullName = "Full Name is required";
    if (!formData.officerId.trim()) newErrors.officerId = "Officer ID is required";
    if (!formData.contactNumber.trim() || formData.contactNumber.length < 9) {
      newErrors.contactNumber = "Valid contact phone number is required";
    }
    if (!formData.username.trim()) newErrors.username = "Username is required";
    if (mode === "create" && !formData.password.trim()) {
      newErrors.password = "Password is required";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-[#0f172a] border border-[#334155] rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#334155] bg-[#1e293b]/70">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-400">
              <UserCheck size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">
                {mode === "create" ? "Add New Sales Officer" : "Edit Sales Officer"}
              </h2>
              <p className="text-xs text-gray-400">
                {mode === "create" ? "Register a new field or retail sales representative" : `Update record for ${formData.fullName || formData.officerId}`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-[#334155]/60 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Row 1: Full Name & Employee ID */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                Full Name <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="e.g. Kasun Perera"
                  value={formData.fullName}
                  onChange={(e) => {
                    setFormData(prev => ({
                      ...prev,
                      fullName: e.target.value,
                      username: prev.username || e.target.value.toLowerCase().replace(/\s+/g, '.'),
                      email: prev.email || `${e.target.value.toLowerCase().replace(/\s+/g, '.')}@500core.lk`
                    }));
                  }}
                  className="w-full bg-[#1e293b] border border-[#334155] rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                />
              </div>
              {errors.fullName && <p className="text-red-400 text-xs mt-1">{errors.fullName}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                Officer / Employee ID <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <Shield size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-blue-400" />
                <input
                  type="text"
                  placeholder="e.g. SO-001"
                  value={formData.officerId}
                  onChange={(e) => setFormData(prev => ({ ...prev, officerId: e.target.value }))}
                  className="w-full bg-[#1e293b] border border-[#334155] rounded-xl pl-10 pr-3.5 py-2.5 text-sm font-mono text-blue-300 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                />
              </div>
              {errors.officerId && <p className="text-red-400 text-xs mt-1">{errors.officerId}</p>}
            </div>
          </div>

          {/* Row 2: Joining Date & Contact Number */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                Joining Date <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <Calendar size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="date"
                  value={formData.joiningDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, joiningDate: e.target.value }))}
                  className="w-full bg-[#1e293b] border border-[#334155] rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                Contact Number (WhatsApp) <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <Phone size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-400" />
                <input
                  type="text"
                  placeholder="+94771234567"
                  value={formData.contactNumber}
                  onChange={(e) => setFormData(prev => ({ ...prev, contactNumber: e.target.value }))}
                  className="w-full bg-[#1e293b] border border-[#334155] rounded-xl pl-10 pr-3.5 py-2.5 text-sm font-mono text-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                />
              </div>
              {errors.contactNumber && <p className="text-red-400 text-xs mt-1">{errors.contactNumber}</p>}
            </div>
          </div>

          {/* Row 3: Username & Password */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                Username <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="kasun.perera"
                  value={formData.username}
                  onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                  className="w-full bg-[#1e293b] border border-[#334155] rounded-xl pl-10 pr-3.5 py-2.5 text-sm font-mono text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                />
              </div>
              {errors.username && <p className="text-red-400 text-xs mt-1">{errors.username}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                Password {mode === "create" && <span className="text-red-400">*</span>}
              </label>
              <div className="relative">
                <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="password"
                  placeholder={mode === "edit" ? "•••••••• (Leave blank to keep unchanged)" : "Password@123"}
                  value={formData.password}
                  onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  className="w-full bg-[#1e293b] border border-[#334155] rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                />
              </div>
              {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password}</p>}
            </div>
          </div>

          {/* Row 4: Email & Assigned Territory */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  placeholder="kasun.p@500core.lk"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full bg-[#1e293b] border border-[#334155] rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                Assigned Territory / Region
              </label>
              <div className="relative">
                <MapPin size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-blue-400" />
                <input
                  type="text"
                  placeholder="e.g. Colombo & Western Province"
                  value={formData.assignedTerritory}
                  onChange={(e) => setFormData(prev => ({ ...prev, assignedTerritory: e.target.value }))}
                  className="w-full bg-[#1e293b] border border-[#334155] rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                />
              </div>
            </div>
          </div>

          {/* Row 5: Status & Commission Rate */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                Account Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as any }))}
                className="w-full bg-[#1e293b] border border-[#334155] rounded-xl px-3.5 py-2.5 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                Commission Rate (%)
              </label>
              <div className="relative">
                <Percent size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-amber-400" />
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={formData.commissionRate}
                  onChange={(e) => setFormData(prev => ({ ...prev, commissionRate: parseFloat(e.target.value) || 0 }))}
                  className="w-full bg-[#1e293b] border border-[#334155] rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-amber-300 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                />
              </div>
            </div>
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#334155]">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-[#334155] text-gray-300 hover:bg-[#1e293b] text-sm font-medium transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-md shadow-blue-600/20 transition"
            >
              {mode === "create" ? "Add Sales Officer" : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SalesOfficerModal;
