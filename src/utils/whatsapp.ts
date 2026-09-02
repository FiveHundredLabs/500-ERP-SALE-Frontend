/**
 * WhatsApp integration utility for S & K Enterprices ERP.
 * Handles phone number normalization, message formatting, and direct WhatsApp URL generation.
 */

/**
 * Normalizes a phone number into an international numeric string suitable for WhatsApp URLs (wa.me/...).
 * e.g., "+94 70 578 7818" -> "94705787818"
 *       "070-578-7818"    -> "94705787818" (Sri Lanka default)
 */
export const cleanWhatsAppNumber = (phone?: string): string => {
  if (!phone) return '94705787818'; // Fallback to default
  
  // Remove all spaces, hyphens, parentheses, and other non-digit characters
  let cleaned = phone.replace(/[^0-9+]/g, '');

  if (cleaned.startsWith('+')) {
    cleaned = cleaned.substring(1);
  } else if (cleaned.startsWith('0')) {
    // Convert Sri Lanka domestic zero-prefix (07x, 011, 081, 033, etc.) to 94...
    cleaned = '94' + cleaned.substring(1);
  }

  // If already standard 9-digit number without country code
  if (!cleaned.startsWith('94') && cleaned.length === 9) {
    cleaned = '94' + cleaned;
  }

  return cleaned || '94705787818';
};

/**
 * Formats a phone number for clean UI display.
 * e.g., "+94705787818" -> "+94 70 578 7818"
 */
export const formatPhoneDisplay = (phone?: string): string => {
  if (!phone) return '';
  const trimmed = phone.trim();
  if (trimmed.startsWith('+94') && trimmed.length >= 11) {
    const rest = trimmed.substring(3).replace(/\s+/g, '');
    if (rest.length === 9) {
      return `+94 ${rest.substring(0, 2)} ${rest.substring(2, 5)} ${rest.substring(5)}`;
    }
  }
  return trimmed;
};

/**
 * Formats a date string into readable long format (e.g. "18 August 2026")
 */
export const formatLongDate = (dateStr?: string): string => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};

/**
 * Builds a direct WhatsApp chat URL with pre-composed text.
 */
export const getWhatsAppUrl = (phone: string, text: string): string => {
  const normalizedPhone = cleanWhatsAppNumber(phone);
  return `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(text)}`;
};

/**
 * Generates formatted WhatsApp text message for Quotations.
 */
export const generateQuotationWhatsAppMessage = (params: {
  quotationNumber: string;
  customerName: string;
  totalAmount: number;
  issueDate?: string;
  itemsCount?: number;
  remarks?: string;
  notes?: string;
  shareUrl?: string;
}): string => {
  const formattedAmount = `LKR ${Number(params.totalAmount || 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

  const remarksText = (params.remarks || params.notes || '').trim();
  const rawNum = params.quotationNumber.replace(/^#/, '');
  const qNum = rawNum.startsWith('QUO-') || rawNum.startsWith('Q-') ? `#${rawNum}` : `#QUO-${rawNum}`;

  const parts: string[] = [
    `Hello ${params.customerName || 'Valued Customer'},`,
    `We have prepared a Quotation ${qNum} from S & K Enterprises.`,
    `Net Total: ${formattedAmount}`,
  ];

  if (remarksText) {
    parts.push(`Remarks: ${remarksText}`);
  }

  if (params.shareUrl) {
    parts.push(
      `You can view, print, or download this official Quotation online by clicking the link below:\n\n${params.shareUrl}`
    );
  }

  parts.push(`Thank you!`);

  return parts.join('\n\n');
};

/**
 * Generates formatted WhatsApp text message for Invoices.
 */
export const generateInvoiceWhatsAppMessage = (params: {
  invoiceNumber: string;
  customerName: string;
  totalAmount: number;
  paymentStatus?: string;
  issueDate?: string;
  dueDate?: string;
  itemsCount?: number;
  remarks?: string;
  notes?: string;
  shareUrl?: string;
}): string => {
  const formattedAmount = `LKR ${Number(params.totalAmount || 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

  const remarksText = (params.remarks || params.notes || '').trim();
  const rawNum = params.invoiceNumber.replace(/^#/, '');
  const invNum = rawNum.startsWith('INV-') || rawNum.startsWith('I-') ? `#${rawNum}` : `#INV-${rawNum}`;

  const parts: string[] = [
    `Hello ${params.customerName || 'Valued Customer'},`,
    `We have issued an Invoice ${invNum} from S & K Enterprises.`,
    `Net Total: ${formattedAmount}`,
  ];

  if (remarksText) {
    parts.push(`Remarks: ${remarksText}`);
  }

  if (params.shareUrl) {
    parts.push(
      `You can view, print, or download this official Invoice online by clicking the link below:\n\n${params.shareUrl}`
    );
  }

  parts.push(`Thank you!`);

  return parts.join('\n\n');
};

/**
 * Generates formatted WhatsApp text message for Purchase Orders.
 */
export const generatePOWhatsAppMessage = (params: {
  poNumber: string;
  supplierName: string;
  totalAmount: number;
  poDate?: string;
  itemsCount?: number;
  remarks?: string;
  notes?: string;
  shareUrl?: string;
}): string => {
  const formattedAmount = `LKR ${Number(params.totalAmount || 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

  const remarksText = (params.remarks || params.notes || '').trim();
  const rawNum = params.poNumber.replace(/^#/, '');
  const poNum = rawNum.startsWith('PO-') ? `#${rawNum}` : `#PO-${rawNum}`;

  const parts: string[] = [
    `Hello ${params.supplierName || 'Valued Supplier'},`,
    `We have generated a Purchase Order ${poNum} from S & K Enterprises.`,
    `Net Total: ${formattedAmount}`,
  ];

  if (remarksText) {
    parts.push(`Remarks: ${remarksText}`);
  }

  if (params.shareUrl) {
    parts.push(
      `You can view, print, or download this official Purchase Order online by clicking the link below:\n\n${params.shareUrl}`
    );
  }

  parts.push(`Thank you!`);

  return parts.join('\n\n');
};

/**
 * Generates formatted WhatsApp text message for Sales Orders.
 */
export const generateOrderWhatsAppMessage = (params: {
  orderNumber: string;
  customerName: string;
  totalAmount: number;
  orderDate?: string;
  itemsCount?: number;
  remarks?: string;
  notes?: string;
  shareUrl?: string;
}): string => {
  const formattedAmount = `LKR ${Number(params.totalAmount || 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

  const remarksText = (params.remarks || params.notes || '').trim();
  const rawNum = params.orderNumber.replace(/^#/, '');
  const ordNum = rawNum.startsWith('ORD-') || rawNum.startsWith('O-') ? `#${rawNum}` : `#ORD-${rawNum}`;

  const parts: string[] = [
    `Hello ${params.customerName || 'Valued Customer'},`,
    `We have created a Sales Order ${ordNum} from S & K Enterprises.`,
    `Net Total: ${formattedAmount}`,
  ];

  if (remarksText) {
    parts.push(`Remarks: ${remarksText}`);
  }

  if (params.shareUrl) {
    parts.push(
      `You can view, print, or download this official Sales Order online by clicking the link below:\n\n${params.shareUrl}`
    );
  }

  parts.push(`Thank you!`);

  return parts.join('\n\n');
};
