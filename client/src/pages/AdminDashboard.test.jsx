import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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

const SEATING = {
  published: false,
  tables: [
    {
      id: 10,
      table_number: 1,
      name: 'Olijf',
      assignments: [{ id: 100, display_name: 'Anne Van Damme', rsvp_attendee_id: 5, position: 1 }],
    },
  ],
  unseated: [],
};

// The dashboard loads five endpoints in parallel on mount; only /rsvps matters here.
// The seating tab (when opened) fetches /api/admin/seating on mount as well.
function mockApi() {
  return vi.fn(async (path) => ({
    ok: true,
    status: 200,
    json: async () => {
      if (path === '/api/admin/rsvps') return RSVPS;
      if (path === '/api/admin/invites') return { invites: [] };
      if (path === '/api/admin/seating') return JSON.parse(JSON.stringify(SEATING));
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

describe('AdminDashboard — seating tab', () => {
  let fetchMock;

  beforeEach(() => {
    localStorage.setItem('weddingAdminAuth', 'dGVzdDp0ZXN0');
    fetchMock = mockApi();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    localStorage.clear();
    vi.unstubAllGlobals();
  });

  /** Renders the dashboard, waits for the initial load, then opens the SEATING tab. */
  async function openSeating() {
    render(<AdminDashboard />);
    const tabButton = await screen.findByRole('button', { name: 'SEATING' });
    fireEvent.click(tabButton);
    // The panel is there once the seating fetch has resolved.
    await screen.findByText('Tafel 01');
    return tabButton;
  }

  test('lists a SEATING tab button alongside the other tabs', async () => {
    render(<AdminDashboard />);
    expect(await screen.findByRole('button', { name: 'SEATING' })).toBeInTheDocument();
    // The pre-existing tabs are still there.
    expect(screen.getByRole('button', { name: /RSVPS · 2/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'PHOTOS' })).toBeInTheDocument();
  });

  test('clicking the SEATING tab renders the seating panel', async () => {
    await openSeating();
    expect(screen.getByText('Olijf')).toBeInTheDocument();
    expect(screen.getByText('Anne Van Damme')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tafel toevoegen' })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith('/api/admin/seating', expect.anything());
  });

  test('deleting a table confirms first, then DELETEs and refreshes', async () => {
    await openSeating();

    // Only the table card's button exists at this point.
    fireEvent.click(screen.getByRole('button', { name: 'Verwijderen' }));

    // The host owns the dialog; it names the table being removed.
    expect(await screen.findByText('Tafel verwijderen?')).toBeInTheDocument();
    expect(
      screen.getByText('Tafel 1 en alle plaatsen aan die tafel worden verwijderd.'),
    ).toBeInTheDocument();

    const seatingLoadsBefore = fetchMock.mock.calls.filter(
      ([p]) => p === '/api/admin/seating',
    ).length;

    // Now there are two: the card's button and the dialog's confirm. The dialog
    // is rendered last, so it is the second one.
    const verwijderen = screen.getAllByRole('button', { name: 'Verwijderen' });
    expect(verwijderen).toHaveLength(2);
    fireEvent.click(verwijderen[1]);

    await waitFor(() => {
      expect(
        fetchMock.mock.calls.some(([p]) => p === '/api/admin/seating/tables/10'),
      ).toBe(true);
    });

    const [, init] = fetchMock.mock.calls.find(([p]) => p === '/api/admin/seating/tables/10');
    expect(init.method).toBe('DELETE');
    // Called with `undefined` creds, so it falls back to the stored auth.
    expect(init.headers.Authorization).toBe('Basic dGVzdDp0ZXN0');

    // The dialog closes, the toast shows, and the tab remounts and refetches.
    await waitFor(() => {
      expect(screen.queryByText('Tafel verwijderen?')).not.toBeInTheDocument();
    });
    expect(await screen.findByText('Tafel verwijderd')).toBeInTheDocument();
    await waitFor(() => {
      const after = fetchMock.mock.calls.filter(([p]) => p === '/api/admin/seating').length;
      expect(after).toBeGreaterThan(seatingLoadsBefore);
    });
    // The toast survives the remount.
    expect(screen.getByText('Tafel verwijderd')).toBeInTheDocument();
  });

  test('cancelling the delete dialog fires no request', async () => {
    await openSeating();
    fireEvent.click(screen.getByRole('button', { name: 'Verwijderen' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Annuleren' }));

    await waitFor(() => {
      expect(screen.queryByText('Tafel verwijderen?')).not.toBeInTheDocument();
    });
    expect(fetchMock.mock.calls.some(([p]) => p.startsWith('/api/admin/seating/tables'))).toBe(false);
  });
});
