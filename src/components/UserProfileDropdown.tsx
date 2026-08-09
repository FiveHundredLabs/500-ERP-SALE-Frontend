import React, { useState, useRef, useEffect } from "react";
import { User, LogOut } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

interface UserProfile {
  fullName: string;
  email: string;
  role: string;
}

const UserProfileDropdown: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { logout } = useAuth();

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (stored) {
      try {
        const user = JSON.parse(stored);
        setUserProfile({
          fullName: user.fullName,
          email: user.email,
          role: user.role,
        });
      } catch (error) {
        console.error("Error parsing user data:", error);
      }
    }
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await logout();
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-[#111827] border border-[#334155] p-1.5 rounded-full cursor-pointer hover:bg-[#243244] transition flex items-center justify-center"
        aria-label="User profile menu"
      >
        <User className="text-[#CBD5E1] w-4 h-4" />
      </button>

      {/* Dropdown Menu */}
      {isOpen && userProfile && (
        <div className="absolute right-0 mt-2 w-72 bg-[#1E293B] border border-[#334155] rounded-lg shadow-xl z-[9999]">
          {/* User Info Section */}
          <div className="p-3.5 border-b border-[#334155]">
            <div className="flex items-center gap-3">
              <div className="bg-[#3B82F6]/20 text-[#3B82F6] border border-[#3B82F6]/30 rounded-full p-2.5">
                <User className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[#F8FAFC] truncate">
                  {userProfile.fullName}
                </p>
                <p className="text-xs text-[#94A3B8] truncate">
                  {userProfile.email}
                </p>
              </div>
            </div>
          </div>

          {/* Role Section */}
          <div className="px-3.5 py-2.5 border-b border-[#334155]">
            <p className="text-[10px] text-[#94A3B8] font-semibold uppercase tracking-wider mb-1">
              Role
            </p>
            <div className="inline-block bg-[#3B82F6]/20 text-[#38BDF8] border border-[#3B82F6]/30 text-xs font-semibold px-2.5 py-0.5 rounded-full capitalize">
              {userProfile.role}
            </div>
          </div>

          {/* Logout Button */}
          <div className="p-1.5">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-[#CBD5E1] hover:text-[#EF4444] hover:bg-[#EF4444]/10 rounded-md transition"
            >
              <LogOut className="w-3.5 h-3.5" />
              Logout System
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserProfileDropdown;
