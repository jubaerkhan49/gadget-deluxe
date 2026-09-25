import React from 'react';
import { Box, Typography, Button, Paper } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <Paper
          variant="outlined"
          sx={{
            p: 3,
            m: 2,
            borderRadius: 2.5,
            textAlign: 'center',
            bgcolor: (theme) =>
              theme.palette.mode === 'dark' ? 'rgba(239, 68, 68, 0.08)' : '#FEF2F2',
            borderColor: 'error.light'
          }}
        >
          <ErrorOutlineIcon sx={{ fontSize: 44, color: 'error.main', mb: 1 }} />
          <Typography variant="h6" fontWeight={700} gutterBottom color="error.main">
            Something went wrong rendering this section
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2, maxWidth: 500, mx: 'auto' }}>
            {this.state.error?.message || 'An unexpected rendering error occurred.'}
          </Typography>
          <Button
            variant="contained"
            color="primary"
            size="small"
            startIcon={<RefreshIcon />}
            onClick={this.handleReset}
            sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700 }}
          >
            Try Again
          </Button>
        </Paper>
      );
    }

    return this.props.children;
  }
}
