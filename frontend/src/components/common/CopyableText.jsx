import React, { useState } from 'react';
import { Box, Typography, Tooltip, IconButton } from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';

const CopyableText = ({ label, value, text, sx = {} }) => {
  const [copied, setCopied] = useState(false);
  const content = value || text || '';

  if (!content) return <Typography variant="body2" color="text.secondary">N/A</Typography>;

  const handleCopy = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Box
      onClick={handleCopy}
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.6,
        cursor: 'pointer',
        px: 0.8,
        py: 0.2,
        borderRadius: 1,
        backgroundColor: (theme) =>
          theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)',
        '&:hover': {
          backgroundColor: (theme) =>
            theme.palette.mode === 'dark' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(59, 130, 246, 0.1)',
        },
        ...sx,
      }}
    >
      {label && (
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
          {label}:
        </Typography>
      )}
      <Typography
        variant="body2"
        sx={{
          fontFamily: 'JetBrains Mono, monospace',
          fontWeight: 600,
          letterSpacing: '-0.2px',
        }}
      >
        {content}
      </Typography>
      <Tooltip title={copied ? 'Copied!' : 'Copy to clipboard'} arrow>
        <IconButton size="small" sx={{ p: 0.2 }}>
          {copied ? (
            <CheckIcon sx={{ fontSize: 14, color: 'success.main' }} />
          ) : (
            <ContentCopyIcon sx={{ fontSize: 13, color: 'text.secondary' }} />
          )}
        </IconButton>
      </Tooltip>
    </Box>
  );
};

export default CopyableText;
