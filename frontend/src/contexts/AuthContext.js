import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api, { formatApiError, setAuthTokens, clearAuthTokens } from '@/lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = useCallback(async () => {
    const token = localStorage.getItem('sf_access_token');
    if (!token) {
      setUser(false);
      setLoading(false);
      return;
    }
    try {
      const { data } = await api.get('/auth/me');
      setUser(data);
    } catch {
      clearAuthTokens();
      setUser(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { checkAuth(); }, [checkAuth]);

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    setAuthTokens(data.access_token);
    setUser(data);
    return data;
  };

  const register = async (email, password, name, tenant_name) => {
    const { data } = await api.post('/auth/register', { email, password, name, tenant_name });
    setAuthTokens(data.access_token);
    setUser(data);
    return data;
  };

  const logout = async () => {
    try { await api.post('/auth/logout'); } catch {}
    clearAuthTokens();
    setUser(false);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, formatApiError }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
