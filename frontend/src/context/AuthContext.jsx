import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/client';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem('access_token'));
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('user_info');
      if (savedUser) return JSON.parse(savedUser);
      if (localStorage.getItem('access_token')) return { username: 'Admin' };
    } catch {
      // fallback
    }
    return null;
  });
  const [loading, setLoading] = useState(false);

  const login = async (username, password) => {
    const response = await api.post('/api/token/', { username, password });
    if (response.data.access) {
      localStorage.setItem('access_token', response.data.access);
      if (response.data.refresh) {
        localStorage.setItem('refresh_token', response.data.refresh);
      }
      const userInfo = { username };
      localStorage.setItem('user_info', JSON.stringify(userInfo));
      setToken(response.data.access);
      setUser(userInfo);
      return true;
    }
    return false;
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user_info');
    setToken(null);
    setUser(null);
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{ token, user, isAuthenticated: !!token, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
