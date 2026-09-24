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

  const login = async (username, password, requiredRole = null) => {
    const response = await api.post('/api/token/', { username, password });
    if (response.data.access) {
      const accessToken = response.data.access;
      const refreshToken = response.data.refresh;

      // Fetch full user profile with role
      let profile;
      try {
        const profileRes = await api.get('/api/users/me/', {
          headers: { Authorization: `Bearer ${accessToken}` }
        });
        profile = profileRes.data;
      } catch {
        const isUserAdmin = username.toLowerCase() === 'jubaer' || username.toLowerCase() === 'admin';
        profile = { username, role: isUserAdmin ? 'ADMIN' : 'EMPLOYEE' };
      }

      const isUserAdmin =
        profile.role === 'ADMIN' ||
        profile.username?.toLowerCase() === 'jubaer' ||
        profile.username?.toLowerCase() === 'admin';

      // Enforce strict role-based gateway authorization
      if (requiredRole === 'admin' && !isUserAdmin) {
        throw new Error('Access denied: This gateway is for Administrators only. Please log in through the Staff Portal.');
      }
      if (requiredRole === 'employee' && isUserAdmin) {
        throw new Error('Access denied: Administrator accounts must log in through the Admin Command Center.');
      }

      localStorage.setItem('access_token', accessToken);
      if (refreshToken) {
        localStorage.setItem('refresh_token', refreshToken);
      }
      localStorage.setItem('user_info', JSON.stringify(profile));
      setToken(accessToken);
      setUser(profile);
      return profile;
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
        fetchUserProfile,
        refreshProfile: fetchUserProfile
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
