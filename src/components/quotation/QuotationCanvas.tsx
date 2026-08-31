import React, { useEffect, useRef } from "react";
import type { QuotationData } from "../../types/quotation";
import QuotationTemplate from "../../assets/business_quotation_template.jpg";



interface QuotationCanvasProps {
  quotationData: QuotationData;
}

const QuotationCanvas: React.FC<QuotationCanvasProps> = ({ quotationData }) => {
  const templateRef = useRef<HTMLImageElement>(null);
  
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    } catch {
      return dateString.split('T')[0] || "02/05/2025";
    }
  };

  // Calculate totals
  const calculateTotals = () => {
    const subTotal = quotationData.subTotal;
    const discountAmount = quotationData.discount;
    const totalAmount = quotationData.totalAmount;
    
    return { subTotal, discountAmount, totalAmount };
  };

  const { subTotal, discountAmount, totalAmount } = calculateTotals();

  const getRowColor = (index: number) => {
    return index % 2 === 0 ? '#f5f5f5' : '#ffffff';
  };

  // Company VAT number 
  const companyVatNumber = "218231209 - 7000";

  useEffect(() => {
    if (templateRef.current) {
      const img = templateRef.current;
      if (!img.complete) {
        img.onload = () => {
        };
      }
    }
  }, []);

  const renderCustomerDetails = () => {
    const details = [];
    
    if (!quotationData.customerDetails) {
      details.push(<div key="no-customer">Customer information not available</div>);
      return details;
    }
    
    // Add address if it exists
    if (quotationData.customerDetails.address) {
      const addressParts = [quotationData.customerDetails.address, quotationData.customerDetails.city].filter(Boolean);
      
      if (addressParts.length > 0) {
        details.push(<div key="address">{addressParts.join(', ')}</div>);
      }
    }
    
    // Add date 
    details.push(<div key="date">{formatDate(quotationData.issueDate)}</div>);
    
    // Add email only if it exists
    if (quotationData.customerDetails.email) {
      details.push(<div key="email">{quotationData.customerDetails.email}</div>);
    }
    
    // Add phone only if it exists
    if (quotationData.customerDetails.phone) {
      details.push(<div key="phone">{quotationData.customerDetails.phone}</div>);
    }
    
    // Add VAT number only if it exists
    if (quotationData.customerDetails.vatNumber) {
      details.push(<div key="vat">VAT: {quotationData.customerDetails.vatNumber}</div>);
    }
    
    return details;
  };

  return (
    <div className="relative" style={{ width: '210mm', height: '297mm' }}>
      {/* Background Template Image */}
      <img 
        ref={templateRef}
        src={QuotationTemplate} 
        alt="Quotation Template Background"
        crossOrigin="anonymous"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          zIndex: 1,
          pointerEvents: 'none' 
        }}
        onError={(e) => {
          console.error('Failed to load template image:', e);
          (e.target as HTMLImageElement).style.display = 'none';
        }}
      />

      {/* Quotation Content Overlay */}
      <div 
        className="relative z-10"
        style={{
          padding: '15mm',
          width: '100%',
          height: '100%',
          boxSizing: 'border-box',
          color: '#000000',
          fontSize: '12px',
          lineHeight: '1.4',
          fontFamily: 'Arial, sans-serif'
        }}
      >
        {/* Customer Name */}
        <div 
          style={{
            position: 'absolute',
            top: '54mm',
            left: '15mm',
            fontSize: '15px',
            fontWeight: 'bold',
            color: '#000000'
          }}
        >
          {quotationData.customerDetails?.fullName || "Customer Name"}
        </div>

        {/* Customer Details */}
        <div 
          style={{
            position: 'absolute',
            top: '60mm',
            left: '15mm',
            fontSize: '11px',
            color: '#494949ff',
            lineHeight: '1.5'
          }}
        >
          {renderCustomerDetails()}
        </div>

        {/* Quotation Number */}
        <div 
          style={{
            position: 'absolute',
            top: '65mm',
            right: '15mm',
            fontSize: '13px',
            color: '#000000',
            textAlign: 'right'
          }}
        >
          #{quotationData.quotationNumber || "QUO-0000000"}
        </div>

        {/* Company VAT Number */}
        <div 
          style={{
            position: 'absolute',
            top: '69mm',
            right: '15mm',
            fontSize: '11px',
            color: '#494949ff',
            textAlign: 'right',
            marginTop: '2mm'
          }}
        >
          VAT: {companyVatNumber}
        </div>

        <div 
          style={{
            position: 'absolute',
            top: '82mm',
            left: '15mm',
            right: '15mm',
            height: '1px',
            backgroundColor: '#000000',
            borderTop: '1px solid #000000'
          }}
        />

        {/* Table Header */}
        <div 
          style={{
            position: 'absolute',
            top: '88mm',
            left: '15mm',
            right: '15mm',
            fontSize: '12px',
            fontWeight: 'bold',
            color: '#ffffff',
            display: 'grid',
            gridTemplateColumns: '60% 13% 13% 14%',
            backgroundColor: '#2e2d2dff',
            padding: '2mm 0',
            alignItems: 'center',
            height: '8mm',
            minHeight: '8mm',
            maxHeight: '8mm',
            boxSizing: 'border-box'
          }}
        >
          <div style={{ 
            paddingLeft: '2mm',
            display: 'flex', 
            alignItems: 'center',
            justifyContent: 'flex-start', 
            height: '100%'
          }}>
            DESCRIPTION
          </div>
          <div style={{ 
            textAlign: 'center', 
            display: 'flex', 
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%'
          }}>
            PRICE
          </div>
          <div style={{ 
            textAlign: 'center', 
            display: 'flex', 
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%'
          }}>
            QTY
          </div>
          <div style={{ 
            textAlign: 'center', 
            display: 'flex', 
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%'
          }}>
            TOTAL
          </div>
        </div>

        {/* Items List */}
        <div 
          style={{
            position: 'absolute',
            top: '96mm',
            left: '15mm',
            right: '15mm',
            maxHeight: '70mm',
            overflow: 'hidden'
          }}
        >
          {quotationData.items.length > 0 ? (
            quotationData.items.map((item, index) => (
              <div 
                key={item.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '60% 13% 13% 14%',
                  backgroundColor: getRowColor(index),
                  padding: '3mm 2mm',
                  fontSize: '11px',
                  color: '#000000',
                  borderBottom: index < quotationData.items.length - 1 ? '1px solid #e0e0e0' : 'none',
                  minHeight: '10mm',
                  alignItems: 'center'
                }}
              >
                <div style={{ 
                  paddingLeft: '2mm', 
                  fontWeight: 'bold',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  height: '100%'
                }}>
                  <span>{item.itemName || item.inventoryItem?.productName || item.inventoryItemId || `ITEM NAME / DESCRIPTION`}</span>
                  {item.discountAmount && item.discountAmount > 0 ? (
                    <span style={{ fontSize: '9px', color: '#dc2626', fontWeight: 'normal' }}>
                      (Discount: -LKR {item.discountAmount.toFixed(2)})
                    </span>
                  ) : null}
                </div>
                <div style={{ 
                  textAlign: 'center',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%'
                }}>
                  LKR {item.unitPrice.toFixed(2)}
                </div>
                <div style={{ 
                  textAlign: 'center',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%'
                }}>
                  {item.quantity}
                </div>
                <div style={{ 
                  textAlign: 'center', 
                  fontWeight: 'bold',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%'
                }}>
                  LKR {item.total.toFixed(2)}
                </div>
              </div>
            ))
          ) : (
            <div 
              style={{
                display: 'grid',
                gridTemplateColumns: '60% 13% 13% 14%',
                backgroundColor: '#f5f5f5',
                padding: '3mm 2mm',
                fontSize: '11px',
                color: '#000000',
                fontStyle: 'italic',
                minHeight: '10mm',
                alignItems: 'center'
              }}
            >
              <div style={{ 
                paddingLeft: '2mm',
                display: 'flex',
                alignItems: 'center',
                height: '100%'
              }}>
                No items added
              </div>
              <div style={{ 
                textAlign: 'center',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%'
              }}>
                -
              </div>
              <div style={{ 
                textAlign: 'center',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%'
              }}>
                -
              </div>
              <div style={{ 
                textAlign: 'center',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%'
              }}>
                -
              </div>
            </div>
          )}
        </div>

        {/* Payment Details Section */}
        <div 
          style={{
            position: 'absolute',
            top: '175mm',
            left: '15mm',
            right: '15mm',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '20mm',
            fontSize: '12px',
            color: '#000000'
          }}
        >
          {/* Left Column - Payment Data */}
          <div>
            <div style={{ fontWeight: 'bold', marginBottom: '1mm', fontSize: '12px' }}>PAYMENT DATA:</div>
            <div style={{ marginBottom: '1mm' }}>PAYMENT METHOD: {quotationData.paymentMethod || "CASH"}</div>
            <div style={{ marginBottom: '1mm' }}>STATUS: {quotationData.status || "PENDING"}</div>
            <div style={{ marginBottom: '1mm' }}>VALID UNTIL: {formatDate(quotationData.validUntil)}</div>
          </div>
          
          {/* Right Column - Totals */}
          <div style={{ marginTop: '0mm' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'center', marginBottom: '2mm', paddingBottom: '1mm' }}>
              <span style={{ fontWeight: 'bold' }}>SUBTOTAL:</span>
              <span style={{ textAlign: 'right', minWidth: '50px' }}>LKR {subTotal.toFixed(2)}</span>
            </div>
            {discountAmount > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'center', marginBottom: '2mm', paddingBottom: '1mm' }}>
                <span style={{ fontWeight: 'bold' }}>DISCOUNT:</span>
                <span style={{ textAlign: 'right', minWidth: '50px', color: '#dc2626' }}>- LKR {discountAmount.toFixed(2)}</span>
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'center', fontWeight: 'bold', fontSize: '14px', marginTop: '3mm' }}>
              <span>TOTAL AMOUNT:</span>
              <span style={{ textAlign: 'right', minWidth: '50px' }}>LKR {totalAmount.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div 
          style={{
            position: 'absolute',
            top: '203mm',
            left: '15mm',
            right: '15mm',
            height: '1px',
            backgroundColor: '#000000',
            borderTop: '1px solid #000000'
          }}
        />
      
        {/* Terms and Conditions */}
        <div 
          style={{
            position: 'absolute',
            top: '207mm',
            left: '15mm',
            right: '15mm',
            fontSize: '10px',
            color: '#000000',
            lineHeight: '1.3',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '20mm'
          }}
        >
          {/* Left Column - Terms and Conditions */}
          <div>
            <div style={{ fontWeight: 'bold', marginBottom: '2mm', fontSize: '11px' }}>
              TERMS AND CONDITIONS
            </div>
            <div style={{ marginBottom: '0.5mm' }}>• This quotation is valid until {formatDate(quotationData.validUntil)}.</div>
            <div style={{ marginBottom: '0.5mm' }}>• Prices are subject to change without prior notice.</div>
            <div style={{ marginBottom: '0.5mm' }}>• Payment terms: {quotationData.paymentMethod}.</div>
            <div style={{ marginBottom: '0.5mm' }}>• Delivery time: 3-5 working days after order confirmation.</div>
            <div style={{ marginBottom: '0.5mm' }}>• Warranty covers only manufacturer defects.</div>
            {quotationData.notes && (
              <>
                <div style={{ marginTop: '2mm', fontWeight: 'bold' }}>Additional Notes:</div>
                <div style={{ fontStyle: 'italic' }}>{quotationData.notes}</div>
              </>
            )}
          </div>

          {/* Right Column - Details */}
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2mm', marginBottom: '1mm' }}>
              <span style={{ fontWeight: '500' }}>Quotation Number:</span>
              <span>{quotationData.quotationNumber || "N/A"}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2mm', marginBottom: '1mm' }}>
              <span style={{ fontWeight: '500' }}>Issue Date:</span>
              <span>{formatDate(quotationData.issueDate)}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2mm', marginBottom: '1mm' }}>
              <span style={{ fontWeight: '500' }}>Valid Until:</span>
              <span>{formatDate(quotationData.validUntil)}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2mm', marginBottom: '1mm' }}>
              <span style={{ fontWeight: '500' }}>Status:</span>
              <span>{quotationData.status}</span>
            </div>
          </div>
        </div>

        {/* Date at bottom */}
        <div 
          style={{
            position: 'absolute',
            top: '251mm', 
            left: '32mm',
            fontSize: '10px',
            color: '#000000',
            fontWeight: '500',
            marginTop: '3mm'
          }}
        >
          {formatDate(quotationData.issueDate)}
        </div>
      </div>
    </div>
  );
};

export default QuotationCanvas;
