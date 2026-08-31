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
    product_name: "",
    product_code: "",
    purchase_price: "",
    sell_price: "",
    sold_count: "0",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialData) {
      setFormData({
        product_name: initialData.product_name || "",
        product_code: initialData.product_code || "",
        purchase_price: (initialData.purchase_price ?? "").toString(),
        sell_price: (initialData.sell_price ?? "").toString(),
        sold_count: (initialData.sold_count ?? 0).toString(),
      });
      setErrors({});
    } else {
      // Auto generate next product code
      const nextNum = Math.floor(1000 + Math.random() * 9000);
      setFormData({
        product_name: "",
        product_code: `PRD-${nextNum}`,
        purchase_price: "",
        sell_price: "",
        sold_count: "0",
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
    if (!formData.product_name.trim()) errs.product_name = "Product name is required";
    if (!formData.purchase_price || parseFloat(formData.purchase_price) <= 0) {
      errs.purchase_price = "Valid cost is required";
    }
    if (!formData.sell_price || parseFloat(formData.sell_price) <= 0) {
      errs.sell_price = "Valid selling price is required";
    }

    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    if (!onSubmit) return;
    setLoading(true);
    try {
      const payload = {
        product_name: formData.product_name.trim(),
        product_code: formData.product_code || `PRD-${Math.floor(1000 + Math.random() * 9000)}`,
        purchase_price: parseFloat(formData.purchase_price) || 0,
        sell_price: parseFloat(formData.sell_price) || 0,
        quantity: 0,
        sold_count: parseInt(formData.sold_count) || 0,
        status: "in_stock",
        vehicle: { brand: "Universal", model: "All Models", chassis_no: "N/A", year: 2026 },
        shipment_code: "SHP-AUTO",
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
                {formData.product_code || "Auto Generated"}
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
              value={formData.product_name}
              onChange={e => {
                if (!viewMode) {
                  setFormData(prev => ({ ...prev, product_name: e.target.value }));
                  if (errors.product_name) setErrors(prev => ({ ...prev, product_name: "" }));
                }
              }}
              readOnly={viewMode}
              placeholder="e.g. PVC Pressure Pipe 50mm"
              className={`w-full bg-[#0f172a] border rounded-lg px-3.5 py-2.5 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                viewMode ? "cursor-default opacity-80" : errors.product_name ? "border-red-500" : "border-[#334155]"
              }`}
              autoFocus={!viewMode && !isEditing}
            />
            {errors.product_name && (
              <p className="text-red-400 text-[11px] mt-1">{errors.product_name}</p>
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
                value={formData.purchase_price}
                onChange={e => {
                  if (!viewMode) {
                    setFormData(prev => ({ ...prev, purchase_price: e.target.value }));
                    if (errors.purchase_price) setErrors(prev => ({ ...prev, purchase_price: "" }));
                  }
                }}
                readOnly={viewMode}
                placeholder="0.00"
                className={`w-full bg-[#0f172a] border rounded-lg px-3.5 py-2.5 text-sm font-mono text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                  viewMode ? "cursor-default opacity-80" : errors.purchase_price ? "border-red-500" : "border-[#334155]"
                }`}
              />
              {errors.purchase_price && (
                <p className="text-red-400 text-[11px] mt-1">{errors.purchase_price}</p>
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
                value={formData.sell_price}
                onChange={e => {
                  if (!viewMode) {
                    setFormData(prev => ({ ...prev, sell_price: e.target.value }));
                    if (errors.sell_price) setErrors(prev => ({ ...prev, sell_price: "" }));
                  }
                }}
                readOnly={viewMode}
                placeholder="0.00"
                className={`w-full bg-[#0f172a] border rounded-lg px-3.5 py-2.5 text-sm font-mono text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                  viewMode ? "cursor-default opacity-80" : errors.sell_price ? "border-red-500" : "border-[#334155]"
                }`}
              />
              {errors.sell_price && (
                <p className="text-red-400 text-[11px] mt-1">{errors.sell_price}</p>
              )}
            </div>
          </div>

          {/* Selling Quantity (View / Details info) */}
          {viewMode && (
            <div className="bg-[#0f172a]/70 border border-[#334155] rounded-xl p-3.5 flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-400">Total Selling Quantity:</span>
              <span className="text-sm font-bold text-emerald-400 font-mono">
                {formData.sold_count} PCS
              </span>
            </div>
          )}

          {/* Auto-Calculated Profit Margin Card */}
          {Number(formData.sell_price) > 0 && Number(formData.purchase_price) > 0 && (
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
                  Number(formData.sell_price) >= Number(formData.purchase_price) ? "text-emerald-400" : "text-red-400"
                }`}>
                  {formatCurrency(Number(formData.sell_price) - Number(formData.purchase_price))}
                </span>
                <span className="text-[11px] font-mono text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded border border-emerald-500/30 inline-block mt-0.5">
                  {(
                    ((Number(formData.sell_price) - Number(formData.purchase_price)) /
                      Number(formData.sell_price)) *
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
