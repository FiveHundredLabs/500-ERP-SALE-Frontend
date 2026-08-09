// axios.ts – stub only, no real HTTP calls are made (mock-data mode)
// This file is kept for compatibility with any remaining imports.
const api = {
  get: async (_url: string) => ({ data: [], status: 200 }),
  post: async (_url: string, _data?: any) => ({ data: {}, status: 200 }),
  put: async (_url: string, _data?: any) => ({ data: {}, status: 200 }),
  patch: async (_url: string, _data?: any) => ({ data: {}, status: 200 }),
  delete: async (_url: string) => ({ data: {}, status: 200 }),
  interceptors: {
    request: { use: () => {} },
    response: { use: () => {} }
  }
};

export default api;
