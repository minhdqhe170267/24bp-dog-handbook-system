import { useState, createContext, useContext } from 'react';
import { authService } from '../services/authService';

const AuthContext = createContext(null);

const normalizeUserRole = (role) => {
  const normalized = String(role || '').trim().toUpperCase();
  if (normalized === 'EDITOR') return 'CONTENT_EDITOR';
  return normalized || role;
};

const normalizeUser = (user) => {
  if (!user || typeof user !== 'object') return user;
  return {
    ...user,
    role: normalizeUserRole(user.role),
  };
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('user');
    if (!saved) return null;
    try {
      return normalizeUser(JSON.parse(saved));
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(false);

  const login = async (username, password) => {
    setLoading(true);
    try {
      const res = await authService.login(username, password);
      const token = res?.data?.token;
      const user = normalizeUser(res?.data?.user);

      if (!token || !user) {
        throw {
          status: 502,
          success: false,
          message: res?.message || 'Phản hồi đăng nhập không hợp lệ',
          errorCode: res?.errorCode || 'BAD_RESPONSE',
        };
      }

      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      setUser(user);
      return user;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
