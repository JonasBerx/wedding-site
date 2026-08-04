import { describe, test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { SeatingSection } from './Seating';

// Minimal stand-ins for the palette and font set the real page passes down.
const T = {
  ink: '#2e2218', inkSoft: '#5a4a3a', paper: '#fbf5ea',
  accent: '#b85c4a', rule: 'rgba(46,34,24,0.18)',
};
const FONTS = { head: 'serif', body: 'serif', script: 'cursive', label: 'sans-serif' };

function renderSection() {
  return render(
    <MemoryRouter>
      <SeatingSection t={T} fonts={FONTS} />
    </MemoryRouter>,
  );
}

describe('SeatingSection', () => {
  test('sends guests to the seating chart page', () => {
    renderSection();
    expect(screen.getByRole('link', { name: 'Find your table' }))
      .toHaveAttribute('href', '/seating');
  });

  test('names itself for a guest scanning the page', () => {
    renderSection();
    expect(screen.getByRole('heading', { name: 'The seating chart' })).toBeInTheDocument();
  });
});
