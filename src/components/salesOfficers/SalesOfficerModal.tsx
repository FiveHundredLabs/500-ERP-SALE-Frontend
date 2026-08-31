import React, { useState, useEffect } from "react";
import { 
  X, 
  UserCheck, 
  Phone, 
  Calendar, 
  Lock, 
  User, 
  Users, 
  Search, 
  Check, 
  Building2, 
  MapPin, 
  CheckSquare, 
  Square 
} from "lucide-react";
import type { SalesOfficer } from "../../types/salesOfficer";
import type { Customer } from "../../types/customers";
import { invoiceService } from "../../services/InvoiceService";

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
  const [availableCustomers, setAvailableCustomers] = useState<Customer[]>([]);

  useEffect(() => {
    if (isOpen) {
      invoiceService.getAllCustomers().then(c => setAvailableCustomers(c as any || [])).catch(() => setAvailableCustomers([]));
    }
  }, [isOpen]);

  const [formData, setFormData] = useState({
    fullName: "",
    contactNumber: "+94",
    joiningDate: new Date().toISOString().split("T")[0],
    username: "",
    password: "",
    status: "Active" as "Active" | "Inactive",
    assignedCustomerIds: [] as string[],
    assignedCustomers: [] as string[],
  });

  const [customerSearch, setCustomerSearch] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (initialData && mode === "edit") {
      // If editing, extract assigned customer IDs
      let assignedIds = initialData.assignedCustomerIds || [];
      if (assignedIds.length === 0) {
        assignedIds = availableCustomers
          .filter(c => c.salesRep === initialData.fullName || c.salesRepName === initialData.fullName || c.salesRep === initialData.id)
          .map(c => c.id);
      }

      const assignedNames = availableCustomers
        .filter(c => assignedIds.includes(c.id))
        .map(c => c.shopName || c.businessName || '');

      setFormData({
        fullName: initialData.fullName || "",
        contactNumber: initialData.contactNumber || "+94",
        joiningDate: initialData.joiningDate || new Date().toISOString().split("T")[0],
        username: initialData.username || "",
        password: initialData.password || "",
        status: initialData.status || "Active",
        assignedCustomerIds: assignedIds.filter(Boolean),
        assignedCustomers: assignedNames.filter(Boolean),
      });
    } else {
      setFormData({
        fullName: "",
        contactNumber: "+94",
        joiningDate: new Date().toISOString().split("T")[0],
        username: "",
        password: "",
        status: "Active",
        assignedCustomerIds: [],
        assignedCustomers: [],
      });
    }
    setCustomerSearch("");
    setErrors({});
  }, [initialData, mode, isOpen, availableCustomers]);

  if (!isOpen) return null;

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.fullName.trim()) newErrors.fullName = "Full Name is required";
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

  const handleToggleCustomer = (customer: Customer) => {
    const custId = customer.id;
    const custName = customer.shopName || customer.businessName || '';
    if (!custId) return;

    setFormData(prev => {
      const exists = prev.assignedCustomerIds.includes(custId);
      if (exists) {
        return {
          ...prev,
          assignedCustomerIds: prev.assignedCustomerIds.filter(id => id !== custId),
          assignedCustomers: prev.assignedCustomers.filter(name => name !== custName),
        };
      } else {
        return {
          ...prev,
          assignedCustomerIds: [...prev.assignedCustomerIds, custId],
          assignedCustomers: [...prev.assignedCustomers, custName],
        };
      }
    });
  };

  const handleSelectAllFiltered = () => {
    const filteredIds = filteredCustomers.map(c => c.id).filter(Boolean);
    const filteredNames = filteredCustomers.map(c => c.shopName || c.businessName || '').filter(Boolean);

    setFormData(prev => {
      const newIds = Array.from(new Set([...prev.assignedCustomerIds, ...filteredIds]));
      const newNames = Array.from(new Set([...prev.assignedCustomers, ...filteredNames]));
      return {
        ...prev,
        assignedCustomerIds: newIds,
        assignedCustomers: newNames,
      };
    });
  };

  const handleDeselectAll = () => {
    setFormData(prev => ({
      ...prev,
      assignedCustomerIds: [],
      assignedCustomers: [],
    }));
  };

  const filteredCustomers = availableCustomers.filter(c => {
    const q = customerSearch.toLowerCase().trim();
    if (!q) return true;
    const name = (c.shopName || c.businessName || '').toLowerCase();
    const contact = (c.contactPerson || '').toLowerCase();
    const city = (c.city || (typeof c.address === 'string' ? c.address : '')).toLowerCase();
    const phone = (c.phone || '').toLowerCase();
    return name.includes(q) || contact.includes(q) || city.includes(q) || phone.includes(q);
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-[#0f172a] border border-[#334155] rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200 my-8">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#334155] bg-[#1e293b]/70">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-400">
              <UserCheck size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">
                {mode === "create" ? "Add New Sales Representative" : "Edit Sales Representative"}
              </h2>
              <p className="text-xs text-gray-400">
                {mode === "create" 
                  ? "Register a new sales rep and assign customer accounts" 
                  : `Update record and customer portfolio for ${formData.fullName || "Sales Officer"}`}
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
        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* Row 1: Full Name & Contact Number */}
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
                    const name = e.target.value;
                    setFormData(prev => ({
                      ...prev,
                      fullName: name,
                      username: prev.username || name.toLowerCase().replace(/\s+/g, '.')
                    }));
                  }}
                  className="w-full bg-[#1e293b] border border-[#334155] rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                />
              </div>
              {errors.fullName && <p className="text-red-400 text-xs mt-1">{errors.fullName}</p>}
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

          {/* Row 2: Joining Date & Account Status */}
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
          </div>

          {/* Row 3: Username & Password */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                System Username <span className="text-red-400">*</span>
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
                System Password {mode === "create" && <span className="text-red-400">*</span>}
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

          {/* Section: Assign Customers */}
          <div className="bg-[#1e293b]/70 border border-[#334155] rounded-xl p-4 space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-purple-500/20 text-purple-400">
                  <Users size={16} />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                    Assign Customers
                  </h3>
                  <p className="text-[11px] text-gray-400">
                    Select customer shops and accounts to allocate to this Sales Representative
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full text-xs font-bold font-mono bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  {formData.assignedCustomerIds.length} Assigned
                </span>
              </div>
            </div>

            {/* Quick Filter Search & Selection Actions */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by shop name, contact person, or city..."
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  className="w-full bg-[#0f172a] border border-[#334155] rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                />
                {customerSearch && (
                  <button
                    type="button"
                    onClick={() => setCustomerSearch("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white text-xs"
                  >
                    ×
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={handleSelectAllFiltered}
                className="px-2.5 py-1.5 bg-[#0f172a] hover:bg-[#334155] border border-[#334155] rounded-lg text-[11px] font-semibold text-purple-300 transition whitespace-nowrap"
              >
                Select All
              </button>

              {formData.assignedCustomerIds.length > 0 && (
                <button
                  type="button"
                  onClick={handleDeselectAll}
                  className="px-2.5 py-1.5 bg-[#0f172a] hover:bg-[#334155] border border-[#334155] rounded-lg text-[11px] font-semibold text-gray-400 hover:text-red-400 transition whitespace-nowrap"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Assigned Tags Preview */}
            {formData.assignedCustomerIds.length > 0 && (
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1.5 bg-[#0f172a]/60 rounded-lg border border-[#334155]/60">
                {formData.assignedCustomerIds.map(id => {
                  const cust = availableCustomers.find(c => c.id === id);
                  const name = cust ? (cust.shopName || cust.businessName || id) : id;
                  return (
                    <span 
                      key={id}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] bg-purple-500/15 border border-purple-500/30 text-purple-200 font-medium"
                    >
                      <Building2 size={10} className="text-purple-400" />
                      <span className="truncate max-w-[130px]">{name}</span>
                      <button
                        type="button"
                        onClick={() => cust && handleToggleCustomer(cust)}
                        className="hover:text-red-400 text-purple-400 ml-0.5"
                      >
                        ×
                      </button>
                    </span>
                  );
                })}
              </div>
            )}

            {/* Customer Checkbox Selection List */}
            <div className="max-h-52 overflow-y-auto divide-y divide-[#334155]/50 border border-[#334155] rounded-xl bg-[#0f172a]">
              {filteredCustomers.length === 0 ? (
                <div className="p-4 text-center text-xs text-gray-500 italic">
                  No matching customers found
                </div>
              ) : (
                filteredCustomers.map(cust => {
                  const custId = cust.id;
                  const isChecked = formData.assignedCustomerIds.includes(custId);
                  const shopName = cust.shopName || cust.businessName || 'Customer';
                  const city = cust.city || (typeof cust.address === 'string' ? cust.address.split(',').pop()?.trim() : '');

                  return (
                    <div
                      key={custId}
                      onClick={() => handleToggleCustomer(cust)}
                      className={`px-3 py-2 flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                        isChecked 
                          ? "bg-purple-950/20 hover:bg-purple-950/30" 
                          : "hover:bg-[#1e293b]/70"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="text-purple-400">
                          {isChecked ? (
                            <CheckSquare size={16} className="text-purple-400 fill-purple-400/20" />
                          ) : (
                            <Square size={16} className="text-gray-500" />
                          )}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`text-xs font-semibold truncate ${isChecked ? "text-purple-200 font-bold" : "text-gray-200"}`}>
                              {shopName}
                            </span>
                            {cust.customerId && (
                              <span className="text-[10px] font-mono text-cyan-400 bg-cyan-400/10 px-1 rounded">
                                {cust.customerId}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-[11px] text-gray-400 mt-0.5">
                            {cust.contactPerson && (
                              <span>Contact: <span className="text-gray-300">{cust.contactPerson}</span></span>
                            )}
                            {city && (
                              <span className="flex items-center gap-0.5 text-gray-400">
                                <MapPin size={10} className="text-slate-500" />
                                {city}
                              </span>
                            )}
                            {cust.phone && (
                              <span className="font-mono text-[10px] text-gray-400">{cust.phone}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {cust.creditLimit !== undefined && cust.creditLimit > 0 && (
                        <span className="text-[10px] font-mono text-emerald-400 font-semibold shrink-0 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                          Limit: LKR {Math.round(cust.creditLimit).toLocaleString()}
                        </span>
                      )}
                    </div>
                  );
                })
              )}
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
              className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-md shadow-blue-600/20 transition flex items-center gap-2"
            >
              <Check size={16} />
              {mode === "create" ? "Add Sales Representative" : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SalesOfficerModal;
