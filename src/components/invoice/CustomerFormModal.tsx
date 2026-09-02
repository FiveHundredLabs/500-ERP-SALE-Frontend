import React, { useState } from 'react';
import { 
  X, 
  UserPlus, 
  MessageCircle, 
  Phone, 
  Building2, 
  MapPin, 
  CheckCircle2, 
  UserCheck,
  ChevronDown
} from 'lucide-react';
import type { Customer } from '../../hooks/useCustomerSearch';
import { extractCityFromAddress } from '../../types/customers';
import { salesOfficerService } from '../../services/SalesOfficerService';
import type { SalesOfficer } from '../../types/salesOfficer';

export interface CustomerFormData {
  fullName: string;
  shopName?: string;
  contactPerson?: string;
  phone: string;
  phone2?: string;
  phone3?: string;
  address: string;
  city?: string;
  creditLimit: number;
  creditPeriod?: number;
  salesRepId?: string | null;
  salesRepName?: string;
  notes?: string;
}

interface CustomerFormModalProps {
  isOpen: boolean;
  mode: 'create' | 'edit';
  initialData?: Customer;
  prefillData?: Partial<CustomerFormData>;
  onClose: () => void;
  onSubmit: (data: CustomerFormData) => Promise<void>;
}

export const CustomerFormModal: React.FC<CustomerFormModalProps> = ({
  isOpen,
  mode,
  initialData,
  prefillData,
  onClose,
  onSubmit,
}) => {
  const [salesOfficers, setSalesOfficers] = useState<SalesOfficer[]>([]);

  React.useEffect(() => {
    if (isOpen) {
      salesOfficerService.getAll().then(s => setSalesOfficers(s || [])).catch(() => {});
    }
  }, [isOpen]);

  const [formData, setFormData] = useState<CustomerFormData>(() => {
    if (initialData) {
      const initialAddress = initialData.address || '';

      return {
        fullName: (initialData as any).shopName || initialData.fullName || '',
        shopName: (initialData as any).shopName || initialData.fullName || '',
        contactPerson: (initialData as any).contactPerson || '',
        phone: initialData.phone || '',
        phone2: initialData.phone2 || '',
        phone3: initialData.phone3 || '',
        creditLimit: initialData.creditLimit ?? 1000000,
        creditPeriod: (initialData as any).creditPeriod ?? 30,
        salesRepId: initialData.salesRepId || initialData.salesRep?.id || null,
        salesRepName: initialData.salesRepName || initialData.salesRep?.fullName || '',
        address: initialAddress,
        city: initialData.city || extractCityFromAddress(initialAddress),
      };
    }
    
    const prefillAddr = typeof prefillData?.address === 'string' ? prefillData.address : '';
    return {
      fullName: prefillData?.shopName || prefillData?.fullName || '',
      shopName: prefillData?.shopName || prefillData?.fullName || '',
      contactPerson: prefillData?.contactPerson || '',
      phone: prefillData?.phone || '+94',
      phone2: prefillData?.phone2 || '',
      phone3: prefillData?.phone3 || '',
      creditLimit: prefillData?.creditLimit ?? 1000000,
      creditPeriod: prefillData?.creditPeriod ?? 30,
      salesRepId: prefillData?.salesRepId || null,
      salesRepName: prefillData?.salesRepName || '',
      address: prefillAddr,
      city: extractCityFromAddress(prefillAddr),
    };
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!formData.fullName.trim() || !formData.phone.trim() || !formData.address.trim()) {
      alert('Please fill in the required customer fields: Shop Name, Address, and WhatsApp Phone.');
      return;
    }

    const city = extractCityFromAddress(formData.address);

    setIsSubmitting(true);
    try {
      await onSubmit({
        ...formData,
        shopName: formData.fullName.trim(),
        city,
      });
      onClose();
    } catch (error) {
      alert(error instanceof Error ? error.message : `Failed to ${mode} customer`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateField = <K extends keyof CustomerFormData>(
    field: K,
    value: CustomerFormData[K]
  ) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-[#0b132b] border border-[#1e293b] rounded-2xl max-w-4xl w-full p-6 shadow-2xl space-y-4 relative text-slate-100">
        
        {/* Glow backdrop decorative accent */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-64 h-64 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-[#1e293b] relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white flex items-center justify-center shadow-lg shadow-blue-500/25">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-tight">
                  {mode === 'edit' ? 'Edit Customer Profile' : 'Add New Customer'}
                </h3>
                <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  {mode === 'edit' ? 'Update Profile' : 'New Customer'}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Set shop details, contact numbers, and assigned sales representative
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#1e293b] transition-colors"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
          {/* 2-Column Responsive Layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Column 1: Shop & Location */}
            <div className="bg-[#111c3a]/70 border border-[#1e2e54] rounded-xl p-4 space-y-3.5">
              <div className="flex items-center gap-2 pb-2 border-b border-[#1e2e54] text-xs font-bold text-blue-300 uppercase tracking-wider">
                <Building2 size={14} className="text-blue-400" />
                <span>Shop & Location Details</span>
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-semibold text-xs">
                  Shop Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={formData.fullName}
                  onChange={(e) => updateField('fullName', e.target.value)}
                  placeholder="e.g. Metro Auto Spares"
                  className="w-full bg-[#0a1024] border border-[#233560] rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-xs font-medium"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-semibold text-xs">
                  Contact Person <span className="text-slate-500 font-normal text-[11px]">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={formData.contactPerson || ''}
                  onChange={(e) => updateField('contactPerson', e.target.value)}
                  placeholder="e.g. Nirosha Bandara"
                  className="w-full bg-[#0a1024] border border-[#233560] rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-xs font-medium"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-slate-300 font-semibold text-xs">
                    Address <span className="text-rose-400">*</span>
                  </label>
                  <span className="text-[10px] text-emerald-400">
                    City extracted after comma
                  </span>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <MapPin size={14} />
                  </div>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => updateField('address', e.target.value)}
                    placeholder="e.g. 45, Main Street, Colombo"
                    className="w-full bg-[#0a1024] border border-[#233560] rounded-xl pl-9 pr-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-xs"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Column 2: Contact Numbers & Credit Terms */}
            <div className="space-y-4">
              {/* WhatsApp & Phones Box */}
              <div className="bg-[#0f2324]/60 border border-emerald-500/30 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-emerald-500/20">
                  <span className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                    <Phone size={13} className="text-emerald-400" /> Contact Numbers
                  </span>
                  <span className="text-[10px] text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-full font-mono flex items-center gap-1">
                    <MessageCircle size={10} /> 1st = WhatsApp Direct
                  </span>
                </div>

                <div>
                  <label className="block text-slate-300 mb-1 font-semibold text-xs">
                    WhatsApp Number <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => updateField('phone', e.target.value)}
                    placeholder="e.g. +94705787818"
                    className="w-full bg-[#071518] border border-emerald-500/50 rounded-xl px-3.5 py-2 text-emerald-300 placeholder-slate-500 font-mono text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 mb-1 font-semibold text-xs">
                      Phone 2 <span className="text-slate-500 text-[10px]">(Office)</span>
                    </label>
                    <input
                      type="tel"
                      value={formData.phone2 || ''}
                      onChange={(e) => updateField('phone2', e.target.value)}
                      placeholder="011-255-4321"
                      className="w-full bg-[#0a1024] border border-[#1e2e54] rounded-xl px-3 py-2 text-white placeholder-slate-500 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 mb-1 font-semibold text-xs">
                      Phone 3 <span className="text-slate-500 text-[10px]">(Mobile)</span>
                    </label>
                    <input
                      type="tel"
                      value={formData.phone3 || ''}
                      onChange={(e) => updateField('phone3', e.target.value)}
                      placeholder="077-123-4567"
                      className="w-full bg-[#0a1024] border border-[#1e2e54] rounded-xl px-3 py-2 text-white placeholder-slate-500 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    />
                  </div>
                </div>
              </div>

              {/* Credit Terms & Sales Officer */}
              <div className="bg-gradient-to-br from-[#1b1539]/90 to-[#10193b]/90 border border-purple-500/30 rounded-xl p-4 space-y-3">
                <div>
                  <label className="block text-purple-200 mb-1 font-semibold text-xs">
                    Credit Period ({formData.creditPeriod || 30} Days)
                  </label>
                  <div className="grid grid-cols-5 gap-1">
                    {[15, 30, 45, 60, 90].map((days) => (
                      <button
                        key={days}
                        type="button"
                        onClick={() => updateField('creditPeriod', days)}
                        className={`py-1.5 rounded-lg text-[11px] font-bold border transition ${
                          formData.creditPeriod === days
                            ? 'bg-purple-600 border-purple-400 text-white shadow-sm'
                            : 'bg-[#0a1024] border-[#2e265c] text-slate-300 hover:border-purple-500/50'
                        }`}
                      >
                        {days}d
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-purple-200 mb-1 font-semibold text-xs">
                    Assigned Sales Representative
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-purple-400">
                      <UserCheck size={14} />
                    </div>
                    <select
                      value={formData.salesRepId || ''}
                      onChange={(e) => {
                        const salesRepId = e.target.value;
                        const selected = salesOfficers.find((officer) => officer.id === salesRepId);
                        setFormData(prev => ({
                          ...prev,
                          salesRepId: salesRepId || null,
                          salesRepName: selected?.fullName || '',
                        }));
                      }}
                      className="w-full appearance-none bg-[#0a1024] border border-[#2e265c] rounded-xl pl-9 pr-8 py-2 text-white text-xs focus:outline-none focus:ring-2 focus:ring-purple-500/50 font-medium cursor-pointer"
                    >
                      <option value="">Unassigned</option>
                      {salesOfficers.map((so) => (
                        <option key={so.id} value={so.id}>
                          {so.fullName} {so.officerId ? `(${so.officerId})` : ''}
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-purple-400 pointer-events-none" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Footer (Always visible) */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#1e293b]">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-xs font-semibold text-slate-400 hover:text-white hover:bg-[#1e293b] rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-lg shadow-blue-600/30 active:scale-98"
            >
              {isSubmitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={15} />
                  <span>{mode === 'edit' ? 'Update Customer' : 'Create Customer'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CustomerFormModal;
