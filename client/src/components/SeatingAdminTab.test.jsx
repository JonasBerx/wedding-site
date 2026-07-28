import { describe, test, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SeatingAdminTab from './SeatingAdminTab';

const SEATING = {
  published: false,
  tables: [
    {
      id: 10,
      table_number: 1,
      name: 'Olijf',
      assignments: [
        { id: 100, display_name: 'Anne Van Damme', rsvp_attendee_id: 5, position: 1 },
        { id: 101, display_name: 'Bram Peeters', rsvp_attendee_id: 6, position: 2 },
      ],
    },
    { id: 11, table_number: 2, name: null, assignments: [] },
  ],
  unseated: [
    { rsvp_attendee_id: 7, name: 'Clara Janssens', party_name: 'Familie Janssens' },
    { rsvp_attendee_id: 8, name: 'Dries Maes', party_name: 'Familie Maes' },
  ],
};

function clone(o) { return JSON.parse(JSON.stringify(o)); }

/**
 * Mocks the host's three-arg apiFetch(path, creds, options).
 * GET /api/admin/seating returns `seating`; every other call returns `mutationResult`.
 */
function mockApiFetch(seating = SEATING, mutationResult = { ok: true, status: 204 }) {
  return vi.fn(async (path) => {
    if (path === '/api/admin/seating') {
      return { ok: true, status: 200, json: async () => clone(seating) };
    }
    return { json: async () => ({}), ...mutationResult };
  });
}

/** Every apiFetch call that is not the GET refetch. */
function mutations(apiFetch) {
  return apiFetch.mock.calls.filter(([path]) => path !== '/api/admin/seating');
}

/** Each table card has its own "+" button; scope to the one next to that table's input. */
function extraGuestControls(tableNumber) {
  const input = screen.getByLabelText(`Extra gast voor tafel ${tableNumber}`);
  return { input, plus: input.parentElement.querySelector('button') };
}

async function renderTab(props = {}) {
  const apiFetch = props.apiFetch || mockApiFetch();
  const utils = render(<SeatingAdminTab apiFetch={apiFetch} {...props} />);
  // Wait for the initial load to settle.
  await screen.findByText('Anne Van Damme');
  return { ...utils, apiFetch };
}

describe('SeatingAdminTab — rendering', () => {
  test('renders each table with its assignments', async () => {
    await renderTab();
    expect(screen.getByText('Tafel 01')).toBeInTheDocument();
    expect(screen.getByText('Olijf')).toBeInTheDocument();
    expect(screen.getByText('Tafel 02')).toBeInTheDocument();
    expect(screen.getByText('Anne Van Damme')).toBeInTheDocument();
    expect(screen.getByText('Bram Peeters')).toBeInTheDocument();
  });

  test('renders the unseated list with its count', async () => {
    await renderTab();
    expect(screen.getByText(/Nog niet ingedeeld · 2/)).toBeInTheDocument();
    expect(screen.getByText('Clara Janssens')).toBeInTheDocument();
    expect(screen.getByText('Familie Janssens')).toBeInTheDocument();
    expect(screen.getByText('Dries Maes')).toBeInTheDocument();
  });

  test('shows the all-seated message when nobody is unseated', async () => {
    const apiFetch = mockApiFetch({ ...clone(SEATING), unseated: [] });
    render(<SeatingAdminTab apiFetch={apiFetch} />);
    expect(await screen.findByText('Iedereen heeft een plaats.')).toBeInTheDocument();
    expect(screen.getByText(/Nog niet ingedeeld · 0/)).toBeInTheDocument();
  });

  test('loads once on mount even though the host passes a new apiFetch identity', async () => {
    // AdminDashboard declares apiFetch inline, so it is a new function every render.
    const apiFetch = mockApiFetch();
    const { rerender } = render(<SeatingAdminTab apiFetch={apiFetch} />);
    await screen.findByText('Anne Van Damme');
    rerender(<SeatingAdminTab apiFetch={(...a) => apiFetch(...a)} />);
    rerender(<SeatingAdminTab apiFetch={(...a) => apiFetch(...a)} />);
    await waitFor(() => expect(apiFetch).toHaveBeenCalledTimes(1));
  });
});

describe('SeatingAdminTab — seating a guest', () => {
  test('POSTs table_id + rsvp_attendee_id and refetches', async () => {
    const { apiFetch } = await renderTab();
    apiFetch.mockClear();

    fireEvent.change(screen.getByLabelText('Tafel voor Clara Janssens'), { target: { value: '11' } });

    await waitFor(() => expect(mutations(apiFetch)).toHaveLength(1));
    const [path, creds, options] = mutations(apiFetch)[0];
    expect(path).toBe('/api/admin/seating/assignments');
    expect(creds).toBeUndefined();
    expect(options.method).toBe('POST');
    expect(JSON.parse(options.body)).toEqual({ table_id: 11, rsvp_attendee_id: 7 });

    await waitFor(() =>
      expect(apiFetch.mock.calls.some(([p]) => p === '/api/admin/seating')).toBe(true));
  });

  test('the table dropdown returns to the placeholder after use', async () => {
    await renderTab();
    const select = screen.getByLabelText('Tafel voor Dries Maes');
    fireEvent.change(select, { target: { value: '10' } });
    await waitFor(() => expect(select.value).toBe(''));
  });

  test('choosing the placeholder option fires no request', async () => {
    const { apiFetch } = await renderTab();
    apiFetch.mockClear();
    fireEvent.change(screen.getByLabelText('Tafel voor Clara Janssens'), { target: { value: '' } });
    expect(mutations(apiFetch)).toHaveLength(0);
  });
});

describe('SeatingAdminTab — unseating', () => {
  test('the × button DELETEs that assignment id', async () => {
    const { apiFetch } = await renderTab();
    apiFetch.mockClear();

    fireEvent.click(screen.getByLabelText('Verwijder Bram Peeters'));

    await waitFor(() => expect(mutations(apiFetch)).toHaveLength(1));
    const [path, creds, options] = mutations(apiFetch)[0];
    expect(path).toBe('/api/admin/seating/assignments/101');
    expect(creds).toBeUndefined();
    expect(options.method).toBe('DELETE');
    expect(options.body).toBeUndefined();
  });

  test('a 204 response is not parsed as JSON', async () => {
    const apiFetch = vi.fn(async (path) => {
      if (path === '/api/admin/seating') {
        return { ok: true, status: 200, json: async () => clone(SEATING) };
      }
      return { ok: true, status: 204, json: async () => { throw new SyntaxError('Unexpected end of JSON input'); } };
    });
    const onToast = vi.fn();
    render(<SeatingAdminTab apiFetch={apiFetch} onToast={onToast} />);
    await screen.findByText('Anne Van Damme');

    fireEvent.click(screen.getByLabelText('Verwijder Anne Van Damme'));

    await waitFor(() => expect(mutations(apiFetch)).toHaveLength(1));
    expect(onToast).not.toHaveBeenCalled();
  });
});

describe('SeatingAdminTab — extra guests', () => {
  test('POSTs the trimmed name and clears the input on success', async () => {
    const { apiFetch } = await renderTab();
    apiFetch.mockClear();
    const { input, plus } = extraGuestControls(2);

    fireEvent.change(input, { target: { value: '  Oma Lucienne  ' } });
    fireEvent.click(plus);

    await waitFor(() => expect(mutations(apiFetch)).toHaveLength(1));
    const [path, , options] = mutations(apiFetch)[0];
    expect(path).toBe('/api/admin/seating/assignments');
    expect(options.method).toBe('POST');
    expect(JSON.parse(options.body)).toEqual({ table_id: 11, guest_name: 'Oma Lucienne' });
    await waitFor(() => expect(input.value).toBe(''));
  });

  test('Enter submits the extra guest', async () => {
    const { apiFetch } = await renderTab();
    apiFetch.mockClear();
    const { input } = extraGuestControls(1);

    fireEvent.change(input, { target: { value: 'Nonkel Piet' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => expect(mutations(apiFetch)).toHaveLength(1));
    expect(JSON.parse(mutations(apiFetch)[0][2].body))
      .toEqual({ table_id: 10, guest_name: 'Nonkel Piet' });
  });

  test('a whitespace-only name fires no request', async () => {
    const { apiFetch } = await renderTab();
    apiFetch.mockClear();
    const { input, plus } = extraGuestControls(2);

    fireEvent.change(input, { target: { value: '   ' } });
    fireEvent.click(plus);

    expect(mutations(apiFetch)).toHaveLength(0);
    expect(input.value).toBe('   ');
  });

  test('an empty name fires no request', async () => {
    const { apiFetch } = await renderTab();
    apiFetch.mockClear();
    fireEvent.click(extraGuestControls(1).plus);
    fireEvent.click(extraGuestControls(2).plus);
    expect(mutations(apiFetch)).toHaveLength(0);
  });
});

describe('SeatingAdminTab — publishing', () => {
  test('PUTs true when currently hidden', async () => {
    const { apiFetch } = await renderTab();
    expect(screen.getByText('Verborgen voor gasten')).toBeInTheDocument();
    apiFetch.mockClear();

    fireEvent.click(screen.getByRole('button', { name: 'Publiceren' }));

    await waitFor(() => expect(mutations(apiFetch)).toHaveLength(1));
    const [path, , options] = mutations(apiFetch)[0];
    expect(path).toBe('/api/admin/seating/published');
    expect(options.method).toBe('PUT');
    expect(JSON.parse(options.body)).toEqual({ published: true });
  });

  test('PUTs false when currently published, and labels the button Verbergen', async () => {
    const apiFetch = mockApiFetch({ ...clone(SEATING), published: true });
    render(<SeatingAdminTab apiFetch={apiFetch} />);
    await screen.findByText('Zichtbaar voor gasten');
    apiFetch.mockClear();

    fireEvent.click(screen.getByRole('button', { name: 'Verbergen' }));

    await waitFor(() => expect(mutations(apiFetch)).toHaveLength(1));
    expect(JSON.parse(mutations(apiFetch)[0][2].body)).toEqual({ published: false });
  });

  test('toasts the Dutch success message', async () => {
    const onToast = vi.fn();
    const apiFetch = mockApiFetch();
    render(<SeatingAdminTab apiFetch={apiFetch} onToast={onToast} />);
    await screen.findByText('Anne Van Damme');

    fireEvent.click(screen.getByRole('button', { name: 'Publiceren' }));

    await waitFor(() => expect(onToast).toHaveBeenCalledWith('Tafelschikking gepubliceerd'));
  });
});

describe('SeatingAdminTab — creating a table', () => {
  test('POSTs the parsed number and trimmed name, then clears the form', async () => {
    const { apiFetch } = await renderTab();
    apiFetch.mockClear();
    const number = screen.getByLabelText('Nummer');
    const name = screen.getByLabelText('Naam (optioneel)');

    fireEvent.change(number, { target: { value: '7' } });
    fireEvent.change(name, { target: { value: ' Beuk ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Tafel toevoegen' }));

    await waitFor(() => expect(mutations(apiFetch)).toHaveLength(1));
    const [path, , options] = mutations(apiFetch)[0];
    expect(path).toBe('/api/admin/seating/tables');
    expect(options.method).toBe('POST');
    expect(JSON.parse(options.body)).toEqual({ table_number: 7, name: 'Beuk' });
    await waitFor(() => expect(number.value).toBe(''));
    expect(name.value).toBe('');
  });

  test('sends null when no name is given', async () => {
    const { apiFetch } = await renderTab();
    apiFetch.mockClear();
    fireEvent.change(screen.getByLabelText('Nummer'), { target: { value: '3' } });
    fireEvent.click(screen.getByRole('button', { name: 'Tafel toevoegen' }));

    await waitFor(() => expect(mutations(apiFetch)).toHaveLength(1));
    expect(JSON.parse(mutations(apiFetch)[0][2].body)).toEqual({ table_number: 3, name: null });
  });

  test('rejects a non-numeric table number client-side', async () => {
    const onToast = vi.fn();
    const apiFetch = mockApiFetch();
    render(<SeatingAdminTab apiFetch={apiFetch} onToast={onToast} />);
    await screen.findByText('Anne Van Damme');
    apiFetch.mockClear();

    fireEvent.change(screen.getByLabelText('Nummer'), { target: { value: 'abc' } });
    fireEvent.click(screen.getByRole('button', { name: 'Tafel toevoegen' }));

    await waitFor(() => expect(onToast).toHaveBeenCalledWith('invalid_table_number'));
    expect(mutations(apiFetch)).toHaveLength(0);
  });
});

describe('SeatingAdminTab — failures', () => {
  test("surfaces the server's error string and keeps the input", async () => {
    const onToast = vi.fn();
    const apiFetch = vi.fn(async (path) => {
      if (path === '/api/admin/seating') {
        return { ok: true, status: 200, json: async () => clone(SEATING) };
      }
      return { ok: false, status: 409, json: async () => ({ error: 'already_seated' }) };
    });
    render(<SeatingAdminTab apiFetch={apiFetch} onToast={onToast} />);
    await screen.findByText('Anne Van Damme');
    const { input, plus } = extraGuestControls(1);

    fireEvent.change(input, { target: { value: 'Nonkel Piet' } });
    fireEvent.click(plus);

    await waitFor(() => expect(onToast).toHaveBeenCalledWith('already_seated'));
    expect(input.value).toBe('Nonkel Piet');
  });

  test('falls back to a generic message when the error body is not JSON', async () => {
    const onToast = vi.fn();
    const apiFetch = vi.fn(async (path) => {
      if (path === '/api/admin/seating') {
        return { ok: true, status: 200, json: async () => clone(SEATING) };
      }
      return { ok: false, status: 500, json: async () => { throw new SyntaxError('bad json'); } };
    });
    render(<SeatingAdminTab apiFetch={apiFetch} onToast={onToast} />);
    await screen.findByText('Anne Van Damme');

    fireEvent.click(screen.getByLabelText('Verwijder Anne Van Damme'));

    await waitFor(() => expect(onToast).toHaveBeenCalledWith('Er ging iets mis'));
  });

  test('survives a 200 response with a partial body', async () => {
    const onToast = vi.fn();
    const apiFetch = vi.fn(async () => ({ ok: true, status: 200, json: async () => ({}) }));
    render(<SeatingAdminTab apiFetch={apiFetch} onToast={onToast} />);
    expect(await screen.findByText('Iedereen heeft een plaats.')).toBeInTheDocument();
    expect(onToast).not.toHaveBeenCalled();
  });

  test('toasts when the seating payload is not JSON at all', async () => {
    const onToast = vi.fn();
    const apiFetch = vi.fn(async () => ({
      ok: true, status: 200, json: async () => { throw new SyntaxError('<!doctype html>'); },
    }));
    render(<SeatingAdminTab apiFetch={apiFetch} onToast={onToast} />);
    await waitFor(() =>
      expect(onToast).toHaveBeenCalledWith('Tafelschikking kon niet geladen worden'));
  });

  test('does not refetch after a failed mutation', async () => {
    const apiFetch = mockApiFetch(SEATING, { ok: false, status: 409, json: async () => ({ error: 'nope' }) });
    render(<SeatingAdminTab apiFetch={apiFetch} />);
    await screen.findByText('Anne Van Damme');
    apiFetch.mockClear();

    fireEvent.click(screen.getByLabelText('Verwijder Anne Van Damme'));

    await waitFor(() => expect(mutations(apiFetch)).toHaveLength(1));
    expect(apiFetch.mock.calls.filter(([p]) => p === '/api/admin/seating')).toHaveLength(0);
  });
});

describe('SeatingAdminTab — deleting a table', () => {
  test('delegates to onConfirmDeleteTable with the table object and deletes nothing itself', async () => {
    const onConfirmDeleteTable = vi.fn();
    const apiFetch = mockApiFetch();
    render(<SeatingAdminTab apiFetch={apiFetch} onConfirmDeleteTable={onConfirmDeleteTable} />);
    await screen.findByText('Anne Van Damme');
    apiFetch.mockClear();

    fireEvent.click(screen.getAllByRole('button', { name: 'Verwijderen' })[0]);

    expect(onConfirmDeleteTable).toHaveBeenCalledTimes(1);
    expect(onConfirmDeleteTable.mock.calls[0][0]).toMatchObject({ id: 10, table_number: 1, name: 'Olijf' });
    expect(mutations(apiFetch)).toHaveLength(0);
  });

  test('does not crash when no onConfirmDeleteTable handler is supplied', async () => {
    await renderTab();
    fireEvent.click(screen.getAllByRole('button', { name: 'Verwijderen' })[1]);
    expect(screen.getByText('Tafel 02')).toBeInTheDocument();
  });
});
