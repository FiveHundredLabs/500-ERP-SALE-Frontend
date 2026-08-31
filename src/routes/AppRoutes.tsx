import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Login from "../pages/Login";
import Dashboard from "../pages/Dashboard";
import Inventory from "../pages/Inventory";
import Quotations from "../pages/Quotation";
import Finance from "../pages/Finance";
import Invoice from "../pages/Invoice";
import UserManagement from "../pages/UserManagement";
import ProtectedRoute from "./ProtectedRoute";
import InvoiceView from "../pages/InvoiceView";
import QuotationView from "../pages/QuotationView";
import RoleRoute from "./RoleRoute";
import { ToastProvider } from "../components/erp/Toast";

// NEW HARDWARE ERP PAGES
import Orders from "../pages/Orders";
import OrderDetails from "../pages/OrderDetails";
import PurchaseOrders from "../pages/PurchaseOrders";
import PurchaseOrderDetails from "../pages/PurchaseOrderDetails";
import Customers from "../pages/Customers";
import Suppliers from "../pages/Suppliers";
import CustomerDetails from "../pages/CustomerDetails";
import SupplierDetails from "../pages/SupplierDetails";
import SalesOfficers from "../pages/SalesOfficers";
import Reports from "../pages/Reports";
import MobileApp from "../pages/MobileApp";
import InvoiceReturns from "../pages/InvoiceReturns";

