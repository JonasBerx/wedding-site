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
    await screen.findByText('Table 01');
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
    expect(screen.getByRole('button', { name: 'Add table' })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith('/api/admin/seating', expect.anything());
  });

  test('deleting a table confirms first, then DELETEs and refreshes', async () => {
    await openSeating();

    // Only the table card's button exists at this point.
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

    // The host owns the dialog; it names the table being removed.
    expect(await screen.findByText('Delete this table?')).toBeInTheDocument();
    expect(
      screen.getByText('Table 1 and every seat at it will be deleted.'),
    ).toBeInTheDocument();

    const seatingLoadsBefore = fetchMock.mock.calls.filter(
      ([p]) => p === '/api/admin/seating',
    ).length;

    // Now there are two: the card's button and the dialog's confirm. The dialog
    // is rendered last, so it is the second one.
    const deleteButtons = screen.getAllByRole('button', { name: 'Delete' });
    expect(deleteButtons).toHaveLength(2);
    fireEvent.click(deleteButtons[1]);

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
      expect(screen.queryByText('Delete this table?')).not.toBeInTheDocument();
    });
    expect(await screen.findByText('Table deleted')).toBeInTheDocument();
    await waitFor(() => {
      const after = fetchMock.mock.calls.filter(([p]) => p === '/api/admin/seating').length;
      expect(after).toBeGreaterThan(seatingLoadsBefore);
    });
    // The toast survives the remount.
    expect(screen.getByText('Table deleted')).toBeInTheDocument();
  });

  test('cancelling the delete dialog fires no request', async () => {
    await openSeating();
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Cancel' }));

    await waitFor(() => {
      expect(screen.queryByText('Delete this table?')).not.toBeInTheDocument();
    });
    expect(fetchMock.mock.calls.some(([p]) => p.startsWith('/api/admin/seating/tables'))).toBe(false);
  });
});

const RENAME_RSVPS = [
  {
    id: 7,
    name: 'Ana',
    email: 'ana@example.com',
    attending: 1,
    event_type: 'full',
    dietary_restrictions: null,
    song: null,
    submitted_at: '2026-05-01T10:00:00.000',
    attendees: [
      { id: 71, position: 1, name: 'Ana', first_course_name: 'Tomato', main_course_name: 'Lamb', dietary_restrictions: null },
      { id: 72, position: 2, name: 'Bram', first_course_name: 'Tomato', main_course_name: 'Lamb', dietary_restrictions: null },
    ],
  },
  // A second household, present only to prove that name-cell accessible names
  // are guest-specific rather than identical across rows (e.g. "Lead name"
  // would collide between every row without the guest's name baked in). None
  // of the tests below rename this party.
  {
    id: 8,
    name: 'Cara',
    email: 'cara@example.com',
    attending: 1,
    event_type: 'full',
    dietary_restrictions: null,
    song: null,
    submitted_at: '2026-05-01T11:00:00.000',
    attendees: [
      { id: 81, position: 1, name: 'Cara', first_course_name: 'Soup', main_course_name: 'Fish', dietary_restrictions: null },
    ],
  },
];

// Mirrors the server's linkage: renaming the lead (or attendee 1) moves both.
function mockRenameApi({ patchOk = true } = {}) {
  return vi.fn(async (path, init = {}) => {
    if (init.method === 'PATCH') {
      if (!patchOk) return { ok: false, status: 500, json: async () => ({ error: 'boom' }) };
      const { name } = JSON.parse(init.body);
      const rsvp = JSON.parse(JSON.stringify(RENAME_RSVPS[0]));
      if (path === '/api/admin/rsvps/7') {
        rsvp.name = name;
        rsvp.attendees[0].name = name;
      } else {
        const a = rsvp.attendees.find(x => path === `/api/admin/rsvps/7/attendees/${x.id}`);
        a.name = name;
        if (a.position === 1) rsvp.name = name;
      }
      return { ok: true, status: 200, json: async () => ({ rsvp }) };
    }
    return {
      ok: true,
      status: 200,
      json: async () => {
        if (path === '/api/admin/rsvps') return JSON.parse(JSON.stringify(RENAME_RSVPS));
        if (path === '/api/admin/invites') return { invites: [] };
        return [];
      },
    };
  });
}

