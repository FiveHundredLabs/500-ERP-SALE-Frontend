import React, { useState, useEffect } from "react";
import { X, Package, Tag, Plus, Check, TrendingUp } from "lucide-react";
import type { InventoryItem } from "../types/inventory";

interface InventoryFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit?: (data: any) => Promise<void>;
  initialData?: InventoryItem | null;
  isEditing: boolean;
  viewMode?: boolean;
}

const InventoryForm: React.FC<InventoryFormProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  isEditing,
  viewMode = false
}) => {
  const [formData, setFormData] = useState({
    productName: "",
    productCode: "",
    purchasePrice: "",
    sellPrice: "",
    soldCount: "0",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialData) {
      setFormData({
        productName: initialData.productName || "",
        productCode: initialData.productCode || "",
        purchasePrice: (initialData.purchasePrice ?? "").toString(),
        sellPrice: (initialData.sellPrice ?? "").toString(),
        soldCount: (initialData.soldCount ?? 0).toString(),
      });
      setErrors({});
    } else {
      // Auto generate next product code
      const nextNum = Math.floor(1000 + Math.random() * 9000);
      setFormData({
        productName: "",
        productCode: `PRD-${nextNum}`,
        purchasePrice: "",
        sellPrice: "",
        soldCount: "0",
      });
      setErrors({});
    }
  }, [initialData, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (viewMode) {
      onClose();
      return;
    }

    const errs: Record<string, string> = {};
    if (!formData.productName.trim()) errs.productName = "Product name is required";
    if (!formData.purchasePrice || parseFloat(formData.purchasePrice) <= 0) {
      errs.purchasePrice = "Valid cost is required";
    }
    if (!formData.sellPrice || parseFloat(formData.sellPrice) <= 0) {
      errs.sellPrice = "Valid selling price is required";
    }

    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    if (!onSubmit) return;
    setLoading(true);
    try {
      const payload = {
        productName: formData.productName.trim(),
        productCode: formData.productCode || `PRD-${Math.floor(1000 + Math.random() * 9000)}`,
        purchasePrice: parseFloat(formData.purchasePrice) || 0,
        sellPrice: parseFloat(formData.sellPrice) || 0,
        quantity: 0,
        soldCount: parseInt(formData.soldCount) || 0,
        status: "in_stock",
        brand: "Universal", model: "All Models", chassisNo: "N/A", year: 2026,
        shipmentCode: "SHP-AUTO",
      };
      await onSubmit(payload);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const getTitle = () => {
    if (viewMode) return "Product Details";
    if (isEditing) return "Edit Product";
    return "Add New Product";
  };

  const formatCurrency = (val: number | string) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "LKR", minimumFractionDigits: 0 }).format(Number(val) || 0);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
      <div className="bg-[#1e293b] border border-[#334155] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#334155] bg-[#0f172a]/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30">
              <Package size={18} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">{getTitle()}</h2>
              <p className="text-xs text-gray-400">
                {viewMode ? "View product information" : "Specify product name, cost, and selling price"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-[#334155] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Product Code Badge (Auto-generated) */}
          <div className="bg-[#0f172a] border border-[#334155] rounded-xl p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Tag size={15} className="text-blue-400" />
              <span className="text-xs font-medium text-gray-400">Product Code:</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-blue-300 bg-blue-600/20 px-2 py-0.5 rounded border border-blue-500/30">
                {formData.productCode || "Auto Generated"}
              </span>
              {!viewMode && !isEditing && (
                <span className="text-[10px] text-gray-400 uppercase font-medium">Auto</span>
              )}
            </div>
          </div>

          {/* Product Name */}
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">
              Product Name {!viewMode && <span className="text-red-400">*</span>}
            </label>
            <input
              type="text"
              value={formData.productName}
              onChange={e => {
                if (!viewMode) {
                  setFormData(prev => ({ ...prev, productName: e.target.value }));
                  if (errors.productName) setErrors(prev => ({ ...prev, productName: "" }));
                }
              }}
              readOnly={viewMode}
              placeholder="e.g. PVC Pressure Pipe 50mm"
              className={`w-full bg-[#0f172a] border rounded-lg px-3.5 py-2.5 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                viewMode ? "cursor-default opacity-80" : errors.productName ? "border-red-500" : "border-[#334155]"
              }`}
              autoFocus={!viewMode && !isEditing}
            />
            {errors.productName && (
              <p className="text-red-400 text-[11px] mt-1">{errors.productName}</p>
            )}
          </div>

          {/* Cost and Selling Price in 2 Columns */}
          <div className="grid grid-cols-2 gap-3.5">
            {/* Cost Price */}
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                Cost (LKR) {!viewMode && <span className="text-red-400">*</span>}
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.purchasePrice}
                onChange={e => {
                  if (!viewMode) {
                    setFormData(prev => ({ ...prev, purchasePrice: e.target.value }));
                    if (errors.purchasePrice) setErrors(prev => ({ ...prev, purchasePrice: "" }));
                  }
                }}
                readOnly={viewMode}
                placeholder="0.00"
                className={`w-full bg-[#0f172a] border rounded-lg px-3.5 py-2.5 text-sm font-mono text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                  viewMode ? "cursor-default opacity-80" : errors.purchasePrice ? "border-red-500" : "border-[#334155]"
                }`}
              />
              {errors.purchasePrice && (
                <p className="text-red-400 text-[11px] mt-1">{errors.purchasePrice}</p>
              )}
            </div>

            {/* Selling Price */}
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                Selling Price (LKR) {!viewMode && <span className="text-red-400">*</span>}
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.sellPrice}
                onChange={e => {
                  if (!viewMode) {
                    setFormData(prev => ({ ...prev, sellPrice: e.target.value }));
                    if (errors.sellPrice) setErrors(prev => ({ ...prev, sellPrice: "" }));
                  }
                }}
                readOnly={viewMode}
                placeholder="0.00"
                className={`w-full bg-[#0f172a] border rounded-lg px-3.5 py-2.5 text-sm font-mono text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                  viewMode ? "cursor-default opacity-80" : errors.sellPrice ? "border-red-500" : "border-[#334155]"
                }`}
              />
              {errors.sellPrice && (
                <p className="text-red-400 text-[11px] mt-1">{errors.sellPrice}</p>
              )}
            </div>
          </div>

          {/* Selling Quantity (View / Details info) */}
          {viewMode && (
            <div className="bg-[#0f172a]/70 border border-[#334155] rounded-xl p-3.5 flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-400">Total Selling Quantity:</span>
              <span className="text-sm font-bold text-emerald-400 font-mono">
                {formData.soldCount} PCS
              </span>
            </div>
          )}

          {/* Auto-Calculated Profit Margin Card */}
          {Number(formData.sellPrice) > 0 && Number(formData.purchasePrice) > 0 && (
            <div className="bg-[#0f172a] border border-emerald-500/30 rounded-xl p-3.5 flex items-center justify-between shadow-inner">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
                  <TrendingUp size={15} />
                </div>
                <div>
                  <span className="text-xs font-semibold text-gray-300 block">Auto Profit Margin</span>
                  <span className="text-[11px] text-gray-500">Calculated from Selling Price - Cost</span>
                </div>
              </div>
              <div className="text-right">
                <span className={`font-mono text-sm font-bold block ${
                  Number(formData.sellPrice) >= Number(formData.purchasePrice) ? "text-emerald-400" : "text-red-400"
                }`}>
                  {formatCurrency(Number(formData.sellPrice) - Number(formData.purchasePrice))}
                </span>
                <span className="text-[11px] font-mono text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded border border-emerald-500/30 inline-block mt-0.5">
                  {(
                    ((Number(formData.sellPrice) - Number(formData.purchasePrice)) /
                      Number(formData.sellPrice)) *
                    100
                  ).toFixed(1)}% Margin
                </span>
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex justify-end items-center gap-3 pt-3 border-t border-[#334155] mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-[#334155] bg-[#1e293b] hover:bg-[#334155] text-gray-300 rounded-lg text-xs font-medium transition-colors"
            >
              {viewMode ? "Close" : "Cancel"}
            </button>

            {!viewMode && (
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-lg shadow-blue-600/20 disabled:opacity-50"
              >
                {loading ? (
                  "Saving..."
                ) : isEditing ? (
                  <>
                    <Check size={14} /> Update Product
                  </>
                ) : (
                  <>
                    <Plus size={14} /> Add Product
                  </>
                )}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default InventoryForm;
