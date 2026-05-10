import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { VariationB } from './WeddingSite';
import RegistryPage from './pages/RegistryPage';
import AdminDashboard from './pages/AdminDashboard';
import { PaletteShell, usePaletteMode } from './PaletteShell';

function HomePage() {
  const { mode } = usePaletteMode();
  return <VariationB mode={mode} />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<PaletteShell><HomePage /></PaletteShell>} />
      <Route path="/registry" element={<PaletteShell><RegistryPage /></PaletteShell>} />
      <Route path="/admin" element={<AdminDashboard />} />
    </Routes>
  );
}
