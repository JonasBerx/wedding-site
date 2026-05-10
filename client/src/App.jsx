import React from 'react';
import { VariationB } from './variation-b';

export default function App() {
  const [mode, setMode] = React.useState('day');
  const paletteMode = mode === 'evening' ? 'night' : 'day';

  return (
    <>
      <VariationB mode={paletteMode} />
      <button
        onClick={() => setMode(m => m === 'day' ? 'evening' : 'day')}
        style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 999,
          padding: '10px 18px', border: 'none', borderRadius: 4,
          background: paletteMode === 'day' ? '#2e2218' : '#f1e6d3',
          color: paletteMode === 'day' ? '#f1e6d3' : '#2e2218',
          fontFamily: '"EB Garamond", serif', fontSize: 14,
          cursor: 'pointer', letterSpacing: '0.08em',
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
        }}>
        {mode === 'day' ? 'Evening mode' : 'Day mode'}
      </button>
    </>
  );
}
