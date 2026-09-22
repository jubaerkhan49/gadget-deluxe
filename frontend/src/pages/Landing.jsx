import React, { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  TextField,
  InputAdornment,
  Chip,
  Stack,
  IconButton,
  Tooltip,
  Divider,
  Paper,
  useTheme
} from '@mui/material';
import {
  Search as SearchIcon,
  LocalShipping as ShippingIcon,
  AdminPanelSettings as AdminIcon,
  Badge as EmployeeIcon,
  PhoneAndroid as DeviceIcon,
  Build as RepairIcon,
  Storefront as B2BIcon,
  Insights as AnalyticsIcon,
  Brightness4 as DarkModeIcon,
  Brightness7 as LightModeIcon,
  ArrowForward as ArrowForwardIcon,
  CheckCircle as CheckIcon,
  VerifiedUser as SecurityIcon,
  CloudDone as CloudIcon,
  SupportAgent as SupportIcon,
  QrCodeScanner as ScannerIcon,
  Timeline as TimelineIcon,
  Speed as SpeedIcon,
  Lock as LockIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useContext } from 'react';
import { ColorModeContext } from '../App';
import { useAuth } from '../context/AuthContext';

export default function Landing() {
  const theme = useTheme();
  const navigate = useNavigate();
  const colorMode = useContext(ColorModeContext);
  const { user } = useAuth();

  const [orderQuery, setOrderQuery] = useState('');

  const handleTrackSubmit = (e) => {
    e.preventDefault();
    if (orderQuery.trim()) {
      navigate(`/track?order=${encodeURIComponent(orderQuery.trim())}`);
    } else {
      navigate('/track');
    }
  };

  const isDark = theme.palette.mode === 'dark';

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: 'background.default',
        color: 'text.primary',
        overflowX: 'hidden'
      }}
    >
      {/* 1. Header / Navbar */}
      <Box
        component="header"
        sx={{
          position: 'sticky',
          top: 0,
          zIndex: 1100,
          backdropFilter: 'blur(16px)',
          bgcolor: isDark ? 'rgba(15, 23, 42, 0.85)' : 'rgba(255, 255, 255, 0.85)',
          borderBottom: 1,
          borderColor: 'divider',
          py: 1.5,
          px: { xs: 2, md: 4 }
        }}
      >
        <Container maxWidth="lg">
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            {/* Logo */}
            <Box
              onClick={() => navigate('/')}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                cursor: 'pointer',
                userSelect: 'none'
              }}
            >
              <Box
                sx={{
                  width: 42,
                  height: 42,
                  borderRadius: 2.5,
                  background: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  boxShadow: '0 4px 14px rgba(59, 130, 246, 0.4)'
                }}
              >
                <DeviceIcon fontSize="small" />
              </Box>
              <Box>
                <Typography variant="h6" fontWeight={900} letterSpacing="-0.5px" sx={{ lineHeight: 1.1 }}>
                  Gadget Deluxe
                </Typography>
                <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ fontSize: '0.72rem' }}>
                  Cloud Sourcing & Inventory
                </Typography>
              </Box>
            </Box>

            {/* Nav Actions */}
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Button
                variant="text"
                color="inherit"
                onClick={() => navigate('/track')}
                startIcon={<ShippingIcon fontSize="small" color="primary" />}
                sx={{ display: { xs: 'none', sm: 'inline-flex' }, fontWeight: 700 }}
              >
                Track Parcel
              </Button>

              <Tooltip title={`Switch to ${isDark ? 'Light' : 'Dark'} mode`}>
                <IconButton onClick={colorMode.toggleColorMode} color="inherit" size="small">
                  {isDark ? <LightModeIcon fontSize="small" /> : <DarkModeIcon fontSize="small" />}
                </IconButton>
              </Tooltip>

              {user ? (
                <Button
                  variant="contained"
                  color="primary"
                  onClick={() => navigate('/dashboard')}
                  endIcon={<ArrowForwardIcon />}
                  sx={{
                    borderRadius: 2.5,
                    px: 2.5,
                    fontWeight: 700,
                    boxShadow: '0 4px 14px rgba(59, 130, 246, 0.35)'
                  }}
                >
                  Enter Dashboard
                </Button>
              ) : (
                <Button
                  variant="contained"
                  color="primary"
                  onClick={() => navigate('/login')}
                  startIcon={<LockIcon fontSize="small" />}
                  sx={{
                    borderRadius: 2.5,
                    px: 2.5,
                    fontWeight: 700,
                    boxShadow: '0 4px 14px rgba(59, 130, 246, 0.35)'
                  }}
                >
                  Portal Login
                </Button>
              )}
            </Stack>
          </Box>
        </Container>
      </Box>

      {/* 2. Hero Section */}
      <Box
        sx={{
          position: 'relative',
          pt: { xs: 6, md: 10 },
          pb: { xs: 8, md: 12 },
          background: isDark
            ? 'radial-gradient(ellipse 80% 60% at 50% 10%, rgba(59, 130, 246, 0.18), transparent 100%)'
            : 'radial-gradient(ellipse 80% 60% at 50% 10%, rgba(59, 130, 246, 0.12), transparent 100%)'
        }}
      >
        <Container maxWidth="md">
          {/* Badge */}
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <Chip
              icon={<CloudIcon fontSize="small" sx={{ color: '#fff !important' }} />}
              label="Enterprise Cloud IMEI, Sourcing & Tracking Ecosystem"
              color="primary"
              sx={{
                fontWeight: 700,
                fontSize: '0.8rem',
                py: 2,
                px: 1,
                borderRadius: 4,
                boxShadow: '0 4px 20px rgba(59, 130, 246, 0.25)'
              }}
            />
          </Box>

          {/* Headline */}
          <Typography
            variant="h2"
            align="center"
            fontWeight={900}
            letterSpacing="-1.5px"
            sx={{
              fontSize: { xs: '2.3rem', sm: '3.2rem', md: '3.8rem' },
              lineHeight: 1.15,
              mb: 2.5
            }}
          >
            Next-Gen Device Inventory &{' '}
            <Box
              component="span"
              sx={{
                background: 'linear-gradient(135deg, #3B82F6 0%, #8B5CF6 50%, #EC4899 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}
            >
              Live Sourcing Logistics
            </Box>
          </Typography>

          {/* Subtitle */}
          <Typography
            variant="subtitle1"
            align="center"
            color="text.secondary"
            sx={{
              fontSize: { xs: '1rem', md: '1.2rem' },
              maxWidth: 720,
              mx: 'auto',
              mb: 5,
              lineHeight: 1.6
            }}
          >
            A unified operations hub for cross-border electronics trade, 9-stage China-to-BD parcel tracking,
            hardware refurbishing lifecycle, and multi-channel B2B wholesale distribution.
          </Typography>

          {/* Interactive Live Tracking Search Bar */}
          <Paper
            elevation={0}
            component="form"
            onSubmit={handleTrackSubmit}
            sx={{
              p: { xs: 1, sm: 1.2 },
              borderRadius: 3.5,
              border: '2px solid',
              borderColor: 'primary.main',
              bgcolor: isDark ? '#131B2E' : '#FFFFFF',
              boxShadow: isDark
                ? '0 12px 36px rgba(59, 130, 246, 0.25)'
                : '0 12px 36px rgba(59, 130, 246, 0.15)',
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              flexWrap: { xs: 'wrap', sm: 'nowrap' },
              mb: 3
            }}
          >
            <TextField
              fullWidth
              size="medium"
              placeholder="Enter Custom Order ID (e.g. OG-2609-0001) or Phone Number..."
              value={orderQuery}
              onChange={(e) => setOrderQuery(e.target.value)}
              InputProps={{
                disableUnderline: true,
                startAdornment: (
                  <InputAdornment position="start" sx={{ pl: 1 }}>
                    <SearchIcon color="primary" />
                  </InputAdornment>
                )
              }}
              variant="standard"
              sx={{ px: 1 }}
            />
            <Button
              type="submit"
              variant="contained"
              color="primary"
              size="large"
              startIcon={<ShippingIcon />}
              sx={{
                borderRadius: 2.5,
                px: 3.5,
                py: 1.3,
                fontWeight: 800,
                fontSize: '0.95rem',
                whiteSpace: 'nowrap',
                width: { xs: '100%', sm: 'auto' },
                background: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)',
                boxShadow: '0 4px 14px rgba(59, 130, 246, 0.4)'
              }}
            >
              Track Parcel
            </Button>
          </Paper>

          {/* Quick suggestions */}
          <Stack
            direction="row"
            spacing={1}
            justifyContent="center"
            alignItems="center"
            flexWrap="wrap"
            sx={{ gap: 0.8 }}
          >
            <Typography variant="caption" color="text.secondary" fontWeight={700}>
              POPULAR ACTIONS:
            </Typography>
            <Chip
              label="Track Sourcing Order"
              size="small"
              clickable
              onClick={() => navigate('/track')}
              color="info"
              variant="outlined"
              sx={{ fontWeight: 700 }}
            />
            <Chip
              label="Admin Workspace"
              size="small"
              clickable
              onClick={() => navigate('/login?role=admin')}
              color="primary"
              variant="outlined"
              sx={{ fontWeight: 700 }}
            />
            <Chip
              label="Staff Login"
              size="small"
              clickable
              onClick={() => navigate('/login?role=employee')}
              color="secondary"
              variant="outlined"
              sx={{ fontWeight: 700 }}
            />
          </Stack>
        </Container>
      </Box>

      {/* 3. Role-Based Quick Access Gateways */}
      <Box sx={{ py: { xs: 6, md: 8 }, bgcolor: isDark ? '#0B0F19' : '#F1F5F9' }}>
        <Container maxWidth="lg">
          <Box sx={{ textAlign: 'center', mb: 6 }}>
            <Typography variant="overline" color="primary" fontWeight={800} letterSpacing={1.5}>
              DIRECT PORTAL ACCESS
            </Typography>
            <Typography variant="h4" fontWeight={900} letterSpacing="-0.5px">
              Choose Your Access Gateway
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Fast-track authentication and tracking entrypoints for customers, admins, and staff
            </Typography>
          </Box>

          <Grid container spacing={3.5}>
            {/* Gateway 1: Customer Order Tracking */}
            <Grid item xs={12} md={4}>
              <Card
                elevation={0}
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  borderRadius: 3.5,
                  border: 1,
                  borderColor: isDark ? 'rgba(59, 130, 246, 0.3)' : 'rgba(59, 130, 246, 0.2)',
                  bgcolor: isDark ? '#131B2E' : '#FFFFFF',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  '&:hover': {
                    transform: 'translateY(-6px)',
                    boxShadow: '0 16px 32px rgba(59, 130, 246, 0.2)',
                    borderColor: 'primary.main'
                  }
                }}
              >
                <CardContent sx={{ p: 3.5, flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <Box
                    sx={{
                      width: 52,
                      height: 52,
                      borderRadius: 3,
                      bgcolor: 'rgba(59, 130, 246, 0.15)',
                      color: 'primary.main',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mb: 2.5
                    }}
                  >
                    <ShippingIcon fontSize="medium" />
                  </Box>
                  <Typography variant="h6" fontWeight={800} gutterBottom>
                    📦 Customer Order Tracking
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 3, flex: 1, lineHeight: 1.6 }}>
                    Track live 9-stage shipment milestones from Chinese supplier purchase, CN warehouse verification,
                    international flight transit, to Bangladesh customs & local home delivery.
                  </Typography>

                  <Button
                    variant="contained"
                    color="primary"
                    fullWidth
                    onClick={() => navigate('/track')}
                    endIcon={<ArrowForwardIcon />}
                    sx={{
                      borderRadius: 2.5,
                      py: 1.2,
                      fontWeight: 800,
                      background: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)'
                    }}
                  >
                    Track Custom Order
                  </Button>
                </CardContent>
              </Card>
            </Grid>

            {/* Gateway 2: Administrator Workspace */}
            <Grid item xs={12} md={4}>
              <Card
                elevation={0}
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  borderRadius: 3.5,
                  border: 1,
                  borderColor: isDark ? 'rgba(139, 92, 246, 0.3)' : 'rgba(139, 92, 246, 0.2)',
                  bgcolor: isDark ? '#131B2E' : '#FFFFFF',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  '&:hover': {
                    transform: 'translateY(-6px)',
                    boxShadow: '0 16px 32px rgba(139, 92, 246, 0.2)',
                    borderColor: 'secondary.main'
                  }
                }}
              >
                <CardContent sx={{ p: 3.5, flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <Box
                    sx={{
                      width: 52,
                      height: 52,
                      borderRadius: 3,
                      bgcolor: 'rgba(139, 92, 246, 0.15)',
                      color: 'secondary.main',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mb: 2.5
                    }}
                  >
                    <AdminIcon fontSize="medium" />
                  </Box>
                  <Typography variant="h6" fontWeight={800} gutterBottom>
                    🛡️ Admin Command Center
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 3, flex: 1, lineHeight: 1.6 }}>
                    Full operational control: live inventory valuation, B2B wholesale consignment lots, net profit auditing,
                    inbound shipment batches, and team sales commission leaderboards.
                  </Typography>

                  <Button
                    variant="contained"
                    color="secondary"
                    fullWidth
                    onClick={() => navigate('/login?role=admin')}
                    endIcon={<ArrowForwardIcon />}
                    sx={{
                      borderRadius: 2.5,
                      py: 1.2,
                      fontWeight: 800,
                      background: 'linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)'
                    }}
                  >
                    Login as Administrator
                  </Button>
                </CardContent>
              </Card>
            </Grid>

            {/* Gateway 3: Employee / Staff Portal */}
            <Grid item xs={12} md={4}>
              <Card
                elevation={0}
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  borderRadius: 3.5,
                  border: 1,
                  borderColor: isDark ? 'rgba(16, 185, 129, 0.3)' : 'rgba(16, 185, 129, 0.2)',
                  bgcolor: isDark ? '#131B2E' : '#FFFFFF',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  '&:hover': {
                    transform: 'translateY(-6px)',
                    boxShadow: '0 16px 32px rgba(16, 185, 129, 0.2)',
                    borderColor: 'success.main'
                  }
                }}
              >
                <CardContent sx={{ p: 3.5, flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <Box
                    sx={{
                      width: 52,
                      height: 52,
                      borderRadius: 3,
                      bgcolor: 'rgba(16, 185, 129, 0.15)',
                      color: 'success.main',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mb: 2.5
                    }}
                  >
                    <EmployeeIcon fontSize="medium" />
                  </Box>
                  <Typography variant="h6" fontWeight={800} gutterBottom>
                    👤 Staff & Operations Portal
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 3, flex: 1, lineHeight: 1.6 }}>
                    Staff workbench: Barcode & IMEI camera scanner, physical custody check-ins, daily BD shipment batch
                    receiving, device repair updates, and customer sales registry.
                  </Typography>

                  <Button
                    variant="contained"
                    color="success"
                    fullWidth
                    onClick={() => navigate('/login?role=employee')}
                    endIcon={<ArrowForwardIcon />}
                    sx={{
                      borderRadius: 2.5,
                      py: 1.2,
                      fontWeight: 800,
                      color: '#ffffff',
                      background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)'
                    }}
                  >
                    Login as Employee
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* 4. Enterprise Capabilities Grid */}
      <Box sx={{ py: { xs: 8, md: 10 } }}>
        <Container maxWidth="lg">
          <Box sx={{ textAlign: 'center', mb: 7 }}>
            <Typography variant="overline" color="primary" fontWeight={800} letterSpacing={1.5}>
              SYSTEM HIGHLIGHTS
            </Typography>
            <Typography variant="h4" fontWeight={900} letterSpacing="-0.5px">
              Built for Scale, Accuracy & Velocity
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1, maxWidth: 650, mx: 'auto' }}>
              Designed to solve the real-world operational challenges of electronics importers, refurbishers, and retailers.
            </Typography>
          </Box>

          <Grid container spacing={3}>
            {/* Feature 1 */}
            <Grid item xs={12} sm={6} md={4}>
              <Paper
                variant="outlined"
                sx={{
                  p: 3,
                  borderRadius: 3,
                  height: '100%',
                  bgcolor: isDark ? 'rgba(30, 41, 59, 0.4)' : '#FFFFFF'
                }}
              >
                <DeviceIcon color="primary" sx={{ fontSize: 32, mb: 1.5 }} />
                <Typography variant="subtitle1" fontWeight={800} gutterBottom>
                  IMEI & Serial Lifecycle Auditing
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                  Deep hardware tracking: dual IMEI, serial, MEID, battery health %, cycle counts, carrier policy, and international variant tags.
                </Typography>
              </Paper>
            </Grid>

            {/* Feature 2 */}
            <Grid item xs={12} sm={6} md={4}>
              <Paper
                variant="outlined"
                sx={{
                  p: 3,
                  borderRadius: 3,
                  height: '100%',
                  bgcolor: isDark ? 'rgba(30, 41, 59, 0.4)' : '#FFFFFF'
                }}
              >
                <TimelineIcon color="primary" sx={{ fontSize: 32, mb: 1.5 }} />
                <Typography variant="subtitle1" fontWeight={800} gutterBottom>
                  9-Stage Live Pipeline
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                  Custom retail import pipeline for Laptops, AirPods, Gadgets and Cosmetics with payment TrxID logging and confidential customer portals.
                </Typography>
              </Paper>
            </Grid>

            {/* Feature 3 */}
            <Grid item xs={12} sm={6} md={4}>
              <Paper
                variant="outlined"
                sx={{
                  p: 3,
                  borderRadius: 3,
                  height: '100%',
                  bgcolor: isDark ? 'rgba(30, 41, 59, 0.4)' : '#FFFFFF'
                }}
              >
                <B2BIcon color="primary" sx={{ fontSize: 32, mb: 1.5 }} />
                <Typography variant="subtitle1" fontWeight={800} gutterBottom>
                  Client-Safe B2B Wholesale
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                  Separates client-funded inventory from owner capital, supporting custom shop deliveries while shielding confidential margins.
                </Typography>
              </Paper>
            </Grid>

            {/* Feature 4 */}
            <Grid item xs={12} sm={6} md={4}>
              <Paper
                variant="outlined"
                sx={{
                  p: 3,
                  borderRadius: 3,
                  height: '100%',
                  bgcolor: isDark ? 'rgba(30, 41, 59, 0.4)' : '#FFFFFF'
                }}
              >
                <RepairIcon color="primary" sx={{ fontSize: 32, mb: 1.5 }} />
                <Typography variant="subtitle1" fontWeight={800} gutterBottom>
                  Shenzhen Hardware Lab Tracker
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                  Tracks overseas repair round-trips, component costs, and automatically reconciles repair overhead against product profit.
                </Typography>
              </Paper>
            </Grid>

            {/* Feature 5 */}
            <Grid item xs={12} sm={6} md={4}>
              <Paper
                variant="outlined"
                sx={{
                  p: 3,
                  borderRadius: 3,
                  height: '100%',
                  bgcolor: isDark ? 'rgba(30, 41, 59, 0.4)' : '#FFFFFF'
                }}
              >
                <ScannerIcon color="primary" sx={{ fontSize: 32, mb: 1.5 }} />
                <Typography variant="subtitle1" fontWeight={800} gutterBottom>
                  ML-Kit Camera Barcode Scanner
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                  Native Android client with Google ML-Kit camera scanning for rapid warehouse check-ins and ownership handovers.
                </Typography>
              </Paper>
            </Grid>

            {/* Feature 6 */}
            <Grid item xs={12} sm={6} md={4}>
              <Paper
                variant="outlined"
                sx={{
                  p: 3,
                  borderRadius: 3,
                  height: '100%',
                  bgcolor: isDark ? 'rgba(30, 41, 59, 0.4)' : '#FFFFFF'
                }}
              >
                <AnalyticsIcon color="primary" sx={{ fontSize: 32, mb: 1.5 }} />
                <Typography variant="subtitle1" fontWeight={800} gutterBottom>
                  Executive ROI & Leaderboard
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                  Live business intelligence: net monthly profit, sales representative turnaround speeds, and sales consistency indices.
                </Typography>
              </Paper>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* 5. System Trust & Security Banner */}
      <Box sx={{ py: 6, bgcolor: isDark ? '#111827' : '#E2E8F0', borderTop: 1, borderBottom: 1, borderColor: 'divider' }}>
        <Container maxWidth="lg">
          <Grid container spacing={3} alignItems="center" justifyContent="space-around" sx={{ textAlign: 'center' }}>
            <Grid item xs={6} sm={3}>
              <Typography variant="h4" fontWeight={900} color="primary.main">
                9-Stage
              </Typography>
              <Typography variant="caption" color="text.secondary" fontWeight={700}>
                Live Sourcing Pipeline
              </Typography>
            </Grid>

            <Grid item xs={6} sm={3}>
              <Typography variant="h4" fontWeight={900} color="success.main">
                100%
              </Typography>
              <Typography variant="caption" color="text.secondary" fontWeight={700}>
                Cloud & Mobile Sync
              </Typography>
            </Grid>

            <Grid item xs={6} sm={3}>
              <Typography variant="h4" fontWeight={900} color="secondary.main">
                360°
              </Typography>
              <Typography variant="caption" color="text.secondary" fontWeight={700}>
                Hardware Lifecycle Audit
              </Typography>
            </Grid>

            <Grid item xs={6} sm={3}>
              <Typography variant="h4" fontWeight={900} color="warning.main">
                99.9%
              </Typography>
              <Typography variant="caption" color="text.secondary" fontWeight={700}>
                Platform Uptime
              </Typography>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* 6. Footer */}
      <Box
        component="footer"
        sx={{
          py: 5,
          bgcolor: isDark ? '#0B0F17' : '#FFFFFF',
          borderTop: 1,
          borderColor: 'divider',
          textAlign: 'center'
        }}
      >
        <Container maxWidth="md">
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 2 }}>
            <DeviceIcon color="primary" fontSize="small" />
            <Typography variant="subtitle1" fontWeight={900}>
              Gadget Deluxe
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
            Cloud IMEI Inventory, Sourcing Logistics & B2B Trading Ecosystem.
          </Typography>

          <Stack direction="row" spacing={3} justifyContent="center" sx={{ mb: 3 }}>
            <Button size="small" color="inherit" onClick={() => navigate('/track')} sx={{ fontWeight: 600 }}>
              Track Parcel
            </Button>
            <Button size="small" color="inherit" onClick={() => navigate('/login?role=admin')} sx={{ fontWeight: 600 }}>
              Admin Portal
            </Button>
            <Button size="small" color="inherit" onClick={() => navigate('/login?role=employee')} sx={{ fontWeight: 600 }}>
              Employee Portal
            </Button>
          </Stack>

          <Divider sx={{ my: 2, maxWidth: 300, mx: 'auto' }} />

          <Typography variant="caption" color="text.disabled" display="block">
            © {new Date().getFullYear()} Gadget Deluxe. All Rights Reserved. Powered by Google Antigravity & Django Cloud.
          </Typography>
        </Container>
      </Box>
    </Box>
  );
}
