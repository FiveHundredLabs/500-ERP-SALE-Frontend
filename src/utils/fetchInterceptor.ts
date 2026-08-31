import { authService } from "../services/authService";

const originalFetch = window.fetch;

let isRefreshing = false;
let failedQueue: Array<{ resolve: (value: any) => void; reject: (reason?: any) => void; args: any[] }> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      const [resource, config] = prom.args;
      const headers = new Headers(config?.headers || {});
      if (token) {
        headers.set("Authorization", `Bearer ${token}`);
      }
      prom.resolve(originalFetch(resource, { ...config, headers }));
    }
  });
  failedQueue = [];
};

window.fetch = async (...args) => {
  let [resource, config] = args;
  const url = typeof resource === 'string' ? resource : (resource instanceof Request ? resource.url : '');
  
  // Don't intercept auth routes
  if (url.includes('/auth/login') || url.includes('/auth/register') || url.includes('/auth/refresh')) {
    return originalFetch(...args);
  }

  // Attach current token
  let token = localStorage.getItem('accessToken') || localStorage.getItem('token');
  if (token) {
    const headers = new Headers(config?.headers || {});
    headers.set("Authorization", `Bearer ${token}`);
    config = { ...config, headers };
    args = [resource, config];
  }

  let response = await originalFetch(...args);

  // If 401 Unauthorized, try to refresh
  if (response.status === 401 && token) {
    if (isRefreshing) {
      return new Promise(function(resolve, reject) {
        failedQueue.push({ resolve, reject, args });
      });
    }

    isRefreshing = true;

    try {
      const refreshed = await authService.refreshToken();
      const newToken = refreshed?.accessToken;
      if (newToken) {
        processQueue(null, newToken);
        
        // Retry original request
        const headers = new Headers(config?.headers || {});
        headers.set("Authorization", `Bearer ${newToken}`);
        config = { ...config, headers };
        return await originalFetch(resource, config);
      }
    } catch (err) {
      processQueue(err, null);
      
      // If refresh fails, log out
      localStorage.removeItem("accessToken");
      localStorage.removeItem("token");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("user");
      localStorage.removeItem("role");
      
      window.location.href = '/login';
    } finally {
      isRefreshing = false;
    }
  }

  return response;
};
