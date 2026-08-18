import React from 'react';
import { X, Edit2, MessageCircle, CreditCard, Calendar, Building, Car } from 'lucide-react';
import { cleanWhatsAppNumber } from '../../utils/whatsapp';
import type { Customer } from '../../hooks/useCustomerSearch';

interface CustomerViewModalProps {
  customer: Customer;
  isOpen: boolean;
  onClose: () => void;
  onEdit: () => void;
}

export const CustomerViewModal: React.FC<CustomerViewModalProps> = ({
  customer,
  isOpen,
  onClose,
  onEdit,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
      <div className="bg-[#0f172a] border border-[#334155] rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4">
        <div className="flex justify-between items-center pb-3 border-b border-[#334155]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center">
              <Building size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Customer Profile</h3>
              <p className="text-[11px] text-gray-400">{customer.customerCode || 'Registered Customer'}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-white hover:bg-[#1e293b] rounded-lg transition"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="space-y-3.5 text-xs">
          {/* Main Info */}
          <div className="grid grid-cols-2 gap-3 bg-[#1e293b]/70 p-3.5 rounded-xl border border-[#334155]">
            <div>
              <div className="text-gray-400 font-medium text-[11px]">Customer / Business Name</div>
              <div className="text-white font-bold text-sm mt-0.5">{customer.fullName}</div>
            </div>
            <div>
              <div className="text-gray-400 font-medium text-[11px]">VAT / Tax ID</div>
              <div className="text-cyan-400 font-mono font-bold mt-0.5">{customer.vatNumber || 'N/A'}</div>
            </div>
          </div>

          {/* Credit Terms (User Requirement) */}
          <div className="p-3.5 rounded-xl bg-gradient-to-r from-purple-950/40 to-blue-950/40 border border-purple-500/30 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-purple-500/20 text-purple-400">
                <CreditCard size={16} />
              </div>
              <div>
                <span className="text-[11px] text-purple-300 font-medium block">Default Credit Period</span>
                <span className="text-sm font-bold text-white font-mono">
                  {customer.creditPeriod ?? 30} Days
                </span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[11px] text-gray-400 font-medium block">Payment Terms</span>
              <span className="text-xs font-semibold text-purple-300">
                {customer.paymentTerms || `Net ${customer.creditPeriod ?? 30}`}
              </span>
            </div>
          </div>
          
          {/* Phone Numbers */}
          <div className="p-3 rounded-xl bg-[#1e293b] border border-[#334155] space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-gray-400 font-medium flex items-center gap-1">
                <MessageCircle size={12} className="text-emerald-400" /> WhatsApp (Primary):
              </span>
              <a
                href={`https://wa.me/${cleanWhatsAppNumber(customer.phone)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-emerald-400 hover:text-emerald-300 font-mono font-bold flex items-center gap-1 transition"
                title="Chat on WhatsApp"
              >
                <span>{customer.phone}</span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded font-sans">Chat</span>
              </a>
            </div>

            {customer.phone2 && (
              <div className="flex justify-between items-center pt-1 border-t border-[#334155]/60">
                <span className="text-gray-400 font-medium">Phone 2 (Secondary):</span>
                <span className="text-gray-200 font-mono">{customer.phone2}</span>
              </div>
            )}

            {customer.phone3 && (
              <div className="flex justify-between items-center pt-1 border-t border-[#334155]/60">
                <span className="text-gray-400 font-medium">Phone 3 (Alternative):</span>
                <span className="text-gray-200 font-mono">{customer.phone3}</span>
              </div>
            )}
          </div>

          {customer.email && (
            <div className="bg-[#1e293b]/50 p-2.5 rounded-lg border border-[#334155]">
              <div className="text-gray-400 font-medium text-[11px]">Email Address</div>
              <div className="text-gray-200 font-medium mt-0.5">{customer.email}</div>
            </div>
          )}
          
          {customer.address && (
            <div className="bg-[#1e293b]/50 p-2.5 rounded-lg border border-[#334155]">
              <div className="text-gray-400 font-medium text-[11px] mb-1">Billing & Delivery Address</div>
              <div className="text-gray-300">
                {customer.address.street && <div>{customer.address.street}</div>}
                <div>
                  {customer.address.city && `${customer.address.city}, `}
                  {customer.address.country && `${customer.address.country} `}
                  {customer.address.zip && `(${customer.address.zip})`}
                </div>
              </div>
            </div>
          )}
          
          {(customer.vehicle_number || customer.vehicle_model || customer.year_of_manufacture) && (
            <div className="bg-[#1e293b]/50 p-2.5 rounded-lg border border-[#334155] space-y-1">
              <div className="text-gray-400 font-medium text-[11px] mb-1 flex items-center gap-1.5">
                <Car size={12} className="text-cyan-400" />
                <span>Vehicle Details</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-[11px]">
                {customer.vehicle_number && <div><span className="text-gray-500">Reg:</span> <span className="font-mono text-white font-semibold">{customer.vehicle_number}</span></div>}
                {customer.vehicle_model && <div><span className="text-gray-500">Model:</span> <span className="text-white font-medium">{customer.vehicle_model}</span></div>}
                {customer.year_of_manufacture && <div><span className="text-gray-500">Year:</span> <span className="text-white font-medium">{customer.year_of_manufacture}</span></div>}
              </div>
            </div>
          )}
          
          <div className="flex justify-end gap-2.5 pt-4 border-t border-[#334155]">
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs text-gray-300 hover:text-white transition"
            >
              Close
            </button>
            <button
              onClick={() => {
                onClose();
                onEdit();
              }}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition shadow-md shadow-blue-600/30"
            >
              <Edit2 className="w-3.5 h-3.5" />
              Edit Customer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerViewModal;
