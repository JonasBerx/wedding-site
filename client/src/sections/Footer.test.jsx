import { describe, test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { FooterSection } from './Footer';
import { PALETTES, WEDDING_FONTS } from '../shared';

function renderFooter(path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <FooterSection t={PALETTES.day} fonts={WEDDING_FONTS} />
    </MemoryRouter>
  );
}

describe('FooterSection navigation', () => {
  // /seating was reachable only by someone who had been told the URL.
  test('links to the seating chart from the home page', () => {
    renderFooter('/');
    expect(screen.getByRole('link', { name: 'Seating Chart' })).toHaveAttribute('href', '/seating');
  });

  test('still links to the registry from the home page', () => {
    renderFooter('/');
    expect(screen.getByRole('link', { name: 'Gift Registry' })).toHaveAttribute('href', '/registry');
  });

  test('offers both side pages from the photos page', () => {
    renderFooter('/photos');
    expect(screen.getByRole('link', { name: 'Seating Chart' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Gift Registry' })).toBeInTheDocument();
  });

  test('replaces the current page with a way back', () => {
    renderFooter('/seating');
    expect(screen.getByRole('link', { name: /back to the wedding/ })).toHaveAttribute('href', '/');
    expect(screen.queryByRole('link', { name: 'Seating Chart' })).toBeNull();
    expect(screen.getByRole('link', { name: 'Gift Registry' })).toBeInTheDocument();
  });

  test('does the same on the registry page', () => {
    renderFooter('/registry');
    expect(screen.getByRole('link', { name: /back to the wedding/ })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Gift Registry' })).toBeNull();
    expect(screen.getByRole('link', { name: 'Seating Chart' })).toBeInTheDocument();
  });
});
