import { describe, test, expect, afterEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import SeatingPage from './SeatingPage';

const mockFetch = (body, ok = true) =>
  vi.fn(async () => ({ ok, status: ok ? 200 : 500, json: async () => body }));

describe('SeatingPage', () => {
  afterEach(() => { vi.unstubAllGlobals(); });

  test('renders a card per table when published', async () => {
    vi.stubGlobal('fetch', mockFetch({
      published: true,
      tables: [
        { table_number: 1, name: 'Olijf',  guests: ['Anne Van Damme', 'Bram Peeters'] },
        { table_number: 2, name: null,     guests: ['Clara Janssens'] },
      ],
    }));
    render(<SeatingPage />);
    expect(await screen.findByText('Anne Van Damme')).toBeInTheDocument();
    expect(screen.getByText('Tafel 01')).toBeInTheDocument();
    expect(screen.getByText('Tafel 02')).toBeInTheDocument();
    expect(screen.getByText('Clara Janssens')).toBeInTheDocument();
  });

  test('shows the coming-soon panel and no names when unpublished', async () => {
    vi.stubGlobal('fetch', mockFetch({ published: false, tables: [] }));
    const { container } = render(<SeatingPage />);
    expect(await screen.findByText(/kort voor de trouwdag/i)).toBeInTheDocument();
    expect(container.querySelectorAll('li')).toHaveLength(0);
  });

  test('falls back to the same panel when the request fails', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('network'); }));
    render(<SeatingPage />);
    expect(await screen.findByText(/kort voor de trouwdag/i)).toBeInTheDocument();
  });

  // Privacy guard: the page must key off `published`, never off "are there tables".
  test('shows no guest names if tables somehow arrive while unpublished', async () => {
    vi.stubGlobal('fetch', mockFetch({
      published: false,
      tables: [{ table_number: 1, name: 'Olijf', guests: ['Anne Van Damme'] }],
    }));
    const { container } = render(<SeatingPage />);
    expect(await screen.findByText(/kort voor de trouwdag/i)).toBeInTheDocument();
    expect(container.querySelectorAll('li')).toHaveLength(0);
    expect(screen.queryByText('Anne Van Damme')).toBeNull();
    expect(screen.queryByText('Tafel 01')).toBeNull();
  });

  test('shows the calm panel when the body is not JSON', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true, status: 200,
      json: async () => { throw new SyntaxError('Unexpected token < in JSON'); },
    })));
    render(<SeatingPage />);
    expect(await screen.findByText(/kort voor de trouwdag/i)).toBeInTheDocument();
  });

  test('does not crash on a body with neither published nor tables', async () => {
    vi.stubGlobal('fetch', mockFetch({}));
    const { container } = render(<SeatingPage />);
    expect(await screen.findByText(/kort voor de trouwdag/i)).toBeInTheDocument();
    expect(container.querySelectorAll('li')).toHaveLength(0);
  });

  test('does not flash the coming-soon panel before a published response arrives', async () => {
    let resolveBody;
    const body = new Promise(resolve => { resolveBody = resolve; });
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, status: 200, json: () => body })));

    render(<SeatingPage />);
    // Heading is up straight away, but nothing has claimed the chart is unready.
    expect(screen.getByText('Tafelschikking')).toBeInTheDocument();
    expect(screen.queryByText(/kort voor de trouwdag/i)).toBeNull();

    resolveBody({
      published: true,
      tables: [{ table_number: 1, name: 'Olijf', guests: ['Anne Van Damme'] }],
    });

    expect(await screen.findByText('Anne Van Damme')).toBeInTheDocument();
    expect(screen.queryByText(/kort voor de trouwdag/i)).toBeNull();
  });
});
