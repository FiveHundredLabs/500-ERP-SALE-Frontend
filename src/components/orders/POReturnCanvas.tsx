import React from 'react';
import type { PurchaseOrderReturn } from '../../types/po-return';

interface POReturnCanvasProps {
  returnData: PurchaseOrderReturn;
}

const POReturnCanvas: React.FC<POReturnCanvasProps> = ({ returnData }) => {
  return (
    <div className="w-[210mm] min-h-[297mm] bg-white text-black p-8 font-sans relative">
      <div className="text-center mb-8 border-b-2 border-gray-800 pb-4">
        <h1 className="text-3xl font-bold uppercase tracking-widest text-gray-900">Purchase Return Note / Debit Note</h1>
        <p className="text-sm text-gray-500 mt-1">S & K Enterprises</p>
      </div>

      <div className="flex justify-between mb-8">
        <div>
          <h2 className="text-sm font-bold text-gray-700 uppercase mb-2">Supplier Details</h2>
          <div className="font-semibold text-lg">
            {returnData.supplier?.companyName || 'Supplier'}
          </div>
          <div className="text-sm text-gray-600 mt-1">
            {returnData.supplier?.contactPerson && (
              <div>Attn: {returnData.supplier.contactPerson}</div>
            )}
            {returnData.supplier?.phone && (
              <div>Phone: {returnData.supplier.phone}</div>
            )}
            {returnData.supplier?.address && (
              <div>Address: {returnData.supplier.address}</div>
            )}
          </div>
        </div>
        <div className="text-right">
          <div className="mb-2"><span className="font-bold text-gray-700">Return ID:</span> {returnData.returnNumber}</div>
          <div className="mb-2"><span className="font-bold text-gray-700">Purchase Order:</span> {returnData.purchaseOrder?.poNumber || 'N/A'}</div>
          <div><span className="font-bold text-gray-700">Date:</span> {new Date(returnData.createdAt).toLocaleDateString()}</div>
        </div>
      </div>

      <div className="mb-8">
        <h3 className="font-bold text-gray-700 mb-2 uppercase text-sm">Reason for Return to Supplier</h3>
        <p className="text-gray-800 border-l-4 border-amber-500 pl-4 py-1 font-medium">{returnData.returnReason}</p>
        {returnData.remarks && <p className="text-gray-600 text-sm mt-2 pl-5 italic">{returnData.remarks}</p>}
      </div>

      <table className="w-full mb-8 border-collapse">
        <thead>
          <tr className="bg-gray-100 border-y-2 border-gray-800">
            <th className="py-2 px-2 text-left font-bold text-sm uppercase">Item Description / SKU</th>
            <th className="py-2 px-2 text-right font-bold text-sm uppercase">Qty Returned</th>
            <th className="py-2 px-2 text-right font-bold text-sm uppercase">Unit Cost</th>
            <th className="py-2 px-2 text-right font-bold text-sm uppercase">Total Debit</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {returnData.items.map((item, idx) => {
            const itemName = item.productName || item.inventoryItem?.productName || item.sku;
            return (
              <tr key={idx}>
                <td className="py-3 px-2 text-sm">
                  <div className="font-medium text-gray-900">{itemName}</div>
                  <div className="text-xs text-gray-500">{item.sku}</div>
                </td>
                <td className="py-3 px-2 text-right text-sm">{item.quantity}</td>
                <td className="py-3 px-2 text-right text-sm">Rs. {item.unitPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                <td className="py-3 px-2 text-right text-sm font-semibold">Rs. {item.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-gray-800">
            <td colSpan={3} className="py-4 px-2 text-right font-bold uppercase tracking-wider text-gray-700">Total Supplier Debit Amount:</td>
            <td className="py-4 px-2 text-right font-bold text-lg text-red-600">Rs. {returnData.returnTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
          </tr>
        </tfoot>
      </table>

      <div className="absolute bottom-16 left-8 right-8 flex justify-between">
        <div className="w-48 text-center border-t border-gray-400 pt-2 text-sm font-semibold">Store / Prepared By</div>
        <div className="w-48 text-center border-t border-gray-400 pt-2 text-sm font-semibold">Supplier Acknowledgement</div>
      </div>
    </div>
  );
};

export default POReturnCanvas;
