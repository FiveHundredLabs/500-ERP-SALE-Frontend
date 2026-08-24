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
  quotationId: string;
  customerName: string;
  totalAmount: number;
  issueDate: string;
  itemsCount: number;
  shareUrl?: string;
}): string => {
  const formattedAmount = `LKR ${params.totalAmount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

  const formattedIssueDate = formatLongDate(params.issueDate) || params.issueDate;

  const lines: string[] = [
    `500Core ERP — QUOTATION ${params.quotationId}`,
    `━━━━━━━━━━━━━━━━━━━━`,
    `Customer: ${params.customerName}`,
    `Quotation Date: ${formattedIssueDate}`,
    `Items: ${params.itemsCount}`,
    `Total Amount: ${formattedAmount}`,
  ];

  if (params.shareUrl) {
    lines.push(`\n --View / Download Quotation:\n${params.shareUrl}`);
  }

  lines.push(`\n --The official Quotation PDF is attached for your records and review.`);
  lines.push(`Thank you for your business. We appreciate your continued support.`);

  return lines.join('\n');
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
  const formattedAmount = `LKR ${params.totalAmount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

  const formattedIssueDate = formatLongDate(params.issueDate) || params.issueDate;
  const formattedDueDate = formatLongDate(params.dueDate) || params.dueDate;

  const lines: string[] = [
    `500Core ERP — INVOICE ${params.invoiceId}`,
    `━━━━━━━━━━━━━━━━━━━━`,
    `Customer: ${params.customerName}`,
    `Invoice Date: ${formattedIssueDate}`,
  ];

  if (formattedDueDate) {
    lines.push(`Due Date: ${formattedDueDate}`);
  }

  lines.push(`Items: ${params.itemsCount}`);
  lines.push(`Total Amount: ${formattedAmount}`);

  if (params.shareUrl) {
    lines.push(`\n -- View / Download Invoice:\n${params.shareUrl}`);
  }

  lines.push(`\n -- The official Tax Invoice PDF is attached for your records and payment processing.`);
  lines.push(`Thank you for your business. We appreciate your continued support.`);

  return lines.join('\n');
};

/**
 * Generates formatted WhatsApp text message for Purchase Orders.
 */
export const generatePOWhatsAppMessage = (params: {
  poNumber: string;
  supplierName: string;
  totalAmount: number;
  poDate: string;
  itemsCount: number;
  shareUrl?: string;
}): string => {
  const formattedAmount = `LKR ${params.totalAmount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

  const formattedPoDate = formatLongDate(params.poDate) || params.poDate;

  const lines: string[] = [
    `500Core ERP — PURCHASE ORDER ${params.poNumber}`,
    `━━━━━━━━━━━━━━━━━━━━`,
    `Supplier: ${params.supplierName}`,
    `PO Date: ${formattedPoDate}`,
    `Items: ${params.itemsCount}`,
    `Total Amount: ${formattedAmount}`,
  ];

  if (params.shareUrl) {
    lines.push(`\n -- View / Download Purchase Order:\n${params.shareUrl}`);
  }

  lines.push(`\n -- The official Purchase Order PDF is attached for your records.`);
  lines.push(`Thank you for your business. We appreciate your continued support.`);

  return lines.join('\n');
};

/**
 * Generates formatted WhatsApp text message for Sales Orders.
 */
export const generateOrderWhatsAppMessage = (params: {
  orderId: string;
  customerName: string;
  totalAmount: number;
  orderDate: string;
  itemsCount: number;
  shareUrl?: string;
}): string => {
  const formattedAmount = `LKR ${params.totalAmount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

  const formattedOrderDate = formatLongDate(params.orderDate) || params.orderDate;

  const lines: string[] = [
    `500Core ERP — SALES ORDER ${params.orderId}`,
    `━━━━━━━━━━━━━━━━━━━━`,
    `Customer: ${params.customerName}`,
    `Order Date: ${formattedOrderDate}`,
    `Items: ${params.itemsCount}`,
    `Total Amount: ${formattedAmount}`,
  ];

  if (params.shareUrl) {
    lines.push(`\n -- View / Download Order:\n${params.shareUrl}`);
  }

  lines.push(`\n -- The official Order confirmation has been created in our system.`);
  lines.push(`Thank you for your business. We appreciate your continued support.`);

  return lines.join('\n');
};
