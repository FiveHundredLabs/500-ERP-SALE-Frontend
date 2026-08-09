import React, { useState } from "react";
import {
  LayoutGrid,
  ShoppingBag,
  FileText,
  Receipt,
  ShoppingCart,
  Package,
  Warehouse,
  Users,
  Truck,
  Settings,
  ChevronDown,
  ChevronRight,
  Shield,
  ShieldCheck,
  DollarSign,
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: ((val: boolean) => void) | React.Dispatch<React.SetStateAction<boolean>>;
}

interface NavItem {
  name: string;
  icon: React.ElementType;
  path: string;
  roles: string[];
}

interface NavGroup {
  title: string;
  icon: React.ElementType;
  items: NavItem[];
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, setIsOpen }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { role } = useAuth();

  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    Sales: true,
    Purchasing: true,
    Products: true,
    Users: true,
    Reports: false,
    Settings: false,
  });

  const toggleGroup = (title: string) => {
    setExpandedGroups((prev) => ({ ...prev, [title]: !prev[title] }));
  };

  const currentRole = role || 'admin';

  const singleNavItems: NavItem[] = [
    { name: "Dashboard", icon: LayoutGrid, path: "/dashboard", roles: ['admin', 'inventory_manager'] },
  ];

  const navGroups: NavGroup[] = [
    {
      title: "Sales",
      icon: ShoppingBag,
      items: [
        { name: "Orders", icon: ShoppingBag, path: "/orders", roles: ['admin', 'salesman'] },
        { name: "Purchase Orders", icon: ShoppingCart, path: "/purchase-orders", roles: ['admin', 'inventory_manager'] },
        { name: "Quotations", icon: FileText, path: "/quotations", roles: ['admin'] },
        { name: "Invoices", icon: Receipt, path: "/invoice", roles: ['admin'] },
        { name: "Accounts", icon: DollarSign, path: "/finance", roles: ['admin'] },
      ],
    },
    {
      title: "Products",
      icon: Package,
      items: [
        { name: "Inventory", icon: Warehouse, path: "/inventory", roles: ['admin', 'inventory_manager'] },
      ],
    },
    {
      title: "Users",
      icon: Users,
      items: [
        { name: "Customers", icon: Users, path: "/users/customers", roles: ['admin'] },
        { name: "Suppliers", icon: Truck, path: "/users/suppliers", roles: ['admin'] },
      ],
    },
    {
      title: "Settings",
      icon: Settings,
      items: [
        { name: "System Users", icon: Shield, path: "/settings/system-users", roles: ['admin'] },
      ],
    },
  ];

  const isActive = (path: string) => {
    if (path === "/users/customers" || path === "/users/suppliers") {
      return location.pathname.startsWith("/users");
    }
    return location.pathname === path || location.pathname.startsWith(path + "/");
  };

  const handleNavClick = (path: string) => {
    navigate(path);
    if (window.innerWidth < 1024) {
      (setIsOpen as (val: boolean) => void)(false);
    }
  };

  return (
    <aside
      className={`
        ${isOpen ? "w-64" : "w-16"}
        h-screen transition-all duration-200
        bg-[#0b1120] border-r border-[#334155]
        text-slate-300 shadow-xl
        flex flex-col flex-shrink-0 z-30 select-none
      `}
    >
      {/* Brand Header */}
      <div className="flex items-center px-4 py-3.5 border-b border-[#334155] h-16 bg-[#0b1120]">
        <div
          className="flex items-center gap-3 cursor-pointer min-w-0"
          onClick={() => handleNavClick('/dashboard')}
        >
          <div className="p-2 rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30 flex-shrink-0">
            <ShieldCheck size={20} />
          </div>
          {isOpen && (
            <div className="overflow-hidden">
              <h1 className="text-sm font-bold text-white tracking-tight truncate">500Core</h1>
              <p className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase">Business Suite</p>
            </div>
          )}
        </div>
      </div>

      {/* Navigation List */}
      <div className="sidebar-nav flex-1 overflow-y-auto px-2.5 py-3 space-y-1" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        {/* Single Navigation Items */}
        {singleNavItems
          .filter((item) => item.roles.includes(currentRole))
          .map((item) => {
            const active = isActive(item.path);
            return (
              <div
                key={item.name}
                onClick={() => handleNavClick(item.path)}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer text-sm font-medium
                  transition-colors duration-150
                  ${
                    active
                      ? "bg-blue-600/20 text-blue-400 font-semibold border border-blue-500/30"
                      : "text-slate-300 hover:bg-[#1e293b] hover:text-white"
                  }
                `}
                title={!isOpen ? item.name : undefined}
              >
                <item.icon size={18} className={`flex-shrink-0 ${active ? "text-blue-400" : "text-slate-400"}`} />
                {isOpen && <span className="truncate">{item.name}</span>}
              </div>
            );
          })}

        {/* Grouped Navigation Items */}
        {navGroups.map((group) => {
          const filteredItems = group.items.filter((item) => item.roles.includes(currentRole));
          if (filteredItems.length === 0) return null;

          const isExpanded = expandedGroups[group.title] ?? true;

          return (
            <div key={group.title} className="pt-2">
              {/* Group Header */}
              {isOpen ? (
                <div
                  onClick={() => toggleGroup(group.title)}
                  className="flex items-center justify-between px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400 cursor-pointer hover:text-slate-200 transition-colors"
                >
                  <span>{group.title}</span>
                  {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                </div>
              ) : (
                <div className="h-px bg-[#334155] mx-2 my-2" />
              )}

              {/* Group Children */}
              {(isExpanded || !isOpen) && (
                <div className="space-y-0.5 mt-1">
                  {filteredItems.map((item) => {
                    const active = isActive(item.path);
                    return (
                      <div
                        key={item.name}
                        onClick={() => handleNavClick(item.path)}
                        className={`
                          flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer text-sm font-medium
                          transition-colors duration-150
                          ${
                            active
                              ? "bg-blue-600/20 text-blue-400 font-semibold border border-blue-500/30"
                              : "text-slate-300 hover:bg-[#1e293b] hover:text-white"
                          }
                        `}
                        title={!isOpen ? item.name : undefined}
                      >
                        <item.icon size={17} className={`flex-shrink-0 ${active ? "text-blue-400" : "text-slate-400"}`} />
                        {isOpen && <span className="truncate">{item.name}</span>}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer Status */}
      {isOpen && (
        <div className="p-3 border-t border-[#334155] text-[11px] text-slate-400 flex justify-between items-center bg-[#0b1120]">
          <span>HardTrade ERP v2.4</span>
          <span className="w-2 h-2 rounded-full bg-emerald-500" title="Online" />
        </div>
      )}
    </aside>
  );
};

export default Sidebar;