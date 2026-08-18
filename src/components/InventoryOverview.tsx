import React from "react";
import { Package, TrendingUp, DollarSign, Tag } from "lucide-react";
import { mockInventoryItems } from "../data/mockInventory";

interface InventoryOverviewProps {
  stats?: {
    totalItems: number;
    inStock?: number;
    outOfStock?: number;
    discontinued?: number;
  };
}

const InventoryOverview: React.FC<InventoryOverviewProps> = () => {
  const items = mockInventoryItems;
  const totalProducts = items.length;
  const totalSoldQty = items.reduce((acc, i) => acc + (i.sold_count || 0), 0);
  const avgCost = items.length > 0 ? items.reduce((acc, i) => acc + (i.purchase_price || 0), 0) / items.length : 0;
  const avgSell = items.length > 0 ? items.reduce((acc, i) => acc + (i.sell_price || 0), 0) / items.length : 0;

  const statCards = [
    {
      title: "Total Products",
      value: totalProducts.toString(),
      icon: Package,
      color: "text-blue-400",
      bgColor: "bg-blue-500/20",
      borderColor: "border-blue-500/30"
    },
    {
      title: "Total Selling Qty",
      value: `${totalSoldQty.toLocaleString()} PCS`,
      icon: TrendingUp,
      color: "text-emerald-400",
      bgColor: "bg-emerald-500/20",
      borderColor: "border-emerald-500/30"
    },
    {
      title: "Average Cost",
      value: `LKR ${Math.round(avgCost).toLocaleString()}`,
      icon: DollarSign,
      color: "text-amber-400",
      bgColor: "bg-amber-500/20",
      borderColor: "border-amber-500/30"
    },
    {
      title: "Average Selling Price",
      value: `LKR ${Math.round(avgSell).toLocaleString()}`,
      icon: Tag,
      color: "text-purple-400",
      bgColor: "bg-purple-500/20",
      borderColor: "border-purple-500/30"
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {statCards.map((stat, index) => (
        <div
          key={index}
          className={`
            bg-[#1e293b]/70 border ${stat.borderColor} 
            rounded-2xl shadow-xl p-5 
            backdrop-blur-sm transition-all duration-300
            hover:scale-[1.02] hover:shadow-2xl
          `}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-1.5">
                {stat.title}
              </p>
              <p className={`text-xl font-bold font-mono ${stat.color}`}>
                {stat.value}
              </p>
            </div>
            <div className={`
              p-3 rounded-xl ${stat.bgColor} ${stat.borderColor} border
            `}>
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default InventoryOverview;