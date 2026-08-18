import React from 'react';
import { ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export interface Breadcrumb {
  label: string;
  path?: string;
}

interface PageHeaderProps {
  title: string;
  description?: string;
  breadcrumbs?: Breadcrumb[];
  actions?: React.ReactNode;
  className?: string;
}

const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
  breadcrumbs = [],
  actions,
  className = '',
}) => {
  const navigate = useNavigate();

  return (
    <div className={`mb-5 ${className}`}>
      {/* Breadcrumbs */}
      {breadcrumbs.length > 0 && (
        <nav className="flex items-center gap-1.5 mb-2.5" aria-label="Breadcrumb">
          {breadcrumbs.map((crumb, idx) => (
            <React.Fragment key={idx}>
              {idx > 0 && <ChevronRight size={13} className="text-gray-500" />}
              {crumb.path ? (
                <button
                  onClick={() => navigate(crumb.path!)}
                  className="text-gray-400 hover:text-blue-400 transition-colors font-medium"
                  style={{ fontSize: '0.82rem' }}
                >
                  {crumb.label}
                </button>
              ) : (
                <span className="text-gray-200 font-semibold" style={{ fontSize: '0.82rem' }}>{crumb.label}</span>
              )}
            </React.Fragment>
          ))}
        </nav>
      )}

      {/* Main Header Title Row */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-bold text-gray-100 leading-tight" style={{ fontSize: '1.4rem' }}>{title}</h1>
          {description && (
            <p className="text-gray-400 mt-1" style={{ fontSize: '0.9rem' }}>{description}</p>
          )}
        </div>
        {actions && (
          <div className="flex items-center gap-2.5 flex-shrink-0">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
};

export default PageHeader;
