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
      className={`kpi-card ${isClickable ? 'cursor-pointer hover:border-slate-400 hover:scale-[1.02] transition-all' : ''} ${className}`}
      onClick={onClick}
      style={{
        backgroundColor: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        borderRadius: '0.75rem',
        padding: '1.25rem',
        boxShadow: 'var(--shadow-card)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        gap: '0.75rem',
      }}
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
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.375rem' }}>
          {title}
        </p>
        <p style={{ color: 'var(--text-primary)', fontSize: '1.7rem', fontWeight: 700, lineHeight: 1.2 }}>
          {value}
        </p>
        {subtitle && (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.25rem' }}>
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
};

export default KpiCard;
