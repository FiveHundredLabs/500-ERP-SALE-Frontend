import React from 'react';
import { X, Edit2, MessageCircle } from 'lucide-react';
import { cleanWhatsAppNumber } from '../../utils/whatsapp';

interface Customer {
  _id: string;
  fullName: string;
  email: string;
  phone: string;
  phone2?: string;
  phone3?: string;
  vatNumber: string;
  address?: {
    street?: string;
    city?: string;
    country?: string;
    zip?: string;
  };
  vehicle_number?: string;
  vehicle_model?: string;
  year_of_manufacture?: number;
  customerCode?: string;
}

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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#0f172a] border border-[#334155] rounded-2xl w-full max-w-md p-6 shadow-2xl">
        <div className="flex justify-between items-center pb-3 mb-4 border-b border-[#334155]">
          <h3 className="text-base font-semibold text-white">Customer Profile</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="space-y-3.5 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-gray-400 font-medium">Customer Name</div>
              <div className="text-white font-semibold text-sm mt-0.5">{customer.fullName}</div>
            </div>
            <div>
              <div className="text-gray-400 font-medium">VAT / Tax ID</div>
              <div className="text-cyan-400 font-mono font-medium mt-0.5">{customer.vatNumber}</div>
            </div>
          </div>
          
          {/* Phone Numbers */}
          <div className="p-3 rounded-xl bg-[#1e293b] border border-[#334155] space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-gray-400 font-medium flex items-center gap-1">
                <MessageCircle size={11} className="text-emerald-400" /> WhatsApp (Primary):
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
            <div>
              <div className="text-gray-400 font-medium">Email Address</div>
              <div className="text-gray-200 mt-0.5">{customer.email}</div>
            </div>
          )}
          
          {customer.address && (
            <div>
              <div className="text-gray-400 font-medium mb-1">Billing & Delivery Address</div>
              <div className="text-gray-300 bg-[#1e293b]/50 p-2.5 rounded-lg border border-[#334155]">
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
            <div>
              <div className="text-gray-400 font-medium mb-1">Vehicle Details</div>
              <div className="text-gray-300 bg-[#1e293b]/50 p-2.5 rounded-lg border border-[#334155] space-y-1">
                {customer.vehicle_number && <div><span className="text-gray-500">Number:</span> <span className="font-mono text-white">{customer.vehicle_number}</span></div>}
                {customer.vehicle_model && <div><span className="text-gray-500">Model:</span> <span className="text-white">{customer.vehicle_model}</span></div>}
                {customer.year_of_manufacture && <div><span className="text-gray-500">Year:</span> <span className="text-white">{customer.year_of_manufacture}</span></div>}
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
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition"
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
