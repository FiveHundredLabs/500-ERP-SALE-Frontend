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
              {idx > 0 && <ChevronRight size={13} style={{ color: 'var(--text-muted)' }} />}
              {crumb.path ? (
                <button
                  onClick={() => navigate(crumb.path!)}
                  className="hover:text-blue-400 transition-colors font-medium"
                  style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}
                >
                  {crumb.label}
                </button>
              ) : (
                <span className="font-semibold" style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{crumb.label}</span>
              )}
            </React.Fragment>
          ))}
        </nav>
      )}

      {/* Main Header Title Row */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-bold leading-tight" style={{ fontSize: '1.4rem', color: 'var(--text-heading)' }}>{title}</h1>
          {description && (
            <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem', fontSize: '0.9rem' }}>{description}</p>
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
