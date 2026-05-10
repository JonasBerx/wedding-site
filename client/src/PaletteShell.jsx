import React from 'react';
import { usePalette, WEDDING_FONTS } from './shared';

const PaletteContext = React.createContext(null);

export function usePaletteMode() {
  const ctx = React.useContext(PaletteContext);
  if (!ctx) throw new Error('usePaletteMode must be used inside <PaletteShell>');
  return ctx;
}

export function PaletteShell({ children }) {
  const [mode, setMode] = React.useState('day');
  const t = usePalette(mode);
  const fonts = WEDDING_FONTS;
  const togglePaletteMode = () => setMode(m => (m === 'day' ? 'night' : 'day'));

  return (
    <PaletteContext.Provider value={{ mode, t, fonts, togglePaletteMode }}>
      {children}
      <button
        onClick={togglePaletteMode}
        style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 999,
          padding: '10px 18px', border: 'none', borderRadius: 4,
          background: mode === 'day' ? '#2e2218' : '#f1e6d3',
          color: mode === 'day' ? '#f1e6d3' : '#2e2218',
          fontFamily: '"EB Garamond", serif', fontSize: 14,
          cursor: 'pointer', letterSpacing: '0.08em',
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
        }}>
        {mode === 'day' ? 'Evening mode' : 'Day mode'}
      </button>
    </PaletteContext.Provider>
  );
}
