import React from 'react';

const HEAD_FONT = '"DM Serif Display", serif';
const LABEL_FONT = '"EB Garamond", serif';

const PAPER_DARK = '#f5ecdc';
const INK = '#2e2218';
const INK_SOFT = '#5a4a3a';
const LABEL = '#7a5a3e';
const ACCENT = '#b85c4a';
const RULE = 'rgba(46,34,24,0.18)';

// The API speaks in codes; the couple should never have to. Anything not listed
// here still gets a human sentence rather than a raw identifier.
const ERROR_MESSAGES = {
  table_number_taken: 'There is already a table with that number.',
  already_seated: 'That guest already has a seat — refresh to see the current chart.',
  invalid_table_number: 'A table number has to be a whole number, 1 or higher.',
  invalid_table_name: 'That table name will not work — try a shorter one.',
  invalid_guest_name: 'That guest name will not work — try a shorter one.',
  attendee_not_found: 'That guest is no longer on the list — refresh the chart.',
  table_not_found: 'That table no longer exists — refresh the chart.',
  assignment_not_found: 'That seat is already gone — refresh the chart.',
  invalid_assignment_target: 'Pick either a guest from the list or type a name — not both.',
};
const GENERIC_ERROR = 'Something went wrong. Please try again.';
const LOAD_ERROR = 'Could not load the seating chart.';

const errorMessage = (code) => ERROR_MESSAGES[code] || GENERIC_ERROR;

const labelStyle = {
  display: 'block', fontFamily: LABEL_FONT, fontSize: 10, letterSpacing: '0.3em',
  textTransform: 'uppercase', color: LABEL, marginBottom: 6,
};
const inputStyle = {
  background: 'transparent', border: 'none', borderBottom: `1px solid rgba(46,34,24,0.3)`,
  fontFamily: LABEL_FONT, fontSize: 15, color: INK, padding: '6px 0', outline: 'none',
};
const outlineButton = {
  background: 'transparent', color: INK, border: `1px solid ${INK}`, cursor: 'pointer',
  fontFamily: LABEL_FONT, fontSize: 11, letterSpacing: '0.18em',
  textTransform: 'uppercase', padding: '6px 16px',
};

