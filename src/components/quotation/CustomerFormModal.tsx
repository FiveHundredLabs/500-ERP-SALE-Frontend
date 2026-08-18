import React, { useState } from 'react';
import { X, UserPlus, MessageCircle, Phone } from 'lucide-react';
import type { Customer } from '../../hooks/useCustomerSearch';

interface CustomerFormData {
  fullName: string;
  email: string;
  phone: string;
  phone2?: string;
  phone3?: string;
  vatNumber: string;
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
        address: {
          street: initialData.address?.street || '',
          city: initialData.address?.city || '',
          country: initialData.address?.country || '',
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
      phone: prefillData?.phone || '+94705787818',
      phone2: prefillData?.phone2 || '',
      phone3: prefillData?.phone3 || '',
      vatNumber: prefillData?.vatNumber || '',
      address: {
        street: prefillData?.address?.street || '',
        city: prefillData?.address?.city || '',
        country: prefillData?.address?.country || '',
        zip: prefillData?.address?.zip || '',
      },
      vehicle_number: prefillData?.vehicle_number || '',
      vehicle_model: prefillData?.vehicle_model || '',
      year_of_manufacture: prefillData?.year_of_manufacture,
    };
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    // Validate required fields
    if (!formData.fullName || !formData.phone || !formData.vatNumber) {
      alert('Please fill in all required customer fields (Full Name, WhatsApp Phone, VAT Number)');
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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-[#0f172a] border border-[#334155] rounded-2xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#334155]">
          <h4 className="font-semibold text-white flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-blue-400" />
            {mode === 'edit' ? 'Edit Customer' : 'Create New Customer'}
          </h4>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Full Name / Business Name*
              </label>
              <input
                type="text"
                value={formData.fullName}
                onChange={(e) => updateField('fullName', e.target.value)}
                placeholder="Customer or Business Name"
                className="w-full bg-[#1e293b] border border-[#334155] rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => updateField('email', e.target.value)}
                placeholder="customer@email.com"
                className="w-full bg-[#1e293b] border border-[#334155] rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
          </div>

          {/* Phone Numbers Section (Up to 3) */}
          <div className="p-3.5 rounded-xl bg-[#1e293b]/70 border border-[#334155] space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[#334155]">
              <span className="text-xs font-semibold text-gray-200 flex items-center gap-1.5">
                <Phone size={13} className="text-emerald-400" />
                Phone Numbers (Up to 3)
              </span>
              <span className="text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded font-mono font-medium flex items-center gap-1">
                <MessageCircle size={10} /> 1st Phone = WhatsApp
              </span>
            </div>

            <div>
              <label className="flex items-center justify-between text-xs font-medium text-emerald-400 mb-1">
                <span className="flex items-center gap-1 font-semibold">
                  <MessageCircle size={12} /> WhatsApp Number * (Required)
                </span>
                <span className="text-[10px] text-gray-400 font-mono">Chat & PDF Sharing Target</span>
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => updateField('phone', e.target.value)}
                placeholder="e.g. +94705787818"
                className="w-full bg-[#0f172a] border border-emerald-500/40 rounded-lg px-3 py-2 text-emerald-300 placeholder-gray-500 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">
                  Phone 2 <span className="text-gray-500 text-[10px]">(Optional - Landline / Alt)</span>
                </label>
                <input
                  type="tel"
                  value={formData.phone2 || ''}
                  onChange={(e) => updateField('phone2', e.target.value)}
                  placeholder="e.g. 011-255-4321"
                  className="w-full bg-[#0f172a] border border-[#334155] rounded-lg px-3 py-2 text-white placeholder-gray-500 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">
                  Phone 3 <span className="text-gray-500 text-[10px]">(Optional - Secondary Mobile)</span>
                </label>
                <input
                  type="tel"
                  value={formData.phone3 || ''}
                  onChange={(e) => updateField('phone3', e.target.value)}
                  placeholder="e.g. 077-123-4567"
                  className="w-full bg-[#0f172a] border border-[#334155] rounded-lg px-3 py-2 text-white placeholder-gray-500 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              VAT Number*
            </label>
            <input
              type="text"
              value={formData.vatNumber}
              onChange={(e) => updateField('vatNumber', e.target.value)}
              placeholder="e.g. LKR-123456789-VAT"
              className="w-full bg-[#1e293b] border border-[#334155] rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Address
            </label>
            <input
              type="text"
              value={formData.address.street}
              onChange={(e) => updateAddressField('street', e.target.value)}
              placeholder="Street Address"
              className="w-full bg-[#1e293b] border border-[#334155] rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2 text-sm"
            />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <input
                type="text"
                value={formData.address.city}
                onChange={(e) => updateAddressField('city', e.target.value)}
                placeholder="City"
                className="bg-[#1e293b] border border-[#334155] rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
              <input
                type="text"
                value={formData.address.country}
                onChange={(e) => updateAddressField('country', e.target.value)}
                placeholder="Country"
                className="bg-[#1e293b] border border-[#334155] rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
              <input
                type="text"
                value={formData.address.zip}
                onChange={(e) => updateAddressField('zip', e.target.value)}
                placeholder="ZIP Code"
                className="bg-[#1e293b] border border-[#334155] rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Vehicle Number
              </label>
              <input
                type="text"
                value={formData.vehicle_number}
                onChange={(e) => updateField('vehicle_number', e.target.value)}
                placeholder="WP-CAD-1234"
                className="w-full bg-[#1e293b] border border-[#334155] rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Vehicle Model
              </label>
              <input
                type="text"
                value={formData.vehicle_model}
                onChange={(e) => updateField('vehicle_model', e.target.value)}
                placeholder="Toyota Hilux"
                className="w-full bg-[#1e293b] border border-[#334155] rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Year of Manufacture
              </label>
              <input
                type="number"
                value={formData.year_of_manufacture || ''}
                onChange={(e) => updateField('year_of_manufacture', e.target.value ? parseInt(e.target.value) : undefined)}
                placeholder="2020"
                min="1900"
                max={new Date().getFullYear() + 1}
                className="w-full bg-[#1e293b] border border-[#334155] rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-[#334155]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Saving...
              </>
            ) : (
              mode === 'edit' ? 'Update Customer' : 'Create Customer'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CustomerFormModal;
