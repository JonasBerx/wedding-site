import React from 'react';
import { useLocation } from 'react-router-dom';
import { usePalette, WEDDING_FONTS, useIsMobile } from './shared';

const PaletteContext = React.createContext(null);

export function usePaletteMode() {
  const ctx = React.useContext(PaletteContext);
  if (!ctx) throw new Error('usePaletteMode must be used inside <PaletteShell>');
  return ctx;
}

export function PaletteShell({ children }) {
  const [mode, setMode] = React.useState('day');
  const t = usePalette(mode);
  const togglePaletteMode = () => setMode(m => (m === 'day' ? 'night' : 'day'));
  const { pathname } = useLocation();
  const showToggle = pathname !== '/admin';
  const isMobile = useIsMobile();

  return (
    <PaletteContext.Provider value={{ mode, t, fonts: WEDDING_FONTS, togglePaletteMode }}>
      {children}
      {showToggle && (
        <button
          onClick={togglePaletteMode}
          style={{
            position: 'fixed',
            bottom: isMobile ? 14 : 24,
            right: isMobile ? 14 : 24,
            zIndex: 999,
            padding: isMobile ? '8px 14px' : '10px 18px',
            border: 'none', borderRadius: 4,
            background: mode === 'day' ? '#2e2218' : '#f1e6d3',
            color: mode === 'day' ? '#f1e6d3' : '#2e2218',
            fontFamily: '"EB Garamond", serif',
            fontSize: isMobile ? 12 : 14,
            cursor: 'pointer', letterSpacing: '0.08em',
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
            opacity: 0.92,
          }}>
          {mode === 'day' ? 'Evening mode' : 'Day mode'}
        </button>
      )}
    </PaletteContext.Provider>
  );
}
