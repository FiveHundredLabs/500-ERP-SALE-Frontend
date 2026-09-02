import React from "react";
import type { InvoiceData } from "../types/invoice";
import Logo from "../assets/logo_without_bg.png";

interface InvoiceCanvasProps {
  invoiceData: InvoiceData;
}

const InvoiceCanvas: React.FC<InvoiceCanvasProps> = ({ invoiceData }) => {
  const formatDate = (dateString: string) => {
    try {
      if (!dateString) return "N/A";
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      return `${year}-${month}-${day}`;
    } catch {
      return dateString?.split('T')[0] || "N/A";
    }
  };

  const calculateTotals = () => {
    const subTotal = invoiceData.subTotal || 0;
    const totalAmount = invoiceData.totalAmount || subTotal;
    const paidAmount = invoiceData.paidAmount || 0;
    const balanceAmount = totalAmount - paidAmount;
    
    return { subTotal, totalAmount, paidAmount, balanceAmount };
  };

  const { subTotal, totalAmount, paidAmount, balanceAmount } = calculateTotals();

  const customer =
    invoiceData.customerDetails ||
    (typeof invoiceData.customer === "object" ? (invoiceData.customer as any) : null) ||
    ({} as any);
  const salesmanName =
    invoiceData.salesman?.fullName ||
    invoiceData.salesman?.name ||
    (invoiceData as any).salesmanName ||
    customer.salesRepName ||
    customer.salesRep?.fullName ||
    "N/A";

  const customerName =
    customer.shopName ||
    customer.fullName ||
    (typeof invoiceData.customer === "string" ? invoiceData.customer : "") ||
    "Walk-in Customer";

  const contactPerson =
    customer.contactPerson && customer.contactPerson !== customerName
      ? customer.contactPerson
      : customer.fullName && customer.fullName !== customerName
      ? customer.fullName
      : null;

  const customerCode = customer.customerCode || customer.code || null;

  const renderAddress = () => {
    const parts = [customer.address, customer.city].filter(Boolean);
    if (parts.length > 0) return parts.join(", ");
    return customer.address || "N/A";
  };

  const renderPhone = () => {
    const phones = [customer.phone, customer.phone2, customer.phone3].filter(Boolean);
    if (phones.length > 0) return phones.join(" / ");
    return "N/A";
  };

  const getDiscountDisplay = (item: any) => {
    const qty = Number(item.quantity) || 0;
    const price = Number(item.unitPrice) || 0;
    const expectedTotal = qty * price;
    const total = item.total !== undefined ? Number(item.total) : expectedTotal;
    const discountAmount = item.discountAmount !== undefined
      ? Number(item.discountAmount)
      : item.discount !== undefined
        ? Number(item.discount)
        : Math.max(0, expectedTotal - total);

    if (discountAmount <= 0) return '0%';

    // Explicit percentage discount
    if (item.discountType === 'percentage') {
      const val = item.discountValue !== undefined ? Number(item.discountValue) : (expectedTotal > 0 ? (discountAmount / expectedTotal) * 100 : 0);
      return `${Math.round(val)}%`;
    }

    // Explicit amount discount
    if (item.discountType === 'amount') {
      const val = item.discountValue !== undefined ? Number(item.discountValue) : discountAmount;
      if (item.discountScope === 'per_unit') {
        return `Rs. ${Math.round(val).toLocaleString()}/u`;
      }
      return `Rs. ${Math.round(val).toLocaleString()}`;
    }

    // Fallback: if discount exists but discountType not specified
    if (expectedTotal > 0 && discountAmount > 0) {
      const percent = (discountAmount / expectedTotal) * 100;
      if (Math.abs(percent - Math.round(percent)) < 0.05 && percent >= 0.5) {
        return `${Math.round(percent)}%`;
      }
      return `Rs. ${Math.round(discountAmount).toLocaleString()}`;
    }

    return '0%';
  };

  const documentTitle = invoiceData.documentTitle || "INVOICE";
  const documentLabel = documentTitle === "QUOTATION" ? "Quotation:" : documentTitle === "PURCHASE ORDER" ? "PO No:" : "Invoice:";

  const ITEMS_PER_PAGE = 20;
  const chunkedItems = [];
  
  // Create chunks of exactly 20 rows each
  const itemsArray = invoiceData.items || [];
  for (let i = 0; i < itemsArray.length; i += ITEMS_PER_PAGE) {
    const chunk = itemsArray.slice(i, i + ITEMS_PER_PAGE);
    
    // Pad chunk to exactly 20 items using placeholders
    while (chunk.length < ITEMS_PER_PAGE) {
      chunk.push({ isPlaceholder: true } as any);
    }
    chunkedItems.push(chunk);
  }
  
  // Handle empty state - always ensure at least one page with 20 empty rows
  if (chunkedItems.length === 0) {
    const emptyChunk = [];
    while (emptyChunk.length < ITEMS_PER_PAGE) {
      emptyChunk.push({ isPlaceholder: true } as any);
    }
    chunkedItems.push(emptyChunk);
  }

  return (
    <div className="invoice-document" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      {chunkedItems.map((chunk, pageIndex) => {
        const isLastPage = pageIndex === chunkedItems.length - 1;

        return (
          <div 
            key={pageIndex}
            className="invoice-page" 
            style={{ 
              width: '210mm', 
              height: '297mm', // Strict fixed height for A4
              backgroundColor: '#ffffff',
              color: '#1f2937', 
              fontFamily: 'Inter, Arial, sans-serif',
              padding: '10mm 15mm',
              boxSizing: 'border-box',
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              pageBreakAfter: isLastPage ? 'auto' : 'always',
              marginBottom: isLastPage ? '0' : '20px' // Visually separate pages in UI preview
            }}
          >
            {/* Header Section */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #e2e8f0', paddingBottom: '15px', marginBottom: '15px' }}>
              {/* Company Info - Now in Blue */}
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <img src={Logo} alt="Logo" style={{ width: '80px', height: '80px', objectFit: 'contain', marginRight: '15px' }} />
                <div>
                  <h1 style={{ color: '#1e3a8a', margin: '0 0 4px 0', fontSize: '24px', fontWeight: '800', letterSpacing: '-0.5px' }}>
                    S & K Enterprises
                  </h1>
                  <div style={{ color: '#1d4ed8', fontSize: '13px', marginBottom: '3px', display: 'flex', alignItems: 'center', fontWeight: '500' }}>
                    <span style={{ marginRight: '6px' }}>📍</span> 116/01 Kudabuthgamuwa, Kotikawattha.
                  </div>
                  <div style={{ color: '#1d4ed8', fontSize: '13px', display: 'flex', alignItems: 'center', fontWeight: '500' }}>
                    <span style={{ marginRight: '6px' }}>📞</span> 0713500780
                  </div>
                </div>
              </div>

              {/* Document Title - Now in Red */}
              <div style={{ textAlign: 'right', paddingTop: '5px' }}>
                <h2 style={{ margin: '0 0 8px 0', fontSize: '28px', color: '#dc2626', fontWeight: '800', letterSpacing: '1px', textTransform: 'uppercase' }}>
                  {documentTitle}
                </h2>
                <div style={{ fontSize: '13px', color: '#4b5563', marginBottom: '3px', fontWeight: '600' }}>
                  Date: <span style={{ color: '#111827' }}>{formatDate(invoiceData.issueDate)}</span>
                </div>
                <div style={{ fontSize: '13px', color: '#4b5563', fontWeight: '600' }}>
                  {documentLabel} <span style={{ color: '#111827' }}>{invoiceData.invoiceNumber}</span>
                </div>
                {chunkedItems.length > 1 && (
                  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                    Page {pageIndex + 1} of {chunkedItems.length}
                  </div>
                )}
              </div>
            </div>

            {/* Info Grid (Customer & Salesman) */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px', gap: '15px' }}>
              {/* Customer Details Box */}
              <div style={{ flex: '2', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '10px' }}>
                <div style={{ marginBottom: '6px' }}>
                  <h3 style={{ margin: 0, fontSize: '12px', color: '#64748b', textTransform: 'uppercase', fontWeight: '700', letterSpacing: '0.5px' }}>
                    Customer Details
                  </h3>
                </div>
                <div style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a', marginBottom: '3px' }}>
                  {customerName}
                </div>
                {contactPerson && (
                  <div style={{ fontSize: '12px', color: '#475569', marginBottom: '2px' }}>
                    <span style={{ color: '#64748b' }}>Attn:</span> {contactPerson}
                  </div>
                )}
                <div style={{ fontSize: '13px', color: '#475569', marginBottom: '2px' }}>
                  {renderPhone()}
                </div>
                <div style={{ fontSize: '13px', color: '#475569' }}>
                  {renderAddress()}
                </div>
              </div>

              {/* Salesman & Extra Details */}
              <div style={{ flex: '1', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '10px' }}>
                <h3 style={{ margin: '0 0 6px 0', fontSize: '12px', color: '#64748b', textTransform: 'uppercase', fontWeight: '700', letterSpacing: '0.5px' }}>
                  Sales Details
                </h3>
                <div style={{ fontSize: '13px', color: '#475569', marginBottom: '5px' }}>
                  <strong style={{ color: '#0f172a' }}>Sales Officer:</strong> {salesmanName}
                </div>
                {invoiceData.paymentMethod && (
                  <div style={{ fontSize: '13px', color: '#475569' }}>
                    <strong style={{ color: '#0f172a' }}>Payment Method:</strong>{' '}
                    <span style={{ textTransform: 'capitalize' }}>
                      {String(invoiceData.paymentMethod).toLowerCase() === 'credit'
                        ? `Credit${invoiceData.creditPeriod ? ` (${invoiceData.creditPeriod} Days)` : ''}`
                        : invoiceData.paymentMethod}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Main Items Table - FIXED HEIGHT */}
            {/* The table area ensures that 20 rows are displayed identically regardless of actual item count */}
            <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', fontSize: '12px' }}>
              <thead>
                <tr style={{ backgroundColor: '#1e3a8a', color: '#ffffff' }}>
                  <th style={{ padding: '6px 5px', textAlign: 'center', border: '1px solid #1e3a8a', width: '5%', fontWeight: '600' }}>#</th>
                  <th style={{ padding: '6px 10px', textAlign: 'left', border: '1px solid #1e3a8a', width: '43%', fontWeight: '600' }}>DESCRIPTION</th>
                  <th style={{ padding: '6px 5px', textAlign: 'center', border: '1px solid #1e3a8a', width: '7%', fontWeight: '600' }}>QTY</th>
                  <th style={{ padding: '6px 10px', textAlign: 'right', border: '1px solid #1e3a8a', width: '15%', fontWeight: '600', whiteSpace: 'nowrap' }}>RATE (Rs.)</th>
                  <th style={{ padding: '6px 5px', textAlign: 'center', border: '1px solid #1e3a8a', width: '10%', fontWeight: '600' }}>DISC</th>
                  <th style={{ padding: '6px 10px', textAlign: 'right', border: '1px solid #1e3a8a', width: '20%', fontWeight: '600', whiteSpace: 'nowrap' }}>AMOUNT (Rs.)</th>
                </tr>
              </thead>
              <tbody>
                {chunk.map((item, index) => {
                  // Fixed row height ensures the table structure never shifts
                  const rowStyle = { backgroundColor: index % 2 === 0 ? '#ffffff' : '#f8fafc', height: '22px' };
                  
                  if (item.isPlaceholder) {
                    return (
                      <tr key={`placeholder-${index}`} style={rowStyle}>
                        <td style={{ border: '1px solid #e2e8f0' }}></td>
                        <td style={{ border: '1px solid #e2e8f0' }}></td>
                        <td style={{ border: '1px solid #e2e8f0' }}></td>
                        <td style={{ border: '1px solid #e2e8f0' }}></td>
                        <td style={{ border: '1px solid #e2e8f0' }}></td>
                        <td style={{ border: '1px solid #e2e8f0' }}></td>
                      </tr>
                    );
                  }

                  const globalIndex = pageIndex * ITEMS_PER_PAGE + index;
                  return (
                    <tr key={item.id || globalIndex} style={rowStyle}>
                      <td style={{ padding: '2px 5px', border: '1px solid #e2e8f0', color: '#64748b', textAlign: 'center', whiteSpace: 'nowrap' }}>{globalIndex + 1}</td>
                      <td style={{ padding: '2px 10px', border: '1px solid #e2e8f0', color: '#0f172a', fontWeight: '500', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.itemName || item.inventoryItem?.productName || 'Item'}</td>
                      <td style={{ padding: '2px 5px', textAlign: 'center', border: '1px solid #e2e8f0', color: '#334155', whiteSpace: 'nowrap' }}>{item.quantity}</td>
                      <td style={{ padding: '2px 10px', textAlign: 'right', border: '1px solid #e2e8f0', color: '#334155', whiteSpace: 'nowrap' }}>{Math.round(item.unitPrice).toLocaleString()}</td>
                      <td style={{ padding: '2px 5px', textAlign: 'center', border: '1px solid #e2e8f0', color: '#334155', whiteSpace: 'nowrap' }}>
                        {getDiscountDisplay(item)}
                      </td>
                      <td style={{ padding: '2px 10px', textAlign: 'right', border: '1px solid #e2e8f0', color: '#0f172a', fontWeight: '600', whiteSpace: 'nowrap' }}>{Math.round(item.total).toLocaleString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Financial Summary & Footer Section */}
            {/* Positioned immediately below the table on the last page. Because the table is exactly 20 rows, this is always vertically consistent. */}
            {isLastPage && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: '10px' }}>
                {/* Left Side: Notes & Terms */}
                <div style={{ flex: '1.2', paddingRight: '20px' }}>
                  {invoiceData.notes && (
                    <div style={{ marginBottom: '10px' }}>
                      <strong style={{ display: 'block', fontSize: '11px', color: '#64748b', textTransform: 'uppercase', marginBottom: '3px' }}>Remarks / Notes</strong>
                      <div style={{ fontSize: '12px', color: '#475569', fontStyle: 'italic', maxHeight: '40px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{invoiceData.notes}</div>
                    </div>
                  )}
                </div>

                {/* Right Side: Total Calculation */}
                {(() => {
                  const grossItemsTotal = (invoiceData.items || []).reduce((sum, it) => {
                    if ((it as any).isPlaceholder) return sum;
                    return sum + ((Number(it.quantity) || 0) * (Number(it.unitPrice) || 0));
                  }, 0);

                  const totalProductDiscount = (invoiceData.items || []).reduce((sum, it) => {
                    if ((it as any).isPlaceholder) return sum;
                    const q = Number(it.quantity) || 0;
                    const p = Number(it.unitPrice) || 0;
                    const exp = q * p;
                    const t = it.total !== undefined ? Number(it.total) : exp;
                    const d = it.discountAmount !== undefined
                      ? Number(it.discountAmount)
                      : it.discount !== undefined
                        ? Number(it.discount)
                        : Math.max(0, exp - t);
                    return sum + Math.max(0, d);
                  }, 0);

                  const totalBillDiscount = Number(invoiceData.discount) || 0;

                  return (
                    <div style={{ width: '280px', backgroundColor: '#f8fafc', padding: '8px 12px', borderRadius: '6px', border: '1px solid #e2e8f0', marginLeft: 'auto' }}>
                      
                      {/* Sub Total (Gross if product discount exists, else standard subtotal) */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '12px', color: '#475569', fontWeight: '600' }}>
                        <span>Sub Total:</span>
                        <span style={{ color: '#0f172a' }}>
                          Rs. {Math.round(totalProductDiscount > 0 ? grossItemsTotal : subTotal).toLocaleString()}
                        </span>
                      </div>

                      {/* Product Wise Discount (if user gave discount on items) */}
                      {totalProductDiscount > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '12px', color: '#475569' }}>
                          <span>Product Discount:</span>
                          <span style={{ color: '#dc2626', fontWeight: '600' }}>
                            - Rs. {Math.round(totalProductDiscount).toLocaleString()}
                          </span>
                        </div>
                      )}

                      {/* Discount for Total (if user set total discount, as like 4th image) */}
                      {totalBillDiscount > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '12px', color: '#475569' }}>
                          <span>
                            Total Discount
                            {invoiceData.totalDiscountType === 'percentage' && (invoiceData.totalDiscountValue || invoiceData.discountPercentage)
                              ? ` (${invoiceData.totalDiscountValue || invoiceData.discountPercentage}%)`
                              : invoiceData.discountPercentage
                              ? ` (${Math.round(invoiceData.discountPercentage)}%)`
                              : ''}:
                          </span>
                          <span style={{ color: '#dc2626', fontWeight: '600' }}>
                            - Rs. {Math.round(totalBillDiscount).toLocaleString()}
                          </span>
                        </div>
                      )}

                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '12px', color: '#475569' }}>
                    <span>Amount Paid:</span>
                    <span style={{ fontWeight: '600' }}>Rs. {Math.round(paidAmount).toLocaleString()}</span>
                  </div>

                  <div style={{ borderTop: '2px solid #e2e8f0', margin: '6px 0' }}></div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <span style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a' }}>NET TOTAL:</span>
                    <span style={{ fontSize: '16px', fontWeight: '800', color: '#1e3a8a' }}>
                      Rs. {Math.round(totalAmount).toLocaleString()}
                    </span>
                  </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '12px', fontWeight: '700', color: '#dc2626' }}>BALANCE DUE:</span>
                        <span style={{ fontSize: '12px', fontWeight: '800', color: '#dc2626' }}>
                          Rs. {Math.round(balanceAmount).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Footer Signatures Area - On Every Page */}
            {/* Pushed to the very bottom naturally using flex layout */}
            <div style={{ marginTop: 'auto', paddingTop: '50px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', padding: '0 20px' }}>
                <div style={{ textAlign: 'center', width: '25%' }}>
                  <div style={{ borderTop: '1px solid #94a3b8', paddingTop: '6px', fontSize: '11px', fontWeight: '700', color: '#475569', letterSpacing: '0.5px' }}>PREPARED BY</div>
                </div>
                <div style={{ textAlign: 'center', width: '25%' }}>
                  <div style={{ borderTop: '1px solid #94a3b8', paddingTop: '6px', fontSize: '11px', fontWeight: '700', color: '#475569', letterSpacing: '0.5px' }}>AUTHORIZED BY</div>
                </div>
                <div style={{ textAlign: 'center', width: '25%' }}>
                  <div style={{ borderTop: '1px solid #94a3b8', paddingTop: '6px', fontSize: '11px', fontWeight: '700', color: '#475569', letterSpacing: '0.5px' }}>CUSTOMER SIGNATURE</div>
                </div>
              </div>
              
              <div style={{ textAlign: 'center', fontWeight: '700', fontSize: '11px', color: '#1e3a8a' }}>
                Thank You For Trusting S & K Enterprises.
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default InvoiceCanvas;
