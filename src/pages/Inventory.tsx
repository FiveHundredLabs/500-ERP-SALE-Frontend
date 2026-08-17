import React, { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import InventoryOverview from "../components/InventoryOverview";
import SearchFilter from "../components/SearchFilter";
import ReusableTable from "../components/ReusableTable";
import InventoryForm from "../components/InventoryForm";
import CustomAlert from "../components/CustomAlert";
import type { AlertType } from "../components/CustomAlert";
import { Package } from "lucide-react";
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
      message: `Are you sure you want to delete "${item.product_name}"? This action cannot be undone.`,
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
    "product_code",
    "product_name",
    "purchase_price",
    "sell_price",
    "profit_margin",
    "sold_count"
  ];

  const inventoryColumnLabels = {
    product_code: "Product Code",
    product_name: "Product Name",
    purchase_price: "Cost (LKR)",
    sell_price: "Selling Price (LKR)",
    profit_margin: "Profit Margin",
    sold_count: "Selling Quantity",
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
            onAdd={handleAddItem}
            onEdit={handleEditItem}
            onDelete={handleDeleteItem}
            onView={handleViewItem}
            showActions={true}
            refreshTrigger={refreshTrigger}
            searchTerm={searchTerm}
            selectedCategory={selectedCategory}
            computeRowValue={(column, item) => {
              if (column === "product_code") {
                return <span className="font-mono text-xs font-bold text-blue-400">{item.product_code}</span>;
              }
              if (column === "product_name") {
                return <span className="font-semibold text-gray-200">{item.product_name}</span>;
              }
              if (column === "purchase_price") {
                return <span className="font-mono text-gray-300">LKR {(item.purchase_price || 0).toLocaleString()}</span>;
              }
              if (column === "sell_price") {
                return <span className="font-mono font-bold text-gray-200">LKR {(item.sell_price || 0).toLocaleString()}</span>;
              }
              if (column === "profit_margin") {
                const cost = Number(item.purchase_price) || 0;
                const sell = Number(item.sell_price) || 0;
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
              if (column === "sold_count") {
                return <span className="font-mono text-gray-300">{(item.sold_count || 0).toLocaleString()} PCS</span>;
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
