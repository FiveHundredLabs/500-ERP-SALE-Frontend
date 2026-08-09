import type { LoginData, RegisterData, AuthRes } from "../types/auth";

const DEFAULT_MOCK_USER = {
  _id: "usr-admin-001",
  fullName: "Admin User",
  email: "500labs.admin@gmail.com",
  role: "admin",
  status: "Active",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z"
};

export const authService = {
  async login(loginData: LoginData): Promise<AuthRes> {
    // Artificial delay for smooth UX
    await new Promise((res) => setTimeout(res, 300));

    const email = loginData.email.trim().toLowerCase();
    const password = loginData.password.trim();

    if (email === "500labs.admin@gmail.com" && password === "500labs") {
      return {
        user: DEFAULT_MOCK_USER,
        token: "mock-jwt-token-500labs-admin"
      };
    }

    // Allow general fallback for test purposes if email matches standard formats
    if (password === "500labs" || password === "admin123" || password === "password") {
      return {
        user: {
          ...DEFAULT_MOCK_USER,
          email: loginData.email
        },
        token: "mock-jwt-token-demo"
      };
    }

    // If specific email provided with wrong password
    if (email === "500labs.admin@gmail.com" && password !== "500labs") {
      throw new Error("Invalid password for 500labs.admin@gmail.com");
    }

    // Default mock login success for easy testing
    return {
      user: {
        ...DEFAULT_MOCK_USER,
        email: loginData.email
      },
      token: "mock-jwt-token-demo"
    };
  },

  async register(registerData: RegisterData): Promise<AuthRes> {
    await new Promise((res) => setTimeout(res, 300));
    return {
      user: {
        _id: `usr-${Date.now()}`,
        fullName: registerData.fullName,
        email: registerData.email,
        role: registerData.role || "salesman",
        status: "Active",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      token: "mock-jwt-token-new"
    };
  },

  async refreshToken(): Promise<{ accessToken: string; refreshToken: string }> {
    return {
      accessToken: "mock-access-token",
      refreshToken: "mock-refresh-token"
    };
  },

  async logout(): Promise<void> {
    localStorage.removeItem("user");
    localStorage.removeItem("role");
  },
};

export const loginAPI = authService.login;
export const registerAPI = authService.register;
export const logoutAPI = authService.logout;
export const refreshTokenAPI = authService.refreshToken;