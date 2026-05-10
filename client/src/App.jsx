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
    <PaletteShell>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/registry" element={<RegistryPage />} />
        <Route path="/admin" element={<AdminDashboard />} />
      </Routes>
    </PaletteShell>
  );
}
