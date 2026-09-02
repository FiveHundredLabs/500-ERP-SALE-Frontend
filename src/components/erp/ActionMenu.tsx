import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { MoreVertical } from 'lucide-react';

export interface ActionMenuItem {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
  variant?: 'default' | 'blue' | 'purple' | 'emerald' | 'danger' | 'amber';
  subtitle?: string;
}

export interface ActionMenuSection {
  title?: string;
  items: ActionMenuItem[];
}

export interface ActionMenuProps {
  /** Items configuration for declarative menu */
  items?: (ActionMenuItem | ActionMenuSection)[];
  /** Custom children to render inside the floating dropdown */
  children?: React.ReactNode | ((helpers: { close: () => void }) => React.ReactNode);
  /** Custom trigger button or node */
  trigger?: React.ReactNode;
  /** Alignment relative to the trigger button */
  align?: 'left' | 'right';
  /** Custom width in pixels or Tailwind classes */
  width?: number | string;
  /** Custom className for the trigger wrapper */
  className?: string;
  /** Custom className for the floating menu panel */
  menuClassName?: string;
  /** Trigger button title/tooltip */
  title?: string;
  /** Controlled open state */
  isOpen?: boolean;
  /** Controlled open state change callback */
  onOpenChange?: (open: boolean) => void;
  /** Stop propagation on click */
  stopPropagation?: boolean;
}

/**
 * Enterprise Portal-based Action Menu (3-dots popover)
 * - Escapes parent table/overflow boundaries via document.body Portal
 * - Intelligently flips upwards when close to bottom viewport edge
 * - Clamps within viewport horizontally and vertically
 * - Tracks scroll/resize seamlessly and auto-closes on outside click or Escape
 */
