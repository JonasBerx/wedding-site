import React from 'react';

const HEAD_FONT = '"DM Serif Display", serif';
const LABEL_FONT = '"EB Garamond", serif';

const PAPER_DARK = '#f5ecdc';
const INK = '#2e2218';
const INK_SOFT = '#5a4a3a';
const LABEL = '#7a5a3e';
const ACCENT = '#b85c4a';
const RULE = 'rgba(46,34,24,0.18)';

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

export default function SeatingAdminTab({ apiFetch, onToast, onConfirmDeleteTable }) {
  const [data, setData] = React.useState({ published: false, tables: [], unseated: [] });
  const [newTable, setNewTable] = React.useState({ table_number: '', name: '' });
  const [extra, setExtra] = React.useState({});

  // The host (AdminDashboard) declares `apiFetch` as a plain function inside its
  // component body, so its identity changes on every render. Depending on it
  // directly would re-create `load`, re-fire the mount effect, setState, and loop
  // forever. Keep the newest callback in a ref and give `load` empty deps.
  const apiFetchRef = React.useRef(apiFetch);
  const onToastRef = React.useRef(onToast);
  React.useEffect(() => {
    apiFetchRef.current = apiFetch;
    onToastRef.current = onToast;
  });

  const load = React.useCallback(async () => {
    try {
      const res = await apiFetchRef.current('/api/admin/seating');
      if (!res.ok) return;
      const body = await res.json();
      // Normalise so a partial/garbled body can never blank the whole tab.
      setData({
        published: !!body.published,
        tables: Array.isArray(body.tables) ? body.tables : [],
        unseated: Array.isArray(body.unseated) ? body.unseated : [],
      });
    } catch {
      onToastRef.current?.('Tafelschikking kon niet geladen worden');
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
    const body = await res.json().catch(() => ({}));
    onToastRef.current?.(body.error || 'Er ging iets mis');
    return false;
  }

  async function createTable(e) {
    e.preventDefault();
    const n = parseInt(newTable.table_number, 10);
    if (!Number.isInteger(n) || n < 1) {
      onToastRef.current?.('invalid_table_number');
      return;
    }
    const ok = await mutate('/api/admin/seating/tables', {
      method: 'POST',
      body: JSON.stringify({ table_number: n, name: newTable.name.trim() || null }),
    }, 'Tafel toegevoegd');
    if (ok) setNewTable({ table_number: '', name: '' });
  }

  const seat = (table_id, rsvp_attendee_id) => mutate('/api/admin/seating/assignments', {
    method: 'POST', body: JSON.stringify({ table_id, rsvp_attendee_id }),
  });

  const unseat = (id) => mutate(`/api/admin/seating/assignments/${id}`, { method: 'DELETE' });

  async function addExtra(table_id) {
    const guest_name = (extra[table_id] || '').trim();
    if (!guest_name) return;
    const ok = await mutate('/api/admin/seating/assignments', {
      method: 'POST', body: JSON.stringify({ table_id, guest_name }),
    });
    if (ok) setExtra(prev => ({ ...prev, [table_id]: '' }));
  }

  const togglePublished = () => mutate('/api/admin/seating/published', {
    method: 'PUT', body: JSON.stringify({ published: !data.published }),
  }, data.published ? 'Tafelschikking verborgen' : 'Tafelschikking gepubliceerd');

  return (
    <div>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 16, flexWrap: 'wrap', border: `1px solid ${RULE}`,
        background: PAPER_DARK, padding: '14px 16px', marginBottom: 24,
      }}>
        <div>
          <div style={labelStyle}>Zichtbaarheid</div>
          <div style={{ fontFamily: LABEL_FONT, fontSize: 15, color: INK }}>
            {data.published ? 'Zichtbaar voor gasten' : 'Verborgen voor gasten'}
          </div>
        </div>
        <button type="button" style={outlineButton} onClick={togglePublished}>
          {data.published ? 'Verbergen' : 'Publiceren'}
        </button>
      </div>

      <form onSubmit={createTable} style={{ display: 'flex', gap: 16, alignItems: 'flex-end', marginBottom: 28, flexWrap: 'wrap' }}>
        <div>
          <label style={labelStyle} htmlFor="seating-number">Nummer</label>
          <input id="seating-number" style={{ ...inputStyle, width: 90 }} value={newTable.table_number}
            onChange={e => setNewTable(v => ({ ...v, table_number: e.target.value }))} />
        </div>
        <div>
          <label style={labelStyle} htmlFor="seating-name">Naam (optioneel)</label>
          <input id="seating-name" style={{ ...inputStyle, width: 200 }} value={newTable.name}
            onChange={e => setNewTable(v => ({ ...v, name: e.target.value }))} />
        </div>
        <button type="submit" style={outlineButton}>Tafel toevoegen</button>
      </form>

      <div style={{ border: `1px solid ${RULE}`, padding: '14px 16px', marginBottom: 28 }}>
        <div style={labelStyle}>Nog niet ingedeeld · {data.unseated.length}</div>
        {data.unseated.length === 0 ? (
          <div style={{ color: INK_SOFT, fontSize: 14 }}>Iedereen heeft een plaats.</div>
        ) : data.unseated.map(u => (
          <div key={u.rsvp_attendee_id} style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '6px 0', borderBottom: '1px dotted rgba(46,34,24,.13)',
          }}>
            <span style={{ fontSize: 15, color: INK, minWidth: 190 }}>{u.name}</span>
            <span style={{ fontSize: 12, color: LABEL, minWidth: 150 }}>{u.party_name}</span>
            <select
              aria-label={`Tafel voor ${u.name}`}
              value=""
              style={{ ...inputStyle, fontSize: 14 }}
              onChange={e => { if (e.target.value) seat(parseInt(e.target.value, 10), u.rsvp_attendee_id); }}
            >
              <option value="">Kies tafel…</option>
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
        {data.tables.map(t => (
          <div key={t.id} style={{ border: `1px solid ${RULE}`, background: PAPER_DARK, padding: '14px 16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
              <div>
                <div style={labelStyle}>Tafel {String(t.table_number).padStart(2, '0')}</div>
                {t.name && <div style={{ fontFamily: HEAD_FONT, fontSize: 19, color: INK }}>{t.name}</div>}
              </div>
              <button type="button"
                style={{ ...outlineButton, borderColor: ACCENT, color: ACCENT, padding: '3px 10px' }}
                onClick={() => onConfirmDeleteTable?.(t)}>
                Verwijderen
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
                    aria-label={`Verwijder ${a.display_name}`}
                    onClick={() => unseat(a.id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: ACCENT, fontSize: 15 }}>
                    ×
                  </button>
                </li>
              ))}
            </ul>

            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <input
                aria-label={`Extra gast voor tafel ${t.table_number}`}
                placeholder="Extra gast"
                style={{ ...inputStyle, fontSize: 14, flex: 1 }}
                value={extra[t.id] || ''}
                onChange={e => setExtra(prev => ({ ...prev, [t.id]: e.target.value }))}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addExtra(t.id); } }}
              />
              <button type="button" style={{ ...outlineButton, padding: '4px 10px' }}
                onClick={() => addExtra(t.id)}>+</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
