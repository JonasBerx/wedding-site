import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import AdminDashboard from './AdminDashboard';

const RSVPS = [
  {
    id: 1,
    name: 'Ada Lovelace',
    email: 'ada@example.com',
    attending: 1,
    event_type: 'full',
    dietary_restrictions: null,
    song: 'Edith Piaf — La Vie en Rose',
    submitted_at: '2026-05-01T10:00:00.000',
    attendees: [],
  },
  {
    id: 2,
    name: 'Grace Hopper',
    email: 'grace@example.com',
    attending: 1,
    event_type: 'ceremony',
    dietary_restrictions: null,
    song: null,
    submitted_at: '2026-05-02T10:00:00.000',
    attendees: [],
  },
];

// The dashboard loads five endpoints in parallel on mount; only /rsvps matters here.
function mockApi() {
  return vi.fn(async (path) => ({
    ok: true,
    status: 200,
    json: async () => {
      if (path === '/api/admin/rsvps') return RSVPS;
      if (path === '/api/admin/invites') return { invites: [] };
      return [];
    },
  }));
}

describe('AdminDashboard — RSVPs tab', () => {
  beforeEach(() => {
    localStorage.setItem('weddingAdminAuth', 'dGVzdDp0ZXN0');
    vi.stubGlobal('fetch', mockApi());
  });

  afterEach(() => {
    localStorage.clear();
    vi.unstubAllGlobals();
  });

  test('shows the song a guest requested', async () => {
    render(<AdminDashboard />);
    expect(await screen.findByText('Edith Piaf — La Vie en Rose')).toBeInTheDocument();
  });

  test('has a Song column header', async () => {
    render(<AdminDashboard />);
    expect(await screen.findByRole('columnheader', { name: /song/i })).toBeInTheDocument();
  });
});
