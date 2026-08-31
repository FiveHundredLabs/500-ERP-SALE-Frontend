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

  const customer = invoiceData.customerDetails || ({} as any);
  const salesmanName = invoiceData.salesman?.name || customer.salesRepName || "N/A";

  const renderAddress = () => {
    if (!customer.address) return "N/A";
    if (typeof customer.address === 'string') return customer.address;
    const parts = [];
    if (customer.address.street) parts.push(customer.address.street);
    if (customer.address.city) parts.push(customer.address.city);
    return parts.join(', ');
  };

  const getDiscountDisplay = (item: any) => {
    if (item.discountType === 'percentage' && item.discountValue) return `${Math.round(item.discountValue)}%`;
    if (item.discountType === 'amount' && item.discountValue && item.unitPrice && item.quantity) {
       const percent = (item.discountValue / (item.unitPrice * item.quantity)) * 100;
       return `${Math.round(percent)}%`;
    }
    if (item.unitPrice && item.quantity && item.total) {
      const expectedTotal = item.unitPrice * item.quantity;
      if (expectedTotal > item.total) {
        const discountAmount = expectedTotal - item.total;
        const percent = (discountAmount / expectedTotal) * 100;
        return `${Math.round(percent)}%`;
      }
    }
    return '0%';
  };

  const documentTitle = invoiceData.documentTitle || "INVOICE";
  const documentLabel = documentTitle === "QUOTATION" ? "Quotation:" : documentTitle === "PURCHASE ORDER" ? "Invoice:" : "Invoice:";

  const ITEMS_PER_PAGE = 20;
  const chunkedItems = [];
  
  const itemsArray = invoiceData.items || [];
  for (let i = 0; i < itemsArray.length; i += ITEMS_PER_PAGE) {
    const chunk = itemsArray.slice(i, i + ITEMS_PER_PAGE);
    while (chunk.length < ITEMS_PER_PAGE) {
      chunk.push({ isPlaceholder: true } as any);
    }
    chunkedItems.push(chunk);
  }
  
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
              height: '297mm',
              backgroundColor: '#ffffff',
              color: '#1f2937', 
              fontFamily: 'Arial, sans-serif',
              padding: '10mm 15mm',
              boxSizing: 'border-box',
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              pageBreakAfter: isLastPage ? 'auto' : 'always',
              marginBottom: isLastPage ? '0' : '20px'
            }}
          >
            {/* Header Section */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #e2e8f0', paddingBottom: '10px', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <img src={Logo} alt="Logo" style={{ width: '65px', height: '65px', objectFit: 'contain', marginRight: '15px' }} />
                <div>
                  <h1 style={{ color: '#dc2626', margin: '0 0 2px 0', fontSize: '20px', fontWeight: 'bold' }}>
                    S & K Enterprises
                  </h1>
                  <div style={{ color: '#dc2626', fontSize: '13px', marginBottom: '2px', display: 'flex', alignItems: 'center' }}>
                    <span style={{ marginRight: '6px' }}>📍</span> 116/01 Kudabuthgamuwa, Kotikawattha.
                  </div>
                  <div style={{ color: '#dc2626', fontSize: '13px', display: 'flex', alignItems: 'center' }}>
                    <span style={{ marginRight: '6px' }}>📞</span> 0713500780
                  </div>
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <h2 style={{ margin: '0 0 5px 0', fontSize: '28px', color: '#64748b', fontWeight: 'normal' }}>
                  {documentTitle}
                </h2>
                <div style={{ fontSize: '14px', color: '#64748b', marginBottom: '2px' }}>
                  Date: {formatDate(invoiceData.issueDate)}
                </div>
                <div style={{ fontSize: '14px', color: '#64748b' }}>
                  {documentLabel} {invoiceData.invoiceId}
                </div>
              </div>
            </div>

            {/* Customer Details Section */}
            <div style={{ backgroundColor: '#64748b', color: '#ffffff', padding: '4px 10px', fontSize: '15px', fontWeight: 'bold', marginBottom: '8px' }}>
              Customer Details
            </div>
            <div style={{ display: 'flex', fontSize: '14px', color: '#475569', padding: '0 10px', marginBottom: '8px', gap: '20px' }}>
              <div>Name: {customer.fullName || customer.shopName || "Walk-in Customer"}</div>
              <div>Mobile: {customer.phone || "N/A"}</div>
              <div>Address: {renderAddress()}</div>
            </div>

            {/* Salesman Section */}
            <div style={{ backgroundColor: '#1e293b', color: '#ffffff', padding: '4px 10px', fontSize: '13px', fontWeight: 'bold', marginBottom: '4px' }}>
              Salesman: {salesmanName?.toUpperCase()}
            </div>

            {/* Main Items Table */}
            <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', fontSize: '12px' }}>
              <thead>
                <tr style={{ backgroundColor: '#93c5fd', color: '#0f172a' }}>
                  <th style={{ padding: '6px 5px', textAlign: 'center', border: '1px solid #e2e8f0', width: '5%', fontWeight: 'bold' }}>#</th>
                  <th style={{ padding: '6px 10px', textAlign: 'left', border: '1px solid #e2e8f0', width: '43%', fontWeight: 'bold' }}>DESCRIPTION</th>
                  <th style={{ padding: '6px 5px', textAlign: 'center', border: '1px solid #e2e8f0', width: '7%', fontWeight: 'bold' }}>QTY</th>
                  <th style={{ padding: '6px 10px', textAlign: 'center', border: '1px solid #e2e8f0', width: '15%', fontWeight: 'bold', whiteSpace: 'nowrap' }}>RATE (Rs.)</th>
                  <th style={{ padding: '6px 5px', textAlign: 'center', border: '1px solid #e2e8f0', width: '10%', fontWeight: 'bold' }}>DISC(%)</th>
                  <th style={{ padding: '6px 10px', textAlign: 'right', border: '1px solid #e2e8f0', width: '20%', fontWeight: 'bold', whiteSpace: 'nowrap' }}>AMOUNT (Rs.)</th>
                </tr>
              </thead>
              <tbody>
                {chunk.map((item, index) => {
                  const rowStyle = { backgroundColor: '#ffffff', height: '22px' };
                  
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
                      <td style={{ padding: '2px 5px', border: '1px solid #e2e8f0', color: '#475569', textAlign: 'center', whiteSpace: 'nowrap' }}>{globalIndex + 1}</td>
                      <td style={{ padding: '2px 10px', border: '1px solid #e2e8f0', color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.itemName || item.item}</td>
                      <td style={{ padding: '2px 5px', textAlign: 'center', border: '1px solid #e2e8f0', color: '#1e293b', whiteSpace: 'nowrap' }}>{item.quantity}</td>
                      <td style={{ padding: '2px 10px', textAlign: 'center', border: '1px solid #e2e8f0', color: '#1e293b', whiteSpace: 'nowrap' }}>{Math.round(item.unitPrice).toLocaleString()}</td>
                      <td style={{ padding: '2px 5px', textAlign: 'center', border: '1px solid #e2e8f0', color: '#1e293b', whiteSpace: 'nowrap' }}>
                        {getDiscountDisplay(item)}
                      </td>
                      <td style={{ padding: '2px 10px', textAlign: 'right', border: '1px solid #e2e8f0', color: '#1e293b', whiteSpace: 'nowrap' }}>{Math.round(item.total).toLocaleString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Financial Summary & Footer Section */}
            {isLastPage && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: '15px' }}>
                {/* Left Side: Notes */}
                <div style={{ flex: '1.2', paddingRight: '20px' }}>
                  {invoiceData.notes && (
                    <div>
                      <strong style={{ display: 'block', fontSize: '11px', color: '#64748b', textTransform: 'uppercase', marginBottom: '3px' }}>Remarks / Notes</strong>
                      <div style={{ fontSize: '12px', color: '#475569', fontStyle: 'italic', maxHeight: '40px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{invoiceData.notes}</div>
                    </div>
                  )}
                </div>

                {/* Right Side: PDF Style Totals */}
                <div style={{ flex: '1', textAlign: 'right' }}>
                  {invoiceData.paymentMethod && (
                    <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '6px' }}>
                      Payment Type - {invoiceData.paymentMethod}
                    </div>
                  )}
                  
                  <div style={{ fontSize: '13px', color: '#1e293b', fontWeight: 'bold', marginBottom: '6px' }}>
                    Customer Paid - Rs. {Math.round(paidAmount).toLocaleString()}
                  </div>
                  
                  <div style={{ fontSize: '13px', color: '#dc2626', fontWeight: 'bold', marginBottom: '15px' }}>
                    Balance Amount - Rs. {Math.round(balanceAmount).toLocaleString()}
                  </div>
                  
                  <div style={{ borderTop: '1px solid #000000', paddingTop: '8px' }}>
                    <div style={{ fontSize: '13px', color: '#475569', marginBottom: '4px' }}>Total Amount</div>
                    <div style={{ fontSize: '26px', color: '#000000', fontWeight: 'normal' }}>
                      Rs. {Math.round(totalAmount).toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Footer Signatures Area */}
            <div style={{ marginTop: 'auto', paddingTop: '40px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
                <div style={{ textAlign: 'center', width: '30%' }}>
                  <div style={{ borderTop: '1px solid #000000', paddingTop: '8px', fontSize: '11px', fontWeight: 'bold', color: '#000000' }}>CHECKED BY</div>
                </div>
                <div style={{ textAlign: 'center', width: '30%' }}>
                  <div style={{ borderTop: '1px solid #000000', paddingTop: '8px', fontSize: '11px', fontWeight: 'bold', color: '#000000' }}>AUTHORIZED BY</div>
                </div>
                <div style={{ textAlign: 'center', width: '30%' }}>
                  <div style={{ borderTop: '1px solid #000000', paddingTop: '8px', fontSize: '11px', fontWeight: 'bold', color: '#000000' }}>RECEIVED BY</div>
                </div>
              </div>
              
              <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '12px', marginBottom: '4px', color: '#000000' }}>
                Thank You For Trusting S & K Enterprises.
              </div>
              <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: '10px' }}>
                Generated by 500Core ERP System
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default InvoiceCanvas;
