/**
 * WhatsApp integration utility for 500Core ERP.
 * Handles phone number normalization, message formatting, and direct WhatsApp URL generation.
 */

/**
 * Normalizes a phone number into an international numeric string suitable for WhatsApp URLs (wa.me/...).
 * e.g., "+94 70 578 7818" -> "94705787818"
 *       "070-578-7818"    -> "94705787818" (Sri Lanka default)
 */
export const cleanWhatsAppNumber = (phone?: string): string => {
  if (!phone) return '94705787818'; // Fallback to sample default
  
  // Remove all spaces, hyphens, parentheses, and other non-digit characters
  let cleaned = phone.replace(/[^0-9+]/g, '');

  if (cleaned.startsWith('+')) {
    cleaned = cleaned.substring(1);
  } else if (cleaned.startsWith('0')) {
    // Convert Sri Lanka domestic zero-prefix (07x, 011, 081, 033, etc.) to 94...
    cleaned = '94' + cleaned.substring(1);
  }

  // If already standard 9-12 digit number without +
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
  quotationId: string;
  customerName: string;
  totalAmount: number;
  issueDate: string;
  itemsCount: number;
  shareUrl?: string;
}): string => {
  const formattedAmount = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'LKR',
    minimumFractionDigits: 2,
  }).format(params.totalAmount);

  return [
    `*500Core ERP — QUOTATION ${params.quotationId}*`,
    `━━━━━━━━━━━━━━━━━━━━━━━━`,
    `👤 *Customer:* ${params.customerName}`,
    `📅 *Date:* ${params.issueDate}`,
    `📦 *Items:* ${params.itemsCount} ${params.itemsCount === 1 ? 'Item' : 'Items'}`,
    `💰 *Total Amount:* ${formattedAmount}`,
    params.shareUrl ? `\n🔗 *View / Verify Online:*\n${params.shareUrl}` : '',
    `\n📎 _The official Quotation PDF document has been generated for your record._`,
    `\nPlease review and let us know if you would like to proceed with this order.`,
    `Thank you for choosing 500Core!`,
  ]
    .filter(Boolean)
    .join('\n');
};

/**
 * Generates formatted WhatsApp text message for Invoices.
 */
export const generateInvoiceWhatsAppMessage = (params: {
  invoiceId: string;
  customerName: string;
  totalAmount: number;
  paymentStatus?: string;
  issueDate: string;
  dueDate?: string;
  itemsCount: number;
  shareUrl?: string;
}): string => {
  const formattedAmount = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'LKR',
    minimumFractionDigits: 2,
  }).format(params.totalAmount);

  const statusEmoji = params.paymentStatus === 'Completed' ? '✅ Paid' : '⏳ Pending Payment';

  return [
    `*500Core ERP — INVOICE ${params.invoiceId}*`,
    `━━━━━━━━━━━━━━━━━━━━━━━━`,
    `👤 *Customer:* ${params.customerName}`,
    `📅 *Date:* ${params.issueDate}`,
    params.dueDate ? `⏰ *Due Date:* ${params.dueDate}` : '',
    `📦 *Items:* ${params.itemsCount} ${params.itemsCount === 1 ? 'Item' : 'Items'}`,
    `💰 *Total Amount:* ${formattedAmount}`,
    `💳 *Status:* ${statusEmoji}`,
    params.shareUrl ? `\n🔗 *View / Download Invoice:*\n${params.shareUrl}` : '',
    `\n📎 _The official Tax Invoice PDF is attached for your records and payment processing._`,
    `\nThank you for your business!`,
  ]
    .filter(Boolean)
    .join('\n');
};
