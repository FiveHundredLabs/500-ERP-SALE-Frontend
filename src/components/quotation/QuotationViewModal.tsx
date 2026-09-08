import React, { useRef, useState } from 'react';
import { FileText, Download, Printer, Share2, Copy, Check, ShoppingCart, MessageCircle, Mail, CheckCircle, ExternalLink } from 'lucide-react';
import { Modal, LoadingSpinner } from '../common';
import InvoiceCanvas from '../InvoiceCanvas';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import type { QuotationData } from '../../types/quotation';
import { generateQuotationWhatsAppMessage, getWhatsAppUrl } from '../../utils/whatsapp';

interface QuotationViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  quotationData: QuotationData | null;
  onConvertToPO?: (quotation: QuotationData) => void;
  onShareSuccess?: (message: string) => void;
}

export const QuotationViewModal: React.FC<QuotationViewModalProps> = ({
  isOpen,
  onClose,
  quotationData,
  onConvertToPO,
  onShareSuccess,
}) => {
  const quotationRef = useRef<HTMLDivElement>(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [shareFeedback, setShareFeedback] = useState<{
    phone: string;
    pdfName: string;
    waUrl: string;
  } | null>(null);

  if (!quotationData) return null;

  // Retrieve customer WhatsApp number (1st phone number)
  const getCustomerPhone = (): string => {
    if (quotationData.customerDetails?.phone) return quotationData.customerDetails.phone;
    if (typeof quotationData.customer === 'object' && (quotationData.customer as any)?.phone) {
      return (quotationData.customer as any).phone;
    }
    return '';
  };

  const getCustomerName = (): string => {
    if (quotationData.customerDetails?.fullName) return quotationData.customerDetails.fullName;
    if (typeof quotationData.customer === 'object' && (quotationData.customer as any)?.fullName) {
      return (quotationData.customer as any).fullName;
    }
    if ((quotationData.customerDetails as any)?.shopName) return (quotationData.customerDetails as any).shopName;
    return 'Valued Customer';
  };

  const customerPhone = getCustomerPhone();
  const customerName = getCustomerName();

  const quotationShareUrl = quotationData.id
    ? `${window.location.origin}/quotation/view/${quotationData.id}`
    : window.location.href;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(quotationShareUrl);
      setCopiedLink(true);
      onShareSuccess?.("Quotation link copied to clipboard!");
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      // ignore
    }
  };

  // Generate and Download PDF
  const generateAndDownloadPDF = async (): Promise<boolean> => {
    if (!quotationRef.current) return false;
    try {
      setIsGeneratingPDF(true);
      if (document.fonts) {
        await document.fonts.ready;
      }
      await new Promise(resolve => setTimeout(resolve, 50));

      const pages = quotationRef.current.querySelectorAll('.invoice-page');
      if (pages.length === 0) return false;

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true,
      });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      for (let i = 0; i < pages.length; i++) {
        const canvas = await html2canvas(pages[i] as HTMLElement, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff',
          onclone: (_clonedDoc: Document, clonedElement: HTMLElement) => {
            let curr: HTMLElement | null = clonedElement;
            while (curr) {
              curr.style.transform = 'none';
              curr = curr.parentElement;
            }
          },
        });
        const imgData = canvas.toDataURL('image/png');
        if (i > 0) pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
      }

      const fileName = `Quotation-${quotationData.quotationNumber || 'draft'}.pdf`;
      pdf.save(fileName);
      return true;
    } catch (err) {
      console.error('Failed to export PDF:', err);
      return false;
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  // Main WhatsApp Share Flow: Preview -> Generate PDF -> Open WhatsApp chat pre-filled with customer number & message
  const handleShareWhatsApp = async () => {
    setShowShareMenu(false);
    
    // Step 1: Generate & Download PDF
    await generateAndDownloadPDF();
    const pdfFileName = `Quotation-${quotationData.quotationNumber || 'draft'}.pdf`;

    // Step 2: Build formatted WhatsApp message
    const message = generateQuotationWhatsAppMessage({
      quotationNumber: quotationData.quotationNumber || 'draft',
      customerName: customerName,
      totalAmount: quotationData.totalAmount,
      issueDate: quotationData.issueDate || new Date().toISOString().split('T')[0],
      itemsCount: quotationData.items.length,
      remarks: quotationData.notes,
      shareUrl: quotationShareUrl,
    });

    // Step 3: Open WhatsApp with target phone number
    const waUrl = getWhatsAppUrl(customerPhone, message);
    window.open(waUrl, '_blank');

    // Step 4: Show user guidance
    setShareFeedback({
      phone: customerPhone,
      pdfName: pdfFileName,
      waUrl: waUrl,
    });

    onShareSuccess?.(`WhatsApp chat opened for ${customerPhone}! PDF downloaded — attach and click Send.`);
  };

  const handleShareEmail = () => {
    const subject = `Quotation ${quotationData.quotationNumber} from 500Core ERP`;
    const body = `Hello ${customerName},\n\nPlease find your quotation details below:\n\nQuotation: ${quotationData.quotationNumber}\nTotal Amount: LKR ${quotationData.totalAmount.toFixed(2)}\n\nView Online: ${quotationShareUrl}\n\nThank you for choosing 500Core!`;
    window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, '_blank');
    setShowShareMenu(false);
  };

  const handlePrint = () => {
    if (!quotationRef.current) return;
    const docNode = quotationRef.current.querySelector('.invoice-document');
    if (!docNode) return;

    const printWin = window.open('', '_blank', 'width=900,height=1200');
    if (!printWin) return;

    const logoImg = quotationRef.current.querySelector('img[alt="Logo"]') as HTMLImageElement | null;
    let logoSrc = logoImg?.src || '';

    const writeAndPrint = (resolvedLogoSrc: string) => {
      const html = (docNode as HTMLElement).innerHTML.replace(
        /src="[^"]*logo[^"]*"/gi,
        `src="${resolvedLogoSrc}"`
      );

      printWin.document.open();
      printWin.document.write(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>Print Document</title>
  <link rel="preconnect" href="https://fonts.googleapis.com"/>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"/>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: #fff;
      font-family: Inter, Arial, sans-serif;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .invoice-document {
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .invoice-page {
      width: 210mm;
      height: 297mm;
      min-height: 297mm;
      max-height: 297mm;
      padding: 10mm 15mm;
      box-sizing: border-box;
      background: #ffffff;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      page-break-after: always;
      break-after: page;
    }
    .invoice-page:last-child {
      page-break-after: auto;
      break-after: auto;
    }
    .invoice-page table {
      table-layout: fixed;
      width: 180mm;
      min-width: 180mm;
      max-width: 180mm;
      border-collapse: collapse;
      margin: 0 auto;
    }
    .invoice-page th,
    .invoice-page td {
      box-sizing: border-box;
      vertical-align: middle;
    }
    @page {
      size: A4 portrait;
      margin: 0;
    }
    @media print {
      html, body { margin: 0; padding: 0; }
      .invoice-page { page-break-after: always; break-after: page; }
      .invoice-page:last-child { page-break-after: auto; break-after: auto; }
    }
  </style>
</head>
<body>
  <div class="invoice-document">${html}</div>
</body>
</html>`);
      printWin.document.close();

      printWin.onload = () => {
        setTimeout(() => {
          printWin.focus();
          printWin.print();
          printWin.close();
        }, 600);
      };
    };

    if (logoSrc && !logoSrc.startsWith('data:')) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const cvs = document.createElement('canvas');
          cvs.width = img.naturalWidth;
          cvs.height = img.naturalHeight;
          cvs.getContext('2d')!.drawImage(img, 0, 0);
          writeAndPrint(cvs.toDataURL('image/png'));
        } catch {
          writeAndPrint(logoSrc);
        }
      };
      img.onerror = () => writeAndPrint(logoSrc);
      img.src = logoSrc;
    } else {
      writeAndPrint(logoSrc);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        setShareFeedback(null);
        onClose();
      }}
      title={`Quotation Preview — ${quotationData.quotationNumber || 'draft'}`}
      icon={<FileText className="w-5 h-5 text-blue-400" />}
      size="xl"
      className="max-h-[96vh] max-w-[96vw] flex flex-col"
    >
      <div className="flex-1 flex flex-col min-h-0 space-y-3">
        {/* Actions Bar */}
        <div className="flex-shrink-0 flex flex-wrap items-center justify-between gap-3 bg-[#0f172a] p-3 rounded-xl border border-[#334155]">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-300">
              Total: <span className="text-emerald-400 font-mono font-bold text-sm">LKR {quotationData.totalAmount.toFixed(2)}</span>
            </span>
            <span className="text-xs text-gray-500">•</span>
            <span className="text-xs text-gray-400">{quotationData.items.length} {quotationData.items.length === 1 ? 'item' : 'items'}</span>
            <span className="text-xs text-gray-500">•</span>
            <span className="text-xs text-slate-300 font-mono flex items-center gap-1">
              <MessageCircle size={11} className="text-emerald-400" />
              <span>{customerPhone}</span>
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Primary Action: Share to WhatsApp with Customer's 1st Phone Number */}
            <button
              type="button"
              onClick={handleShareWhatsApp}
              disabled={isGeneratingPDF}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition shadow-md disabled:opacity-50"
              title={`Generate PDF & Open WhatsApp chat for ${customerPhone}`}
            >
              <MessageCircle size={14} className="text-white" />
              <span>Share to WhatsApp</span>
              <span className="text-[10px] bg-emerald-800/80 text-emerald-100 px-1.5 py-0.5 rounded font-mono hidden sm:inline">
                {customerPhone}
              </span>
            </button>

            {/* Share Options Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowShareMenu(!showShareMenu)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1e293b] hover:bg-[#334155] text-gray-200 border border-[#334155] rounded-lg text-xs font-semibold transition"
                title="More Share Options"
              >
                <Share2 size={13} />
                <span>Options</span>
              </button>

              {showShareMenu && (
                <div className="absolute right-0 top-full mt-1.5 w-52 bg-[#0f172a] border border-[#334155] rounded-xl shadow-2xl z-50 p-1.5 space-y-1">
                  <button
                    type="button"
                    onClick={handleShareWhatsApp}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-left text-emerald-400 hover:bg-[#1e293b] rounded-lg transition font-medium"
                  >
                    <MessageCircle size={14} />
                    <span>WhatsApp ({customerPhone})</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-left text-gray-200 hover:bg-[#1e293b] rounded-lg transition"
                  >
                    {copiedLink ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                    <span>{copiedLink ? "Link Copied!" : "Copy Public Link"}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleShareEmail}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-left text-blue-400 hover:bg-[#1e293b] rounded-lg transition"
                  >
                    <Mail size={14} />
                    <span>Send via Email</span>
                  </button>
                </div>
              )}
            </div>

            {/* Convert to PO */}
            {onConvertToPO && quotationData.id && (
              <button
                type="button"
                onClick={() => onConvertToPO(quotationData)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600/20 hover:bg-amber-600/30 text-amber-400 border border-amber-500/30 rounded-lg text-xs font-semibold transition"
              >
                <ShoppingCart size={13} />
                <span>Convert to PO</span>
              </button>
            )}

            {/* Print */}
            <button
              type="button"
              onClick={handlePrint}
              disabled={isGeneratingPDF}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-700/60 hover:bg-gray-700 text-gray-200 border border-gray-600 rounded-lg text-xs font-semibold transition disabled:opacity-50"
            >
              <Printer size={13} />
              <span>Print</span>
            </button>

            {/* Download PDF */}
            <button
              type="button"
              onClick={generateAndDownloadPDF}
              disabled={isGeneratingPDF}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition shadow-md disabled:opacity-50"
            >
              <Download size={13} />
              <span>{isGeneratingPDF ? 'Generating...' : 'Download PDF'}</span>
            </button>
          </div>
        </div>

        {/* WhatsApp Share Success & Guidance Banner */}
        {shareFeedback && (
          <div className="flex-shrink-0 bg-emerald-950/80 border border-emerald-500/40 rounded-xl p-3 flex items-start justify-between gap-3 text-xs text-emerald-200 animate-fadeIn">
            <div className="flex items-start gap-2.5">
              <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-white">
                  WhatsApp chat opened for <span className="font-mono text-emerald-300">{shareFeedback.phone}</span>
                </p>
                <p className="text-emerald-300/90 mt-0.5">
                  The PDF file <strong className="text-white font-mono">{shareFeedback.pdfName}</strong> has been downloaded to your device. Simply drag & drop or attach the PDF file in your WhatsApp chat and click <strong>Send</strong>!
                </p>
              </div>
            </div>
            <a
              href={shareFeedback.waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-shrink-0 flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold transition"
            >
              <ExternalLink size={12} />
              <span>Reopen Chat</span>
            </a>
          </div>
        )}

        {/* Canvas Render Area */}
        <div className="relative flex-1 overflow-auto bg-[#0b1120] rounded-xl p-4 flex items-center justify-center min-h-[550px]">
          {isGeneratingPDF && (
            <div className="absolute inset-0 z-50 bg-[#0b1120]/80 backdrop-blur-sm flex items-center justify-center rounded-xl">
              <LoadingSpinner size="lg" text="Preparing PDF Document..." />
            </div>
          )}
          <div
            ref={quotationRef}
            style={{
              width: '210mm',
              minHeight: '297mm',
              backgroundColor: 'white',
              transform: 'scale(0.88)',
              transformOrigin: 'top center',
              boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
              margin: '0 auto',
            }}
          >
            <InvoiceCanvas 
              invoiceData={{
                documentTitle: "QUOTATION",
                invoiceNumber: quotationData.quotationNumber || "Draft",
                customer: quotationData.customer,
                customerDetails: quotationData.customerDetails as any,
                salesman: quotationData.salesman,
                salesmanName: quotationData.salesmanName || quotationData.salesman?.fullName,
                items: quotationData.items.map(item => ({
                  id: item.id || Date.now().toString(),
                  inventoryItemId: item.inventoryItemId,
                  itemName: item.itemName || item.inventoryItem?.productName || 'Item',
                  itemCode: item.productCode || item.inventoryItem?.productCode,
                  quantity: item.quantity,
                  unitPrice: item.unitPrice,
                  total: item.total,
                })),
                subTotal: quotationData.subTotal,
                discount: quotationData.discount,
                discountPercentage: quotationData.discountPercentage || 0,
                totalAmount: quotationData.totalAmount,
                paymentStatus: 'pending',
                paymentMethod: quotationData.paymentMethod as any,
                issueDate: quotationData.issueDate,
                dueDate: quotationData.validUntil,
                vehicleNumber: '',
                notes: quotationData.notes,
                applyVat: false,
                vatAmount: 0,
                taxRate: 0,
                paidAmount: 0,
              }} 
            />
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default QuotationViewModal;
