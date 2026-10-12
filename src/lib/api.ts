function getApiBaseUrl(): string {
  let base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  if (typeof window !== 'undefined') {
    if (window.location.hostname === 'localhost' && base.includes('127.0.0.1')) {
      base = base.replace('127.0.0.1', 'localhost');
    } else if (window.location.hostname === '127.0.0.1' && base.includes('localhost')) {
      base = base.replace('localhost', '127.0.0.1');
    }
  }
  return base;
}

export class ApiError extends Error {
  status: number;
  info?: any;

  constructor(message: string, status: number, info?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.info = info;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}${path}`;
  const headers = new Headers(options.headers);

  if (options.body && !(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  // Attach token from localStorage if available as robust fallback for cross-site cookie restrictions
  if (typeof window !== 'undefined' && !headers.has('Authorization')) {
    const token = localStorage.getItem('v3c_token');
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
  }

  // Always send cookies/credentials
  const config: RequestInit = {
    ...options,
    headers,
    credentials: options.credentials || 'include',
  };

  let response: Response;
  try {
    response = await fetch(url, config);
  } catch (err: any) {
    if (err instanceof ApiError) throw err;
    const isNetworkError = err?.message === 'Failed to fetch' || err?.name === 'TypeError';
    const message = isNetworkError
      ? `Cannot reach backend API at ${baseUrl}. Please check server status and CORS configuration.`
      : (err?.message || 'Network request failed');
    throw new ApiError(message, 0, err);
  }

  let data: any;
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    try {
      data = await response.json();
    } catch {
      data = null;
    }
  } else {
    try {
      data = await response.text();
    } catch {
      data = null;
    }
  }

  if (!response.ok) {
    const errorMsg = (data && typeof data === 'object' && data.error) 
      ? data.error 
      : (data && typeof data === 'object' && data.message)
      ? data.message
      : typeof data === 'string' && data ? data : response.statusText;
    throw new ApiError(errorMsg, response.status, data);
  }

  return data as T;
}

export const api = {
  get: <T>(path: string, options?: RequestInit) => 
    request<T>(path, { ...options, method: 'GET' }),
    
  post: <T>(path: string, body?: any, options?: RequestInit) => 
    request<T>(path, { 
      ...options, 
      method: 'POST', 
      body: body instanceof FormData ? body : JSON.stringify(body) 
    }),
    
  put: <T>(path: string, body?: any, options?: RequestInit) => 
    request<T>(path, { 
      ...options, 
      method: 'PUT', 
      body: body instanceof FormData ? body : JSON.stringify(body) 
    }),
    
  delete: <T>(path: string, options?: RequestInit) => 
    request<T>(path, { ...options, method: 'DELETE' }),
};
