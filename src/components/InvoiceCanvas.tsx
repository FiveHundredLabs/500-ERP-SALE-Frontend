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

  const { totalAmount, paidAmount } = calculateTotals();

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

    if (item.discountType === 'percentage') {
      const val = item.discountValue !== undefined ? Number(item.discountValue) : (expectedTotal > 0 ? (discountAmount / expectedTotal) * 100 : 0);
      return `${Math.round(val)}%`;
    }
    if (item.discountType === 'amount') {
      const val = item.discountValue !== undefined ? Number(item.discountValue) : discountAmount;
      if (item.discountScope === 'per_unit') return `Rs. ${Math.round(val).toLocaleString()}/u`;
      return `Rs. ${Math.round(val).toLocaleString()}`;
    }
    if (expectedTotal > 0 && discountAmount > 0) {
      const percent = (discountAmount / expectedTotal) * 100;
      if (Math.abs(percent - Math.round(percent)) < 0.05 && percent >= 0.5) return `${Math.round(percent)}%`;
      return `Rs. ${Math.round(discountAmount).toLocaleString()}`;
    }
    return '0%';
  };

  const documentTitle = invoiceData.documentTitle || "INVOICE";
  const documentLabel = documentTitle === "QUOTATION" ? "Quotation:" : documentTitle === "PURCHASE ORDER" ? "PO No:" : "Invoice:";

  const ITEMS_PER_PAGE = 20;
  const chunkedItems: any[][] = [];
  const itemsArray = invoiceData.items || [];
  for (let i = 0; i < itemsArray.length; i += ITEMS_PER_PAGE) {
    const chunk = itemsArray.slice(i, i + ITEMS_PER_PAGE);
    while (chunk.length < ITEMS_PER_PAGE) chunk.push({ isPlaceholder: true } as any);
    chunkedItems.push(chunk);
  }
  if (chunkedItems.length === 0) {
    const emptyChunk: any[] = [];
    while (emptyChunk.length < ITEMS_PER_PAGE) emptyChunk.push({ isPlaceholder: true } as any);
    chunkedItems.push(emptyChunk);
  }

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
    <div className="invoice-document" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      {chunkedItems.map((chunk, pageIndex) => {
        const isLastPage = pageIndex === chunkedItems.length - 1;

        const pageGrossTotal = chunk.reduce((sum, it) => {
          if ((it as any).isPlaceholder) return sum;
          return sum + ((Number(it.quantity) || 0) * (Number(it.unitPrice) || 0));
        }, 0);

        const pageSubTotal = (chunkedItems.length === 1 && totalProductDiscount <= 0 && invoiceData.subTotal)
          ? invoiceData.subTotal
          : pageGrossTotal;

        return (
          <div
            key={pageIndex}
            className="invoice-page"
            style={{
              width: '210mm',
              height: '297mm',
              backgroundColor: '#ffffff',
              color: '#1f2937',
              fontFamily: 'Inter, Arial, sans-serif',
              boxSizing: 'border-box',
              position: 'relative',
              pageBreakAfter: isLastPage ? 'auto' : 'always',
              marginBottom: isLastPage ? '0' : '20px',
            }}
          >
            {/* ── CONTENT AREA: reserves space for the absolute footer ── */}
            <div style={{
              position: 'absolute',
              top: '10mm',
              left: '15mm',
              right: '15mm',
              bottom: '26mm',   /* 8mm bottom margin + ~18mm footer */
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}>

              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #e2e8f0', paddingBottom: '10px', marginBottom: '10px', flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <img src={Logo} alt="Logo" style={{ width: '75px', height: '75px', objectFit: 'contain', marginRight: '16px', marginTop: '2px' }} />
                  <div>
                    <h1 style={{ color: '#000000', margin: '0 0 4px 0', fontSize: '24px', fontWeight: '800', letterSpacing: '-0.3px' }}>
                      S &amp; K Enterprises
                    </h1>
                    <div style={{ color: '#000000', fontSize: '13px', marginBottom: '3px', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '500' }}>
                      <span style={{ color: '#dc2626' }}>📍</span>
                      <span>116/01 Kudabuthgamuwa, Kotikawattha.</span>
                    </div>
                    <div style={{ color: '#dc2626', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '600' }}>
                      <span style={{ color: '#dc2626' }}>📞</span>
                      <span>0713500780</span>
                    </div>
                  </div>
                </div>
                <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'center' }}>
                  <h2 style={{ margin: '0 0 6px 0', fontSize: '28px', color: '#dc2626', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px', lineHeight: '1' }}>
                    {documentTitle}
                  </h2>
                  <div style={{ fontSize: '13px', color: '#4b5563', marginBottom: '3px', fontWeight: '600', display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                    <span>Date:</span> <span style={{ color: '#111827' }}>{formatDate(invoiceData.issueDate)}</span>
                  </div>
                  <div style={{ fontSize: '13px', color: '#4b5563', fontWeight: '600', display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                    <span>{documentLabel}</span> <span style={{ color: '#111827', fontWeight: '700' }}>{invoiceData.invoiceNumber}</span>
                  </div>
                </div>
              </div>

              {/* Info Grid */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', gap: '15px', flexShrink: 0 }}>
                <div style={{ flex: '2', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '10px' }}>
                  <div style={{ marginBottom: '6px' }}>
                    <h3 style={{ margin: 0, fontSize: '12px', color: '#64748b', textTransform: 'uppercase', fontWeight: '700' }}>
                      {documentTitle === "PURCHASE ORDER" ? "Supplier Details" : "Customer Details"}
                    </h3>
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a', marginBottom: '3px' }}>{customerName}</div>
                  {contactPerson && (
                    <div style={{ fontSize: '12px', color: '#475569', marginBottom: '2px', display: 'flex', gap: '4px' }}>
                      <span style={{ color: '#64748b' }}>Attn:</span> <span>{contactPerson}</span>
                    </div>
                  )}
                  <div style={{ fontSize: '13px', color: '#475569', marginBottom: '2px' }}>{renderPhone()}</div>
                  <div style={{ fontSize: '13px', color: '#475569' }}>{renderAddress()}</div>
                </div>
                <div style={{ flex: '1', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '10px' }}>
                  <h3 style={{ margin: '0 0 6px 0', fontSize: '12px', color: '#64748b', textTransform: 'uppercase', fontWeight: '700' }}>
                    {documentTitle === "PURCHASE ORDER" ? "Order Details" : "Sales Details"}
                  </h3>
                  <div style={{ fontSize: '13px', color: '#475569', marginBottom: '5px', display: 'flex', gap: '6px' }}>
                    <strong style={{ color: '#0f172a', whiteSpace: 'nowrap' }}>
                      {documentTitle === "PURCHASE ORDER" ? "Purchaser / Officer:" : "Sales Officer:"}
                    </strong>
                    <span>{salesmanName || (documentTitle === "PURCHASE ORDER" ? "Procurement" : "N/A")}</span>
                  </div>
                  {invoiceData.paymentMethod && (
                    <div style={{ fontSize: '13px', color: '#475569', display: 'flex', gap: '6px' }}>
                      <strong style={{ color: '#0f172a', whiteSpace: 'nowrap' }}>Payment Method:</strong>
                      <span style={{ textTransform: 'capitalize' }}>
                        {documentTitle === "INVOICE" && String(invoiceData.paymentMethod).toLowerCase() === 'credit'
                          ? 'Credit'
                          : String(invoiceData.paymentMethod).toLowerCase() === 'credit'
                          ? `Credit${invoiceData.creditPeriod ? ` (${invoiceData.creditPeriod} Days)` : ''}`
                          : invoiceData.paymentMethod}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Items Table */}
              <table style={{ width: '180mm', minWidth: '180mm', maxWidth: '180mm', borderCollapse: 'collapse', tableLayout: 'fixed', fontSize: '12px', margin: '0 auto', flexShrink: 0 }}>
                <colgroup>
                  <col style={{ width: '10mm' }} />
                  <col style={{ width: '80mm' }} />
                  <col style={{ width: '15mm' }} />
                  <col style={{ width: '25mm' }} />
                  <col style={{ width: '18mm' }} />
                  <col style={{ width: '32mm' }} />
                </colgroup>
                <thead>
                  <tr style={{ backgroundColor: '#1e3a8a', color: '#ffffff', height: '28px' }}>
                    <th style={{ padding: '5px 2px', textAlign: 'center', border: '1px solid #1e3a8a', fontWeight: '700', whiteSpace: 'nowrap', verticalAlign: 'middle' }}>#</th>
                    <th style={{ padding: '5px 10px', textAlign: 'left', border: '1px solid #1e3a8a', fontWeight: '700', whiteSpace: 'nowrap', verticalAlign: 'middle' }}>DESCRIPTION</th>
                    <th style={{ padding: '5px 2px', textAlign: 'center', border: '1px solid #1e3a8a', fontWeight: '700', whiteSpace: 'nowrap', verticalAlign: 'middle' }}>QTY</th>
                    <th style={{ padding: '5px 2px', textAlign: 'center', border: '1px solid #1e3a8a', fontWeight: '700', whiteSpace: 'nowrap', verticalAlign: 'middle' }}>RATE (Rs.)</th>
                    <th style={{ padding: '5px 2px', textAlign: 'center', border: '1px solid #1e3a8a', fontWeight: '700', whiteSpace: 'nowrap', verticalAlign: 'middle' }}>DISC</th>
                    <th style={{ padding: '5px 10px', textAlign: 'right', border: '1px solid #1e3a8a', fontWeight: '700', whiteSpace: 'nowrap', verticalAlign: 'middle' }}>AMOUNT (Rs.)</th>
                  </tr>
                </thead>
                <tbody>
                  {chunk.map((item, index) => {
                    const rowStyle: React.CSSProperties = {
                      backgroundColor: index % 2 === 0 ? '#ffffff' : '#f8fafc',
                      height: '20px',
                      boxSizing: 'border-box',
                    };
                    if (item.isPlaceholder) {
                      return (
                        <tr key={`ph-${index}`} style={rowStyle}>
                          <td style={{ border: '1px solid #e2e8f0', padding: '0', height: '20px' }}>&nbsp;</td>
                          <td style={{ border: '1px solid #e2e8f0', padding: '0', height: '20px' }}>&nbsp;</td>
                          <td style={{ border: '1px solid #e2e8f0', padding: '0', height: '20px' }}>&nbsp;</td>
                          <td style={{ border: '1px solid #e2e8f0', padding: '0', height: '20px' }}>&nbsp;</td>
                          <td style={{ border: '1px solid #e2e8f0', padding: '0', height: '20px' }}>&nbsp;</td>
                          <td style={{ border: '1px solid #e2e8f0', padding: '0', height: '20px' }}>&nbsp;</td>
                        </tr>
                      );
                    }
                    const globalIndex = pageIndex * ITEMS_PER_PAGE + index;
                    return (
                      <tr key={item.id || globalIndex} style={rowStyle}>
                        <td style={{ padding: '3px 2px', border: '1px solid #e2e8f0', color: '#64748b', textAlign: 'center', whiteSpace: 'nowrap', verticalAlign: 'middle', lineHeight: '1.2' }}>
                          {globalIndex + 1}
                        </td>
                        <td style={{ maxWidth: '80mm', padding: '3px 10px', border: '1px solid #e2e8f0', color: '#0f172a', fontWeight: '500', wordBreak: 'break-word', overflowWrap: 'break-word', whiteSpace: 'normal', verticalAlign: 'middle', lineHeight: '1.25' }}>
                          {item.itemName || item.inventoryItem?.productName || 'Item'}
                        </td>
                        <td style={{ padding: '3px 2px', textAlign: 'center', border: '1px solid #e2e8f0', color: '#334155', whiteSpace: 'nowrap', verticalAlign: 'middle', lineHeight: '1.2' }}>
                          {item.quantity}
                        </td>
                        <td style={{ padding: '3px 2px', textAlign: 'center', border: '1px solid #e2e8f0', color: '#334155', whiteSpace: 'nowrap', verticalAlign: 'middle', lineHeight: '1.2' }}>
                          {Math.round(item.unitPrice).toLocaleString()}
                        </td>
                        <td style={{ padding: '3px 2px', textAlign: 'center', border: '1px solid #e2e8f0', color: '#334155', whiteSpace: 'nowrap', verticalAlign: 'middle', lineHeight: '1.2' }}>
                          {getDiscountDisplay(item)}
                        </td>
                        <td style={{ padding: '3px 10px', textAlign: 'right', border: '1px solid #e2e8f0', color: '#0f172a', fontWeight: '700', whiteSpace: 'nowrap', verticalAlign: 'middle', lineHeight: '1.2' }}>
                          {Math.round(item.total).toLocaleString()}
                        </td>
                      </tr>
                    );
                  })}
                  {/* Row 21: SUB TOTAL */}
                  <tr style={{ height: '22px', backgroundColor: '#f8fafc', fontWeight: '700' }}>
                    <td colSpan={5} style={{ padding: '3px 12px', border: '1px solid #cbd5e1', textAlign: 'right', color: '#0f172a', fontWeight: '700', fontSize: '12px', letterSpacing: '0.5px', verticalAlign: 'middle' }}>
                      SUB TOTAL:
                    </td>
                    <td style={{ padding: '3px 10px', border: '1px solid #cbd5e1', textAlign: 'right', color: '#0f172a', fontWeight: '700', fontSize: '12px', whiteSpace: 'nowrap', verticalAlign: 'middle' }}>
                      Rs. {Math.round(pageSubTotal).toLocaleString()}
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Financial Summary – last page only */}
              {isLastPage && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: '8px', flexShrink: 0 }}>
                  {/* Notes */}
                  <div style={{ flex: '1.2', paddingRight: '20px' }}>
                    {Boolean(invoiceData.notes && invoiceData.notes.trim()) && (
                      <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '8px 12px', boxSizing: 'border-box' }}>
                        <strong style={{ display: 'block', fontSize: '11px', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>
                          Remarks / Notes
                        </strong>
                        <div style={{ fontSize: '12px', color: '#475569', fontStyle: 'italic', lineHeight: '1.4', wordBreak: 'break-word' }}>
                          {invoiceData.notes}
                        </div>
                      </div>
                    )}
                  </div>
                  {/* Totals Box */}
                  <div style={{ width: '280px', backgroundColor: '#f8fafc', padding: '10px 14px', borderRadius: '6px', border: '1px solid #e2e8f0', marginLeft: 'auto' }}>
                    {totalProductDiscount > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '12px', color: '#475569' }}>
                        <span>Product Discount:</span>
                        <span style={{ color: '#dc2626', fontWeight: '600' }}>- Rs. {Math.round(totalProductDiscount).toLocaleString()}</span>
                      </div>
                    )}
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
                        <span style={{ color: '#dc2626', fontWeight: '600' }}>- Rs. {Math.round(totalBillDiscount).toLocaleString()}</span>
                      </div>
                    )}
                    {documentTitle === "INVOICE" && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '12px', color: '#475569' }}>
                        <span>Amount Paid:</span>
                        <span style={{ fontWeight: '600' }}>Rs. {Math.round(paidAmount).toLocaleString()}</span>
                      </div>
                    )}
                    {(totalProductDiscount > 0 || totalBillDiscount > 0 || documentTitle === "INVOICE") && (
                      <div style={{ borderTop: '1.5px solid #e2e8f0', margin: '6px 0' }}></div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a' }}>NET TOTAL:</span>
                      <span style={{ fontSize: '16px', fontWeight: '800', color: '#1e3a8a' }}>
                        Rs. {Math.round(totalAmount).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>{/* end content area */}

            {/* ── FOOTER: absolute bottom — always pinned, never pushed off ── */}
            {documentTitle === "PURCHASE ORDER" ? (
              <div style={{
                position: 'absolute',
                bottom: '8mm',
                left: '15mm',
                right: '15mm',
                borderTop: '1px solid #cbd5e1',
                paddingTop: '7px',
              }}>
                <div style={{ textAlign: 'center', fontSize: '11px', color: '#64748b', fontWeight: '500', letterSpacing: '0.3px', marginBottom: '4px' }}>
                  Computer Generated Document – No Signature Required
                </div>
                <div style={{ textAlign: 'center', fontWeight: '700', fontSize: '11px', color: '#1e3a8a' }}>
                  Thank You For Trusting S &amp; K Enterprises.
                </div>
              </div>
            ) : (
              <div style={{
                position: 'absolute',
                bottom: '8mm',
                left: '15mm',
                right: '15mm',
                borderTop: '1px solid #e2e8f0',
                paddingTop: '7px',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', padding: '0 20px' }}>
                  <div style={{ textAlign: 'center', width: '25%' }}>
                    <div style={{ borderTop: '1.5px solid #94a3b8', paddingTop: '5px', fontSize: '11px', fontWeight: '700', color: '#475569' }}>
                      PREPARED BY
                    </div>
                  </div>
                  <div style={{ textAlign: 'center', width: '25%' }}>
                    <div style={{ borderTop: '1.5px solid #94a3b8', paddingTop: '5px', fontSize: '11px', fontWeight: '700', color: '#475569' }}>
                      AUTHORIZED BY
                    </div>
                  </div>
                  <div style={{ textAlign: 'center', width: '25%' }}>
                    <div style={{ borderTop: '1.5px solid #94a3b8', paddingTop: '5px', fontSize: '11px', fontWeight: '700', color: '#475569' }}>
                      CUSTOMER SIGNATURE
                    </div>
                  </div>
                </div>
                <div style={{ textAlign: 'center', fontWeight: '700', fontSize: '11px', color: '#1e3a8a' }}>
                  Thank You For Trusting S &amp; K Enterprises.
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default InvoiceCanvas;
