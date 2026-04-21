// Fixed API client for the frontend - Enhanced error handling and debugging
// - Automatically extracts data from {success: true, data: [...]} responses
// - Handles JSON vs FormData bodies
// - Provides safe, masked logging for debugging
// - Compatible with existing VideoManagement and CoursesPage components
// - Enhanced network error handling and CORS debugging

type JsonObject = { [key: string]: any };

// FIXED: Better URL handling and validation - PREVENTS DOUBLE /api ISSUES
const API_BASE_URL = (() => {
  const envUrl = process.env.REACT_APP_API_URL || 'http://localhost:5001';
  
  // Remove any trailing /api paths to prevent duplication
  const baseUrl = envUrl.replace(/\/api.*$/, '');
  
  console.log(`🔧 Environment API URL: ${envUrl}`);
  console.log(`🔧 Cleaned base URL: ${baseUrl}`);
  
  // Validate the URL format
  try {
    new URL(baseUrl);
    console.log(`✅ Valid base URL format`);
  } catch (error) {
    console.error('❌ Invalid base URL format:', baseUrl);
  }
  
  return baseUrl;
})();

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
    console.log(`🔌 API Client initialized for ${getCurrentUserTag()} with base URL: ${baseUrl}`);
    
    // Validate the base URL
    try {
      new URL(baseUrl);
    } catch (error) {
      console.error('❌ Invalid base URL:', baseUrl);
    }
  }

  // Simple URL building - adds /api prefix for API endpoints
  private buildUrl(endpoint: string) {
    // If endpoint doesn't start with /api, add it
    const apiEndpoint = endpoint.startsWith('/api') ? endpoint : `/api${endpoint}`;
    const fullUrl = `${this.baseUrl}${apiEndpoint}`;
    console.log(`🔗 Built URL: ${endpoint} -> ${fullUrl}`);
    return fullUrl;
  }

  // Convert HeadersInit to a plain object for merging/inspection
  private headersInitToObject(headersInit?: HeadersInit): Record<string, string> {
    const headers: Record<string, string> = {};
    if (!headersInit) return headers;

    if (headersInit instanceof Headers) {
      headersInit.forEach((v, k) => (headers[k] = v));
    } else if (Array.isArray(headersInit)) {
      headersInit.forEach(([k, v]) => (headers[k] = v));
    } else {
      Object.assign(headers, headersInit);
    }
    return headers;
  }

  // Mask token for safe logging (don't print full token)
  private maskToken(token: string) {
    if (!token) return '';
    if (token.length > 12) return `${token.slice(0, 6)}…${token.slice(-4)}`;
    return '***';
  }

  // ✅ Extract data from MySQL5 backend response structure
  private extractData<T>(response: any): T {
    console.log('📦 Extracting data from response:', typeof response, Array.isArray(response));
    
    // If it's already an array, return as-is
    if (Array.isArray(response)) {
      console.log('✅ Response is already an array:', response.length, 'items');
      return response as T;
    }
    
    // If it's an object with success/data structure (MySQL5 backend)
    if (response && typeof response === 'object') {
      if ('success' in response && response.success === true && 'data' in response) {
        console.log('✅ Extracting data from success response:', Array.isArray(response.data) ? response.data.length + ' items' : typeof response.data);
        return response.data as T;
      }
      
      if ('data' in response) {
        console.log('✅ Extracting data property');
        return response.data as T;
      }
      
      if ('success' in response && response.success && 'result' in response) {
        console.log('✅ Extracting result from success response');
        return response.result as T;
      }

      // For video responses, check for direct video data
      if ('id' in response && 'title' in response && 'video_path' in response) {
        console.log('✅ Detected video response format');
        return response as T;
      }
    }
    
    console.log('✅ Returning response as-is');
    return response as T;
  }

  // ENHANCED: Better error handling and network debugging
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = this.buildUrl(endpoint);
    console.log(`🔍 Making ${options.method || 'GET'} request to: ${url}`);

    // Prepare headers
    const suppliedHeaders = this.headersInitToObject(options.headers);
    const headers: Record<string, string> = {};

    // If body is FormData we must not set Content-Type (browser will set with boundary)
    const isFormData = options.body instanceof FormData;

    // If not form data and Content-Type not explicitly provided, default to application/json
    const lowerCaseHeaders = Object.keys(suppliedHeaders).reduce((acc, k) => {
      acc[k.toLowerCase()] = suppliedHeaders[k];
      return acc;
    }, {} as Record<string,string>);
    if (!isFormData && !('content-type' in lowerCaseHeaders)) {
      headers['Content-Type'] = 'application/json';
    }

    // Merge supplied headers
    Object.assign(headers, suppliedHeaders);

    // Add CORS headers for cross-origin requests
    if (!headers['Accept']) {
      headers['Accept'] = 'application/json, text/plain, */*';
    }

    // Attach Authorization from localStorage
    try {
      if (typeof window !== 'undefined') {
        const token = localStorage.getItem('authToken') || localStorage.getItem('token');
        if (token && !headers['Authorization'] && !headers['authorization']) {
          headers['Authorization'] = `Bearer ${token}`;
        }
        
        if (headers['Authorization']) {
          console.log('🔐 Request includes Authorization header (masked):', `Bearer ${this.maskToken(String(headers['Authorization']).replace(/^Bearer\s+/, ''))}`);
        } else {
          console.log('⚠️ Request does NOT include Authorization header');
        }
      }
    } catch (e) {
      console.warn('⚠️ Could not read auth token from localStorage', e);
    }

    // If FormData, ensure we don't send Content-Type header
    if (isFormData) {
      delete headers['Content-Type'];
      delete headers['content-type'];
    }

    // ENHANCED: Add timeout and better fetch configuration
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    const config: RequestInit = {
      ...options,
      headers,
      signal: controller.signal,
      // Add CORS mode if needed
      mode: this.baseUrl.includes('localhost') ? 'cors' : 'cors',
      credentials: 'include', // Include cookies for CORS
    };

    let response: Response;
    try {
      console.log(`🚀 Fetching ${url} with config:`, {
        method: config.method || 'GET',
        headers: Object.keys(headers),
        mode: config.mode,
        credentials: config.credentials
      });
      
      response = await fetch(url, config);
      clearTimeout(timeoutId);
      
    } catch (networkErr: any) {
      clearTimeout(timeoutId);
      console.error(`❌ Network error while requesting ${url}:`, networkErr);
      
      // Enhanced error reporting
      if (networkErr.name === 'AbortError') {
        throw new Error('Request timeout - please try again');
      } else if (networkErr.message?.includes('CORS')) {
        throw new Error('CORS error - please check server configuration');
      } else if (networkErr.message?.includes('Failed to fetch')) {
        // This is the error we're seeing
        console.error('🔍 Debugging fetch failure:');
        console.error('  - URL:', url);
        console.error('  - Base URL:', this.baseUrl);
        console.error('  - Endpoint:', endpoint);
        console.error('  - Network available:', navigator.onLine);
        
        throw new Error(`Unable to connect to server at ${url}. Please check:\n1. Server is running\n2. URL is correct\n3. CORS is configured\n4. Network connection`);
      } else {
        throw new Error(`Network error: ${networkErr.message}`);
      }
    }

    // Log response details
    console.log(`📥 Response: ${response.status} ${response.statusText} from ${url}`);
    console.log(`📊 Response headers:`, Object.fromEntries(response.headers.entries()));

    // Read response for error parsing
    const contentType = response.headers.get('content-type') || '';
    const isJson = contentType.includes('application/json');

    // ✅ INTERCEPTOR: Check for session expiration in ALL responses (before error handling)
    if (isJson && (response.status === 401 || response.status === 200 || response.status === 201)) {
      const textCopy = await response.clone().text();
      try {
        const dataCopy = textCopy ? JSON.parse(textCopy) : null;
        console.log('🔍 Interceptor checking response for session expiration:', {
          status: response.status,
          hasSessionExpired: dataCopy?.sessionExpired,
          hasLoggedInElsewhere: dataCopy?.loggedInElsewhere
        });
        
        if (dataCopy?.sessionExpired || dataCopy?.loggedInElsewhere) {
          console.warn('⛔⛔⛔ SESSION EXPIRED DETECTED! ⛔⛔⛔');
          console.warn('Response data:', dataCopy);
          
          // Clear auth data
          this.clearAuthData();
          
          // Store message and redirect
          if (typeof window !== 'undefined') {
            const message = dataCopy?.loggedInElsewhere 
              ? 'Vous avez été déconnecté car vous vous êtes connecté sur un autre appareil.'
              : 'Votre session a expiré. Veuillez vous reconnecter.';
            
            console.warn('📝 Storing message in sessionStorage:', message);
            sessionStorage.setItem('loginMessage', message);
            
            console.warn('🔄 Redirecting to /login in 100ms...');
            // Force redirect
            setTimeout(() => {
              window.location.href = '/login';
            }, 100);
          }
          
          throw new Error('Session expired');
        }
      } catch (parseErr) {
        // If it's not JSON or parsing failed, continue normally
        console.log('⚠️ Interceptor parse error (ignoring):', parseErr);
      }
    }

    // Handle auth errors
    if (response.status === 401 || response.status === 403) {
      const text = await response.text();
      let parsed: any = null;
      try {
        parsed = text ? JSON.parse(text) : null;
      } catch (e) {
        // not JSON
      }
      const serverMessage = parsed?.error || parsed?.message || text || response.statusText;
      
      if (response.status === 401) {
        console.warn('🔐 Unauthorized response:', serverMessage);
        
        // ✅ NEW: Check if session expired (logged in elsewhere)
        if (parsed?.sessionExpired || parsed?.loggedInElsewhere) {
          console.warn('⛔ Session expired - user logged in elsewhere');
          
          // Clear local auth data
          this.clearAuthData();
          
          // Redirect to login with message
          if (typeof window !== 'undefined') {
            const message = parsed?.loggedInElsewhere 
              ? 'Vous avez été déconnecté car vous vous êtes connecté sur un autre appareil.'
              : 'Votre session a expiré. Veuillez vous reconnecter.';
            
            // Store message for login page
            sessionStorage.setItem('loginMessage', message);
            
            // Redirect to login
            window.location.href = '/login';
          }
        }
        
        throw new Error(serverMessage || 'Authentication required. Please log in again.');
      } else {
        console.warn('⛔ Forbidden response:', serverMessage);
        throw new Error(serverMessage || 'Access forbidden');
      }
    }

    // Handle other errors
    if (!response.ok) {
      const text = await response.text();
      console.error(`❌ Error response (${response.status}):`, text);
      
      try {
        const parsed = text ? JSON.parse(text) : null;
        const message = parsed?.message || parsed?.error || text || `HTTP error ${response.status}`;
        throw new Error(message);
      } catch (err) {
        throw new Error(text || `HTTP error ${response.status}: ${response.statusText}`);
      }
    }

    // Parse successful response
    if (isJson) {
      try {
        const rawData = await response.json();
        console.log('📊 Raw JSON response:', typeof rawData, Array.isArray(rawData) ? rawData.length + ' items' : 'object');
        
        // Session check already done by interceptor above
        
        const extractedData = this.extractData<T>(rawData);
        console.log('✅ Extracted data:', typeof extractedData, Array.isArray(extractedData) ? extractedData.length + ' items' : 'object');
        
        return extractedData;
      } catch (err) {
        console.error('❌ Failed to parse JSON response:', err);
        throw new Error('Invalid JSON response from server');
      }
    }

    // For non-JSON responses
    const textResponse = await response.text();
    return textResponse as any as T;
  }

  // Public API methods
  async get<T = any>(endpoint: string, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET', ...options });
  }

  async post<T = any>(endpoint: string, data?: any, options?: RequestInit): Promise<T> {
    const body = data instanceof FormData ? data : data !== undefined ? JSON.stringify(data) : undefined;
    return this.request<T>(endpoint, { method: 'POST', body, ...options });
  }

  async put<T = any>(endpoint: string, data?: any, options?: RequestInit): Promise<T> {
    const body = data instanceof FormData ? data : data !== undefined ? JSON.stringify(data) : undefined;
    return this.request<T>(endpoint, { method: 'PUT', body, ...options });
  }

  async delete<T = any>(endpoint: string, data?: any, options?: RequestInit): Promise<T> {
    const body = data instanceof FormData ? data : data !== undefined ? JSON.stringify(data) : undefined;
    return this.request<T>(endpoint, { method: 'DELETE', body, ...options });
  }

  // Enhanced upload with better error handling
  async upload<T = any>(
    endpoint: string,
    formData: FormData,
    onProgress?: (percent: number) => void
  ): Promise<T> {
    const url = this.buildUrl(endpoint);
    console.log(`📤 Starting upload to: ${url}`);

    return new Promise<T>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', url);
      xhr.timeout = 120000; // 2 minute timeout for uploads

      // Add auth header
      try {
        if (typeof window !== 'undefined') {
          const token = localStorage.getItem('authToken') || localStorage.getItem('token');
          if (token) {
            xhr.setRequestHeader('Authorization', `Bearer ${token}`);
            console.log('🔐 Auth header added to upload request');
          }
        }
      } catch (e) {
        console.warn('⚠️ Error reading auth token for upload:', e);
      }

      xhr.upload.onprogress = (ev) => {
        if (ev.lengthComputable && onProgress) {
          const percent = Math.round((ev.loaded / ev.total) * 100);
          onProgress(percent);
          console.log(`📊 Upload progress: ${percent}%`);
        }
      };

      xhr.onload = () => {
        console.log(`📥 Upload response: ${xhr.status} ${xhr.statusText}`);
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const parsed = xhr.responseText ? JSON.parse(xhr.responseText) : {};
            const extracted = this.extractData<T>(parsed);
            resolve(extracted);
          } catch (err) {
            resolve(xhr.responseText as T);
          }
        } else {
          let message = `Upload failed with status ${xhr.status}`;
          try {
            const parsed = xhr.responseText ? JSON.parse(xhr.responseText) : null;
            message = parsed?.message || parsed?.error || message;
          } catch (_) {
            message = `Upload failed: ${xhr.status} ${xhr.responseText}`;
          }
          console.error(`❌ Upload failed:`, message);
          reject(new Error(message));
        }
      };

      xhr.onerror = () => {
        console.error('❌ Upload network error');
        reject(new Error('Upload failed - network error'));
      };

      xhr.ontimeout = () => {
        console.error('❌ Upload timeout');
        reject(new Error('Upload failed - timeout'));
      };

      xhr.send(formData);
    });
  }

  // Test connection method
  async testConnection(): Promise<boolean> {
    try {
      console.log('🔍 Testing connection to server...');
      const response = await fetch(this.baseUrl + '/api/health', {
        method: 'GET',
        mode: 'cors',
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
        },
      });
      
      console.log(`✅ Connection test: ${response.status} ${response.statusText}`);
      return response.ok;
    } catch (error) {
      console.error('❌ Connection test failed:', error);
      return false;
    }
  }

  // Clear auth data
  clearAuthData() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('authToken');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      console.log(`🗑️ Auth data cleared`);
    }
  }
}

