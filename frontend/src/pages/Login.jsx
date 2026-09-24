import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  InputAdornment,
  IconButton,
  CircularProgress,
  Alert,
  Stack,
  Container,
  Chip
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  LockOutlined as LockIcon,
  PersonOutline as PersonIcon,
  Smartphone as PhoneIcon,
  ArrowBack as BackIcon,
  AdminPanelSettings as AdminIcon,
  Badge as EmployeeIcon
} from '@mui/icons-material';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const roleParam = searchParams.get('role');

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const from =
    location.state?.from?.pathname && location.state.from.pathname !== '/'
      ? location.state.from.pathname
      : '/dashboard';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Please enter both username and password.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      await login(username, password, roleParam);
      navigate(from, { replace: true });
    } catch (err) {
      console.error('Login error', err);
      setError(
        err.message ||
        err.response?.data?.detail ||
        err.response?.data?.error ||
        'Invalid username or password. Please check your credentials.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: (theme) =>
          theme.palette.mode === 'dark'
            ? 'radial-gradient(circle at 50% 20%, #1E293B 0%, #0F172A 100%)'
            : 'radial-gradient(circle at 50% 20%, #EEF2F6 0%, #F8FAFC 100%)',
        p: 2
      }}
    >
      <Container maxWidth="xs">
        {/* Back to Home button */}
        <Box sx={{ mb: 2 }}>
          <Button
            size="small"
            color="inherit"
            startIcon={<BackIcon />}
            onClick={() => navigate('/')}
            sx={{ fontWeight: 600, borderRadius: 2 }}
          >
            Back to Portal
          </Button>
        </Box>

        <Card
          sx={{
            p: { xs: 2, sm: 3 },
            borderRadius: 3,
            boxShadow: (theme) =>
              theme.palette.mode === 'dark'
                ? '0 20px 40px rgba(0,0,0,0.6)'
                : '0 20px 40px rgba(0,0,0,0.08)',
            border: 1,
            borderColor: 'divider'
          }}
        >
          <CardContent sx={{ p: { xs: 1, sm: 2 } }}>
            {/* Header Icon & Title */}
            <Stack alignItems="center" spacing={1.5} sx={{ mb: 3 }}>
              <Box
                sx={{
                  width: 56,
                  height: 56,
                  borderRadius: '16px',
                  background:
                    roleParam === 'employee'
                      ? 'linear-gradient(135deg, #10B981 0%, #059669 100%)'
                      : roleParam === 'admin'
                        ? 'linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)'
                        : 'linear-gradient(135deg, #2563EB 0%, #3B82F6 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 8px 16px rgba(37, 99, 235, 0.3)'
                }}
              >
                {roleParam === 'employee' ? (
                  <EmployeeIcon sx={{ color: '#FFFFFF', fontSize: 30 }} />
                ) : roleParam === 'admin' ? (
                  <AdminIcon sx={{ color: '#FFFFFF', fontSize: 30 }} />
                ) : (
                  <PhoneIcon sx={{ color: '#FFFFFF', fontSize: 30 }} />
                )}
              </Box>

              <Typography variant="h5" fontWeight={800} align="center" letterSpacing={-0.5}>
                Gadget Deluxe
              </Typography>

              {roleParam === 'admin' ? (
                <Chip
                  icon={<AdminIcon fontSize="small" sx={{ color: '#fff !important' }} />}
                  label="Administrator Access"
                  color="secondary"
                  size="small"
                  sx={{ fontWeight: 800, color: '#ffffff' }}
                />
              ) : roleParam === 'employee' ? (
                <Chip
                  icon={<EmployeeIcon fontSize="small" sx={{ color: '#fff !important' }} />}
                  label="Staff / Employee Access"
                  color="success"
                  size="small"
                  sx={{ fontWeight: 800, color: '#ffffff' }}
                />
              ) : (
                <Typography variant="body2" color="text.secondary" align="center">
                  Cloud Portal Authentication
                </Typography>
              )}
            </Stack>

            {error && (
              <Alert severity="error" sx={{ mb: 2.5, borderRadius: 2 }}>
                {error}
              </Alert>
            )}

            {/* Login Form */}
            <form onSubmit={handleSubmit}>
              <Stack spacing={2.5}>
                <TextField
                  fullWidth
                  label="Username"
                  autoComplete="username"
                  autoFocus
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <PersonIcon color="action" fontSize="small" />
                      </InputAdornment>
                    )
                  }}
                />

                <TextField
                  fullWidth
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <LockIcon color="action" fontSize="small" />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => setShowPassword(!showPassword)}
                          edge="end"
                          size="small"
                        >
                          {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                        </IconButton>
                      </InputAdornment>
                    )
                  }}
                />

                <Button
                  type="submit"
                  variant="contained"
                  fullWidth
                  size="large"
                  disabled={loading}
                  sx={{
                    py: 1.4,
                    fontSize: '0.95rem',
                    fontWeight: 700,
                    textTransform: 'none',
                    borderRadius: 2,
                    boxShadow: '0 4px 14px rgba(37, 99, 235, 0.4)'
                  }}
                >
                  {loading ? <CircularProgress size={24} color="inherit" /> : 'Sign In'}
                </Button>

                {roleParam === 'admin' ? (
                  <Button
                    variant="text"
                    size="small"
                    color="inherit"
                    onClick={() => {
                      setError('');
                      navigate('/login?role=employee');
                    }}
                    sx={{ textTransform: 'none', fontSize: '0.82rem', color: 'text.secondary' }}
                  >
                    Employee / Staff Member? Switch to Staff Login →
                  </Button>
                ) : roleParam === 'employee' ? (
                  <Button
                    variant="text"
                    size="small"
                    color="inherit"
                    onClick={() => {
                      setError('');
                      navigate('/login?role=admin');
                    }}
                    sx={{ textTransform: 'none', fontSize: '0.82rem', color: 'text.secondary' }}
                  >
                    Administrator? Switch to Admin Login →
                  </Button>
                ) : null}
              </Stack>
            </form>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
}
