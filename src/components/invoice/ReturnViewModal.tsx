import React, { useRef, useState } from 'react';
import { FileText, Printer, ShieldCheck, XCircle } from 'lucide-react';
import { Modal, Button } from '../common';
import ReturnCanvas from './ReturnCanvas';
import html2canvas from 'html2canvas';
import type { InvoiceReturn } from '../../types/invoice-return';
import { ReturnStatus } from '../../types/invoice-return';

interface ReturnViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  returnRecord: InvoiceReturn | null;
  onStatusChange?: (status: ReturnStatus) => Promise<void>;
}

export const ReturnViewModal: React.FC<ReturnViewModalProps> = ({
  isOpen,
  onClose,
  returnRecord,
  onStatusChange
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPrinting, setIsPrinting] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const handlePrint = async () => {
    if (!returnRecord || !containerRef.current) return;

    try {
      setIsPrinting(true);
      const tempContainer = document.createElement('div');
      tempContainer.style.position = 'fixed';
      tempContainer.style.left = '0';
      tempContainer.style.top = '0';
      tempContainer.style.width = '210mm';
      tempContainer.style.minHeight = '297mm';
      tempContainer.style.backgroundColor = 'white';
      tempContainer.style.zIndex = '9999';
      tempContainer.style.opacity = '0';
      document.body.appendChild(tempContainer);

      const { createRoot } = await import('react-dom/client');
      const root = createRoot(tempContainer);
      root.render(<ReturnCanvas returnData={returnRecord} />);

      await new Promise(resolve => setTimeout(resolve, 500));
      const element = tempContainer.firstChild as HTMLElement;
      
      const canvas = await html2canvas(element, { scale: 3 });
      
      root.unmount();
      document.body.removeChild(tempContainer);

      const imageData = canvas.toDataURL('image/png', 1.0);
      const printWindow = window.open('', '_blank');
      if (!printWindow) throw new Error("Popup blocked");

      printWindow.document.write(`
        <html>
          <head><title>Return ${returnRecord.returnId}</title></head>
          <body style="margin:0;padding:0;"><img style="width:100%;" src="${imageData}"/></body>
          <script>window.onload=()=>{setTimeout(()=>{window.print();setTimeout(()=>{window.close();},500);},300);}</script>
        </html>
      `);
      printWindow.document.close();
    } catch (err) {
      console.error(err);
    } finally {
      setIsPrinting(false);
    }
  };

  if (!returnRecord) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Sales Return - ${returnRecord.returnId}`}
      icon={<FileText className="w-5 h-5 text-blue-400" />}
      size="xl"
      className="max-h-[95vh] max-w-[95vw] flex flex-col"
    >
      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex-shrink-0 flex justify-between items-center gap-3 mb-4 px-2">
          <div className="flex items-center gap-2">
            <span className={`px-2 py-1 rounded text-xs font-semibold ${
              returnRecord.status === ReturnStatus.COMPLETED ? 'bg-green-500/20 text-green-400' :
              returnRecord.status === ReturnStatus.PENDING ? 'bg-yellow-500/20 text-yellow-400' :
              'bg-gray-500/20 text-gray-400'
            }`}>
              STATUS: {returnRecord.status}
            </span>
            {returnRecord.status === ReturnStatus.PENDING && onStatusChange && (
              <>
                <Button size="sm" variant="secondary" onClick={async () => {
                  setIsUpdating(true);
                  await onStatusChange(ReturnStatus.COMPLETED);
                  setIsUpdating(false);
                }} disabled={isUpdating} className="text-green-400 hover:text-green-300 border-green-500/30">
                  <ShieldCheck className="w-4 h-4 mr-1" /> Approve & Refund
                </Button>
                <Button size="sm" variant="secondary" onClick={async () => {
                  setIsUpdating(true);
                  await onStatusChange(ReturnStatus.CANCELLED);
                  setIsUpdating(false);
                }} disabled={isUpdating} className="text-red-400 hover:text-red-300 border-red-500/30">
                  <XCircle className="w-4 h-4 mr-1" /> Cancel
                </Button>
              </>
            )}
          </div>
          <Button
            variant="secondary"
            size="md"
            icon={<Printer className="w-4 h-4" />}
            onClick={handlePrint}
            disabled={isPrinting}
            isLoading={isPrinting}
          >
            Print Note
          </Button>
        </div>

        <div className="flex-1 overflow-auto bg-gray-800 rounded-lg min-h-0 px-1 py-4 flex justify-center">
          <div
            ref={containerRef}
            className="bg-white overflow-hidden shadow-2xl"
            style={{ width: '210mm', minHeight: '297mm', transform: 'scale(0.85)', transformOrigin: 'top center' }}
          >
            <ReturnCanvas returnData={returnRecord} />
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default ReturnViewModal;
