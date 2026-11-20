import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api, tokenStore, setUnauthorizedHandler } from '../api/client';

const AuthContext = createContext(null);

const normalize = (u) => ({ ...u, id: u.id || u._id });

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  // Only wait on startup if there is a saved token to verify
  const [loading, setLoading] = useState(Boolean(tokenStore.get()));

  const logout = useCallback(() => {
    tokenStore.clear();
    setUser(null);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(logout);
  }, [logout]);

  // Restore the session on page load
  useEffect(() => {
    if (!tokenStore.get()) return;
    api('/auth/me')
      .then((data) => setUser(normalize(data.user)))
      .catch(() => logout())
      .finally(() => setLoading(false));
  }, [logout]);

  const login = async (email, password) => {
    const data = await api('/auth/login', {
      method: 'POST',
      body: { email, password },
      auth: false,
    });
    tokenStore.set(data.token);
    setUser(normalize(data.user));
  };

  const register = async (form) => {
    const data = await api('/auth/register', { method: 'POST', body: form, auth: false });
    tokenStore.set(data.token);
    setUser(normalize(data.user));
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);