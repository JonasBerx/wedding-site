import { describe, test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import SeatingTableCard from './SeatingTableCard';
import { PALETTES } from '../shared';

describe('SeatingTableCard', () => {
  test('shows a zero-padded number and the table name', () => {
    render(<SeatingTableCard table={{ table_number: 3, name: 'Olijf', guests: ['Anne'] }} />);
    expect(screen.getByText('Table 03')).toBeInTheDocument();
    expect(screen.getByText('Olijf')).toBeInTheDocument();
  });

  test('omits the heading when the table has no name', () => {
    const { container } = render(
      <SeatingTableCard table={{ table_number: 12, name: null, guests: ['Anne'] }} />
    );
    expect(screen.getByText('Table 12')).toBeInTheDocument();
    expect(container.querySelector('h3')).toBeNull();
  });

  test('renders every guest', () => {
    render(<SeatingTableCard table={{
      table_number: 1, name: 'Olijf', guests: ['Anne Van Damme', 'Bram Peeters'],
    }} />);
    expect(screen.getByText('Anne Van Damme')).toBeInTheDocument();
    expect(screen.getByText('Bram Peeters')).toBeInTheDocument();
  });

  test('renders duplicate guest names without collapsing them', () => {
    render(<SeatingTableCard table={{ table_number: 5, name: 'Beuk', guests: ['Jan', 'Jan'] }} />);
    expect(screen.getAllByText('Jan')).toHaveLength(2);
  });

  test('renders an empty guest list without crashing', () => {
    const { container } = render(
      <SeatingTableCard table={{ table_number: 7, name: 'Eik', guests: [] }} />
    );
    expect(screen.getByText('Table 07')).toBeInTheDocument();
    expect(container.querySelectorAll('li')).toHaveLength(0);
  });

  test('does not truncate a three-digit table number', () => {
    render(<SeatingTableCard table={{ table_number: 123, name: 'Esdoorn', guests: ['Anne'] }} />);
    expect(screen.getByText('Table 123')).toBeInTheDocument();
  });

  test('takes its colours from the palette it is given', () => {
    const table = { table_number: 1, name: 'Olijf', guests: ['Anne'] };
    const { container: dayCard } = render(<SeatingTableCard table={table} t={PALETTES.day} />);
    const { container: nightCard } = render(<SeatingTableCard table={table} t={PALETTES.night} />);

    // Night mode must repaint the card itself, not just the page behind it —
    // otherwise the toggle leaves a wall of cream cards on a dark background.
    expect(dayCard.firstChild.style.background).not.toBe('');
    expect(nightCard.firstChild.style.background).not.toBe(dayCard.firstChild.style.background);

    // Guest names follow too, so they stay legible on the dark card.
    const nightGuest = nightCard.querySelector('li');
    const dayGuest = dayCard.querySelector('li');
    expect(nightGuest.style.color).not.toBe(dayGuest.style.color);
  });
});
