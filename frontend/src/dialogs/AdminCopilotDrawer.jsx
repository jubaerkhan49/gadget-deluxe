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
  Fade,
  useTheme
} from '@mui/material';
import {
  Close as CloseIcon,
  Send as SendIcon,
  AutoAwesome as SparkleIcon,
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
import { copilotApi, deviceApi } from '../api/client';
import DeviceDetailDrawer from './DeviceDetailDrawer';

const QUICK_PROMPTS = [
  { label: '📊 Live Inventory Valuation', query: 'Give me a live overview of our current inventory valuation and stock counts.' },
  { label: '🔧 Active Repairs & Costs', query: 'Show all devices currently under repair, the repair centers, and total repair expenses.' },
  { label: '🚚 In-Transit Shipments', query: 'Are there any incoming international shipments currently in transit from China?' },
  { label: '📱 In-Stock iPhone 15 Models', query: 'List all iPhone 15 models currently in stock with their colors and capacities.' }
];

// Simple Markdown renderer for tables, lists, bold text, and code
function renderMarkdown(content) {
  if (!content) return null;

  const lines = content.split('\n');
  const elements = [];
  let tableRows = [];
  let inTable = false;

  const flushTable = (key) => {
    if (tableRows.length > 0) {
      const header = tableRows[0];
      const rows = tableRows.slice(1).filter(r => !r.every(c => /^:?-+:?$/.test(c.trim())));
      elements.push(
        <Box key={`table-${key}`} sx={{ overflowX: 'auto', my: 1.5, borderRadius: 1.5, border: '1px solid rgba(255,255,255,0.1)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
            <thead>
              <tr style={{ background: 'rgba(255, 255, 255, 0.06)' }}>
                {header.map((col, idx) => (
                  <th key={idx} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 700, borderBottom: '1px solid rgba(255,255,255,0.12)' }}>
                    {col.trim()}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rIdx) => (
                <tr key={rIdx} style={{ background: rIdx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)' }}>
                  {row.map((cell, cIdx) => (
                    <td key={cIdx} style={{ padding: '6px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                      {cell.trim()}
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
        <Typography key={index} variant="subtitle2" sx={{ fontWeight: 700, mt: 1.5, mb: 0.5, color: 'primary.light' }}>
          {trimmed.replace('### ', '')}
        </Typography>
      );
    } else if (trimmed.startsWith('## ')) {
      elements.push(
        <Typography key={index} variant="subtitle1" sx={{ fontWeight: 800, mt: 2, mb: 0.5, color: 'text.primary' }}>
          {trimmed.replace('## ', '')}
        </Typography>
      );
    } else if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
      elements.push(
        <Box key={index} sx={{ display: 'flex', alignItems: 'flex-start', my: 0.3, pl: 1 }}>
          <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: 'primary.main', mt: 0.9, mr: 1, flexShrink: 0 }} />
          <Typography variant="body2" sx={{ fontSize: '0.85rem', lineHeight: 1.45 }}>
            {formatInline(trimmed.slice(2))}
          </Typography>
        </Box>
      );
    } else if (trimmed === '---') {
      elements.push(<Divider key={index} sx={{ my: 1.5, opacity: 0.3 }} />);
    } else if (trimmed.length > 0) {
      elements.push(
        <Typography key={index} variant="body2" sx={{ my: 0.5, fontSize: '0.85rem', lineHeight: 1.5 }}>
          {formatInline(trimmed)}
        </Typography>
      );
    }
  });

  if (inTable) {
    flushTable('last');
  }

  return elements;
}

function formatInline(text) {
  // Bold **text**
  const parts = text.split(/(\*\*.*?\*\*|`.*?`)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} style={{ color: 'inherit', fontWeight: 700 }}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code
          key={i}
          style={{
            background: 'rgba(99, 102, 241, 0.15)',
            color: '#a5b4fc',
            padding: '2px 5px',
            borderRadius: '4px',
            fontSize: '0.82rem',
            fontFamily: 'monospace'
          }}
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}

export default function AdminCopilotDrawer({ open, onClose }) {
  const theme = useTheme();
  const { enqueueSnackbar } = useSnackbar();

  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState(() => {
    try {
      const saved = localStorage.getItem('copilot_chat_history');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      // fallback
    }
    return [
      {
        role: 'model',
        text: "👋 Hello! I am your **Gadget Deluxe AI Copilot**, powered by Google Gemini.\n\nI have direct, real-time access to your database to query devices, check GSX motherboard color mismatches, track shipments, check repairs, or update statuses.\n\nHow can I help you today?",
        actions: [],
        referenced_devices: [],
        suggestions: [
          'Give me an inventory summary',
          'Show active repair costs',
          'Which shipments are arriving soon?'
        ]
      }
    ];
  });

  const [selectedDevice, setSelectedDevice] = useState(null);
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState(null);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    try {
      localStorage.setItem('copilot_chat_history', JSON.stringify(messages));
    } catch (e) {}
  }, [messages]);

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
      // Send conversation history (last 6 items)
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
      const errorText = err.response?.data?.reply || err.response?.data?.error || err.message || 'Error communicating with AI service.';
      enqueueSnackbar(errorText, { variant: 'error' });
      setMessages(prev => [
        ...prev,
        {
          role: 'model',
          text: `⚠️ **Unable to complete request**: ${errorText}`,
          actions: [],
          referenced_devices: [],
          suggestions: ['Check Render environment variables', 'Try again']
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
          'Show active repair costs',
          'Which shipments are arriving soon?'
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
            background: theme.palette.mode === 'dark'
              ? 'linear-gradient(180deg, #0e1322 0%, #111827 100%)'
              : 'linear-gradient(180deg, #f8fafc 0%, #ffffff 100%)',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: theme.palette.mode === 'dark' ? '-8px 0 32px rgba(0,0,0,0.6)' : '-8px 0 32px rgba(0,0,0,0.1)'
          }
        }}
      >
        {/* Header */}
        <Box
          sx={{
            p: 2,
            borderBottom: '1px solid',
            borderColor: 'divider',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: theme.palette.mode === 'dark' ? 'rgba(15, 23, 42, 0.7)' : 'rgba(255, 255, 255, 0.8)',
            backdropFilter: 'blur(10px)',
            position: 'sticky',
            top: 0,
            zIndex: 10
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Avatar
              sx={{
                width: 38,
                height: 38,
                background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 50%, #ec4899 100%)',
                boxShadow: '0 0 16px rgba(168, 85, 247, 0.4)'
              }}
            >
              <SparkleIcon sx={{ fontSize: 22, color: '#fff' }} />
            </Avatar>
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="subtitle1" fontWeight={700} sx={{ letterSpacing: -0.3 }}>
                  Admin Copilot
                </Typography>
                <Chip
                  label="Gemini AI"
                  size="small"
                  sx={{
                    height: 18,
                    fontSize: '0.65rem',
                    fontWeight: 800,
                    bgcolor: 'rgba(99, 102, 241, 0.15)',
                    color: '#818cf8',
                    border: '1px solid rgba(99, 102, 241, 0.3)'
                  }}
                />
              </Box>
              <Typography variant="caption" color="text.secondary">
                Autonomous Inventory & Operations Assistant
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Tooltip title="Clear chat history">
              <IconButton size="small" onClick={handleClearHistory} sx={{ color: 'text.secondary' }}>
                <ClearIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <IconButton size="small" onClick={onClose} sx={{ color: 'text.secondary' }}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
        </Box>

        {/* Message Area */}
        <Box
          sx={{
            flex: 1,
            overflowY: 'auto',
            p: 2,
            display: 'flex',
            flexDirection: 'column',
            gap: 2
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
                {/* Bubble Container */}
                <Paper
                  elevation={0}
                  sx={{
                    p: 1.8,
                    borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                    maxWidth: '92%',
                    bgcolor: isUser
                      ? 'primary.main'
                      : theme.palette.mode === 'dark'
                      ? 'rgba(30, 41, 59, 0.7)'
                      : '#f1f5f9',
                    color: isUser ? '#fff' : 'text.primary',
                    border: isUser ? 'none' : '1px solid',
                    borderColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                    position: 'relative'
                  }}
                >
                  {/* Actions Taken Badges */}
                  {!isUser && msg.actions && msg.actions.length > 0 && (
                    <Box sx={{ mb: 1, display: 'flex', flexWrap: 'wrap', gap: 0.6 }}>
                      {msg.actions.map((act, aIdx) => (
                        <Chip
                          key={aIdx}
                          icon={<TerminalIcon sx={{ fontSize: '14px !important', color: '#10b981 !important' }} />}
                          label={act.tool}
                          size="small"
                          sx={{
                            height: 20,
                            fontSize: '0.68rem',
                            fontWeight: 700,
                            bgcolor: 'rgba(16, 185, 129, 0.12)',
                            color: '#34d399',
                            border: '1px solid rgba(16, 185, 129, 0.25)'
                          }}
                        />
                      ))}
                    </Box>
                  )}

                  {/* Message Content */}
                  {isUser ? (
                    <Typography variant="body2" sx={{ fontSize: '0.88rem', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                      {msg.text}
                    </Typography>
                  ) : (
                    <Box sx={{ wordBreak: 'break-word' }}>
                      {renderMarkdown(msg.text)}
                    </Box>
                  )}

                  {/* Copy Button for Assistant */}
                  {!isUser && (
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
                      <IconButton
                        size="small"
                        onClick={() => handleCopy(msg.text, index)}
                        sx={{ p: 0.3, opacity: 0.6, '&:hover': { opacity: 1 } }}
                      >
                        {copiedIndex === index ? (
                          <CheckIcon sx={{ fontSize: 14, color: 'success.main' }} />
                        ) : (
                          <CopyIcon sx={{ fontSize: 14 }} />
                        )}
                      </IconButton>
                    </Box>
                  )}
                </Paper>

                {/* Referenced IMEIs / Devices Pills */}
                {!isUser && msg.referenced_devices && msg.referenced_devices.length > 0 && (
                  <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 0.8, pl: 0.5 }}>
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 0.5 }}>
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
                          height: 22,
                          fontSize: '0.72rem',
                          fontFamily: 'monospace',
                          fontWeight: 700,
                          bgcolor: 'rgba(99, 102, 241, 0.15)',
                          color: '#a5b4fc',
                          border: '1px solid rgba(99, 102, 241, 0.35)',
                          '&:hover': { bgcolor: 'rgba(99, 102, 241, 0.25)' }
                        }}
                      />
                    ))}
                  </Box>
                )}

                {/* Intelligent Follow-up Suggestion Chips */}
                {!isUser && msg.suggestions && msg.suggestions.length > 0 && index === messages.length - 1 && (
                  <Box sx={{ mt: 1.5, display: 'flex', flexWrap: 'wrap', gap: 0.8, pl: 0.5 }}>
                    {msg.suggestions.map((sug, sIdx) => (
                      <Chip
                        key={sIdx}
                        label={sug}
                        size="small"
                        clickable
                        onClick={() => handleSendMessage(sug)}
                        sx={{
                          fontSize: '0.75rem',
                          bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
                          color: 'text.secondary',
                          border: '1px solid',
                          borderColor: 'divider',
                          '&:hover': {
                            bgcolor: 'primary.main',
                            color: '#fff',
                            borderColor: 'primary.main'
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
              <CircularProgress size={18} thickness={5} sx={{ color: '#818cf8' }} />
              <Typography variant="caption" sx={{ color: 'text.secondary', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <SparkleIcon sx={{ fontSize: 13, color: '#818cf8' }} />
                Copilot is reasoning and querying database...
              </Typography>
            </Box>
          )}

          <div ref={messagesEndRef} />
        </Box>

        {/* Quick starter prompts (if few messages) */}
        {messages.length <= 2 && (
          <Box sx={{ px: 2, pb: 1 }}>
            <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ textTransform: 'uppercase', letterSpacing: 0.5, mb: 0.8, display: 'block' }}>
              Suggested Actions
            </Typography>
            <Stack direction="row" spacing={0.8} sx={{ flexWrap: 'wrap', gap: 0.8 }}>
              {QUICK_PROMPTS.map((qp, qIdx) => (
                <Chip
                  key={qIdx}
                  label={qp.label}
                  size="small"
                  clickable
                  onClick={() => handleSendMessage(qp.query)}
                  sx={{
                    fontSize: '0.74rem',
                    fontWeight: 600,
                    bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                    border: '1px solid',
                    borderColor: 'divider',
                    '&:hover': { bgcolor: 'rgba(99, 102, 241, 0.15)', borderColor: '#818cf8', color: '#818cf8' }
                  }}
                />
              ))}
            </Stack>
          </Box>
        )}

        {/* Input Bar */}
        <Box
          sx={{
            p: 2,
            borderTop: '1px solid',
            borderColor: 'divider',
            background: theme.palette.mode === 'dark' ? 'rgba(15, 23, 42, 0.85)' : 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(10px)'
          }}
        >
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
            <TextField
              fullWidth
              multiline
              maxRows={4}
              placeholder="Ask Copilot (e.g. Check IMEI 35027..., or show stock stats)..."
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
                  fontSize: '0.88rem',
                  bgcolor: theme.palette.mode === 'dark' ? 'rgba(30, 41, 59, 0.5)' : '#fff',
                  '&.Mui-focused fieldset': {
                    borderColor: '#818cf8',
                    boxShadow: '0 0 10px rgba(129, 140, 248, 0.25)'
                  }
                }
              }}
            />
            <Button
              variant="contained"
              onClick={() => handleSendMessage()}
              disabled={!inputMessage.trim() || loading}
              sx={{
                minWidth: 44,
                width: 44,
                height: 40,
                borderRadius: 2.5,
                p: 0,
                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                boxShadow: '0 4px 12px rgba(99, 102, 241, 0.35)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)'
                }
              }}
            >
              <SendIcon sx={{ fontSize: 18 }} />
            </Button>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1, px: 0.5 }}>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem' }}>
              Press <strong>Enter</strong> to send • <strong>Shift+Enter</strong> for newline
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem' }}>
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