export const ActionMenu: React.FC<ActionMenuProps> = ({
  items,
  children,
  trigger,
  align = 'right',
  width = 180,
  className = '',
  menuClassName = '',
  title = 'Actions',
  isOpen: controlledIsOpen,
  onOpenChange,
  stopPropagation = true,
}) => {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const isControlled = controlledIsOpen !== undefined;
  const isOpen = isControlled ? controlledIsOpen : internalIsOpen;

  const triggerRef = useRef<HTMLButtonElement | HTMLDivElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const [coords, setCoords] = useState<{ top: number; left: number; isPlacementTop: boolean }>({
    top: 0,
    left: 0,
    isPlacementTop: false,
  });

  const setIsOpen = useCallback((open: boolean) => {
    if (!isControlled) {
      setInternalIsOpen(open);
    }
    onOpenChange?.(open);
  }, [isControlled, onOpenChange]);

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Check if trigger is offscreen entirely
    if (
      triggerRect.bottom < 0 ||
      triggerRect.top > viewportHeight ||
      triggerRect.right < 0 ||
      triggerRect.left > viewportWidth
    ) {
      setIsOpen(false);
      return;
    }

    const menuEl = menuRef.current;
    const menuWidth = typeof width === 'number' ? width : (menuEl?.offsetWidth || 180);
    const menuHeight = menuEl?.offsetHeight || 150;
    const margin = 8;
    const gap = 4;

    // Vertical placement & auto-flip
    const spaceBelow = viewportHeight - triggerRect.bottom;
    const spaceAbove = triggerRect.top;

    let isPlacementTop = false;
    let top = triggerRect.bottom + gap;

    if (spaceBelow < menuHeight + margin && spaceAbove > spaceBelow) {
      isPlacementTop = true;
      top = triggerRect.top - menuHeight - gap;
    }

    // Horizontal placement
    let left = align === 'right' ? triggerRect.right - menuWidth : triggerRect.left;

    // Boundary constraints
    left = Math.max(margin, Math.min(left, viewportWidth - menuWidth - margin));
    top = Math.max(margin, Math.min(top, viewportHeight - menuHeight - margin));

    setCoords({ top, left, isPlacementTop });
  }, [align, width, setIsOpen]);

  // Position calculation when opened
  useEffect(() => {
    if (isOpen) {
      updatePosition();
      // Double check position on next tick after layout render
      const frame = requestAnimationFrame(updatePosition);
      return () => cancelAnimationFrame(frame);
    }
  }, [isOpen, updatePosition]);

  // Global listeners for scroll, resize, click-outside, and escape
  useEffect(() => {
    if (!isOpen) return;

    const handleScrollOrResize = () => {
      updatePosition();
    };

    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (
        triggerRef.current?.contains(target) ||
        menuRef.current?.contains(target)
      ) {
        return;
      }
      setIsOpen(false);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    window.addEventListener('scroll', handleScrollOrResize, { capture: true, passive: true });
    window.addEventListener('resize', handleScrollOrResize, { passive: true });
    document.addEventListener('mousedown', handleClickOutside, true);
    document.addEventListener('touchstart', handleClickOutside, true);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('scroll', handleScrollOrResize, { capture: true });
      window.removeEventListener('resize', handleScrollOrResize);
      document.removeEventListener('mousedown', handleClickOutside, true);
      document.removeEventListener('touchstart', handleClickOutside, true);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, updatePosition, setIsOpen]);

  const handleTriggerClick = (e: React.MouseEvent) => {
    if (stopPropagation) {
      e.stopPropagation();
      e.preventDefault();
    }
    setIsOpen(!isOpen);
  };

  const getItemColorClasses = (item: ActionMenuItem) => {
    if (item.disabled) return 'text-slate-500 cursor-not-allowed opacity-50';
    if (item.danger || item.variant === 'danger') return 'text-rose-400 hover:text-rose-300 hover:bg-rose-500/20';
    if (item.variant === 'blue') return 'text-slate-200 hover:text-blue-300 hover:bg-blue-600/20';
    if (item.variant === 'purple') return 'text-slate-200 hover:text-purple-300 hover:bg-purple-600/20';
    if (item.variant === 'emerald') return 'text-slate-200 hover:text-emerald-300 hover:bg-emerald-600/20';
    if (item.variant === 'amber') return 'text-slate-200 hover:text-amber-300 hover:bg-amber-600/20';
    return 'text-slate-200 hover:text-white hover:bg-slate-700/50';
  };

  const getItemIconClasses = (item: ActionMenuItem) => {
    if (item.danger || item.variant === 'danger') return 'text-rose-400';
    if (item.variant === 'blue') return 'text-blue-400';
    if (item.variant === 'purple') return 'text-purple-400';
    if (item.variant === 'emerald') return 'text-emerald-400';
    if (item.variant === 'amber') return 'text-amber-400';
    return 'text-slate-400 group-hover:text-slate-200';
  };

  const widthStyle = typeof width === 'number' ? { width: `${width}px` } : {};
  const widthClass = typeof width === 'string' ? width : '';

  const renderContent = () => {
    if (children) {
      return typeof children === 'function' ? children({ close: () => setIsOpen(false) }) : children;
    }

    if (!items || items.length === 0) return null;

    // Check if items has sections or flat items
    const isSectioned = items.some((item) => 'items' in item);

    if (isSectioned) {
      const sections = items as ActionMenuSection[];
      return (
        <div className="divide-y divide-[#334155]/60">
          {sections.map((sec, secIdx) => (
            <div key={secIdx} className="p-1 space-y-0.5">
              {sec.title && (
                <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {sec.title}
                </div>
              )}
              {sec.items.map((item, itemIdx) => (
                <button
                  key={itemIdx}
                  type="button"
                  disabled={item.disabled}
                  onClick={(e) => {
                    if (stopPropagation) e.stopPropagation();
                    setIsOpen(false);
                    item.onClick();
                  }}
                  className={`group w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-left transition-colors ${getItemColorClasses(item)}`}
                >
                  {item.icon && <span className={`flex-shrink-0 ${getItemIconClasses(item)}`}>{item.icon}</span>}
                  <div className="flex-1 min-w-0">
                    <div className="truncate">{item.label}</div>
                    {item.subtitle && <div className="text-[10px] text-slate-400 truncate">{item.subtitle}</div>}
                  </div>
                </button>
              ))}
            </div>
          ))}
        </div>
      );
    }

    const flatItems = items as ActionMenuItem[];
    return (
      <div className="p-1 space-y-0.5">
        {flatItems.map((item, idx) => (
          <button
            key={idx}
            type="button"
            disabled={item.disabled}
            onClick={(e) => {
              if (stopPropagation) e.stopPropagation();
              setIsOpen(false);
              item.onClick();
            }}
            className={`group w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-left transition-colors ${getItemColorClasses(item)}`}
          >
            {item.icon && <span className={`flex-shrink-0 ${getItemIconClasses(item)}`}>{item.icon}</span>}
            <div className="flex-1 min-w-0">
              <div className="truncate">{item.label}</div>
              {item.subtitle && <div className="text-[10px] text-slate-400 truncate">{item.subtitle}</div>}
            </div>
          </button>
        ))}
      </div>
    );
  };

  return (
    <div className={`relative inline-flex items-center ${className}`}>
      {trigger ? (
        <div
          ref={triggerRef as React.RefObject<HTMLDivElement>}
          onClick={handleTriggerClick}
          className="cursor-pointer"
        >
          {trigger}
        </div>
      ) : (
        <button
          ref={triggerRef as React.RefObject<HTMLButtonElement>}
          type="button"
          onClick={handleTriggerClick}
          className={`p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors ${
            isOpen ? 'bg-slate-800 text-white ring-1 ring-slate-600' : ''
          }`}
          title={title}
          aria-label={title}
          aria-expanded={isOpen}
        >
          <MoreVertical size={16} />
        </button>
      )}

      {/* Floating Menu via Portal attached to document.body */}
      {isOpen &&
        createPortal(
          <div
            ref={menuRef}
            style={{
              position: 'fixed',
              top: `${coords.top}px`,
              left: `${coords.left}px`,
              ...widthStyle,
              zIndex: 99999,
            }}
            onClick={(e) => {
              if (stopPropagation) e.stopPropagation();
            }}
            className={`
              bg-[#0f172a] 
              border border-[#334155] 
              rounded-xl 
              shadow-2xl 
              shadow-black/70 
              text-xs 
              text-slate-200 
              animate-in fade-in zoom-in-95 
              duration-150
              ${widthClass || (!widthStyle.width ? 'w-48' : '')}
              ${menuClassName}
            `}
          >
            {renderContent()}
          </div>,
          document.body
        )}
    </div>
  );
};

export default ActionMenu;
