import React, { useRef, useState } from 'react';
import { FileText, Download, Printer, Share2, Copy, Check, MessageCircle, Mail } from 'lucide-react';
import { Modal } from '../common';
import InvoiceCanvas from '../InvoiceCanvas';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import type { InvoiceData } from '../../types/invoice';

interface InvoiceViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoiceData: InvoiceData | null;
  onShareSuccess?: (message: string) => void;
}

export const InvoiceViewModal: React.FC<InvoiceViewModalProps> = ({
  isOpen,
  onClose,
  invoiceData,
  onShareSuccess,
}) => {
  const invoiceRef = useRef<HTMLDivElement>(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);

  if (!invoiceData) return null;

  const invoiceShareUrl = invoiceData._id
    ? `${window.location.origin}/invoice/view/${invoiceData._id}`
    : window.location.href;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(invoiceShareUrl);
      setCopiedLink(true);
      onShareSuccess?.("Invoice link copied to clipboard!");
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      // ignore
    }
  };

  const handleShareWhatsApp = () => {
    const text = `Invoice ${invoiceData.invoiceId} - Total: LKR ${invoiceData.totalAmount.toFixed(2)}: ${invoiceShareUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    setShowShareMenu(false);
  };

  const handleShareEmail = () => {
    const subject = `Invoice ${invoiceData.invoiceId}`;
    const body = `Hello,\n\nPlease find the invoice details here:\n${invoiceShareUrl}\n\nTotal Amount: LKR ${invoiceData.totalAmount.toFixed(2)}`;
    window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, '_blank');
    setShowShareMenu(false);
  };

  const handleDownloadPDF = async () => {
    if (!invoiceRef.current) return;
    try {
      setIsGeneratingPDF(true);
      const canvas = await html2canvas(invoiceRef.current, {
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
      pdf.save(`Invoice-${invoiceData.invoiceId || 'draft'}.pdf`);
    } catch (err) {
      console.error('Failed to export PDF:', err);
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handlePrint = async () => {
    if (!invoiceRef.current) return;
    try {
      setIsPrinting(true);
      const canvas = await html2canvas(invoiceRef.current, {
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
            <title>Print Invoice ${invoiceData.invoiceId}</title>
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
      title={`Invoice Preview — ${invoiceData.invoiceId || 'Draft'}`}
      icon={<FileText className="w-5 h-5 text-blue-400" />}
      size="xl"
      className="max-h-[96vh] max-w-[96vw] flex flex-col"
    >
      <div className="flex-1 flex flex-col min-h-0 space-y-3">
        {/* Actions Bar */}
        <div className="flex-shrink-0 flex flex-wrap items-center justify-between gap-3 bg-[#0f172a] p-3 rounded-xl border border-[#334155]">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-300">
              Total: <span className="text-emerald-400 font-mono font-bold text-sm">LKR {invoiceData.totalAmount.toFixed(2)}</span>
            </span>
            <span className="text-xs text-gray-500">•</span>
            <span className="text-xs text-gray-400">{invoiceData.items.length} {invoiceData.items.length === 1 ? 'item' : 'items'}</span>
            <span className="text-xs text-gray-500">•</span>
            <span className={`text-[10px] px-2 py-0.5 rounded font-semibold ${
              invoiceData.paymentStatus === 'Completed' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
              invoiceData.paymentStatus === 'Pending' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
              'bg-red-500/20 text-red-400 border border-red-500/30'
            }`}>
              {invoiceData.paymentStatus}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Share Menu */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowShareMenu(!showShareMenu)}
                className="flex items-center gap-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 px-3 py-1.5 rounded-lg text-xs font-semibold transition"
                title="Share Options"
              >
                <Share2 className="w-4 h-4" />
                <span>Share</span>
              </button>

              {showShareMenu && (
                <div className="absolute right-0 mt-1 w-48 bg-[#0f172a] border border-[#334155] rounded-xl shadow-2xl z-50 p-1 space-y-1">
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-200 hover:bg-[#1e293b] rounded-lg transition"
                  >
                    {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-gray-400" />}
                    <span>{copiedLink ? 'Link Copied!' : 'Copy Link'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleShareWhatsApp}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-green-400 hover:bg-[#1e293b] rounded-lg transition"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>WhatsApp</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleShareEmail}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-blue-400 hover:bg-[#1e293b] rounded-lg transition"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>Email</span>
                  </button>
                </div>
              )}
            </div>

            {/* Download PDF */}
            <button
              type="button"
              onClick={handleDownloadPDF}
              disabled={isGeneratingPDF}
              className="flex items-center gap-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 px-3 py-1.5 rounded-lg text-xs font-semibold transition disabled:opacity-50"
            >
              {isGeneratingPDF ? (
                <div className="w-3.5 h-3.5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <Download className="w-4 h-4" />
              )}
              <span>PDF</span>
            </button>

            {/* Print */}
            <button
              type="button"
              onClick={handlePrint}
              disabled={isPrinting}
              className="flex items-center gap-1.5 bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-400 border border-cyan-500/30 px-3 py-1.5 rounded-lg text-xs font-semibold transition disabled:opacity-50"
            >
              {isPrinting ? (
                <div className="w-3.5 h-3.5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <Printer className="w-4 h-4" />
              )}
              <span>Print</span>
            </button>
          </div>
        </div>

        {/* Scrollable Canvas Container */}
        <div className="flex-1 overflow-auto bg-[#0b1329] p-4 rounded-xl flex justify-center items-start min-h-0 border border-[#334155]/60 shadow-inner">
          <div
            ref={invoiceRef}
            className="bg-white shadow-2xl"
            style={{
              width: '210mm',
              minHeight: '297mm',
              transformOrigin: 'top center',
            }}
          >
            <InvoiceCanvas invoiceData={invoiceData} />
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default InvoiceViewModal;