// Helper to identify user in logs
function getCurrentUserTag() {
  try {
    if (typeof window === 'undefined') return 'User';
    const u = localStorage.getItem('user');
    if (!u) return 'User';
    const parsed = JSON.parse(u);
    return parsed?.email || parsed?.name || 'User';
  } catch {
    return 'User';
  }
}

// Export the API client instance
export const api = new ApiClient(API_BASE_URL);
export default api;

// API utilities
export const apiUtils = {
  setAuthToken: (token: string) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('authToken', token);
      localStorage.setItem('token', token);
      console.log('🔑 Auth token stored');
    }
  },

  removeAuthToken: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('authToken');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      console.log('🗑️ Auth token removed');
    }
  },

  getAuthToken: (): string | null => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('authToken') || localStorage.getItem('token');
    }
    return null;
  },

  setUserData: (user: any) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('user', JSON.stringify(user));
      console.log('👤 User data stored:', user?.email || user?.name || 'unknown');
    }
  },

  getUserData: (): any | null => {
    if (typeof window !== 'undefined') {
      const raw = localStorage.getItem('user');
      if (!raw) return null;
      try {
        return JSON.parse(raw);
      } catch (e) {
        console.error('❌ Error parsing user data:', e);
        return null;
      }
    }
    return null;
  },

  isAuthenticated: (): boolean => {
    const token = apiUtils.getAuthToken();
    const ok = !!token;
    console.log(`🔍 Authentication check: ${ok ? 'authenticated' : 'not authenticated'}`);
    return ok;
  },

  isAdmin: (): boolean => {
    const u = apiUtils.getUserData();
    return !!(u && (u.is_admin === true || u.isAdmin === true));
  },

  getUserRole: (): string => {
    const u = apiUtils.getUserData();
    if (!u) return 'guest';
    if (u.is_admin || u.isAdmin) return 'admin';
    return u.role || 'user';
  }
};