export default function SeatingAdminTab({ apiFetch, onToast, onConfirmDeleteTable, onAuthExpired }) {
  const [data, setData] = React.useState({ published: false, tables: [], unseated: [] });
  // 'loading' | 'ready' | 'error' — without this a failed load would render the
  // empty tab, which reads exactly like a real, fully-seated chart.
  const [status, setStatus] = React.useState('loading');
  const [newTable, setNewTable] = React.useState({ table_number: '', name: '' });
  const [extra, setExtra] = React.useState({});
  // id of the table whose extra-guest submit is in flight, or null. The manual
  // path has no unique index behind it, so two fast clicks would otherwise
  // create two identical rows.
  const [addingExtra, setAddingExtra] = React.useState(null);
  // The ref is the actual guard: it is set before the first `await`, so a second
  // click cannot slip through even if React has not re-rendered the disabled
  // button yet. The state exists only to grey the button out.
  const addingExtraRef = React.useRef(false);

  // The host (AdminDashboard) declares `apiFetch` as a plain function inside its
  // component body, so its identity changes on every render. Depending on it
  // directly would re-create `load`, re-fire the mount effect, setState, and loop
  // forever. Keep the newest callback in a ref and give `load` empty deps.
  const apiFetchRef = React.useRef(apiFetch);
  const onToastRef = React.useRef(onToast);
  const onAuthExpiredRef = React.useRef(onAuthExpired);
  React.useEffect(() => {
    apiFetchRef.current = apiFetch;
    onToastRef.current = onToast;
    onAuthExpiredRef.current = onAuthExpired;
  });

  const load = React.useCallback(async () => {
    try {
      const res = await apiFetchRef.current('/api/admin/seating');
      if (!res.ok) {
        // A silent return here would render "everyone has a seat" over zero
        // tables — indistinguishable from a genuinely empty chart.
        setStatus('error');
        if (res.status === 401) onAuthExpiredRef.current?.();
        else onToastRef.current?.(LOAD_ERROR);
        return;
      }
      const body = await res.json();
      // Normalise so a partial/garbled body can never blank the whole tab.
      setData({
        published: !!body.published,
        tables: Array.isArray(body.tables) ? body.tables : [],
        unseated: Array.isArray(body.unseated) ? body.unseated : [],
      });
      setStatus('ready');
    } catch {
      setStatus('error');
      onToastRef.current?.(LOAD_ERROR);
    }
  }, []);

  React.useEffect(() => { load(); }, [load]);

  async function mutate(path, options, okMessage) {
    const res = await apiFetchRef.current(path, undefined, options);
    if (res.ok) {
      if (okMessage) onToastRef.current?.(okMessage);
      await load();
      return true;
    }
    if (res.status === 401) {
      onAuthExpiredRef.current?.();
      return false;
    }
    const body = await res.json().catch(() => ({}));
    onToastRef.current?.(errorMessage(body.error));
    return false;
  }

  async function createTable(e) {
    e.preventDefault();
    const n = parseInt(newTable.table_number, 10);
    if (!Number.isInteger(n) || n < 1) {
      onToastRef.current?.(errorMessage('invalid_table_number'));
      return;
    }
    const ok = await mutate('/api/admin/seating/tables', {
      method: 'POST',
      body: JSON.stringify({ table_number: n, name: newTable.name.trim() || null }),
    }, 'Table added');
    if (ok) setNewTable({ table_number: '', name: '' });
  }

  const seat = (table_id, rsvp_attendee_id) => mutate('/api/admin/seating/assignments', {
    method: 'POST', body: JSON.stringify({ table_id, rsvp_attendee_id }),
  });

  const unseat = (id) => mutate(`/api/admin/seating/assignments/${id}`, { method: 'DELETE' });

  async function addExtra(table_id) {
    if (addingExtraRef.current) return;
    const guest_name = (extra[table_id] || '').trim();
    if (!guest_name) return;
    addingExtraRef.current = true;
    setAddingExtra(table_id);
    try {
      const ok = await mutate('/api/admin/seating/assignments', {
        method: 'POST', body: JSON.stringify({ table_id, guest_name }),
      });
      if (ok) setExtra(prev => ({ ...prev, [table_id]: '' }));
    } finally {
      addingExtraRef.current = false;
      setAddingExtra(null);
    }
  }

  const togglePublished = () => mutate('/api/admin/seating/published', {
    method: 'PUT', body: JSON.stringify({ published: !data.published }),
  }, data.published ? 'Seating chart hidden' : 'Seating chart published');

  return (
    <div>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 16, flexWrap: 'wrap', border: `1px solid ${RULE}`,
        background: PAPER_DARK, padding: '14px 16px', marginBottom: 24,
      }}>
        <div>
          <div style={labelStyle}>Visibility</div>
          <div style={{ fontFamily: LABEL_FONT, fontSize: 15, color: INK }}>
            {data.published ? 'Visible to guests' : 'Hidden from guests'}
          </div>
        </div>
        <button type="button" style={outlineButton} onClick={togglePublished}>
          {data.published ? 'Hide' : 'Publish'}
        </button>
      </div>

      <form onSubmit={createTable} style={{ display: 'flex', gap: 16, alignItems: 'flex-end', marginBottom: 28, flexWrap: 'wrap' }}>
        <div>
          <label style={labelStyle} htmlFor="seating-number">Number</label>
          <input id="seating-number" style={{ ...inputStyle, width: 90 }} value={newTable.table_number}
            onChange={e => setNewTable(v => ({ ...v, table_number: e.target.value }))} />
        </div>
        <div>
          <label style={labelStyle} htmlFor="seating-name">Name (optional)</label>
          <input id="seating-name" style={{ ...inputStyle, width: 200 }} value={newTable.name}
            onChange={e => setNewTable(v => ({ ...v, name: e.target.value }))} />
        </div>
        <button type="submit" style={outlineButton}>Add table</button>
      </form>

      <div style={{ border: `1px solid ${RULE}`, padding: '14px 16px', marginBottom: 28 }}>
        <div style={labelStyle}>Not seated yet · {data.unseated.length}</div>
        {status !== 'ready' ? (
          <div style={{ color: INK_SOFT, fontSize: 14 }}>
            {status === 'error' ? LOAD_ERROR : 'Loading…'}
          </div>
        ) : data.unseated.length === 0 ? (
          <div style={{ color: INK_SOFT, fontSize: 14 }}>Everyone has a seat.</div>
        ) : data.unseated.map(u => (
          <div key={u.rsvp_attendee_id} style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '6px 0', borderBottom: '1px dotted rgba(46,34,24,.13)',
          }}>
            <span style={{ fontSize: 15, color: INK, minWidth: 190 }}>{u.name}</span>
            <span style={{ fontSize: 12, color: LABEL, minWidth: 150 }}>{u.party_name}</span>
            <select
              aria-label={`Table for ${u.name}`}
              value=""
              style={{ ...inputStyle, fontSize: 14 }}
              onChange={e => { if (e.target.value) seat(parseInt(e.target.value, 10), u.rsvp_attendee_id); }}
            >
              <option value="">Choose a table…</option>
              {data.tables.map(t => (
                <option key={t.id} value={t.id}>
                  {t.table_number}{t.name ? ` · ${t.name}` : ''}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
        {data.tables.map(t => {
          const busy = addingExtra !== null;
          return (
            <div key={t.id} style={{ border: `1px solid ${RULE}`, background: PAPER_DARK, padding: '14px 16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
                <div>
                  <div style={labelStyle}>Table {String(t.table_number).padStart(2, '0')}</div>
                  {t.name && <div style={{ fontFamily: HEAD_FONT, fontSize: 19, color: INK }}>{t.name}</div>}
                </div>
                <button type="button"
                  style={{ ...outlineButton, borderColor: ACCENT, color: ACCENT, padding: '3px 10px' }}
                  onClick={() => onConfirmDeleteTable?.(t)}>
                  Delete
                </button>
              </div>

              <ul style={{ listStyle: 'none', margin: '12px 0 0', padding: 0 }}>
                {(t.assignments || []).map(a => (
                  <li key={a.id} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    gap: 8, padding: '3px 0', fontSize: 14, color: INK_SOFT,
                  }}>
                    <span>{a.display_name}</span>
                    <button type="button"
                      aria-label={`Remove ${a.display_name}`}
                      onClick={() => unseat(a.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: ACCENT, fontSize: 15 }}>
                      ×
                    </button>
                  </li>
                ))}
              </ul>

              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <input
                  aria-label={`Extra guest for table ${t.table_number}`}
                  placeholder="Extra guest"
                  style={{ ...inputStyle, fontSize: 14, flex: 1 }}
                  value={extra[t.id] || ''}
                  onChange={e => setExtra(prev => ({ ...prev, [t.id]: e.target.value }))}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addExtra(t.id); } }}
                />
                <button type="button"
                  disabled={busy}
                  style={{
                    ...outlineButton, padding: '4px 10px',
                    cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.45 : 1,
                  }}
                  onClick={() => addExtra(t.id)}>+</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
