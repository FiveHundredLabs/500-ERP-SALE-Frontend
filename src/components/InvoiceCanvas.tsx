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
    if (item.discountType === 'percentage' && item.discountValue) return `${item.discountValue}%`;
    if (item.discountType === 'amount' && item.discountValue && item.unitPrice && item.quantity) {
       const percent = (item.discountValue / (item.unitPrice * item.quantity)) * 100;
       return `${percent.toFixed(0)}%`;
    }
    return '0%';
  };

  return (
    <div 
      className="invoice-canvas" 
      style={{ 
        width: '210mm', 
        minHeight: '297mm', 
        backgroundColor: '#ffffff',
        color: '#333',
        fontFamily: 'Arial, sans-serif',
        padding: '10mm 15mm',
        boxSizing: 'border-box',
        position: 'relative'
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #e5e7eb', paddingBottom: '15px', marginBottom: '15px' }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <img src={Logo} alt="Logo" style={{ width: '80px', height: '80px', objectFit: 'contain', marginRight: '15px' }} />
          <div>
            <h1 style={{ color: '#d32f2f', margin: '0 0 5px 0', fontSize: '22px', fontWeight: 'bold' }}>S & K Enterprises</h1>
            <div style={{ color: '#d32f2f', fontSize: '16px', marginBottom: '4px', display: 'flex', alignItems: 'center', fontWeight: '500' }}>
              <span style={{ marginRight: '5px' }}>📍</span> 116/01 Kudabuthgamuwa, Kotikawattha.
            </div>
            <div style={{ color: '#d32f2f', fontSize: '16px', display: 'flex', alignItems: 'center', fontWeight: '500' }}>
              <span style={{ marginRight: '5px' }}>📞</span> 0713500780
            </div>
          </div>
        </div>
        <div style={{ textAlign: 'right', paddingTop: '10px' }}>
          <h2 style={{ margin: '0 0 10px 0', fontSize: '32px', color: '#66809c', fontWeight: '400', letterSpacing: '1px' }}>INVOICE</h2>
          <div style={{ fontSize: '15px', color: '#66809c', marginBottom: '4px' }}>Date: {formatDate(invoiceData.issueDate)}</div>
          <div style={{ fontSize: '15px', color: '#66809c' }}>Invoice: {invoiceData.invoiceId}</div>
        </div>
      </div>

      {/* Customer Details Section */}
      <div style={{ backgroundColor: '#66809c', color: '#ffffff', padding: '6px 12px', fontSize: '16px', marginBottom: '10px' }}>
        Customer Details
      </div>
      <div style={{ display: 'flex', fontSize: '15px', marginBottom: '15px', padding: '0 10px', color: '#4b5563' }}>
        <div style={{ flex: 1.2 }}>Name: {customer.fullName || customer.shopName || "N/A"}</div>
        <div style={{ flex: 1 }}>Mobile: {customer.phone || "N/A"}</div>
        <div style={{ flex: 1.5 }}>Address: {renderAddress()}</div>
      </div>

      {/* Salesman Section */}
      <div style={{ backgroundColor: '#1e3a5f', color: '#ffffff', padding: '6px 12px', fontSize: '14px', fontWeight: 'bold', marginBottom: '15px' }}>
        Salesman: {salesmanName}
      </div>

      {/* Table */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px', fontSize: '14px' }}>
        <thead>
          <tr style={{ backgroundColor: '#90b4d6', color: '#111' }}>
            <th style={{ padding: '10px 8px', textAlign: 'left', border: '1px solid #d1d5db', width: '5%', fontWeight: 'bold' }}>#</th>
            <th style={{ padding: '10px 8px', textAlign: 'left', border: '1px solid #d1d5db', width: '45%', fontWeight: 'bold' }}>DESCRIPTION</th>
            <th style={{ padding: '10px 8px', textAlign: 'center', border: '1px solid #d1d5db', width: '10%', fontWeight: 'bold' }}>QTY</th>
            <th style={{ padding: '10px 8px', textAlign: 'center', border: '1px solid #d1d5db', width: '15%', fontWeight: 'bold' }}>RATE</th>
            <th style={{ padding: '10px 8px', textAlign: 'center', border: '1px solid #d1d5db', width: '10%', fontWeight: 'bold' }}>DISC(%)</th>
            <th style={{ padding: '10px 8px', textAlign: 'right', border: '1px solid #d1d5db', width: '15%', fontWeight: 'bold' }}>AMOUNT</th>
          </tr>
        </thead>
        <tbody>
          {invoiceData.items.map((item, index) => (
            <tr key={item.id} style={{ backgroundColor: '#ffffff' }}>
              <td style={{ padding: '8px', border: '1px solid #e5e7eb', color: '#9ca3af' }}>{index + 1}</td>
              <td style={{ padding: '8px', border: '1px solid #e5e7eb', color: '#374151' }}>{item.itemName || item.item}</td>
              <td style={{ padding: '8px', textAlign: 'center', border: '1px solid #e5e7eb', color: '#374151' }}>{item.quantity}</td>
              <td style={{ padding: '8px', textAlign: 'center', border: '1px solid #e5e7eb', color: '#374151' }}>Rs.{item.unitPrice.toFixed(2)}</td>
              <td style={{ padding: '8px', textAlign: 'center', border: '1px solid #e5e7eb', color: '#374151' }}>
                {getDiscountDisplay(item)}
              </td>
              <td style={{ padding: '8px', textAlign: 'right', border: '1px solid #e5e7eb', color: '#374151' }}>Rs.{item.total.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals Section */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '30px', fontSize: '14px', color: '#374151' }}>
        <div style={{ width: '400px' }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '6px 0', gap: '30px' }}>
            <span style={{ fontWeight: '600' }}>Sub Total:</span>
            <span style={{ fontWeight: 'bold' }}>Rs.{subTotal.toFixed(2)}</span>
          </div>
          
          <div style={{ borderTop: '1px solid #e5e7eb', margin: '20px 0 15px 0' }}></div>
          
          <div style={{ textAlign: 'right', color: '#6b7280', marginBottom: '10px' }}>
            Payment Type - {invoiceData.paymentMethod?.toLowerCase() || 'cash'}
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '4px 0', fontWeight: 'bold' }}>
            <span style={{ marginRight: '10px' }}>Customer Paid -</span>
            <span>Rs.{paidAmount.toFixed(2)}</span>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '6px 0', fontWeight: 'bold', color: '#dc2626' }}>
            <span style={{ borderBottom: '1.5px solid #dc2626', paddingBottom: '2px' }}>
              Balance Amount - Rs.{balanceAmount.toFixed(2)}
            </span>
          </div>

          <div style={{ textAlign: 'right', marginTop: '15px', fontSize: '15px', color: '#4b5563' }}>Total Amount</div>
          <div style={{ textAlign: 'right', fontSize: '28px', color: '#111', marginTop: '5px' }}>Rs.{totalAmount.toFixed(2)}</div>
        </div>
      </div>

      {/* Footer Signatures */}
      <div style={{ position: 'absolute', bottom: '15mm', left: '15mm', right: '15mm' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '25px' }}>
          <div style={{ textAlign: 'center', width: '25%' }}>
            <div style={{ borderTop: '1px solid #111', paddingTop: '8px', fontSize: '13px', fontWeight: 'bold' }}>CHECKED BY</div>
          </div>
          <div style={{ textAlign: 'center', width: '25%' }}>
            <div style={{ borderTop: '1px solid #111', paddingTop: '8px', fontSize: '13px', fontWeight: 'bold' }}>AUTHORIZED BY</div>
          </div>
          <div style={{ textAlign: 'center', width: '25%' }}>
            <div style={{ borderTop: '1px solid #111', paddingTop: '8px', fontSize: '13px', fontWeight: 'bold' }}>RECEIVED BY</div>
          </div>
        </div>
        
        <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '15px', marginBottom: '8px', color: '#111' }}>
          Thank You For Trusting S & K Enterprises.
        </div>
        <div style={{ textAlign: 'center', color: '#9ca3af', fontSize: '11px' }}>
          Generated by 500 Core ERP
        </div>
      </div>
    </div>
  );
};

export default InvoiceCanvas;

