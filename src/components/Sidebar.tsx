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
  PanelLeftClose,
  PanelLeftOpen,
  UserCheck,
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
        { name: "Quotations", icon: FileText, path: "/quotations", roles: ['admin'] },
        { name: "Purchase Orders", icon: ShoppingCart, path: "/purchase-orders", roles: ['admin', 'inventory_manager'] },
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
        { name: "Customers", icon: Users, path: "/customers", roles: ['admin'] },
        { name: "Sales Officers", icon: UserCheck, path: "/sales-officers", roles: ['admin'] },
        { name: "Suppliers", icon: Truck, path: "/suppliers", roles: ['admin'] },
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
    if (path === "/customers") {
      return location.pathname === "/customers" || location.pathname.startsWith("/customers/") || location.pathname.startsWith("/users/customers");
    }
    if (path === "/sales-officers") {
      return location.pathname === "/sales-officers" || location.pathname.startsWith("/sales-officers/") || location.pathname === "/salesmen";
    }
    if (path === "/suppliers") {
      return location.pathname === "/suppliers" || location.pathname.startsWith("/suppliers/") || location.pathname.startsWith("/users/suppliers");
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
        ${isOpen ? "w-[236px]" : "w-[60px]"}
        h-screen transition-all duration-200
        bg-[#0b1120] border-r border-[#334155]
        text-slate-300 shadow-xl
        flex flex-col flex-shrink-0 z-30 select-none
      `}
    >
      {/* Brand Header */}
      <div className={`flex items-center ${isOpen ? 'justify-between px-3.5' : 'justify-center px-2'} py-3 border-b border-[#334155] h-[68px] bg-[#0b1120] flex-shrink-0`}>
        {isOpen ? (
          <>
            <div
              className="flex items-center gap-2.5 cursor-pointer min-w-0 flex-1"
              onClick={() => handleNavClick('/dashboard')}
              title="500Core Dashboard"
            >
              <div className="p-2 rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30 flex-shrink-0">
                <ShieldCheck size={19} />
              </div>
              <div className="overflow-hidden">
                <h1 className="text-[0.95rem] font-bold text-white tracking-tight truncate">500Core</h1>
                <p className="text-[0.68rem] font-semibold tracking-wider text-slate-400 uppercase">Business Suite</p>
              </div>
            </div>

            {/* Collapse button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                (setIsOpen as (val: boolean) => void)(false);
              }}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#1e293b] border border-transparent hover:border-[#334155] transition-colors flex-shrink-0"
              title="Collapse sidebar"
              aria-label="Collapse sidebar"
            >
              <PanelLeftClose size={17} />
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => (setIsOpen as (val: boolean) => void)(true)}
            className="p-2 rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30 hover:bg-blue-600/30 hover:text-white transition-colors flex-shrink-0 flex items-center justify-center"
            title="Expand sidebar"
            aria-label="Expand sidebar"
          >
            <PanelLeftOpen size={18} />
          </button>
        )}
      </div>

      {/* Navigation List */}
      <div className="sidebar-nav flex-1 overflow-y-auto px-2 py-3 space-y-0.5" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
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
                  flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer font-medium
                  transition-colors duration-150
                  ${
                    active
                      ? "bg-blue-600/20 text-blue-400 font-semibold border border-blue-500/30"
                      : "text-slate-300 hover:bg-[#1e293b] hover:text-white"
                  }
                `}
                style={{ fontSize: '0.9rem' }}
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
                  className="flex items-center justify-between px-3 py-1.5 text-[0.7rem] font-bold uppercase tracking-widest text-slate-500 cursor-pointer hover:text-slate-300 transition-colors"
                >
                  <span>{group.title}</span>
                  {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                </div>
              ) : (
                <div className="h-px bg-[#334155] mx-2 my-2" />
              )}

              {/* Group Children */}
              {(isExpanded || !isOpen) && (
                <div className="space-y-0.5 mt-0.5">
                  {filteredItems.map((item) => {
                    const active = isActive(item.path);
                    return (
                      <div
                        key={item.name}
                        onClick={() => handleNavClick(item.path)}
                        className={`
                          flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer font-medium
                          transition-colors duration-150
                          ${
                            active
                              ? "bg-blue-600/20 text-blue-400 font-semibold border border-blue-500/30"
                              : "text-slate-300 hover:bg-[#1e293b] hover:text-white"
                          }
                        `}
                        style={{ fontSize: '0.9rem' }}
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
        <div className="p-3 border-t border-[#334155] flex justify-between items-center bg-[#0b1120]" style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
          <span>500Core v2.4</span>
          <span className="w-2 h-2 rounded-full bg-emerald-500" title="Online" />
        </div>
      )}
    </aside>
  );
};

export default Sidebar;