import React, { useState, useMemo, createContext, useContext } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { SnackbarProvider } from 'notistack';
import { getTheme } from './theme/theme';
import { AuthProvider, useAuth } from './context/AuthContext';
import MainLayout from './components/layout/MainLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Analytics from './pages/Analytics';
import Inventory from './pages/Inventory';
import Shipments from './pages/Shipments';
import Sales from './pages/Sales';
import Repairs from './pages/Repairs';
import Archive from './pages/Archive';
import SickwParser from './pages/SickwParser';
import B2B from './pages/B2B';
import OtherGoods from './pages/OtherGoods';
import Landing from './pages/Landing';
import PublicOrderTracking from './pages/PublicOrderTracking';

export const ColorModeContext = createContext({ toggleColorMode: () => {}, mode: 'dark' });

function ProtectedRoute({ children }) {
  const { token, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return null;
  }

  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}

function AdminRoute({ children }) {
  const { token, loading, isAdmin } = useAuth();
  const location = useLocation();

  if (loading) {
    return null;
  }

  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

export default function App() {
  const [mode, setMode] = useState(() => {
    return localStorage.getItem('themeMode') || 'dark';
  });

  const colorMode = useMemo(
    () => ({
      mode,
      toggleColorMode: () => {
        setMode((prevMode) => {
          const nextMode = prevMode === 'light' ? 'dark' : 'light';
          localStorage.setItem('themeMode', nextMode);
          return nextMode;
        });
      }
    }),
    [mode]
  );

  const theme = useMemo(() => getTheme(mode), [mode]);

  return (
    <ColorModeContext.Provider value={colorMode}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <SnackbarProvider
          maxSnack={3}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          autoHideDuration={3500}
        >
          <AuthProvider>
            <Routes>
              {/* Public Entrypoints */}
              <Route path="/" element={<Landing />} />
              <Route path="/login" element={<Login />} />
              <Route path="/track" element={<PublicOrderTracking />} />

              {/* Protected Management Workspace */}
              <Route
                element={
                  <ProtectedRoute>
                    <MainLayout />
                  </ProtectedRoute>
                }
              >
                <Route path="/dashboard" element={<Dashboard />} />
                <Route
                  path="/analytics"
                  element={
                    <AdminRoute>
                      <Analytics />
                    </AdminRoute>
                  }
                />
                <Route
                  path="/inventory"
                  element={
                    <AdminRoute>
                      <Inventory />
                    </AdminRoute>
                  }
                />
                <Route
                  path="/b2b"
                  element={
                    <AdminRoute>
                      <B2B />
                    </AdminRoute>
                  }
                />
                <Route
                  path="/other-goods"
                  element={
                    <AdminRoute>
                      <OtherGoods />
                    </AdminRoute>
                  }
                />
                <Route
                  path="/shipments"
                  element={
                    <AdminRoute>
                      <Shipments />
                    </AdminRoute>
                  }
                />
                <Route
                  path="/sales"
                  element={
                    <AdminRoute>
                      <Sales />
                    </AdminRoute>
                  }
                />
                <Route
                  path="/repairs"
                  element={
                    <AdminRoute>
                      <Repairs />
                    </AdminRoute>
                  }
                />
                <Route
                  path="/archive"
                  element={
                    <AdminRoute>
                      <Archive />
                    </AdminRoute>
                  }
                />
                <Route
                  path="/sickw"
                  element={
                    <AdminRoute>
                      <SickwParser />
                    </AdminRoute>
                  }
                />
              </Route>

              {/* Catch-all fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </AuthProvider>
        </SnackbarProvider>
      </ThemeProvider>
    </ColorModeContext.Provider>
  );
}
