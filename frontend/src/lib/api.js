import axios from 'axios';

const API_BASE = process.env.REACT_APP_BACKEND_URL;

const api = axios.create({
  baseURL: `${API_BASE}/api`,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' }
});

// Add Bearer token from localStorage to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('sf_access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Trial expired or tenant inactive - dispatch global event
    if (error.response?.status === 402) {
      const code = error.response?.data?.code;
      if (code === 'trial_expired' || code === 'tenant_inactive') {
        window.dispatchEvent(new CustomEvent('trial-blocked', { detail: error.response.data }));
      }
      return Promise.reject(error);
    }
    // Don't retry auth endpoints
    if (error.config?.url?.includes('/auth/')) {
      return Promise.reject(error);
    }
    // On 401, try refresh once
    if (error.response?.status === 401 && !error.config._retry) {
      error.config._retry = true;
      try {
        const token = localStorage.getItem('sf_refresh_token');
        if (token) {
          const res = await axios.post(`${API_BASE}/api/auth/refresh`, {}, {
            withCredentials: true,
            headers: { Authorization: `Bearer ${token}` }
          });
          if (res.data?.access_token) {
            localStorage.setItem('sf_access_token', res.data.access_token);
          }
          return api(error.config);
        }
      } catch (e) {
        localStorage.removeItem('sf_access_token');
        localStorage.removeItem('sf_refresh_token');
      }
    }
    return Promise.reject(error);
  }
);

export function setAuthTokens(accessToken, refreshToken) {
  if (accessToken) localStorage.setItem('sf_access_token', accessToken);
  if (refreshToken) localStorage.setItem('sf_refresh_token', refreshToken);
}

export function clearAuthTokens() {
  localStorage.removeItem('sf_access_token');
  localStorage.removeItem('sf_refresh_token');
}

export function formatApiError(detail) {
  if (detail == null) return "Algo salio mal. Intenta de nuevo.";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) return detail.map((e) => (e?.msg || JSON.stringify(e))).filter(Boolean).join(" ");
  if (detail?.msg) return detail.msg;
  return String(detail);
}

export async function downloadFile(apiPath) {
  const token = localStorage.getItem('sf_access_token');
  const url = `${API_BASE}/api${apiPath}${apiPath.includes('?') ? '&' : '?'}token=${token}`;
  try {
    // Try window.top for iframe environments
    (window.top || window).location.href = url;
  } catch (e) {
    // Fallback if cross-origin blocks window.top
    window.location.href = url;
  }
}

export default api;
