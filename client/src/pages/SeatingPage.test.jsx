import { describe, test, expect, afterEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import SeatingPage from './SeatingPage';
import { PaletteShell } from '../PaletteShell';
import { WEDDING_DATE, SCHEDULE } from '../shared';

const mockFetch = (body, ok = true) =>
  vi.fn(async () => ({ ok, status: ok ? 200 : 500, json: async () => body }));

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/seating']}>
      <PaletteShell>
        <SeatingPage />
      </PaletteShell>
    </MemoryRouter>
  );
}

const PUBLISHED = {
  published: true,
  tables: [
    { table_number: 1, name: 'Olijf', guests: ['Anne Van Damme', 'Bram Peeters'] },
    { table_number: 2, name: null, guests: ['Clara Janssens'] },
  ],
};

describe('SeatingPage', () => {
  afterEach(() => { vi.unstubAllGlobals(); });

  test('renders a card per table when published', async () => {
    vi.stubGlobal('fetch', mockFetch(PUBLISHED));
    renderPage();
    expect(await screen.findByText('Anne Van Damme')).toBeInTheDocument();
    expect(screen.getByText('Table 01')).toBeInTheDocument();
    expect(screen.getByText('Table 02')).toBeInTheDocument();
    expect(screen.getByText('Clara Janssens')).toBeInTheDocument();
  });

  test('shows the coming-soon panel and no names when unpublished', async () => {
    vi.stubGlobal('fetch', mockFetch({ published: false, tables: [] }));
    const { container } = renderPage();
    expect(await screen.findByText(/come back and look for your name/i)).toBeInTheDocument();
    expect(container.querySelectorAll('li')).toHaveLength(0);
  });

  test('falls back to the same panel when the request fails', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('network'); }));
    renderPage();
    expect(await screen.findByText(/come back and look for your name/i)).toBeInTheDocument();
  });

  // Privacy guard: the page must key off `published`, never off "are there tables".
  test('shows no guest names if tables somehow arrive while unpublished', async () => {
    vi.stubGlobal('fetch', mockFetch({
      published: false,
      tables: [{ table_number: 1, name: 'Olijf', guests: ['Anne Van Damme'] }],
    }));
    const { container } = renderPage();
    expect(await screen.findByText(/come back and look for your name/i)).toBeInTheDocument();
    expect(container.querySelectorAll('li')).toHaveLength(0);
    expect(screen.queryByText('Anne Van Damme')).toBeNull();
    expect(screen.queryByText('Table 01')).toBeNull();
  });

  test('shows the calm panel when the body is not JSON', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true, status: 200,
      json: async () => { throw new SyntaxError('Unexpected token < in JSON'); },
    })));
    renderPage();
    expect(await screen.findByText(/come back and look for your name/i)).toBeInTheDocument();
  });

  test('does not crash on a body with neither published nor tables', async () => {
    vi.stubGlobal('fetch', mockFetch({}));
    const { container } = renderPage();
    expect(await screen.findByText(/come back and look for your name/i)).toBeInTheDocument();
    expect(container.querySelectorAll('li')).toHaveLength(0);
  });

  test('does not flash the coming-soon panel before a published response arrives', async () => {
    let resolveBody;
    const body = new Promise(resolve => { resolveBody = resolve; });
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, status: 200, json: () => body })));

    renderPage();
    // Heading is up straight away, but nothing has claimed the chart is unready.
    expect(screen.getByRole('heading', { name: 'Seating Chart' })).toBeInTheDocument();
    expect(screen.queryByText(/come back and look for your name/i)).toBeNull();

    resolveBody({
      published: true,
      tables: [{ table_number: 1, name: 'Olijf', guests: ['Anne Van Damme'] }],
    });

    expect(await screen.findByText('Anne Van Damme')).toBeInTheDocument();
    expect(screen.queryByText(/come back and look for your name/i)).toBeNull();
  });

  // A published-but-empty chart is not a chart. Showing "find your name" over an
  // empty grid is worse than admitting there is nothing to look at yet.
  test('shows the coming-soon panel when published with no tables', async () => {
    vi.stubGlobal('fetch', mockFetch({ published: true, tables: [] }));
    renderPage();
    expect(await screen.findByText(/come back and look for your name/i)).toBeInTheDocument();
    expect(screen.queryByText(/find your name/i)).toBeNull();
  });
});

describe('SeatingPage — date and dinner time track shared.jsx', () => {
  afterEach(() => { vi.unstubAllGlobals(); });

  // Derived here independently of the page, so a hand-typed literal creeping
  // back into SeatingPage.jsx fails this test rather than misleading guests.
  const expectedDay = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Brussels', day: 'numeric', month: 'long', year: 'numeric',
  }).format(WEDDING_DATE);

  const expectedDinner = SCHEDULE
    .flatMap(day => day.items)
    .find(([, label]) => label === 'Dinner')[0];

  test('the kicker is the wedding date from WEDDING_DATE', async () => {
    vi.stubGlobal('fetch', mockFetch(PUBLISHED));
    renderPage();
    await screen.findByText('Anne Van Damme');
    expect(screen.getByText(expectedDay)).toBeInTheDocument();
  });

  test('the lede quotes the Dinner time from SCHEDULE', async () => {
    vi.stubGlobal('fetch', mockFetch(PUBLISHED));
    renderPage();
    await screen.findByText('Anne Van Damme');
    expect(screen.getByText(new RegExp(`Dinner begins at ${expectedDinner}\\b`))).toBeInTheDocument();
  });

  test('the page does not carry the old hardcoded date or dinner time', async () => {
    vi.stubGlobal('fetch', mockFetch(PUBLISHED));
    const { container } = renderPage();
    await screen.findByText('Anne Van Damme');
    expect(container.textContent).not.toMatch(/september/i);
    expect(container.textContent).not.toMatch(/18[u:]30/);
  });
});

describe('SeatingPage — palette', () => {
  afterEach(() => { vi.unstubAllGlobals(); });

  test('the whole page repaints when evening mode is toggled', async () => {
    vi.stubGlobal('fetch', mockFetch(PUBLISHED));
    const { container } = renderPage();
    await screen.findByText('Anne Van Damme');

    const page = container.querySelector('div');
    const dayBg = page.style.background;
    const dayCardBg = screen.getByText('Anne Van Damme').closest('div').style.background;
    expect(dayBg).not.toBe('');

    fireEvent.click(screen.getByRole('button', { name: 'Evening mode' }));

    expect(page.style.background).not.toBe(dayBg);
    expect(screen.getByText('Anne Van Damme').closest('div').style.background).not.toBe(dayCardBg);
  });
});
