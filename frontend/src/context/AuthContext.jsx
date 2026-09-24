import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/client';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem('access_token'));
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('user_info');
      if (savedUser) return JSON.parse(savedUser);
    } catch {
      // fallback
    }
    return null;
  });
  const [loading, setLoading] = useState(true);

  const fetchUserProfile = async () => {
    try {
      const res = await api.get('/api/users/me/');
      if (res.data) {
        setUser(res.data);
        localStorage.setItem('user_info', JSON.stringify(res.data));
      }
    } catch (err) {
      console.error('Failed to fetch user profile', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchUserProfile();
    } else {
      setLoading(false);
    }
  }, [token]);

  const login = async (username, password) => {
    const response = await api.post('/api/token/', { username, password });
    if (response.data.access) {
      localStorage.setItem('access_token', response.data.access);
      if (response.data.refresh) {
        localStorage.setItem('refresh_token', response.data.refresh);
      }
      setToken(response.data.access);

      // Fetch full user profile with role
      try {
        const profileRes = await api.get('/api/users/me/', {
          headers: { Authorization: `Bearer ${response.data.access}` }
        });
        const profile = profileRes.data;
        localStorage.setItem('user_info', JSON.stringify(profile));
        setUser(profile);
      } catch {
        const basicUser = { username, role: username === 'jubaer' || username === 'admin' ? 'ADMIN' : 'EMPLOYEE' };
        localStorage.setItem('user_info', JSON.stringify(basicUser));
        setUser(basicUser);
      }
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

  const isAdmin =
    user?.role === 'ADMIN' ||
    user?.username?.toLowerCase() === 'jubaer' ||
    user?.username?.toLowerCase() === 'admin';

  const isEmployee = !isAdmin;

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        isAdmin,
        isEmployee,
        isAuthenticated: !!token,
        login,
        logout,
        loading,
        refreshProfile: fetchUserProfile
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
