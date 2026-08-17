import React, { useRef, useState } from 'react';
import { FileText, Download, Printer, Share2, Copy, Check, ShoppingCart, MessageCircle, Mail } from 'lucide-react';
import { Modal, LoadingSpinner } from '../common';
import QuotationCanvas from './QuotationCanvas';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import type { QuotationData } from '../../types/quotation';

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
  const [isPrinting, setIsPrinting] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);

  if (!quotationData) return null;

  const quotationShareUrl = quotationData._id
    ? `${window.location.origin}/quotation/view/${quotationData._id}`
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

  const handleShareWhatsApp = () => {
    const text = `Quotation ${quotationData.quotationId} - Total: LKR ${quotationData.totalAmount.toFixed(2)}: ${quotationShareUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    setShowShareMenu(false);
  };

  const handleShareEmail = () => {
    const subject = `Quotation ${quotationData.quotationId}`;
    const body = `Hello,\n\nPlease find the quotation details here:\n${quotationShareUrl}\n\nTotal Amount: LKR ${quotationData.totalAmount.toFixed(2)}`;
    window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, '_blank');
    setShowShareMenu(false);
  };

  const handleDownloadPDF = async () => {
    if (!quotationRef.current) return;
    try {
      setIsGeneratingPDF(true);
      const canvas = await html2canvas(quotationRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Quotation-${quotationData.quotationId || 'draft'}.pdf`);
    } catch (err) {
      console.error('Failed to export PDF:', err);
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handlePrint = async () => {
    if (!quotationRef.current) return;
    try {
      setIsPrinting(true);
      const canvas = await html2canvas(quotationRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
      });

      const imageData = canvas.toDataURL('image/png');
      const printWindow = window.open('', '_blank');
      if (!printWindow) return;

      const printHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Print Quotation ${quotationData.quotationId}</title>
            <style>
              @page { size: A4; margin: 0; }
              body { margin: 0; padding: 0; display: flex; align-items: center; justify-content: center; }
              img { width: 210mm; height: 297mm; object-fit: contain; }
            </style>
          </head>
          <body>
            <img src="${imageData}" onload="window.print(); window.close();" />
          </body>
        </html>
      `;

      printWindow.document.open();
      printWindow.document.write(printHtml);
      printWindow.document.close();
    } catch (err) {
      console.error('Print failed:', err);
    } finally {
      setIsPrinting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Quotation Preview — ${quotationData.quotationId || 'Draft'}`}
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
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Share Menu */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowShareMenu(!showShareMenu)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 border border-purple-500/30 rounded-lg text-xs font-semibold transition"
              >
                <Share2 size={13} />
                <span>Share</span>
              </button>

              {showShareMenu && (
                <div className="absolute right-0 top-full mt-1.5 w-48 bg-[#0f172a] border border-[#334155] rounded-xl shadow-2xl z-50 p-1.5 space-y-1">
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-left text-gray-200 hover:bg-[#1e293b] rounded-lg transition"
                  >
                    {copiedLink ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                    <span>{copiedLink ? "Link Copied!" : "Copy Link"}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleShareWhatsApp}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-left text-emerald-400 hover:bg-[#1e293b] rounded-lg transition"
                  >
                    <MessageCircle size={14} />
                    <span>WhatsApp</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleShareEmail}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-left text-blue-400 hover:bg-[#1e293b] rounded-lg transition"
                  >
                    <Mail size={14} />
                    <span>Email</span>
                  </button>
                </div>
              )}
            </div>

            {/* Convert to PO */}
            {onConvertToPO && quotationData._id && (
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
              disabled={isPrinting}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-700/60 hover:bg-gray-700 text-gray-200 border border-gray-600 rounded-lg text-xs font-semibold transition disabled:opacity-50"
            >
              <Printer size={13} />
              <span>Print</span>
            </button>

            {/* Download PDF */}
            <button
              type="button"
              onClick={handleDownloadPDF}
              disabled={isGeneratingPDF}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition shadow-md disabled:opacity-50"
            >
              <Download size={13} />
              <span>{isGeneratingPDF ? 'Generating...' : 'PDF'}</span>
            </button>
          </div>
        </div>

        {/* Canvas Render Area */}
        <div className="flex-1 overflow-auto bg-[#0b1120] rounded-xl p-4 flex items-center justify-center min-h-[550px]">
          {isGeneratingPDF ? (
            <LoadingSpinner size="lg" text="Exporting Quotation PDF..." />
          ) : (
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
              <QuotationCanvas quotationData={quotationData} />
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default QuotationViewModal;
