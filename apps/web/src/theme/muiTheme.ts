import { createTheme } from '@mui/material/styles';

// Tạo MUI dark theme với palette phù hợp với design hiện tại
export const muiTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#38bdf8', // sky-400
      light: '#7dd3fc', // sky-300
      dark: '#0ea5e9', // sky-500
    },
    secondary: {
      main: '#a78bfa', // violet-400
      light: '#c4b5fd', // violet-300
      dark: '#8b5cf6', // violet-500
    },
    success: {
      main: '#34d399', // emerald-400
      light: '#6ee7b7', // emerald-300
      dark: '#10b981', // emerald-500
    },
    warning: {
      main: '#fbbf24', // amber-400
      light: '#fcd34d', // amber-300
      dark: '#f59e0b', // amber-500
    },
    error: {
      main: '#f87171', // red-400
      light: '#fca5a5', // red-300
      dark: '#ef4444', // red-500
    },
    background: {
      default: '#0f172a', // slate-900
      paper: '#1e293b', // slate-800
    },
    text: {
      primary: '#f9fafb', // slate-50
      secondary: '#94a3b8', // slate-400
    },
  },
  typography: {
    fontFamily: [
      'Inter',
      'system-ui',
      '-apple-system',
      'BlinkMacSystemFont',
      'Segoe UI',
      'sans-serif',
    ].join(','),
    h1: {
      fontSize: '2rem',
      fontWeight: 600,
      lineHeight: 1.2,
    },
    h2: {
      fontSize: '1.5rem',
      fontWeight: 600,
      lineHeight: 1.3,
    },
    h3: {
      fontSize: '1.25rem',
      fontWeight: 600,
      lineHeight: 1.4,
    },
    h4: {
      fontSize: '1.125rem',
      fontWeight: 600,
      lineHeight: 1.4,
    },
    h5: {
      fontSize: '1rem',
      fontWeight: 600,
      lineHeight: 1.5,
    },
    h6: {
      fontSize: '0.875rem',
      fontWeight: 600,
      lineHeight: 1.5,
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.6,
    },
    body2: {
      fontSize: '0.875rem',
      lineHeight: 1.6,
    },
    caption: {
      fontSize: '0.75rem',
      lineHeight: 1.5,
    },
  },
  shape: {
    borderRadius: 12, // rounded-xl equivalent
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: 'rgba(15, 23, 42, 0.6)', // slate-900/60
          border: '1px solid rgba(148, 163, 184, 0.16)', // slate-700/40
          backdropFilter: 'blur(12px)',
        },
      },
    },
    MuiCssBaseline: {
      styleOverrides: {
        '*': {
          scrollbarWidth: 'thin',
          scrollbarColor: 'rgba(148, 163, 184, 0.1) transparent',
          '&::-webkit-scrollbar': {
            width: '6px',
            height: '6px',
          },
          '&::-webkit-scrollbar-track': {
            background: 'transparent',
          },
          '&::-webkit-scrollbar-thumb': {
            background: 'rgba(148, 163, 184, 0.1)',
            borderRadius: '999px',
            transition: 'all 0.3s ease',
          },
          '&:hover::-webkit-scrollbar-thumb': {
            background: 'rgba(148, 163, 184, 0.3)',
          },
          '&::-webkit-scrollbar-thumb:hover': {
            background: 'rgba(148, 163, 184, 0.5)',
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          textTransform: 'none',
          fontWeight: 600,
        },
        contained: {
          boxShadow: 'none',
          '&:hover': {
            boxShadow: 'none',
          },
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        root: {
          minHeight: 'auto',
        },
        indicator: {
          display: 'none',
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          borderRadius: 12,
          minHeight: 'auto',
          padding: '6px 12px',
          marginRight: 8,
          '&.Mui-selected': {
            backgroundColor: 'rgba(56, 189, 248, 0.2)', // sky-400/20
            color: '#7dd3fc', // sky-200
          },
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: {
          borderRadius: 999,
          height: 8,
          backgroundColor: 'rgba(148, 163, 184, 0.18)',
        },
        bar: {
          borderRadius: 999,
        },
      },
    },
  },
});