const AppRoutes: React.FC = () => {
  return (
    <ToastProvider>
      <Routes>
        {/* Public auth */}
        <Route path="/login" element={<Login />} />

        {/* Public document view routes (EXISTING - UNTOUCHED) */}
        <Route path="/invoice/view/:id" element={<InvoiceView />} />
        <Route path="/quotation/view/:id" element={<QuotationView />} />

        {/* DASHBOARD */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <RoleRoute allowedRoles={["admin"]}>
                <Dashboard />
              </RoleRoute>
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <RoleRoute allowedRoles={["admin"]}>
                <Dashboard />
              </RoleRoute>
            </ProtectedRoute>
          }
        />

        {/* ORDERS MANAGEMENT (NEW) */}
        <Route
          path="/orders"
          element={
            <ProtectedRoute>
              <RoleRoute allowedRoles={["admin", "salesman"]}>
                <Orders />
              </RoleRoute>
            </ProtectedRoute>
          }
        />

        <Route
          path="/orders/:id"
          element={
            <ProtectedRoute>
              <RoleRoute allowedRoles={["admin", "salesman"]}>
                <OrderDetails />
              </RoleRoute>
            </ProtectedRoute>
          }
        />

        {/* SALES OFFICERS (NEW) */}
        <Route
          path="/sales-officers"
          element={
            <ProtectedRoute>
              <RoleRoute allowedRoles={["admin"]}>
                <SalesOfficers />
              </RoleRoute>
            </ProtectedRoute>
          }
        />
        <Route path="/salesmen" element={<Navigate to="/sales-officers" replace />} />
        <Route path="/sales-officer" element={<Navigate to="/sales-officers" replace />} />

        {/* PURCHASE ORDERS (NEW) */}
        <Route
          path="/purchase-orders"
          element={
            <ProtectedRoute>
              <RoleRoute allowedRoles={["admin", "inventory_manager"]}>
                <PurchaseOrders />
              </RoleRoute>
            </ProtectedRoute>
          }
        />

        <Route
          path="/purchase-orders/:id"
          element={
            <ProtectedRoute>
              <RoleRoute allowedRoles={["admin", "inventory_manager"]}>
                <PurchaseOrderDetails />
              </RoleRoute>
            </ProtectedRoute>
          }
        />

        {/* CUSTOMERS & SUPPLIERS (SEPARATE PAGES) */}
        <Route
          path="/customers"
          element={
            <ProtectedRoute>
              <RoleRoute allowedRoles={["admin"]}>
                <Customers />
              </RoleRoute>
            </ProtectedRoute>
          }
        />

        <Route
          path="/customers/:id"
          element={
            <ProtectedRoute>
              <RoleRoute allowedRoles={["admin"]}>
                <CustomerDetails />
              </RoleRoute>
            </ProtectedRoute>
          }
        />

        <Route
          path="/suppliers"
          element={
            <ProtectedRoute>
              <RoleRoute allowedRoles={["admin"]}>
                <Suppliers />
              </RoleRoute>
            </ProtectedRoute>
          }
        />

        <Route
          path="/suppliers/:id"
          element={
            <ProtectedRoute>
              <RoleRoute allowedRoles={["admin"]}>
                <SupplierDetails />
              </RoleRoute>
            </ProtectedRoute>
          }
        />

        {/* Legacy /users redirects and aliases */}
        <Route path="/users" element={<Navigate to="/customers" replace />} />
        <Route path="/users/customers" element={<Navigate to="/customers" replace />} />
        <Route path="/users/suppliers" element={<Navigate to="/suppliers" replace />} />
        <Route
          path="/users/customers/:id"
          element={
            <ProtectedRoute>
              <RoleRoute allowedRoles={["admin"]}>
                <CustomerDetails />
              </RoleRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/users/suppliers/:id"
          element={
            <ProtectedRoute>
              <RoleRoute allowedRoles={["admin"]}>
                <SupplierDetails />
              </RoleRoute>
            </ProtectedRoute>
          }
        />

        {/* INVENTORY (EXISTING - UNTOUCHED) */}
        <Route
          path="/inventory"
          element={
            <ProtectedRoute>
              <RoleRoute allowedRoles={["admin", "inventory_manager"]}>
                <Inventory />
              </RoleRoute>
            </ProtectedRoute>
          }
        />

        {/* QUOTATIONS (EXISTING - UNTOUCHED) */}
        <Route
          path="/quotations"
          element={
            <ProtectedRoute>
              <RoleRoute allowedRoles={["admin"]}>
                <Quotations />
              </RoleRoute>
            </ProtectedRoute>
          }
        />

        {/* FINANCE (EXISTING - UNTOUCHED) */}
        <Route
          path="/finance"
          element={
            <ProtectedRoute>
              <RoleRoute allowedRoles={["admin"]}>
                <Finance />
              </RoleRoute>
            </ProtectedRoute>
          }
        />

        {/* INVOICE (EXISTING - UNTOUCHED) */}
        <Route
          path="/invoice"
          element={
            <ProtectedRoute>
              <RoleRoute allowedRoles={["admin"]}>
                <Invoice />
              </RoleRoute>
            </ProtectedRoute>
          }
        />

        {/* INVOICE RETURNS (NEW) */}
        <Route
          path="/invoice-returns"
          element={
            <ProtectedRoute>
              <RoleRoute allowedRoles={["admin"]}>
                <InvoiceReturns />
              </RoleRoute>
            </ProtectedRoute>
          }
        />

        {/* SYSTEM USERS (SETTINGS) */}
        <Route
          path="/user-management"
          element={<Navigate to="/settings/system-users" replace />}
        />

        <Route
          path="/settings/system-users"
          element={
            <ProtectedRoute>
              <RoleRoute allowedRoles={["admin"]}>
                <UserManagement />
              </RoleRoute>
            </ProtectedRoute>
          }
        />

        {/* REPORTS & ANALYTICS */}
        <Route
          path="/reports"
          element={
            <ProtectedRoute>
              <RoleRoute allowedRoles={["admin", "inventory_manager"]}>
                <Reports />
              </RoleRoute>
            </ProtectedRoute>
          }
        />

        {/* MOBILE APP (UNDER DEVELOPMENT) */}
        <Route
          path="/mobile-app"
          element={
            <ProtectedRoute>
              <RoleRoute allowedRoles={["admin", "salesman", "inventory_manager"]}>
                <MobileApp />
              </RoleRoute>
            </ProtectedRoute>
          }
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ToastProvider>
  );
};

export default AppRoutes;