// Enhanced response handler
export const handleApiResponse = <T = any>(response: any): T => {
  console.log('📦 Handling API response:', typeof response);
  
  if (Array.isArray(response)) {
    console.log('✅ Response is array:', response.length, 'items');
    return response as T;
  }
  
  if (response && typeof response === 'object') {
    if ('success' in response && response.success === true && 'data' in response) {
      console.log('✅ Extracting data from success response');
      return response.data as T;
    }
    if ('data' in response) {
      console.log('✅ Extracting data property');
      return response.data as T;
    }
    if ('success' in response && response.success && 'result' in response) {
      console.log('✅ Extracting result from success response');
      return response.result as T;
    }
  }
  
  console.log('✅ Returning response as-is');
  return response as T;
};

// ===========================================
// PROFILE & PUBLIC STATS API
// ===========================================

export const profileApi = {
  /** Update general profile info (name, email, phone) */
  updateProfile: async (data: { name: string; email: string; phone?: string | null }) => {
    return api.put('/auth/profile', data);
  },

  /** Change user password */
  changePassword: async (data: { currentPassword: string; newPassword: string }) => {
    return api.put('/auth/change-password', data);
  },

  /** Upload profile picture */
  updateProfilePicture: async (file: File) => {
    const formData = new FormData();
    formData.append('avatar', file);
    return api.post('/auth/profile-picture', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  /** Get public statistics for the home page */
  getPublicStats: async () => {
    return await api.get('/public/stats');
  }
};

/**
 * Helper to resolve profile picture URLs
 * Ensures relative paths from backend are prepended with the API Base URL
 */
export const getAvatarUrl = (path: string | null | undefined, name?: string): string => {
  if (!path) {
    if (name) {
      return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`;
    }
    return 'https://ui-avatars.com/api/?name=User&background=random';
  }
  
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  
  // Prepend API base URL if path is relative (starts with /uploads)
  const baseUrl = API_BASE_URL.endsWith('/') 
    ? API_BASE_URL.slice(0, -1) 
    : API_BASE_URL;
    
  return `${baseUrl}${path.startsWith('/') ? '' : '/'}${path}`;
};

// Enhanced error utilities
export const getErrorMessage = (error: any): string => {
  if (!error) return 'Unknown error';
  if (typeof error === 'string') return error;
  if (error instanceof Error) return error.message;
  if (error?.response?.data?.message) return error.response.data.message;
  if (error?.message) return error.message;
  if (error?.error) return error.error;
  return JSON.stringify(error).slice(0, 200);
};

export const formatError = (error: any): { message: string; details?: string } => {
  return {
    message: getErrorMessage(error),
    details: error?.stack || error?.details || undefined,
  };
};

console.log('🚀 Enhanced API Client loaded with better error handling and debugging');