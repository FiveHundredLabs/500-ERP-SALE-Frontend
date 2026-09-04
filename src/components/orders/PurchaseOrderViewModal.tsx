import React, { useRef, useState } from 'react';
import {
  FileText,
  Download,
  Printer,
  Share2,
  Copy,
  Check,
  MessageCircle,
  Mail,
  AlertCircle,
  CheckCircle,
  ExternalLink
} from 'lucide-react';
import { Modal, LoadingSpinner } from '../common';
import InvoiceCanvas from '../InvoiceCanvas';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import type { PurchaseOrder } from '../../types/purchaseOrders';
import { generatePOWhatsAppMessage, getWhatsAppUrl } from '../../utils/whatsapp';

interface PurchaseOrderViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPO: PurchaseOrder | null;
  onShareSuccess?: (message: string) => void;
}

export const PurchaseOrderViewModal: React.FC<PurchaseOrderViewModalProps> = ({
  isOpen,
  onClose,
  selectedPO,
  onShareSuccess,
}) => {
  const poRef = useRef<HTMLDivElement>(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [error, setError] = useState<string>('');
  const [shareFeedback, setShareFeedback] = useState<{
    phone: string;
    pdfName: string;
    waUrl: string;
  } | null>(null);

  if (!selectedPO) return null;

  const supplierPhone = selectedPO.supplierPhone || '';
  const supplierName = selectedPO.supplierName || 'Valued Supplier';

  const poShareUrl = selectedPO.id || selectedPO.poNumber
    ? `${window.location.origin}/purchase-orders/${selectedPO.id || selectedPO.poNumber}/preview`
    : window.location.href;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(poShareUrl);
      setCopiedLink(true);
      onShareSuccess?.('Purchase Order link copied to clipboard!');
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      // ignore
    }
  };

  // Generate and Download PDF
  const generateAndDownloadPDF = async (): Promise<boolean> => {
    if (!poRef.current) return false;
    try {
      setIsGeneratingPDF(true);
      setError('');
      const pages = poRef.current.querySelectorAll('.invoice-page');
      if (pages.length === 0) return false;

      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      for (let i = 0; i < pages.length; i++) {
        const canvas = await html2canvas(pages[i] as HTMLElement, {
          scale: 2.5,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff',
        });
        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        if (i > 0) pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
      }

      const fileName = `PurchaseOrder-${selectedPO.poNumber || 'draft'}.pdf`;
      pdf.save(fileName);
      return true;
    } catch (err) {
      console.error('Failed to export PDF:', err);
      setError('Failed to generate PDF');
      return false;
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  // WhatsApp Share Flow: Generate PDF -> Open WhatsApp chat with pre-filled message
  const handleShareWhatsApp = async () => {
    setShowShareMenu(false);

    // Step 1: Generate & Download PDF so user can attach it
    await generateAndDownloadPDF();
    const pdfFileName = `PurchaseOrder-${selectedPO.poNumber || 'draft'}.pdf`;

    // Step 2: Build formatted WhatsApp message
    const message = generatePOWhatsAppMessage({
      poNumber: selectedPO.poNumber || 'draft',
      supplierName: supplierName,
      totalAmount: selectedPO.totalAmount,
      poDate: selectedPO.poDate ? String(selectedPO.poDate).split('T')[0] : new Date().toISOString().split('T')[0],
      itemsCount: selectedPO.totalItems || selectedPO.items?.length || 0,
      remarks: selectedPO.notes,
      shareUrl: poShareUrl,
    });

    // Step 3: Open WhatsApp with target supplier phone
    const waUrl = getWhatsAppUrl(supplierPhone, message);
    window.open(waUrl, '_blank');

    // Step 4: Show user guidance banner
    setShareFeedback({
      phone: supplierPhone,
      pdfName: pdfFileName,
      waUrl: waUrl,
    });

    onShareSuccess?.(`WhatsApp chat opened for ${supplierPhone}! PDF downloaded — attach and click Send.`);
  };

  const handleShareEmail = () => {
    const subject = `Purchase Order ${selectedPO.poNumber} from S & K Enterprices`;
    const body = `Hello ${supplierName},\n\nPlease find Purchase Order ${selectedPO.poNumber} details below:\n\nPO Number: ${selectedPO.poNumber}\nTotal Amount: LKR ${Number(selectedPO.totalAmount).toLocaleString()}/=\n\nView Online: ${poShareUrl}\n\nThank you,\nS & K Enterprices`;
    window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, '_blank');
    setShowShareMenu(false);
  };

  const handlePrint = async () => {
    if (!poRef.current) return;
    try {
      setIsPrinting(true);
      setError('');
      const pages = poRef.current.querySelectorAll('.invoice-page');
      if (pages.length === 0) return;

      const images: string[] = [];
      for (let i = 0; i < pages.length; i++) {
        const canvas = await html2canvas(pages[i] as HTMLElement, {
          scale: 2.5,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff',
        });
        images.push(canvas.toDataURL('image/jpeg', 0.95));
      }

      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        setError('Popup blocked! Please allow popups for this site to print.');
        setIsPrinting(false);
        return;
      }

      const imgTags = images.map(src => `<img class="page-img" src="${src}" />`).join('');

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Purchase Order ${selectedPO.poNumber}</title>
            <style>
              @page {
                size: A4 portrait;
                margin: 0;
              }
              body {
                margin: 0;
                padding: 0;
                background: #fff;
                display: flex;
                flex-direction: column;
                align-items: center;
              }
              .page-img {
                width: 210mm;
                height: 297mm;
                object-fit: contain;
                display: block;
                page-break-after: always;
              }
              .page-img:last-child {
                page-break-after: auto;
              }
              @media print {
                body { margin: 0 !important; padding: 0 !important; }
              }
            </style>
          </head>
          <body>
            ${imgTags}
            <script>
              window.onload = function() {
                setTimeout(function() {
                  window.print();
                  setTimeout(function() { window.close(); }, 1000);
                }, 400);
              };
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    } catch (err: any) {
      setError(`Print error: ${err.message || 'Unknown error'}`);
    } finally {
      setIsPrinting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Purchase Order Preview — ${selectedPO.poNumber}`}
      icon={<FileText className="w-5 h-5 text-purple-400" />}
      size="xl"
      className="max-h-[95vh] max-w-[95vw] flex flex-col"
    >
      <div className="flex-1 flex flex-col min-h-0">
        {/* Top Control & Action Bar */}
        <div className="flex-shrink-0 flex flex-wrap justify-between items-center gap-3 mb-4 px-2 pb-3 border-b border-[#334155]">
          <div>
            <p className="text-xs text-gray-400">
              Supplier: <span className="text-gray-200 font-semibold">{supplierName}</span>
              {supplierPhone && (
                <span className="ml-2 text-emerald-400 font-mono text-[11px]">({supplierPhone})</span>
              )}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Primary Action: Share to WhatsApp */}
            <button
              type="button"
              onClick={handleShareWhatsApp}
              disabled={isGeneratingPDF}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition shadow-md disabled:opacity-50 cursor-pointer"
              title={`Generate PDF & Open WhatsApp chat for ${supplierPhone || 'Supplier'}`}
            >
              <MessageCircle size={14} className="text-white" />
              <span>Share to WhatsApp</span>
              {supplierPhone && (
                <span className="text-[10px] bg-emerald-800/80 text-emerald-100 px-1.5 py-0.5 rounded font-mono hidden sm:inline">
                  {supplierPhone}
                </span>
              )}
            </button>

            {/* Share Options Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowShareMenu(!showShareMenu)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1e293b] hover:bg-[#334155] text-gray-200 border border-[#334155] rounded-lg text-xs font-semibold transition cursor-pointer"
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
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-left text-emerald-400 hover:bg-[#1e293b] rounded-lg transition font-medium cursor-pointer"
                  >
                    <MessageCircle size={14} />
                    <span>WhatsApp ({supplierPhone || 'Supplier'})</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-left text-gray-200 hover:bg-[#1e293b] rounded-lg transition cursor-pointer"
                  >
                    {copiedLink ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                    <span>{copiedLink ? 'Link Copied!' : 'Copy Link'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleShareEmail}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-left text-blue-400 hover:bg-[#1e293b] rounded-lg transition cursor-pointer"
                  >
                    <Mail size={14} />
                    <span>Send via Email</span>
                  </button>
                </div>
              )}
            </div>

            {/* Print Button */}
            <button
              type="button"
              onClick={handlePrint}
              disabled={isPrinting || isGeneratingPDF}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-700/60 hover:bg-gray-700 text-gray-200 border border-gray-600 rounded-lg text-xs font-semibold transition disabled:opacity-50 cursor-pointer"
              title="Print Purchase Order"
            >
              <Printer size={13} />
              <span>{isPrinting ? 'Printing...' : 'Print'}</span>
            </button>

            {/* Download PDF Button */}
            <button
              type="button"
              onClick={generateAndDownloadPDF}
              disabled={isGeneratingPDF || isPrinting}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition shadow-md disabled:opacity-50 cursor-pointer"
              title="Download Purchase Order as PDF"
            >
              <Download size={13} />
              <span>{isGeneratingPDF ? 'Generating...' : 'Download PDF'}</span>
            </button>
          </div>
        </div>

        {/* Error Alert Banner */}
        {error && (
          <div className="flex-shrink-0 bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-4 mx-2">
            <div className="flex gap-2.5 items-center">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
              <div className="text-xs text-red-300 font-medium">{error}</div>
            </div>
          </div>
        )}

        {/* WhatsApp Guidance Banner */}
        {shareFeedback && (
          <div className="flex-shrink-0 bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3 mb-4 mx-2 animate-in fade-in">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-emerald-300">
                    WhatsApp Chat Opened for {shareFeedback.phone}
                  </h4>
                  <p className="text-[11px] text-emerald-400/90 mt-0.5">
                    <strong>{shareFeedback.pdfName}</strong> has been downloaded to your computer.
                    In the opened WhatsApp window, click the <strong className="text-white">+ / Paperclip</strong> icon to attach this PDF and click Send.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={shareFeedback.waUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-[11px] bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1 rounded-lg font-medium transition"
                >
                  <ExternalLink size={11} />
                  <span>Re-open Chat</span>
                </a>
                <button
                  type="button"
                  onClick={() => setShareFeedback(null)}
                  className="text-gray-400 hover:text-white text-xs px-1.5 py-0.5 rounded"
                >
                  ✕
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Canvas Preview Container */}
        <div className="flex-1 overflow-auto bg-[#0b1120] rounded-xl p-4 flex items-center justify-center min-h-[550px]">
          {isGeneratingPDF ? (
            <LoadingSpinner size="lg" text="Generating Purchase Order Document..." />
          ) : (
            <div
              ref={poRef}
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
                  documentTitle: 'PURCHASE ORDER',
                  invoiceNumber: selectedPO.poNumber,
                  customer: selectedPO.supplierId || selectedPO.supplierName,
                  customerDetails: {
                    id: selectedPO.supplierId,
                    customerCode: selectedPO.supplierId,
                    fullName: selectedPO.supplierName,
                    shopName: selectedPO.supplierName,
                    phone: selectedPO.supplierPhone || '',
                    address: selectedPO.supplierAddress || '',
                    city: selectedPO.supplierCity || '',
                    salesRepName: selectedPO.createdByName || '',
                  },
                  items: selectedPO.items.map(item => ({
                    id: item.id || Date.now().toString(),
                    inventoryItemId: item.inventoryItemId || item.id,
                    itemName: item.productName,
                    itemCode: item.sku,
                    quantity: item.quantityOrdered,
                    unitPrice: item.unitPrice,
                    total: item.totalPrice,
                  })),
                  subTotal: selectedPO.subTotal,
                  discount: 0,
                  discountPercentage: 0,
                  totalAmount: selectedPO.totalAmount,
                  paymentStatus: (selectedPO.paymentStatus === 'paid' ? 'completed' : 'pending') as any,
                  paymentMethod: (selectedPO.paymentTerms ? 'credit' : 'cash') as any,
                  issueDate: selectedPO.poDate ? String(selectedPO.poDate) : new Date().toISOString(),
                  dueDate: selectedPO.expectedDeliveryDate ? String(selectedPO.expectedDeliveryDate) : (selectedPO.poDate ? String(selectedPO.poDate) : new Date().toISOString()),
                  vehicleNumber: '',
                  notes: selectedPO.notes,
                  applyVat: false,
                  vatAmount: 0,
                  taxRate: 0,
                  paidAmount: 0,
                  salesman: selectedPO.createdByName ? { id: '', name: selectedPO.createdByName } : null,
                }}
              />
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default PurchaseOrderViewModal;