describe('AdminDashboard — renaming guests', () => {
  let fetchMock;

  beforeEach(() => {
    localStorage.setItem('weddingAdminAuth', 'dGVzdDp0ZXN0');
  });

  afterEach(() => {
    localStorage.clear();
    vi.unstubAllGlobals();
  });

  function mount(opts) {
    fetchMock = mockRenameApi(opts);
    vi.stubGlobal('fetch', fetchMock);
    render(<AdminDashboard />);
  }

  test('clicking a name cell opens an input holding the current name', async () => {
    mount();
    fireEvent.click(await screen.findByRole('button', { name: 'Lead name: Ana' }));
    expect(screen.getByRole('textbox', { name: 'Lead name: Ana' })).toHaveValue('Ana');
    // A second party's lead cell carries a distinct accessible name — proves
    // the label is guest-specific, not identical across rows.
    expect(screen.getByRole('button', { name: 'Lead name: Cara' })).toBeInTheDocument();
  });

  test('Enter PATCHes the lead and updates both the lead and attendee 1', async () => {
    mount();
    fireEvent.click(await screen.findByRole('button', { name: 'Lead name: Ana' }));
    const input = screen.getByRole('textbox', { name: 'Lead name: Ana' });
    fireEvent.change(input, { target: { value: 'Anna Peeters' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => {
      expect(fetchMock.mock.calls.some(([p, i]) => p === '/api/admin/rsvps/7' && i?.method === 'PATCH')).toBe(true);
    });
    const [, init] = fetchMock.mock.calls.find(([p, i]) => p === '/api/admin/rsvps/7' && i?.method === 'PATCH');
    expect(JSON.parse(init.body)).toEqual({ name: 'Anna Peeters' });

    // Lead cell and attendee 1 cell both show the new name; attendee 2 is untouched.
    await waitFor(() => expect(screen.getAllByText('Anna Peeters')).toHaveLength(2));
    expect(screen.getByText('Bram')).toBeInTheDocument();
  });

  test('Enter on an attendee cell PATCHes that attendee', async () => {
    mount();
    fireEvent.click(await screen.findByRole('button', { name: 'Attendee 2 name: Bram' }));
    const input = screen.getByRole('textbox', { name: 'Attendee 2 name: Bram' });
    fireEvent.change(input, { target: { value: 'Bram Peeters' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => {
      expect(fetchMock.mock.calls.some(([p]) => p === '/api/admin/rsvps/7/attendees/72')).toBe(true);
    });
    expect(await screen.findByText('Bram Peeters')).toBeInTheDocument();
    // The lead name did not move.
    expect(screen.getAllByText('Ana')).toHaveLength(2);
  });

  test('Escape restores the original name and sends no request', async () => {
    mount();
    fireEvent.click(await screen.findByRole('button', { name: 'Lead name: Ana' }));
    const input = screen.getByRole('textbox', { name: 'Lead name: Ana' });
    fireEvent.change(input, { target: { value: 'Whoops' } });
    fireEvent.keyDown(input, { key: 'Escape' });

    await waitFor(() => {
      expect(screen.queryByRole('textbox', { name: 'Lead name: Ana' })).not.toBeInTheDocument();
    });
    expect(screen.getAllByText('Ana')).toHaveLength(2);
    expect(fetchMock.mock.calls.some(([, i]) => i?.method === 'PATCH')).toBe(false);
  });

  test('an unchanged name closes the cell without a request', async () => {
    mount();
    fireEvent.click(await screen.findByRole('button', { name: 'Lead name: Ana' }));
    fireEvent.keyDown(screen.getByRole('textbox', { name: 'Lead name: Ana' }), { key: 'Enter' });

    await waitFor(() => {
      expect(screen.queryByRole('textbox', { name: 'Lead name: Ana' })).not.toBeInTheDocument();
    });
    expect(fetchMock.mock.calls.some(([, i]) => i?.method === 'PATCH')).toBe(false);
  });

  test('a failed rename reverts the cell and shows a toast', async () => {
    mount({ patchOk: false });
    fireEvent.click(await screen.findByRole('button', { name: 'Lead name: Ana' }));
    const input = screen.getByRole('textbox', { name: 'Lead name: Ana' });
    fireEvent.change(input, { target: { value: 'Anna Peeters' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(await screen.findByText('Could not rename.')).toBeInTheDocument();
    expect(screen.queryByText('Anna Peeters')).not.toBeInTheDocument();
    expect(screen.getAllByText('Ana')).toHaveLength(2);
    // Exactly one attempt: closing the cell must not let the unmount blur
    // re-fire the request with the stale draft.
    expect(fetchMock.mock.calls.filter(([, i]) => i?.method === 'PATCH')).toHaveLength(1);
  });
});
