import React, { useState, useEffect, useRef } from 'react';
import {
  Drawer,
  Box,
  Typography,
  IconButton,
  TextField,
  Button,
  Chip,
  Paper,
  Stack,
  CircularProgress,
  Tooltip,
  Divider,
  Avatar,
  useTheme
} from '@mui/material';
import {
  Close as CloseIcon,
  Send as SendIcon,
  AutoAwesome as SparkleIcon,
  Add as AddIcon,
  DeleteOutline as ClearIcon,
  ContentCopy as CopyIcon,
  Check as CheckIcon,
  Terminal as TerminalIcon,
  Smartphone as DeviceIcon,
  TrendingUp as StatsIcon,
  LocalShipping as ShippingIcon,
  Build as RepairIcon
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { useLocation } from 'react-router-dom';
import { copilotApi, deviceApi } from '../api/client';
import DeviceDetailDrawer from './DeviceDetailDrawer';

const QUICK_PROMPTS = [
  { label: '📊 Live Valuation & Stats', query: 'Give me a live overview of our current inventory valuation and stock counts.' },
  { label: '🏆 Top Employee Profits', query: 'Tell me which employee generated the most profits this month.' },
  { label: '💰 Today Sales Summary', query: 'How many goods sold today and what is today’s total sales revenue and profit?' },
  { label: '📱 In-Stock iPhone 15 Models', query: 'List all iPhone 15 models currently in stock with their colors and capacities.' }
];

// Markdown renderer with full light/dark theme contrast
function renderMarkdown(content, isDark, onCopy) {
  if (!content) return null;

  const lines = content.split('\n');
  const elements = [];
  let tableRows = [];
  let inTable = false;
  let inCodeBlock = false;
  let codeBlockLines = [];

  const flushCodeBlock = (key) => {
    if (codeBlockLines.length > 0) {
      const codeText = codeBlockLines.join('\n');
      elements.push(
        <Box
          key={`code-${key}`}
          sx={{
            my: 1.5,
            p: 1.5,
            borderRadius: 2,
            bgcolor: isDark ? '#0f172a' : '#1e293b',
            color: '#f8fafc',
            fontFamily: 'monospace',
            fontSize: '0.82rem',
            overflowX: 'auto',
            border: '1px solid',
            borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#334155'
          }}
        >
          {onCopy && (
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 0.5 }}>
              <Tooltip title="Copy code">
                <IconButton
                  size="small"
                  onClick={() => onCopy(codeText)}
                  sx={{ color: '#94a3b8', p: 0.3, '&:hover': { color: '#ffffff' } }}
                >
                  <CopyIcon sx={{ fontSize: 13 }} />
                </IconButton>
              </Tooltip>
            </Box>
          )}
          <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all', fontFamily: 'inherit' }}>
            {codeText}
          </pre>
        </Box>
      );
      codeBlockLines = [];
    }
  };

  const flushTable = (key) => {
    if (tableRows.length > 0) {
      const header = tableRows[0];
      const rows = tableRows.slice(1).filter(r => !r.every(c => /^:?-+:?$/.test(c.trim())));
      elements.push(
        <Box
          key={`table-${key}`}
          sx={{
            overflowX: 'auto',
            my: 1.5,
            borderRadius: 2,
            border: '1px solid',
            borderColor: isDark ? 'rgba(255,255,255,0.15)' : '#cbd5e1',
            boxShadow: isDark ? 'none' : '0 1px 3px rgba(0,0,0,0.05)',
            maxWidth: '100%',
            WebkitOverflowScrolling: 'touch',
            '&::-webkit-scrollbar': {
              height: 5
            },
            '&::-webkit-scrollbar-thumb': {
              backgroundColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)',
              borderRadius: 3
            }
          }}
        >
          <table style={{ width: 'max-content', minWidth: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
            <thead>
              <tr style={{ background: isDark ? 'rgba(255, 255, 255, 0.08)' : '#f1f5f9' }}>
                {header.map((col, idx) => (
                  <th
                    key={idx}
                    style={{
                      padding: '8px 12px',
                      textAlign: 'left',
                      fontWeight: 700,
                      whiteSpace: 'nowrap',
                      color: isDark ? '#f8fafc' : '#0f172a',
                      borderBottom: isDark ? '1px solid rgba(255,255,255,0.15)' : '1px solid #cbd5e1'
                    }}
                  >
                    {formatInline(col.trim(), isDark)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rIdx) => (
                <tr
                  key={rIdx}
                  style={{
                    background: rIdx % 2 === 0
                      ? 'transparent'
                      : isDark ? 'rgba(255,255,255,0.03)' : '#f8fafc'
                  }}
                >
                  {row.map((cell, cIdx) => (
                    <td
                      key={cIdx}
                      style={{
                        padding: '8px 12px',
                        whiteSpace: 'nowrap',
                        color: isDark ? '#e2e8f0' : '#1e293b',
                        borderBottom: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid #e2e8f0'
                      }}
                    >
                      {formatInline(cell.trim(), isDark)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </Box>
      );
      tableRows = [];
    }
  };

  lines.forEach((line, index) => {
    const trimmed = line.trim();

    // Check code blocks
    if (trimmed.startsWith('```')) {
      if (inCodeBlock) {
        flushCodeBlock(index);
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
        codeBlockLines = [];
      }
      return;
    }
    if (inCodeBlock) {
      codeBlockLines.push(line);
      return;
    }

    // Check table row
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      inTable = true;
      const cells = trimmed.slice(1, -1).split('|');
      tableRows.push(cells);
      return;
    } else if (inTable) {
      flushTable(index);
      inTable = false;
    }

    if (trimmed.startsWith('### ')) {
      elements.push(
        <Typography
          key={index}
          variant="subtitle2"
          sx={{
            fontWeight: 800,
            mt: 1.8,
            mb: 0.6,
            color: isDark ? '#93c5fd' : '#1d4ed8',
            fontSize: '0.9rem'
          }}
        >
          {trimmed.replace('### ', '')}
        </Typography>
      );
    } else if (trimmed.startsWith('## ')) {
      elements.push(
        <Typography
          key={index}
          variant="subtitle1"
          sx={{
            fontWeight: 800,
            mt: 2,
            mb: 0.8,
            color: isDark ? '#ffffff' : '#0f172a',
            fontSize: '1rem'
          }}
        >
          {trimmed.replace('## ', '')}
        </Typography>
      );
    } else if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
      elements.push(
        <Box key={index} sx={{ display: 'flex', alignItems: 'flex-start', my: 0.4, pl: 0.5 }}>
          <Box
            sx={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              bgcolor: isDark ? '#60a5fa' : '#2563eb',
              mt: 0.85,
              mr: 1.2,
              flexShrink: 0
            }}
          />
          <Typography
            variant="body2"
            sx={{
              fontSize: '0.86rem',
              lineHeight: 1.5,
              color: isDark ? '#e2e8f0' : '#1e293b'
            }}
          >
            {formatInline(trimmed.slice(2), isDark)}
          </Typography>
        </Box>
      );
    } else if (trimmed === '---') {
      elements.push(
        <Divider
          key={index}
          sx={{
            my: 1.8,
            borderColor: isDark ? 'rgba(255,255,255,0.12)' : '#e2e8f0'
          }}
        />
      );
    } else if (trimmed.length > 0) {
      elements.push(
        <Typography
          key={index}
          variant="body2"
          sx={{
            my: 0.6,
            fontSize: '0.86rem',
            lineHeight: 1.55,
            color: isDark ? '#e2e8f0' : '#1e293b'
          }}
        >
          {formatInline(trimmed, isDark)}
        </Typography>
      );
    }
  });

  if (inTable) {
    flushTable('last');
  }
  if (inCodeBlock) {
    flushCodeBlock('last');
  }

  return elements;
}

function formatInline(text, isDark) {
  if (!text) return null;
  // First split on <br>, <br/>, <br />
  const lines = text.split(/<br\s*\/?>/gi);
  return lines.map((line, lIdx) => {
    // Bold **text** and code `code`
    const parts = line.split(/(\*\*.*?\*\*|`.*?`)/g);
    const content = parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong
            key={i}
            style={{
              fontWeight: 700,
              color: isDark ? '#ffffff' : '#0f172a'
            }}
          >
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return (
          <code
            key={i}
            style={{
              background: isDark ? 'rgba(99, 102, 241, 0.25)' : '#e0e7ff',
              color: isDark ? '#c7d2fe' : '#3730a3',
              border: isDark ? '1px solid rgba(99, 102, 241, 0.4)' : '1px solid #c7d2fe',
              padding: '1px 5px',
              borderRadius: '4px',
              fontSize: '0.8rem',
              fontFamily: 'monospace',
              fontWeight: 600,
              display: 'inline-block'
            }}
          >
            {part.slice(1, -1)}
          </code>
        );
      }
      return part;
    });

    return (
      <React.Fragment key={lIdx}>
        {content}
        {lIdx < lines.length - 1 && <br />}
      </React.Fragment>
    );
  });
}

const INITIAL_MESSAGES = [
  {
    role: 'model',
    text: "👋 Hello! I am your **Gadget Deluxe AI Copilot**, powered by Google Gemini.\n\nI have direct, real-time access to your database to query devices, check GSX motherboard color mismatches, track shipments, check repairs, or update statuses.\n\nHow can I help you today?",
    actions: [],
    referenced_devices: [],
    suggestions: [
      'Give me an inventory summary',
      'Which employee generated most profits this month?',
      'How many goods sold today?'
    ]
  }
];

export default function AdminCopilotDrawer({ open, onClose }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const { enqueueSnackbar } = useSnackbar();

  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState(() => {
    try {
      localStorage.removeItem('copilot_chat_history');
    } catch (e) {}
    return INITIAL_MESSAGES;
  });

  const [selectedDevice, setSelectedDevice] = useState(null);
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState(null);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const location = useLocation();

  useEffect(() => {
    if (location.pathname === '/dashboard') {
      setMessages(INITIAL_MESSAGES);
    }
  }, [location.pathname]);

  useEffect(() => {
    if (open) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        inputRef.current?.focus();
      }, 200);
    }
  }, [open, messages]);

  const handleSendMessage = async (textToSend = null) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || loading) return;

    const userMsg = { role: 'user', text };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInputMessage('');
    setLoading(true);

    try {
      const historyPayload = messages.slice(-6).map(m => ({
        role: m.role === 'model' ? 'model' : 'user',
        text: m.text
      }));

      const res = await copilotApi.chat(text, historyPayload);
      const data = res.data;

      const aiMsg = {
        role: 'model',
        text: data.reply,
        actions: data.actions_taken || [],
        referenced_devices: data.referenced_devices || [],
        suggestions: data.suggestions || []
      };

      setMessages(prev => [...prev, aiMsg]);
    } catch (err) {
      console.error('Copilot API error:', err);
      let errorText = err.response?.data?.reply || err.response?.data?.error;
      if (!errorText) {
        if (err.response?.status === 500) {
          errorText = 'Server took too long to complete AI reasoning or database was busy. Please try asking again in a few moments.';
        } else if (err.response?.status === 429) {
          errorText = 'Gemini API free tier rate limit was reached (15 requests/min). Please wait 10 seconds and try again.';
        } else {
          errorText = err.message || 'Error communicating with AI service.';
        }
      }
      enqueueSnackbar(errorText, { variant: 'error' });
      setMessages(prev => [
        ...prev,
        {
          role: 'model',
          text: `⚠️ **Unable to complete request**: ${errorText}`,
          actions: [],
          referenced_devices: [],
          suggestions: ['Try again', 'Give me an inventory summary']
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleClearHistory = () => {
    setMessages([
      {
        role: 'model',
        text: "✨ Conversation cleared. What would you like to inspect next in your inventory?",
        actions: [],
        referenced_devices: [],
        suggestions: [
          'Give me an inventory summary',
          'Which employee generated most profits this month?',
          'How many goods sold today?'
        ]
      }
    ]);
    localStorage.removeItem('copilot_chat_history');
    enqueueSnackbar('Chat history reset', { variant: 'info' });
  };

  const handleCopy = (text, idx) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
    enqueueSnackbar('Copied to clipboard', { variant: 'success' });
  };

  const handleOpenDevice = async (imei) => {
    try {
      const res = await deviceApi.getAll({ search: imei });
      const found = res.data?.results?.[0] || res.data?.[0];
      if (found) {
        setSelectedDevice(found);
        setDetailDrawerOpen(true);
      } else {
        enqueueSnackbar(`Device with IMEI ${imei} not found in inventory table.`, { variant: 'warning' });
      }
    } catch (e) {
      enqueueSnackbar('Could not load device details.', { variant: 'error' });
    }
  };

  return (
    <>
      <Drawer
        anchor="right"
        open={open}
        onClose={onClose}
        PaperProps={{
          sx: {
            width: { xs: '100%', sm: 480, md: 520 },
            maxWidth: '100vw',
            height: '100dvh',
            maxHeight: '100dvh',
            background: isDark
              ? 'linear-gradient(180deg, #0b0f19 0%, #111827 100%)'
              : '#ffffff',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: isDark
              ? '-8px 0 32px rgba(0,0,0,0.7)'
              : '-8px 0 32px rgba(15,23,42,0.12)',
            borderLeft: '1px solid',
            borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0',
            overflow: 'hidden'
          }
        }}
      >
        {/* Header */}
        <Box
          sx={{
            p: { xs: 1.2, sm: 2 },
            borderBottom: '1px solid',
            borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: isDark ? 'rgba(15, 23, 42, 0.95)' : '#ffffff',
            position: 'sticky',
            top: 0,
            zIndex: 10,
            flexShrink: 0
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 1.5 }, minWidth: 0 }}>
            <Avatar
              sx={{
                width: { xs: 34, sm: 40 },
                height: { xs: 34, sm: 40 },
                background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 50%, #ec4899 100%)',
                boxShadow: '0 2px 10px rgba(168, 85, 247, 0.35)',
                flexShrink: 0
              }}
            >
              <SparkleIcon sx={{ fontSize: { xs: 18, sm: 22 }, color: '#ffffff' }} />
            </Avatar>
            <Box sx={{ minWidth: 0 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                <Typography
                  variant="subtitle1"
                  fontWeight={800}
                  noWrap
                  sx={{
                    fontSize: { xs: '0.92rem', sm: '1rem' },
                    letterSpacing: -0.2,
                    color: isDark ? '#ffffff' : '#0f172a'
                  }}
                >
                  Admin Copilot
                </Typography>
                <Chip
                  label="Gemini AI"
                  size="small"
                  sx={{
                    height: 18,
                    fontSize: '0.62rem',
                    fontWeight: 800,
                    bgcolor: isDark ? 'rgba(168, 85, 247, 0.2)' : '#ede9fe',
                    color: isDark ? '#c084fc' : '#6d28d9',
                    border: '1px solid',
                    borderColor: isDark ? 'rgba(168, 85, 247, 0.4)' : '#ddd6fe',
                    '& .MuiChip-label': {
                      px: 0.6,
                      color: isDark ? '#c084fc' : '#6d28d9'
                    }
                  }}
                />
              </Box>
              <Typography
                variant="caption"
                noWrap
                sx={{
                  color: isDark ? '#94a3b8' : '#475569',
                  fontWeight: 500,
                  fontSize: { xs: '0.68rem', sm: '0.75rem' },
                  display: 'block'
                }}
              >
                Autonomous Inventory Assistant
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.5, sm: 1 }, flexShrink: 0 }}>
            <Tooltip title="Start a new chat conversation">
              <Button
                size="small"
                variant="outlined"
                onClick={handleClearHistory}
                startIcon={<AddIcon sx={{ fontSize: '14px !important', mr: { xs: -0.4, sm: 0 } }} />}
                sx={{
                  borderRadius: 2,
                  fontSize: { xs: '0.7rem', sm: '0.74rem' },
                  fontWeight: 700,
                  textTransform: 'none',
                  px: { xs: 0.8, sm: 1.2 },
                  py: 0.3,
                  minWidth: { xs: 'auto', sm: 64 },
                  color: isDark ? '#93c5fd' : '#1d4ed8',
                  borderColor: isDark ? 'rgba(59, 130, 246, 0.4)' : '#bfdbfe',
                  bgcolor: isDark ? 'rgba(59, 130, 246, 0.1)' : '#eff6ff',
                  '&:hover': {
                    bgcolor: isDark ? 'rgba(59, 130, 246, 0.2)' : '#dbeafe',
                    borderColor: '#2563eb'
                  }
                }}
              >
                New Chat
              </Button>
            </Tooltip>
            <IconButton
              size="small"
              onClick={onClose}
              sx={{ color: isDark ? '#94a3b8' : '#64748b', p: { xs: 0.5, sm: 1 }, '&:hover': { color: isDark ? '#ffffff' : '#0f172a' } }}
            >
              <CloseIcon sx={{ fontSize: { xs: 20, sm: 22 } }} />
            </IconButton>
          </Box>
        </Box>

        {/* Message Area */}
        <Box
          sx={{
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            p: { xs: 1.2, sm: 2.2 },
            display: 'flex',
            flexDirection: 'column',
            gap: { xs: 1.5, sm: 2.2 },
            bgcolor: isDark ? 'transparent' : '#f8fafc',
            overscrollBehavior: 'contain'
          }}
        >
          {messages.map((msg, index) => {
            const isUser = msg.role === 'user';
            return (
              <Box
                key={index}
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: isUser ? 'flex-end' : 'flex-start',
                  maxWidth: '100%'
                }}
              >
                {/* Bubble Container (Merged, Clean & Lightweight) */}
                <Box
                  sx={{
                    p: { xs: 1.4, sm: 1.8 },
                    borderRadius: isUser ? '18px 18px 4px 18px' : '16px 16px 16px 4px',
                    maxWidth: { xs: '96%', sm: '92%' },
                    bgcolor: isUser
                      ? '#2563eb'
                      : isDark
                      ? 'rgba(30, 41, 59, 0.75)'
                      : '#f1f5f9',
                    color: isUser ? '#ffffff' : isDark ? '#f8fafc' : '#0f172a',
                    border: isUser ? '1px solid #1d4ed8' : 'none',
                    boxShadow: isUser ? '0 4px 12px rgba(37, 99, 235, 0.25)' : 'none',
                    position: 'relative'
                  }}
                >
                  {/* Message Content */}
                  {isUser ? (
                    <Typography
                      variant="body2"
                      sx={{
                        fontSize: { xs: '0.84rem', sm: '0.88rem' },
                        whiteSpace: 'pre-wrap',
                        lineHeight: 1.5,
                        color: '#ffffff',
                        fontWeight: 500
                      }}
                    >
                      {msg.text}
                    </Typography>
                  ) : (
                    <Box sx={{ wordBreak: 'break-word', fontSize: { xs: '0.84rem', sm: '0.88rem' } }}>
                      {renderMarkdown(msg.text, isDark, (txt) => handleCopy(txt, index))}
                    </Box>
                  )}

                  {/* Merged Referenced IMEIs / Devices Pills inside bubble */}
                  {!isUser && msg.referenced_devices && msg.referenced_devices.length > 0 && (
                    <Box sx={{ mt: 1.5, pt: 1.2, borderTop: '1px solid', borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 0.8 }}>
                      <Typography
                        variant="caption"
                        sx={{
                          color: isDark ? '#94a3b8' : '#64748b',
                          fontWeight: 700,
                          fontSize: '0.7rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 0.5
                        }}
                      >
                        <DeviceIcon sx={{ fontSize: 13 }} /> Click to inspect:
                      </Typography>
                      {msg.referenced_devices.map((imei, dIdx) => (
                        <Chip
                          key={dIdx}
                          label={imei}
                          size="small"
                          clickable
                          onClick={() => handleOpenDevice(imei)}
                          sx={{
                            height: 24,
                            fontSize: '0.72rem',
                            fontFamily: 'monospace',
                            fontWeight: 700,
                            bgcolor: isDark ? 'rgba(99, 102, 241, 0.2)' : '#ede9fe',
                            color: isDark ? '#c7d2fe' : '#5b21b6',
                            border: '1px solid',
                            borderColor: isDark ? '#6366f1' : '#c4b5fd',
                            '& .MuiChip-label': {
                              color: isDark ? '#c7d2fe' : '#5b21b6',
                              px: 0.9
                            },
                            '&:hover': {
                              bgcolor: isDark ? '#4f46e5' : '#7c3aed',
                              color: '#ffffff',
                              borderColor: '#7c3aed',
                              '& .MuiChip-label': { color: '#ffffff' }
                            }
                          }}
                        />
                      ))}
                    </Box>
                  )}
                </Box>

                {/* Intelligent Follow-up Suggestion Chips */}
                {!isUser && msg.suggestions && msg.suggestions.length > 0 && index === messages.length - 1 && (
                  <Box
                    sx={{
                      mt: 1.2,
                      display: 'flex',
                      flexDirection: 'row',
                      flexWrap: { xs: 'nowrap', sm: 'wrap' },
                      overflowX: { xs: 'auto', sm: 'visible' },
                      pb: { xs: 0.5, sm: 0 },
                      gap: 0.8,
                      pl: 0.5,
                      maxWidth: '100%',
                      WebkitOverflowScrolling: 'touch',
                      '&::-webkit-scrollbar': { display: 'none' },
                      scrollbarWidth: 'none'
                    }}
                  >
                    {msg.suggestions.map((sug, sIdx) => (
                      <Chip
                        key={sIdx}
                        label={sug}
                        size="small"
                        clickable
                        onClick={() => handleSendMessage(sug)}
                        sx={{
                          height: 28,
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          flexShrink: 0,
                          whiteSpace: 'nowrap',
                          bgcolor: isDark ? 'rgba(30, 41, 59, 0.8)' : '#eff6ff',
                          color: isDark ? '#93c5fd' : '#1d4ed8',
                          border: '1px solid',
                          borderColor: isDark ? 'rgba(59, 130, 246, 0.4)' : '#bfdbfe',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                          '& .MuiChip-label': {
                            px: 1,
                            color: isDark ? '#93c5fd' : '#1d4ed8'
                          },
                          '&:hover': {
                            bgcolor: '#2563eb',
                            borderColor: '#2563eb',
                            color: '#ffffff',
                            '& .MuiChip-label': { color: '#ffffff' }
                          }
                        }}
                      />
                    ))}
                  </Box>
                )}
              </Box>
            );
          })}

          {/* Reasoning / Loading Indicator */}
          {loading && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, pl: 1, my: 1 }}>
              <CircularProgress size={16} thickness={5} sx={{ color: '#6366f1' }} />
              <Typography
                variant="caption"
                sx={{
                  color: isDark ? '#94a3b8' : '#475569',
                  fontWeight: 600,
                  fontSize: '0.74rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5
                }}
              >
                <SparkleIcon sx={{ fontSize: 13, color: '#6366f1' }} />
                Copilot is reasoning and querying database...
              </Typography>
            </Box>
          )}

          <div ref={messagesEndRef} />
        </Box>

        {/* Quick starter prompts (Suggested Actions) - horizontal single row on mobile */}
        {messages.length <= 2 && (
          <Box
            sx={{
              px: { xs: 1.2, sm: 2 },
              py: { xs: 0.8, sm: 1.2 },
              borderTop: '1px solid',
              borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0',
              bgcolor: isDark ? 'rgba(15, 23, 42, 0.6)' : '#ffffff',
              flexShrink: 0
            }}
          >
            <Typography
              variant="caption"
              sx={{
                color: isDark ? '#94a3b8' : '#475569',
                fontWeight: 800,
                textTransform: 'uppercase',
                fontSize: '0.64rem',
                letterSpacing: 0.6,
                mb: 0.6,
                display: 'block'
              }}
            >
              Suggested Actions
            </Typography>
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'row',
                flexWrap: { xs: 'nowrap', sm: 'wrap' },
                overflowX: { xs: 'auto', sm: 'visible' },
                pb: { xs: 0.5, sm: 0 },
                gap: 0.8,
                WebkitOverflowScrolling: 'touch',
                '&::-webkit-scrollbar': { display: 'none' },
                scrollbarWidth: 'none'
              }}
            >
              {QUICK_PROMPTS.map((qp, qIdx) => (
                <Chip
                  key={qIdx}
                  label={qp.label}
                  size="small"
                  clickable
                  onClick={() => handleSendMessage(qp.query)}
                  sx={{
                    height: 28,
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    flexShrink: 0,
                    whiteSpace: 'nowrap',
                    bgcolor: isDark ? '#1e293b' : '#f1f5f9',
                    color: isDark ? '#f1f5f9' : '#1e293b',
                    border: '1px solid',
                    borderColor: isDark ? 'rgba(255,255,255,0.15)' : '#cbd5e1',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                    '& .MuiChip-label': {
                      px: 1.1,
                      color: isDark ? '#f1f5f9' : '#1e293b'
                    },
                    '&:hover': {
                      bgcolor: isDark ? '#334155' : '#e2e8f0',
                      borderColor: '#94a3b8',
                      color: isDark ? '#ffffff' : '#0f172a',
                      '& .MuiChip-label': { color: isDark ? '#ffffff' : '#0f172a' }
                    }
                  }}
                />
              ))}
            </Box>
          </Box>
        )}

        {/* Input Bar */}
        <Box
          sx={{
            p: { xs: 1.2, sm: 2 },
            borderTop: '1px solid',
            borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0',
            background: isDark ? 'rgba(15, 23, 42, 0.95)' : '#ffffff',
            flexShrink: 0,
            pb: { xs: 'max(10px, env(safe-area-inset-bottom))', sm: 2 }
          }}
        >
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <TextField
              fullWidth
              multiline
              maxRows={3}
              placeholder="Ask Copilot (e.g. Give me total devices count)"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              inputRef={inputRef}
              disabled={loading}
              variant="outlined"
              size="small"
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2.5,
                  fontSize: { xs: '0.84rem', sm: '0.88rem' },
                  bgcolor: isDark ? '#1e293b' : '#f8fafc',
                  color: isDark ? '#ffffff' : '#0f172a',
                  py: { xs: 0.3, sm: 0.6 },
                  '& fieldset': {
                    borderColor: isDark ? 'rgba(255,255,255,0.18)' : '#cbd5e1'
                  },
                  '&:hover fieldset': {
                    borderColor: isDark ? '#818cf8' : '#3b82f6'
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: isDark ? '#818cf8' : '#2563eb',
                    borderWidth: 2,
                    boxShadow: isDark ? '0 0 10px rgba(129, 140, 248, 0.3)' : '0 0 8px rgba(37, 99, 235, 0.2)'
                  }
                },
                '& .MuiOutlinedInput-input::placeholder': {
                  color: isDark ? '#94a3b8' : '#64748b',
                  opacity: 1
                }
              }}
            />
            <Button
              variant="contained"
              onClick={() => handleSendMessage()}
              disabled={!inputMessage.trim() || loading}
              sx={{
                minWidth: { xs: 40, sm: 44 },
                width: { xs: 40, sm: 44 },
                height: { xs: 38, sm: 42 },
                borderRadius: 2.5,
                p: 0,
                flexShrink: 0,
                background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                boxShadow: '0 4px 12px rgba(37, 99, 235, 0.35)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%)'
                },
                '&.Mui-disabled': {
                  background: isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0',
                  color: isDark ? 'rgba(255,255,255,0.3)' : '#94a3b8'
                }
              }}
            >
              <SendIcon sx={{ fontSize: { xs: 16, sm: 18 }, color: '#ffffff' }} />
            </Button>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 0.8, px: 0.5 }}>
            <Typography
              variant="caption"
              sx={{
                color: isDark ? '#94a3b8' : '#64748b',
                fontSize: '0.7rem',
                display: { xs: 'none', sm: 'block' }
              }}
            >
              Press <strong>Enter</strong> to send • <strong>Shift+Enter</strong> for newline
            </Typography>
            <Typography
              variant="caption"
              sx={{
                color: isDark ? '#94a3b8' : '#64748b',
                fontSize: { xs: '0.66rem', sm: '0.72rem' },
                fontWeight: 600,
                ml: 'auto'
              }}
            >
              Google Gemini 3.5
            </Typography>
          </Box>
        </Box>
      </Drawer>

      {/* Embedded Device Detail Drawer when IMEI is clicked */}
      {selectedDevice && (
        <DeviceDetailDrawer
          open={detailDrawerOpen}
          onClose={() => setDetailDrawerOpen(false)}
          device={selectedDevice}
          onDeviceUpdated={(updated) => setSelectedDevice(updated)}
        />
      )}
    </>
  );
}
