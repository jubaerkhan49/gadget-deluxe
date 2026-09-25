import React, { useState, useContext } from 'react';
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
  Brightness4 as DarkModeIcon,
  Brightness7 as LightModeIcon,
  ArrowForward as ArrowForwardIcon,
  PersonAdd as JoinIcon,
  Shield as ShieldIcon,
  Timeline as TimelineIcon,
  Storefront as B2BIcon,
  Lock as LockIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { ColorModeContext } from '../App';
import { useAuth } from '../context/AuthContext';
import ApplyEmployeeDialog from '../dialogs/ApplyEmployeeDialog';

export default function Landing() {
  const theme = useTheme();
  const navigate = useNavigate();
  const colorMode = useContext(ColorModeContext);
  const { user } = useAuth();

  const [orderQuery, setOrderQuery] = useState('');
  const [showApplyDialog, setShowApplyDialog] = useState(false);

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
        bgcolor: isDark ? '#0F172A' : '#F8FAFC',
        color: isDark ? '#F1F5F9' : '#0F172A',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      {/* 1. Header / Navbar */}
      <Box
        component="header"
        sx={{
          borderBottom: 1,
          borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)',
          bgcolor: isDark ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(8px)',
          position: 'sticky',
          top: 0,
          zIndex: 100
        }}
      >
        <Container maxWidth="lg" sx={{ px: { xs: 2, sm: 3 } }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              py: { xs: 1.5, sm: 2 }
            }}
          >
            {/* Logo */}
            <Box
              onClick={() => navigate('/')}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: { xs: 1, sm: 1.5 },
                cursor: 'pointer',
                userSelect: 'none'
              }}
            >
              <Box
                sx={{
                  width: { xs: 34, sm: 38 },
                  height: { xs: 34, sm: 38 },
                  borderRadius: 2,
                  bgcolor: 'primary.main',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff'
                }}
              >
                <DeviceIcon sx={{ fontSize: { xs: 18, sm: 20 } }} />
              </Box>
              <Box>
                <Typography
                  variant="subtitle1"
                  fontWeight={800}
                  letterSpacing="-0.3px"
                  sx={{ lineHeight: 1.2, fontSize: { xs: '0.95rem', sm: '1.1rem' } }}
                >
                  Gadget Deluxe
                </Typography>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ fontSize: { xs: '0.65rem', sm: '0.72rem' }, display: { xs: 'none', sm: 'block' } }}
                >
                  Inventory & Logistics
                </Typography>
              </Box>
            </Box>

            {/* Nav Actions */}
            <Stack direction="row" spacing={{ xs: 0.8, sm: 1.5 }} alignItems="center">
              <Button
                color="inherit"
                size="small"
                onClick={() => navigate('/track')}
                sx={{ fontWeight: 600, textTransform: 'none', display: { xs: 'none', sm: 'inline-flex' } }}
              >
                Track Parcel
              </Button>

              <Button
                color="inherit"
                size="small"
                onClick={() => setShowApplyDialog(true)}
                startIcon={<JoinIcon sx={{ fontSize: { xs: 16, sm: 18 } }} />}
                sx={{
                  fontWeight: 600,
                  textTransform: 'none',
                  fontSize: { xs: '0.75rem', sm: '0.85rem' },
                  px: { xs: 0.8, sm: 1.5 },
                  py: { xs: 0.4, sm: 0.6 },
                  minWidth: 'auto',
                  whiteSpace: 'nowrap'
                }}
              >
                <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>Join Team</Box>
                <Box component="span" sx={{ display: { xs: 'inline', sm: 'none' } }}>Join</Box>
              </Button>

              <Tooltip title={`Switch to ${isDark ? 'Light' : 'Dark'} mode`}>
                <IconButton onClick={colorMode.toggleColorMode} color="inherit" size="small" sx={{ p: { xs: 0.6, sm: 1 } }}>
                  {isDark ? <LightModeIcon sx={{ fontSize: { xs: 18, sm: 20 } }} /> : <DarkModeIcon sx={{ fontSize: { xs: 18, sm: 20 } }} />}
                </IconButton>
              </Tooltip>

              {user ? (
                <Button
                  variant="contained"
                  color="primary"
                  size="small"
                  onClick={() => navigate('/dashboard')}
                  sx={{
                    borderRadius: 2,
                    px: { xs: 1.3, sm: 2 },
                    py: { xs: 0.5, sm: 0.7 },
                    fontWeight: 700,
                    textTransform: 'none',
                    fontSize: { xs: '0.78rem', sm: '0.85rem' },
                    whiteSpace: 'nowrap',
                    minWidth: 'auto',
                    lineHeight: 1.3
                  }}
                >
                  Dashboard
                </Button>
              ) : (
                <Button
                  variant="contained"
                  color="primary"
                  size="small"
                  onClick={() => navigate('/login')}
                  startIcon={<LockIcon sx={{ fontSize: { xs: 16, sm: 18 }, display: { xs: 'none', sm: 'inline-flex' } }} />}
                  sx={{
                    borderRadius: 2,
                    px: { xs: 1.3, sm: 2 },
                    py: { xs: 0.5, sm: 0.7 },
                    fontWeight: 700,
                    textTransform: 'none',
                    fontSize: { xs: '0.78rem', sm: '0.85rem' },
                    whiteSpace: 'nowrap',
                    minWidth: 'auto',
                    lineHeight: 1.3
                  }}
                >
                  Sign In
                </Button>
              )}
            </Stack>
          </Box>
        </Container>
      </Box>

      {/* 2. Minimalist Hero & Tracking Section */}
      <Box sx={{ pt: { xs: 3.5, sm: 6, md: 9 }, pb: { xs: 3.5, sm: 5, md: 7 }, px: { xs: 2, sm: 3 } }}>
        <Container maxWidth="md">
          <Box sx={{ textAlign: 'center', mb: { xs: 2.5, sm: 3.5 } }}>
            <Typography
              variant="h3"
              fontWeight={800}
              letterSpacing="-0.6px"
              sx={{
                fontSize: { xs: '1.6rem', sm: '2.4rem', md: '3.1rem' },
                lineHeight: 1.2,
                mb: { xs: 1, sm: 1.5 }
              }}
            >
              Device Inventory & Supply Logistics
            </Typography>
            <Typography
              variant="body1"
              color="text.secondary"
              sx={{
                fontSize: { xs: '0.84rem', sm: '0.96rem', md: '1.05rem' },
                maxWidth: 600,
                mx: 'auto',
                lineHeight: 1.55,
                px: { xs: 1, sm: 0 }
              }}
            >
              Real-time device tracking, Cross-border shipment pipeline from China to Bangladesh, and wholesale consignment management.
            </Typography>
          </Box>

          {/* Minimalist Tracking Search Bar */}
          <Paper
            component="form"
            onSubmit={handleTrackSubmit}
            variant="outlined"
            sx={{
              p: { xs: 0.6, sm: 0.8 },
              borderRadius: 3,
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              gap: 0.8,
              bgcolor: isDark ? '#1E293B' : '#FFFFFF',
              borderColor: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.12)',
              maxWidth: 600,
              mx: 'auto',
              boxShadow: isDark ? '0 4px 20px rgba(0,0,0,0.25)' : '0 4px 20px rgba(0,0,0,0.05)'
            }}
          >
            <TextField
              fullWidth
              size="small"
              placeholder="Order ID or Phone Number"
              value={orderQuery}
              onChange={(e) => setOrderQuery(e.target.value)}
              variant="standard"
              InputProps={{
                disableUnderline: true,
                startAdornment: (
                  <InputAdornment position="start" sx={{ pl: { xs: 1, sm: 1.5 } }}>
                    <SearchIcon color="action" sx={{ fontSize: { xs: 18, sm: 20 } }} />
                  </InputAdornment>
                )
              }}
              sx={{
                px: { xs: 0.5, sm: 1 },
                '& input': {
                  fontSize: { xs: '0.82rem', sm: '0.92rem' },
                  py: { xs: 0.6, sm: 0.8 }
                }
              }}
            />
            <Button
              type="submit"
              variant="contained"
              color="primary"
              startIcon={<ShippingIcon sx={{ fontSize: { xs: 16, sm: 18 }, display: { xs: 'none', sm: 'inline-flex' } }} />}
              sx={{
                borderRadius: 2.2,
                px: { xs: 2, sm: 3 },
                py: { xs: 0.75, sm: 1 },
                fontWeight: 700,
                textTransform: 'none',
                whiteSpace: 'nowrap',
                fontSize: { xs: '0.8rem', sm: '0.88rem' },
                flexShrink: 0
              }}
            >
              <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>Track Order</Box>
              <Box component="span" sx={{ display: { xs: 'inline', sm: 'none' } }}>Track</Box>
            </Button>
          </Paper>
        </Container>
      </Box>

      {/* 3. Action Cards Grid */}
      <Box sx={{ py: { xs: 2.5, sm: 5 }, flexGrow: 1 }}>
        <Container maxWidth="lg" sx={{ px: { xs: 2, sm: 3 } }}>
          <Typography
            variant="overline"
            color="text.secondary"
            fontWeight={700}
            letterSpacing={1.2}
            sx={{ display: 'block', textAlign: 'center', mb: { xs: 2, sm: 3.5 }, fontSize: { xs: '0.72rem', sm: '0.82rem' } }}
          >
            PORTAL ACCESS & OPERATIONS
          </Typography>

          <Grid container spacing={{ xs: 2, sm: 3 }}>
            {/* Card 1: Track Order */}
            <Grid item xs={12} sm={6} md={3}>
              <Card
                variant="outlined"
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  borderRadius: 2.5,
                  bgcolor: isDark ? '#1E293B' : '#FFFFFF',
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    borderColor: 'primary.main',
                    boxShadow: isDark ? '0 4px 20px rgba(59, 130, 246, 0.15)' : '0 4px 20px rgba(59, 130, 246, 0.1)'
                  }
                }}
              >
                <CardContent sx={{ p: { xs: 2.2, sm: 3 }, flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <Box
                    sx={{
                      width: { xs: 38, sm: 42 },
                      height: { xs: 38, sm: 42 },
                      borderRadius: 2,
                      bgcolor: 'primary.main',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mb: 1.8
                    }}
                  >
                    <ShippingIcon sx={{ fontSize: { xs: 20, sm: 22 } }} />
                  </Box>
                  <Typography variant="subtitle1" fontWeight={700} sx={{ fontSize: { xs: '0.95rem', sm: '1.05rem' } }} gutterBottom>
                    Track Custom Order
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5, flex: 1, lineHeight: 1.5, fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
                    Check live product shipment status from China to Bangladesh.
                  </Typography>
                  <Button
                    variant="outlined"
                    color="primary"
                    fullWidth
                    size="small"
                    onClick={() => navigate('/track')}
                    endIcon={<ArrowForwardIcon sx={{ fontSize: 16 }} />}
                    sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600, py: 0.7, fontSize: { xs: '0.8rem', sm: '0.85rem' } }}
                  >
                    Track Order
                  </Button>
                </CardContent>
              </Card>
            </Grid>

            {/* Card 2: Join as Employee */}
            <Grid item xs={12} sm={6} md={3}>
              <Card
                variant="outlined"
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  borderRadius: 2.5,
                  bgcolor: isDark ? '#1E293B' : '#FFFFFF',
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    borderColor: 'info.main',
                    boxShadow: isDark ? '0 4px 20px rgba(6, 182, 212, 0.15)' : '0 4px 20px rgba(6, 182, 212, 0.1)'
                  }
                }}
              >
                <CardContent sx={{ p: { xs: 2.2, sm: 3 }, flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <Box
                    sx={{
                      width: { xs: 38, sm: 42 },
                      height: { xs: 38, sm: 42 },
                      borderRadius: 2,
                      bgcolor: 'info.main',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mb: 1.8
                    }}
                  >
                    <JoinIcon sx={{ fontSize: { xs: 20, sm: 22 } }} />
                  </Box>
                  <Typography variant="subtitle1" fontWeight={700} sx={{ fontSize: { xs: '0.95rem', sm: '1.05rem' } }} gutterBottom>
                    Join as Employee
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5, flex: 1, lineHeight: 1.5, fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
                    Submit an application with your credentials and National ID to join our inventory.
                  </Typography>
                  <Button
                    variant="outlined"
                    color="info"
                    fullWidth
                    size="small"
                    onClick={() => setShowApplyDialog(true)}
                    endIcon={<ArrowForwardIcon sx={{ fontSize: 16 }} />}
                    sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600, py: 0.7, fontSize: { xs: '0.8rem', sm: '0.85rem' } }}
                  >
                    Apply to Join
                  </Button>
                </CardContent>
              </Card>
            </Grid>

            {/* Card 3: Employee Login */}
            <Grid item xs={12} sm={6} md={3}>
              <Card
                variant="outlined"
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  borderRadius: 2.5,
                  bgcolor: isDark ? '#1E293B' : '#FFFFFF',
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    borderColor: 'success.main',
                    boxShadow: isDark ? '0 4px 20px rgba(16, 185, 129, 0.15)' : '0 4px 20px rgba(16, 185, 129, 0.1)'
                  }
                }}
              >
                <CardContent sx={{ p: { xs: 2.2, sm: 3 }, flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <Box
                    sx={{
                      width: { xs: 38, sm: 42 },
                      height: { xs: 38, sm: 42 },
                      borderRadius: 2,
                      bgcolor: 'success.main',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mb: 1.8
                    }}
                  >
                    <EmployeeIcon sx={{ fontSize: { xs: 20, sm: 22 } }} />
                  </Box>
                  <Typography variant="subtitle1" fontWeight={700} sx={{ fontSize: { xs: '0.95rem', sm: '1.05rem' } }} gutterBottom>
                    Staff Portal
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5, flex: 1, lineHeight: 1.5, fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
                    Staff workbench to check in incoming devices, record repair updates, and manage assigned custody.
                  </Typography>
                  <Button
                    variant="outlined"
                    color="success"
                    fullWidth
                    size="small"
                    onClick={() => navigate('/login?role=employee')}
                    endIcon={<ArrowForwardIcon sx={{ fontSize: 16 }} />}
                    sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600, py: 0.7, fontSize: { xs: '0.8rem', sm: '0.85rem' } }}
                  >
                    Staff Login
                  </Button>
                </CardContent>
              </Card>
            </Grid>

            {/* Card 4: Admin Workspace */}
            <Grid item xs={12} sm={6} md={3}>
              <Card
                variant="outlined"
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  borderRadius: 2.5,
                  bgcolor: isDark ? '#1E293B' : '#FFFFFF',
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    borderColor: 'secondary.main',
                    boxShadow: isDark ? '0 4px 20px rgba(139, 92, 246, 0.15)' : '0 4px 20px rgba(139, 92, 246, 0.1)'
                  }
                }}
              >
                <CardContent sx={{ p: { xs: 2.2, sm: 3 }, flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <Box
                    sx={{
                      width: { xs: 38, sm: 42 },
                      height: { xs: 38, sm: 42 },
                      borderRadius: 2,
                      bgcolor: 'secondary.main',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mb: 1.8
                    }}
                  >
                    <AdminIcon sx={{ fontSize: { xs: 20, sm: 22 } }} />
                  </Box>
                  <Typography variant="subtitle1" fontWeight={700} sx={{ fontSize: { xs: '0.95rem', sm: '1.05rem' } }} gutterBottom>
                    Admin Workspace
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5, flex: 1, lineHeight: 1.5, fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
                    Executive dashboard for capital auditing, B2B wholesale ledgers, and team recruitment approvals.
                  </Typography>
                  <Button
                    variant="contained"
                    color="secondary"
                    fullWidth
                    size="small"
                    onClick={() => navigate('/login?role=admin')}
                    endIcon={<ArrowForwardIcon sx={{ fontSize: 16 }} />}
                    sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600, py: 0.7, fontSize: { xs: '0.8rem', sm: '0.85rem' } }}
                  >
                    Admin Login
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* 4. Minimalist System Capabilities */}
      <Box sx={{ py: { xs: 4, sm: 6 }, borderTop: 1, borderColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)' }}>
        <Container maxWidth="lg" sx={{ px: { xs: 2, sm: 3 } }}>
          <Grid container spacing={{ xs: 3, md: 4 }}>
            <Grid item xs={12} md={4}>
              <Box sx={{ display: 'flex', gap: 1.8 }}>
                <DeviceIcon color="primary" sx={{ fontSize: 26, mt: 0.3, flexShrink: 0 }} />
                <Box>
                  <Typography variant="subtitle2" fontWeight={700} sx={{ fontSize: { xs: '0.9rem', sm: '0.95rem' } }} gutterBottom>
                    Device Information & Sales Auditing
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.55, fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
                    Track Device Information, Sell Records, and Sales Auditing.
                  </Typography>
                </Box>
              </Box>
            </Grid>

            <Grid item xs={12} md={4}>
              <Box sx={{ display: 'flex', gap: 1.8 }}>
                <TimelineIcon color="primary" sx={{ fontSize: 26, mt: 0.3, flexShrink: 0 }} />
                <Box>
                  <Typography variant="subtitle2" fontWeight={700} sx={{ fontSize: { xs: '0.9rem', sm: '0.95rem' } }} gutterBottom>
                    9-Stage Sourcing Pipeline
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.55, fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
                    China purchase to Bangladesh delivery with milestone logging and customer-facing order tracking.
                  </Typography>
                </Box>
              </Box>
            </Grid>

            <Grid item xs={12} md={4}>
              <Box sx={{ display: 'flex', gap: 1.8 }}>
                <B2BIcon color="primary" sx={{ fontSize: 26, mt: 0.3, flexShrink: 0 }} />
                <Box>
                  <Typography variant="subtitle2" fontWeight={700} sx={{ fontSize: { xs: '0.9rem', sm: '0.95rem' } }} gutterBottom>
                    B2B Wholesale Ledgers
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.55, fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
                    Client-safe wholesale management that keeps client inventory lots separated from personal investment capital.
                  </Typography>
                </Box>
              </Box>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* 5. Clean Footer */}
      <Box
        component="footer"
        sx={{
          py: { xs: 3, sm: 4 },
          borderTop: 1,
          borderColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)',
          bgcolor: isDark ? '#0B0F19' : '#F1F5F9'
        }}
      >
        <Container maxWidth="lg" sx={{ px: { xs: 2, sm: 3 } }}>
          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 2,
              textAlign: { xs: 'center', sm: 'left' }
            }}
          >
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.78rem', sm: '0.85rem' } }}>
              Gadget Deluxe — Cloud Phone Inventory & Sourcing Logistics
            </Typography>

            <Stack direction="row" spacing={{ xs: 1.5, sm: 2.5 }}>
              <Button size="small" color="inherit" onClick={() => navigate('/track')} sx={{ textTransform: 'none', fontSize: { xs: '0.75rem', sm: '0.85rem' } }}>
                Track Order
              </Button>
              <Button size="small" color="inherit" onClick={() => setShowApplyDialog(true)} sx={{ textTransform: 'none', fontSize: { xs: '0.75rem', sm: '0.85rem' } }}>
                Join Team
              </Button>
              <Button size="small" color="inherit" onClick={() => navigate('/login')} sx={{ textTransform: 'none', fontSize: { xs: '0.75rem', sm: '0.85rem' } }}>
                Portal Login
              </Button>
            </Stack>
          </Box>
        </Container>
      </Box>

      {/* Apply as Employee Dialog */}
      {showApplyDialog && (
        <ApplyEmployeeDialog
          open={showApplyDialog}
          onClose={() => setShowApplyDialog(false)}
        />
      )}
    </Box>
  );
}
