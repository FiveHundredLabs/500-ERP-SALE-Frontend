import React, { useState } from 'react';
import { 
  X, 
  UserPlus, 
  MessageCircle, 
  Phone, 
  CreditCard, 
  Building2, 
  Car, 
  MapPin, 
  Mail, 
  FileText, 
  CheckCircle2, 
  Sparkles,
  Calendar
} from 'lucide-react';
import type { Customer } from '../../hooks/useCustomerSearch';

export interface CustomerFormData {
  fullName: string;
  email: string;
  phone: string;
  phone2?: string;
  phone3?: string;
  vatNumber: string;
  creditPeriod: number;
  paymentTerms: string;
  creditLimit: number;
  address: {
    street: string;
    city: string;
    country: string;
    zip: string;
  };
  vehicle_number: string;
  vehicle_model: string;
  year_of_manufacture: number | undefined;
}

interface CustomerFormModalProps {
  isOpen: boolean;
  mode: 'create' | 'edit';
  initialData?: Customer;
  prefillData?: Partial<CustomerFormData>;
  onClose: () => void;
  onSubmit: (data: CustomerFormData) => Promise<void>;
}

const CREDIT_PERIOD_PRESETS = [7, 14, 15, 30, 45, 60, 90];

export const CustomerFormModal: React.FC<CustomerFormModalProps> = ({
  isOpen,
  mode,
  initialData,
  prefillData,
  onClose,
  onSubmit,
}) => {
  const [formData, setFormData] = useState<CustomerFormData>(() => {
    if (initialData) {
      return {
        fullName: initialData.fullName || '',
        email: initialData.email || '',
        phone: initialData.phone || '',
        phone2: initialData.phone2 || '',
        phone3: initialData.phone3 || '',
        vatNumber: initialData.vatNumber || '',
        creditPeriod: initialData.creditPeriod ?? 30,
        paymentTerms: initialData.paymentTerms || 'Net 30',
        creditLimit: initialData.creditLimit || 500000,
        address: {
          street: initialData.address?.street || '',
          city: initialData.address?.city || '',
          country: initialData.address?.country || 'Sri Lanka',
          zip: initialData.address?.zip || '',
        },
        vehicle_number: initialData.vehicle_number || '',
        vehicle_model: initialData.vehicle_model || '',
        year_of_manufacture: initialData.year_of_manufacture,
      };
    }
    
    return {
      fullName: prefillData?.fullName || '',
      email: prefillData?.email || '',
      phone: prefillData?.phone || '+94',
      phone2: prefillData?.phone2 || '',
      phone3: prefillData?.phone3 || '',
      vatNumber: prefillData?.vatNumber || '',
      creditPeriod: prefillData?.creditPeriod ?? 30,
      paymentTerms: prefillData?.paymentTerms || 'Net 30',
      creditLimit: prefillData?.creditLimit || 500000,
      address: {
        street: prefillData?.address?.street || '',
        city: prefillData?.address?.city || '',
        country: prefillData?.address?.country || 'Sri Lanka',
        zip: prefillData?.address?.zip || '',
      },
      vehicle_number: prefillData?.vehicle_number || '',
      vehicle_model: prefillData?.vehicle_model || '',
      year_of_manufacture: prefillData?.year_of_manufacture,
    };
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!formData.fullName.trim() || !formData.phone.trim() || !formData.vatNumber.trim()) {
      alert('Please fill in the required customer fields: Full Name, WhatsApp Phone, and VAT Number.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(formData);
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

  const updateAddressField = (field: keyof CustomerFormData['address'], value: string) => {
    setFormData(prev => ({
      ...prev,
      address: { ...prev.address, [field]: value }
    }));
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-[#0b132b] border border-[#1e293b] rounded-2xl max-w-3xl w-full p-6 max-h-[92vh] overflow-y-auto shadow-2xl space-y-6 relative text-slate-100">
        
        {/* Glow backdrop decorative accent */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-64 h-64 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#1e293b] relative z-10">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white flex items-center justify-center shadow-lg shadow-blue-500/25">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white tracking-tight">
                  {mode === 'edit' ? 'Edit Customer' : 'Create New Customer'}
                </h3>
                <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  {mode === 'edit' ? 'Update Profile' : 'New Account'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Set customer contact info, default credit period, and trade terms
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-[#1e293b] transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 relative z-10">

          {/* Section 1: Business Identity */}
          <div className="bg-[#111c3a]/80 border border-[#1e2e54] rounded-xl p-4.5 space-y-4 shadow-sm">
            <div className="flex items-center justify-between pb-2.5 border-b border-[#1e2e54]">
              <div className="flex items-center gap-2 text-xs font-bold text-blue-300 uppercase tracking-wider">
                <Building2 size={15} className="text-blue-400" />
                <span>Business & Account Details</span>
              </div>
              <span className="text-[11px] text-slate-400">Required fields marked with <span className="text-rose-400 font-bold">*</span></span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Business / Full Name <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={formData.fullName}
                    onChange={(e) => updateField('fullName', e.target.value)}
                    placeholder="e.g. Metro Auto Spares & Engineering"
                    className="w-full bg-[#0a1024] border border-[#233560] rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 text-xs font-medium transition shadow-inner"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  VAT / Tax ID <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={formData.vatNumber}
                    onChange={(e) => updateField('vatNumber', e.target.value)}
                    placeholder="e.g. LKR-100234567-VAT"
                    className="w-full bg-[#0a1024] border border-cyan-500/40 rounded-xl px-3.5 py-2.5 text-cyan-300 font-mono placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 text-xs font-semibold transition shadow-inner"
                    required
                  />
                </div>
              </div>

              <div className="md:col-span-3">
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Mail size={14} />
                  </div>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => updateField('email', e.target.value)}
                    placeholder="accounts@customercompany.lk"
                    className="w-full bg-[#0a1024] border border-[#233560] rounded-xl pl-9 pr-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 text-xs font-medium transition shadow-inner"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Credit Terms & Period (User's primary requirement) */}
          <div className="bg-gradient-to-br from-[#1b1539]/90 to-[#10193b]/90 border border-purple-500/40 rounded-xl p-4.5 space-y-4 shadow-lg shadow-purple-950/20">
            <div className="flex items-center justify-between pb-2.5 border-b border-purple-500/20">
              <div className="flex items-center gap-2 text-xs font-bold text-purple-300 uppercase tracking-wider">
                <CreditCard size={15} className="text-purple-400" />
                <span>Customer Default Credit Terms</span>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-[11px] font-medium">
                <Sparkles size={11} className="text-purple-400" />
                <span>Auto-populates Invoices & Quotations</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Credit Period Selector */}
              <div className="space-y-2.5">
                <label className="block text-xs font-semibold text-purple-200">
                  Default Credit Period (Days)
                </label>
                
                {/* Preset Pills */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {CREDIT_PERIOD_PRESETS.map((days) => {
                    const isSelected = formData.creditPeriod === days;
                    return (
                      <button
                        key={days}
                        type="button"
                        onClick={() => updateField('creditPeriod', days)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                          isSelected
                            ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-600/40 scale-105'
                            : 'bg-[#0a1024] text-slate-300 border border-[#2e265c] hover:bg-[#1a1740] hover:text-white'
                        }`}
                      >
                        {days} Days
                        {isSelected && <CheckCircle2 size={11} className="text-white ml-0.5" />}
                      </button>
                    );
                  })}
                </div>

                {/* Custom Input */}
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-purple-400">
                      <Calendar size={13} />
                    </div>
                    <input
                      type="number"
                      min="0"
                      max="365"
                      value={formData.creditPeriod}
                      onChange={(e) => updateField('creditPeriod', Math.max(0, parseInt(e.target.value) || 0))}
                      placeholder="Custom Days"
                      className="w-full bg-[#0a1024] border border-purple-500/40 rounded-xl pl-8 pr-3 py-2 text-purple-200 font-mono font-bold text-xs focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 shadow-inner"
                    />
                  </div>
                  <span className="text-xs text-purple-300 font-medium whitespace-nowrap bg-purple-950/60 border border-purple-800/40 px-2.5 py-2 rounded-xl">
                    Days to Pay
                  </span>
                </div>
              </div>

              {/* Credit Limit & Terms */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-purple-200 mb-1.5">
                    Credit Limit (LKR)
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-xs text-purple-400 font-mono font-bold">
                      LKR
                    </div>
                    <input
                      type="number"
                      min="0"
                      step="10000"
                      value={formData.creditLimit}
                      onChange={(e) => updateField('creditLimit', Math.max(0, parseFloat(e.target.value) || 0))}
                      placeholder="500,000"
                      className="w-full bg-[#0a1024] border border-[#2e265c] rounded-xl pl-13 pr-3.5 py-2.5 text-white font-mono font-bold text-xs focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 shadow-inner"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-purple-200 mb-1.5">
                    Payment Terms Label
                  </label>
                  <input
                    type="text"
                    value={formData.paymentTerms}
                    onChange={(e) => updateField('paymentTerms', e.target.value)}
                    placeholder="e.g. Net 30, Cash on Delivery"
                    className="w-full bg-[#0a1024] border border-[#2e265c] rounded-xl px-3.5 py-2 text-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 shadow-inner"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Contact Numbers (WhatsApp Highlight) */}
          <div className="bg-[#0f2324]/60 border border-emerald-500/30 rounded-xl p-4.5 space-y-3.5 shadow-lg shadow-emerald-950/20">
            <div className="flex items-center justify-between pb-2.5 border-b border-emerald-500/20">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-300 uppercase tracking-wider">
                <Phone size={15} className="text-emerald-400" />
                <span>Contact & Communication Numbers</span>
              </div>
              <span className="text-[10px] text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 rounded-full font-mono font-medium flex items-center gap-1.5">
                <MessageCircle size={11} className="text-emerald-400" /> WhatsApp Direct Link
              </span>
            </div>

            <div>
              <label className="flex items-center justify-between text-xs font-semibold text-emerald-300 mb-1.5">
                <span className="flex items-center gap-1.5">
                  <MessageCircle size={13} className="text-emerald-400" />
                  Primary WhatsApp Number <span className="text-rose-400">*</span>
                </span>
                <span className="text-[10px] text-slate-400 font-normal">Target for PDF Invoices & Receipts</span>
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => updateField('phone', e.target.value)}
                placeholder="e.g. +94705787818"
                className="w-full bg-[#071518] border border-emerald-500/50 rounded-xl px-3.5 py-2.5 text-emerald-300 placeholder-slate-500 font-mono text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-400 shadow-inner"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Phone 2 <span className="text-slate-500 font-normal text-[11px]">(Landline / Office)</span>
                </label>
                <input
                  type="tel"
                  value={formData.phone2 || ''}
                  onChange={(e) => updateField('phone2', e.target.value)}
                  placeholder="011-255-4321"
                  className="w-full bg-[#0a1024] border border-[#1e2e54] rounded-xl px-3.5 py-2 text-white placeholder-slate-500 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 shadow-inner"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Phone 3 <span className="text-slate-500 font-normal text-[11px]">(Secondary Mobile)</span>
                </label>
                <input
                  type="tel"
                  value={formData.phone3 || ''}
                  onChange={(e) => updateField('phone3', e.target.value)}
                  placeholder="077-123-4567"
                  className="w-full bg-[#0a1024] border border-[#1e2e54] rounded-xl px-3.5 py-2 text-white placeholder-slate-500 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 shadow-inner"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Address Details */}
          <div className="bg-[#111c3a]/80 border border-[#1e2e54] rounded-xl p-4.5 space-y-3 shadow-sm">
            <div className="flex items-center gap-2 pb-2.5 border-b border-[#1e2e54] text-xs font-bold text-amber-300 uppercase tracking-wider">
              <MapPin size={15} className="text-amber-400" />
              <span>Billing & Delivery Address</span>
            </div>

            <div className="space-y-2.5">
              <input
                type="text"
                value={formData.address.street}
                onChange={(e) => updateAddressField('street', e.target.value)}
                placeholder="Street Address (e.g. No. 45, Baseline Road)"
                className="w-full bg-[#0a1024] border border-[#233560] rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 text-xs shadow-inner"
              />
              <div className="grid grid-cols-3 gap-2.5">
                <input
                  type="text"
                  value={formData.address.city}
                  onChange={(e) => updateAddressField('city', e.target.value)}
                  placeholder="City (e.g. Colombo)"
                  className="bg-[#0a1024] border border-[#233560] rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 text-xs shadow-inner"
                />
                <input
                  type="text"
                  value={formData.address.country}
                  onChange={(e) => updateAddressField('country', e.target.value)}
                  placeholder="Country"
                  className="bg-[#0a1024] border border-[#233560] rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 text-xs shadow-inner"
                />
                <input
                  type="text"
                  value={formData.address.zip}
                  onChange={(e) => updateAddressField('zip', e.target.value)}
                  placeholder="Postal Code"
                  className="bg-[#0a1024] border border-[#233560] rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 text-xs shadow-inner"
                />
              </div>
            </div>
          </div>

          {/* Section 5: Vehicle Details (Optional) */}
          <div className="bg-[#111c3a]/80 border border-[#1e2e54] rounded-xl p-4.5 space-y-3 shadow-sm">
            <div className="flex items-center gap-2 pb-2.5 border-b border-[#1e2e54] text-xs font-bold text-cyan-300 uppercase tracking-wider">
              <Car size={15} className="text-cyan-400" />
              <span>Vehicle Details (Optional)</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Vehicle Reg Number
                </label>
                <input
                  type="text"
                  value={formData.vehicle_number}
                  onChange={(e) => updateField('vehicle_number', e.target.value)}
                  placeholder="e.g. WP-CAD-1234"
                  className="w-full bg-[#0a1024] border border-[#233560] rounded-xl px-3.5 py-2 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 text-xs font-mono uppercase shadow-inner"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Vehicle Model
                </label>
                <input
                  type="text"
                  value={formData.vehicle_model}
                  onChange={(e) => updateField('vehicle_model', e.target.value)}
                  placeholder="e.g. Toyota Hilux / Dimo Batta"
                  className="w-full bg-[#0a1024] border border-[#233560] rounded-xl px-3.5 py-2 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 text-xs shadow-inner"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Year of Manufacture
                </label>
                <input
                  type="number"
                  value={formData.year_of_manufacture || ''}
                  onChange={(e) => updateField('year_of_manufacture', e.target.value ? parseInt(e.target.value) : undefined)}
                  placeholder="2022"
                  min="1950"
                  max={new Date().getFullYear() + 1}
                  className="w-full bg-[#0a1024] border border-[#233560] rounded-xl px-3.5 py-2 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 text-xs shadow-inner"
                />
              </div>
            </div>
          </div>

          {/* Action Footer */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#1e293b]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-semibold text-slate-400 hover:text-white hover:bg-[#1e293b] rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-lg shadow-blue-600/30 hover:shadow-blue-600/50 active:scale-98"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Saving Customer...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={15} />
                  <span>{mode === 'edit' ? 'Update Customer Profile' : 'Create Customer Account'}</span>
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