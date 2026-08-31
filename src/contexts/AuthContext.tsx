import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { authService } from "../services/authService";
import UserService from "../services/UserService";
import type { LoginData, RegisterData, User as AuthUser, AuthRes } from "../types/auth";
import type { UserRole } from "../types/roles";
import type { User } from "../types/users";

interface AuthContextType {
  user: AuthUser | null;
  role: UserRole | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (data: LoginData) => Promise<void>;
  register: (data: RegisterData) => Promise<AuthRes>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    const saved = localStorage.getItem("user");
    if (saved) {
      try {
        const userObj = JSON.parse(saved) as AuthUser;
        UserService.setCurrentUser(userObj as User);
        return userObj;
      } catch {
        return null;
      }
    }
    return null;
  });
  
  const [role, setRole] = useState<UserRole | null>(() => {
    const saved = localStorage.getItem("role");
    return saved ? (saved as UserRole) : null;
  });
  
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!user;

  const initAuth = useCallback(async () => {
    setIsLoading(true);

    try {
      // First try to fetch current user with existing access token
      const me = await authService.getMe();
      if (me) {
        setUser(me as AuthUser);
        setRole((me.role || "admin") as UserRole);
        UserService.setCurrentUser(me as User);
        localStorage.setItem("user", JSON.stringify(me));
        localStorage.setItem("role", me.role || "admin");
        return;
      }

      // If token expired but refresh token exists, attempt refresh
      const hasRefreshToken = !!localStorage.getItem("refreshToken");
      if (hasRefreshToken) {
        try {
          const refreshed = await authService.refreshToken();
          if (refreshed) {
            const userAfterRefresh = await authService.getMe();
            if (userAfterRefresh) {
              setUser(userAfterRefresh as AuthUser);
              setRole((userAfterRefresh.role || "admin") as UserRole);
              UserService.setCurrentUser(userAfterRefresh as User);
              return;
            }
          }
        } catch {
          // Token refresh failed - session expired
        }
      }

      // Fallback to local storage if available
      const savedUserStr = localStorage.getItem("user");
      if (savedUserStr) {
        try {
          const parsed = JSON.parse(savedUserStr) as AuthUser;
          setUser(parsed);
          setRole((parsed.role || "admin") as UserRole);
          UserService.setCurrentUser(parsed as User);
        } catch {
          setUser(null);
          setRole(null);
        }
      }
    } catch {
      // Silent error handling
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  const checkAuth = async (): Promise<boolean> => {
    try {
      const me = await authService.getMe();
      if (me) {
        setUser(me as AuthUser);
        setRole((me.role || "admin") as UserRole);
        return true;
      }
      return !!user;
    } catch {
      return false;
    }
  };

  const login = async (data: LoginData): Promise<void> => {
    setIsLoading(true);
    try {
      const result = await authService.login(data);
      
      setUser(result.user);
      setRole((result.user.role || "admin") as UserRole);
      UserService.setCurrentUser(result.user as User);
    } catch (error: unknown) {
      throw error instanceof Error ? error : new Error("Login failed");
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: RegisterData): Promise<AuthRes> => {
    setIsLoading(true);
    try {
      return await authService.register(data);
    } catch (error: unknown) {
      throw error instanceof Error ? error : new Error("Registration failed");
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await authService.logout();
    } catch {
      // Silent error handling for logout
    } finally {
      UserService.setCurrentUser(null);
      setUser(null);
      setRole(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        isAuthenticated,
        isLoading,
        login,
        register,
        logout,
        checkAuth
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}