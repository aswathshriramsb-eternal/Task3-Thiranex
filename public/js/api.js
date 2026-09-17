// REST API Client for Blog Platform
const API_BASE = '/api';

const api = {
  getToken() {
    return localStorage.getItem('blog_auth_token');
  },

  setToken(token) {
    if (token) {
      localStorage.setItem('blog_auth_token', token);
    } else {
      localStorage.removeItem('blog_auth_token');
    }
  },

  clearToken() {
    localStorage.removeItem('blog_auth_token');
    localStorage.removeItem('blog_user');
  },

  getCurrentUser() {
    const raw = localStorage.getItem('blog_user');
    try {
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  setCurrentUser(user) {
    if (user) {
      localStorage.setItem('blog_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('blog_user');
    }
  },

  async request(endpoint, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    };

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          // Token expired or invalid
          if (token && endpoint !== '/auth/login' && endpoint !== '/auth/register') {
            this.clearToken();
            window.dispatchEvent(new CustomEvent('auth:expired'));
          }
        }
        throw new Error(data.error || `Request failed with status ${response.status}`);
      }

      return data;
    } catch (err) {
      console.error(`API Error [${endpoint}]:`, err);
      throw err;
    }
  },

  get(endpoint) {
    return this.request(endpoint, { method: 'GET' });
  },

  post(endpoint, body) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(body)
    });
  },

  put(endpoint, body) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body)
    });
  },

  delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  }
};
