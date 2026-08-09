import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  iconBg?: string;
  trend?: {
    value: number;    // percentage
    positive?: boolean;
  };
  onClick?: () => void;
  className?: string;
}

const KpiCard: React.FC<KpiCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  iconBg = 'bg-blue-500/20 border border-blue-500/30 text-blue-400',
  trend,
  onClick,
  className = '',
}) => {
  const isClickable = !!onClick;

  return (
    <div
      className={`bg-[#1e293b]/70 border border-[#334155] rounded-xl shadow-lg p-5 backdrop-blur-sm flex flex-col justify-between gap-3 ${isClickable ? 'cursor-pointer hover:border-slate-500 hover:scale-[1.02] transition-all' : ''} ${className}`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div className={`p-2.5 rounded-lg ${iconBg}`}>
          {icon}
        </div>
        {trend !== undefined && (
          <div className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${
            trend.positive 
              ? 'text-green-400 bg-green-500/20 border border-green-500/30' 
              : 'text-red-400 bg-red-500/20 border border-red-500/30'
          }`}>
            {trend.positive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {Math.abs(trend.value).toFixed(1)}%
          </div>
        )}
      </div>

      <div>
        <p className="text-gray-400 text-sm font-medium mb-1">{title}</p>
        <p className="text-2xl font-bold text-white leading-tight">{value}</p>
        {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
      </div>
    </div>
  );
};

export default KpiCard;
