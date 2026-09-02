import React, { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import InventoryOverview from "../components/InventoryOverview";
import SearchFilter from "../components/SearchFilter";
import ReusableTable from "../components/ReusableTable";
import InventoryForm from "../components/InventoryForm";
import ProductImportModal from "../components/ProductImportModal";
import CustomAlert from "../components/CustomAlert";
import type { AlertType } from "../components/CustomAlert";
import { Package, FileSpreadsheet } from "lucide-react";
import { inventoryService } from "../services/InventoryService";
import type { InventoryItem } from "../types/inventory";
import UserProfileDropdown from "../components/UserProfileDropdown";

const Inventory: React.FC = () => {
  const [isOpen, setIsOpen] = useState(true);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setIsOpen(false);
      } else {
        setIsOpen(true);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const [stats, setStats] = useState({
    totalItems: 0,
    inStock: 0,
    outOfStock: 0,
    discontinued: 0
  });

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [viewMode, setViewMode] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  const [alert, setAlert] = useState<{ message: string; type: AlertType } | null>(null);

  const [confirmData, setConfirmData] = useState<{
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
  } | null>(null);

  useEffect(() => {
    loadInventoryStats();
  }, [refreshTrigger]);

  const loadInventoryStats = async () => {
    try {
      const statsData = await inventoryService.getStats();
      setStats(statsData);
    } catch (error) {
      console.error("Error loading inventory stats:", error);
      showAlert("Failed to load inventory stats", "error");
    }
  };

  const showAlert = (message: string, type: AlertType = "info") => {
    setAlert({ message, type });
  };

  const handleAddItem = () => {
    setEditingItem(null);
    setViewMode(false);
    setIsFormOpen(true);
  };

  const handleEditItem = (item: InventoryItem) => {
    setEditingItem(item);
    setViewMode(false);
    setIsFormOpen(true);
  };

  const handleViewItem = (item: InventoryItem) => {
    setEditingItem(item);
    setViewMode(true);
    setIsFormOpen(true);
  };

  const handleDeleteItem = (item: InventoryItem) => {
    setConfirmData({
      message: `Are you sure you want to delete "${item.productName}"? This action cannot be undone.`,
      onConfirm: async () => {
        try {
          await inventoryService.delete(item.id);
          showAlert("Item deleted successfully!", "success");
          setRefreshTrigger(prev => prev + 1);
        } catch (error: any) {
          showAlert(`Failed to delete item: ${error.message}`, "error");
        }
        setConfirmData(null);
      },
      onCancel: () => setConfirmData(null),
    });
  };

  const handleFormSubmit = async (formData: any) => {
    try {
      if (editingItem && !viewMode) {
        await inventoryService.update(editingItem.id, formData);
        showAlert("Product updated successfully!", "success");
      } else if (!viewMode) {
        await inventoryService.create(formData);
        showAlert("Product added successfully!", "success");
      }
      setRefreshTrigger(prev => prev + 1);
    } catch (error: any) {
      showAlert(`Operation failed: ${error.message}`, "error");
      throw error;
    }
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setEditingItem(null);
    setViewMode(false);
  };

  const inventoryColumns = [
    "productCode",
    "productName",
    "purchasePrice",
    "sellPrice",
    "profit_margin",
    "soldCount"
  ];

  const inventoryColumnLabels = {
    productCode: "Product Code",
    productName: "Product Name",
    purchasePrice: "Cost (LKR)",
    sellPrice: "Selling Price (LKR)",
    profit_margin: "Profit Margin",
    soldCount: "Selling Quantity",
  };

  return (
    <div className="flex h-screen bg-[#0f172a] text-white overflow-hidden">
      <Sidebar isOpen={isOpen} setIsOpen={setIsOpen} />

      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="h-16 bg-[#1e293b]/80 backdrop-blur-xl border-b border-[#334155] flex items-center justify-between px-6 shadow-lg relative z-50">
          <div className="flex items-center gap-3">
            <Package className="text-blue-400 w-6 h-6" />
            <h1 className="text-xl font-semibold text-gray-200">Inventory Management</h1>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-4">
              <UserProfileDropdown />
            </div>
          </div>
        </div>

        <main className="flex-1 overflow-y-auto p-6 space-y-4">
          <InventoryOverview stats={stats} />
          
          <SearchFilter
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            selectedCategory={selectedCategory}
            onCategoryChange={setSelectedCategory}
          />

          <ReusableTable
            endpoint="/inventory-items"
            columns={inventoryColumns}
            columnLabels={inventoryColumnLabels}
            headerTitle="Products List"
            customActions={
              <button
                onClick={() => setIsImportOpen(true)}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-lg text-sm font-semibold transition-colors shadow-sm"
              >
                <FileSpreadsheet size={16} />
                Import Excel
              </button>
            }
            onAdd={handleAddItem}
            onEdit={handleEditItem}
            onDelete={handleDeleteItem}
            onView={handleViewItem}
            showActions={true}
            refreshTrigger={refreshTrigger}
            searchTerm={searchTerm}
            selectedCategory={selectedCategory}
            computeRowValue={(column, item) => {
              if (column === "productCode") {
                return <span className="font-mono text-xs font-bold text-blue-400">{item.productCode}</span>;
              }
              if (column === "productName") {
                return <span className="font-semibold text-gray-200">{item.productName}</span>;
              }
              if (column === "purchasePrice") {
                return <span className="font-mono text-gray-300">LKR {(item.purchasePrice || 0).toLocaleString()}</span>;
              }
              if (column === "sellPrice") {
                return <span className="font-mono font-bold text-gray-200">LKR {(item.sellPrice || 0).toLocaleString()}</span>;
              }
              if (column === "profit_margin") {
                const cost = Number(item.purchasePrice) || 0;
                const sell = Number(item.sellPrice) || 0;
                const profit = sell - cost;
                const marginPct = sell > 0 ? ((profit / sell) * 100).toFixed(1) : "0.0";
                const isPositive = profit >= 0;
                return (
                  <div className="font-mono flex items-center gap-1.5">
                    <span className={`font-bold ${isPositive ? "text-emerald-400" : "text-red-400"}`}>
                      LKR {profit.toLocaleString()}
                    </span>
                    <span className="text-[11px] text-emerald-400/80 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 font-sans font-semibold">
                      {marginPct}%
                    </span>
                  </div>
                );
              }
              if (column === "soldCount") {
                return <span className="font-mono text-gray-300">{(item.soldCount || 0).toLocaleString()} PCS</span>;
              }
              return item[column];
            }}
          />

          <InventoryForm
            isOpen={isFormOpen}
            onClose={handleFormClose}
            onSubmit={viewMode ? undefined : handleFormSubmit}
            initialData={editingItem}
            isEditing={!!editingItem && !viewMode}
            viewMode={viewMode}
          />

          <ProductImportModal
            isOpen={isImportOpen}
            onClose={() => setIsImportOpen(false)}
            onSuccess={() => {
              setRefreshTrigger((prev) => prev + 1);
              showAlert("Products successfully imported into database!", "success");
            }}
          />
        </main>
      </div>

      {alert && (
        <CustomAlert
          message={alert.message}
          type={alert.type}
          onClose={() => setAlert(null)}
        />
      )}

      {confirmData && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50 p-4">
          <div className="bg-[#1e293b] rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-lg">
            <p className="text-white text-center">{confirmData.message}</p>
            <div className="flex justify-center gap-4">
              <button
                onClick={confirmData.onCancel}
                className="px-4 py-2 text-gray-300 border border-gray-500 rounded-lg hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={confirmData.onConfirm}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-700"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;
