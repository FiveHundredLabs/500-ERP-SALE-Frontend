import React, { useRef, useState } from 'react';
import { FileText, Printer, ShieldCheck, XCircle, Trash2 } from 'lucide-react';
import { Modal, Button } from '../common';
import POReturnCanvas from './POReturnCanvas';
import html2canvas from 'html2canvas';
import type { PurchaseOrderReturn } from '../../types/po-return';
import { POReturnStatus } from '../../types/po-return';

interface POReturnViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  returnRecord: PurchaseOrderReturn | null;
  onStatusChange?: (status: POReturnStatus) => Promise<void>;
  onDelete?: () => void;
}

export const POReturnViewModal: React.FC<POReturnViewModalProps> = ({
  isOpen,
  onClose,
  returnRecord,
  onStatusChange,
  onDelete,
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
      root.render(<POReturnCanvas returnData={returnRecord} />);

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
          <head><title>PO Return ${returnRecord.returnNumber}</title></head>
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
      title={`Purchase Return - ${returnRecord.returnNumber}`}
      icon={<FileText className="w-5 h-5 text-purple-400" />}
      size="xl"
      className="max-h-[95vh] max-w-[95vw] flex flex-col"
    >
      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex-shrink-0 flex justify-between items-center gap-3 mb-4 px-2">
          <div className="flex items-center gap-2">
            <span className={`px-2 py-1 rounded text-xs font-semibold ${
              returnRecord.status === POReturnStatus.COMPLETED ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
              returnRecord.status === POReturnStatus.PENDING ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
              'bg-gray-500/20 text-gray-400'
            }`}>
              STATUS: {String(returnRecord.status).toUpperCase()}
            </span>
            {returnRecord.status === POReturnStatus.PENDING && onStatusChange && (
              <>
                <Button size="sm" variant="secondary" onClick={async () => {
                  setIsUpdating(true);
                  await onStatusChange(POReturnStatus.COMPLETED);
                  setIsUpdating(false);
                }} disabled={isUpdating} className="text-emerald-400 hover:text-emerald-300 border-emerald-500/30">
                  <ShieldCheck className="w-4 h-4 mr-1" /> Complete Return
                </Button>
                <Button size="sm" variant="secondary" onClick={async () => {
                  setIsUpdating(true);
                  await onStatusChange(POReturnStatus.CANCELLED);
                  setIsUpdating(false);
                }} disabled={isUpdating} className="text-red-400 hover:text-red-300 border-red-500/30">
                  <XCircle className="w-4 h-4 mr-1" /> Cancel
                </Button>
              </>
            )}
            {onDelete && (
              <Button
                size="sm"
                variant="secondary"
                onClick={onDelete}
                className="text-rose-400 hover:text-rose-300 border-rose-500/30 hover:bg-rose-500/10"
              >
                <Trash2 className="w-4 h-4 mr-1" /> Delete
              </Button>
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
            Print Debit Note
          </Button>
        </div>

        <div className="flex-1 overflow-auto bg-gray-800 rounded-lg min-h-0 px-1 py-4 flex justify-center">
          <div
            ref={containerRef}
            className="bg-white overflow-hidden shadow-2xl"
            style={{ width: '210mm', minHeight: '297mm', transform: 'scale(0.85)', transformOrigin: 'top center' }}
          >
            <POReturnCanvas returnData={returnRecord} />
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default POReturnViewModal;
