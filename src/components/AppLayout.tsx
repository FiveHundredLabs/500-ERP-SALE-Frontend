import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import UserProfileDropdown from './UserProfileDropdown';
import ThemeToggle from './ThemeToggle';
import { Bell, Menu } from 'lucide-react';

interface AppLayoutProps {
  headerIcon?: React.ReactNode;
  headerTitle: string;
  headerSubtitle?: string;
  headerRight?: React.ReactNode;
  showBell?: boolean;
  children: React.ReactNode;
}

/**
 * AppLayout — Shared page shell for all ERP pages.
 * Redesigned: wider content, bigger header text, less wasted side space.
 */
const AppLayout: React.FC<AppLayoutProps> = ({
  headerIcon,
  headerTitle,
  headerSubtitle,
  headerRight,
  showBell = false,
  children,
}) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setSidebarOpen(false);
      } else {
        setSidebarOpen(true);
        setMobileOpen(false);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleMobileOverlayClick = () => setMobileOpen(false);

  return (
    <div className="flex h-screen bg-[#0f172a] text-white overflow-hidden">

      {/* Mobile backdrop overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={handleMobileOverlayClick}
          aria-hidden="true"
        />
      )}

      {/* Sidebar - Desktop */}
      <div className="hidden lg:flex flex-shrink-0">
        <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
      </div>

      {/* Sidebar - Mobile overlay */}
      <div
        className={`
          fixed inset-y-0 left-0 z-50 lg:hidden
          transform transition-transform duration-250 ease-in-out
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <Sidebar isOpen={true} setIsOpen={() => setMobileOpen(false)} />
      </div>

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Top Header Bar — taller (h-[68px]) for bigger font readability */}
        <header className="h-[68px] bg-[#1e293b]/90 backdrop-blur-xl border-b border-[#334155] flex items-center justify-between px-5 shadow-lg flex-shrink-0 z-50">

          {/* Left Side Header */}
          <div className="flex items-center gap-3 min-w-0">
            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-2 rounded-lg text-gray-400 hover:text-white hover:bg-[#334155] transition-colors flex-shrink-0 cursor-pointer"
              aria-label="Open menu"
            >
              <Menu size={20} />
            </button>

            {/* Desktop sidebar toggle */}
            <button
              onClick={() => setSidebarOpen((v) => !v)}
              className="hidden lg:flex p-2 rounded-lg text-gray-400 hover:text-white hover:bg-[#334155] transition-colors flex-shrink-0 cursor-pointer"
              aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
            >
              <Menu size={20} />
            </button>

            {headerIcon && (
              <div className="p-2 rounded-lg bg-blue-500/20 text-blue-400 flex-shrink-0">
                {headerIcon}
              </div>
            )}

            <div className="min-w-0">
              <h1 className="text-[1.2rem] font-bold text-gray-100 leading-tight truncate tracking-tight">
                {headerTitle}
              </h1>
              {headerSubtitle && (
                <p className="text-[0.8rem] text-gray-400 hidden sm:block truncate mt-0.5">
                  {headerSubtitle}
                </p>
              )}
            </div>
          </div>

          {/* Right Side Header */}
          <div className="flex items-center gap-3 flex-shrink-0">
            {/* Theme Toggle (Light / Dark Mode) */}
            <ThemeToggle />

            {showBell && (
              <button className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-[#334155] transition-colors relative cursor-pointer">
                <Bell size={20} />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-blue-500" />
              </button>
            )}
            {headerRight}
            <UserProfileDropdown />
          </div>
        </header>

        {/* Scrollable Content Area — reduced side padding to use more horizontal space */}
        <main className="flex-1 overflow-y-auto min-w-0 space-y-5" style={{ padding: '1.25rem 1.5rem' }}>
          {children}
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
