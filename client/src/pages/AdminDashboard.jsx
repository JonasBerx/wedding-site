import React from 'react';
import { Sprig } from '../botanicals';
import Toast from '../components/Toast';
import ConfirmModal from '../components/ConfirmModal';

const HEAD_FONT = '"DM Serif Display", serif';
const BODY_FONT = '"EB Garamond", Georgia, serif';
const LABEL_FONT = '"EB Garamond", serif';

const PAPER = '#fbf5ea';
const PAPER_DARK = '#f5ecdc';
const INK = '#2e2218';
const INK_SOFT = '#5a4a3a';
const LABEL = '#7a5a3e';
const ACCENT = '#b85c4a';
const RULE = 'rgba(46,34,24,0.18)';
const RULE_SOFT = 'rgba(46,34,24,0.08)';

function b64(user, pass) { return btoa(`${user}:${pass}`); }

const inputStyle = {
  width: '100%', boxSizing: 'border-box',
  background: 'transparent', border: 'none',
  borderBottom: `1px solid rgba(46,34,24,0.3)`,
  fontFamily: BODY_FONT, fontSize: 16, color: INK,
  padding: '8px 0', outline: 'none',
};

const labelStyle = {
  display: 'block',
  fontFamily: LABEL_FONT, fontSize: 10, letterSpacing: '0.3em',
  textTransform: 'uppercase', color: LABEL, marginBottom: 6,
};

const primaryButton = {
  background: INK, color: PAPER, border: 'none', cursor: 'pointer',
  fontFamily: LABEL_FONT, fontSize: 12, letterSpacing: '0.18em',
  textTransform: 'uppercase', padding: '12px 28px',
};

const outlineButton = {
  background: 'transparent', color: INK, border: `1px solid ${INK}`,
  cursor: 'pointer',
  fontFamily: LABEL_FONT, fontSize: 11, letterSpacing: '0.18em',
  textTransform: 'uppercase', padding: '6px 16px',
};

const thStyle = {
  textAlign: 'left', padding: '12px 14px',
  fontFamily: LABEL_FONT, fontSize: 11, letterSpacing: '0.18em',
  textTransform: 'uppercase', color: LABEL,
  background: PAPER_DARK, borderBottom: `1px solid ${RULE}`,
};

const tdStyle = {
  padding: '12px 14px',
  fontFamily: BODY_FONT, fontSize: 14, color: INK,
  borderBottom: `1px solid ${RULE_SOFT}`, verticalAlign: 'top',
};

export default function AdminDashboard() {
  const [tab, setTab] = React.useState('rsvps');
  const [user, setUser] = React.useState('');
  const [pass, setPass] = React.useState('');
  const [auth, setAuth] = React.useState(null);
  const [authError, setAuthError] = React.useState('');
  const [rsvps, setRsvps] = React.useState([]);
  const [registry, setRegistry] = React.useState([]);
  const [newTitle, setNewTitle] = React.useState('');
  const [newDesc, setNewDesc] = React.useState('');
  const [addError, setAddError] = React.useState('');
  const [toast, setToast] = React.useState('');
  const [pendingDelete, setPendingDelete] = React.useState(null); // null | item

  async function apiFetch(path, creds, options = {}) {
    return fetch(path, {
      ...options,
      headers: {
        'Authorization': `Basic ${creds || auth}`,
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    });
  }

  async function loadData(creds) {
    const [rsvpsRes, regRes] = await Promise.all([
      apiFetch('/api/admin/rsvps', creds),
      apiFetch('/api/admin/registry', creds),
    ]);
    if (rsvpsRes.status === 401) {
      setAuth(null);
      setAuthError('Session expired. Please log in again.');
      return;
    }
    setRsvps(await rsvpsRes.json());
    setRegistry(await regRes.json());
  }

  async function handleLogin(e) {
    e.preventDefault();
    setAuthError('');
    const creds = b64(user, pass);
    const res = await apiFetch('/api/admin/rsvps', creds);
    if (res.status === 401) {
      setAuthError('Invalid credentials');
      return;
    }
    setAuth(creds);
    await loadData(creds);
  }

  async function handleAdd(e) {
    e.preventDefault();
    setAddError('');
    const res = await apiFetch('/api/admin/registry', null, {
      method: 'POST',
      body: JSON.stringify({ title: newTitle, description: newDesc || null }),
    });
    if (!res.ok) {
      try { setAddError((await res.json()).error || 'Failed to add gift.'); }
      catch { setAddError('Failed to add gift.'); }
      return;
    }
    setNewTitle('');
    setNewDesc('');
    await loadData();
  }

  async function performDelete(item) {
    const res = await apiFetch(`/api/admin/registry/${item.id}`, null, { method: 'DELETE' });
    setPendingDelete(null);
    if (res.status === 409) {
      setToast('Cannot delete — release the claim first.');
      return;
    }
    if (!res.ok) {
      setToast('Could not delete the gift.');
      return;
    }
    await loadData();
  }

  // Login screen
  if (!auth) {
    return (
      <div style={{ minHeight: '100vh', background: PAPER, fontFamily: BODY_FONT, color: INK }}>
        <div style={{ maxWidth: 420, margin: '0 auto', padding: '80px 24px' }}>
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <div style={{ color: ACCENT, marginBottom: 16, display: 'flex', justifyContent: 'center' }}>
              <Sprig size={36} />
            </div>
            <div style={{
              fontFamily: LABEL_FONT, fontSize: 11, letterSpacing: '0.32em',
              textTransform: 'uppercase', color: LABEL, marginBottom: 12,
            }}>back office</div>
            <div style={{
              fontFamily: HEAD_FONT, fontSize: 48, fontStyle: 'italic',
              lineHeight: 1, color: INK,
            }}>Admin</div>
          </div>
          <form
            onSubmit={handleLogin}
            style={{
              background: PAPER, border: `1px solid ${RULE}`,
              padding: '36px 32px',
            }}
          >
            {authError && <div style={{ color: ACCENT, fontSize: 14, marginBottom: 16 }}>{authError}</div>}
            <div style={{ marginBottom: 18 }}>
              <label style={labelStyle}>Username</label>
              <input value={user} onChange={e => setUser(e.target.value)} required style={inputStyle} />
            </div>
            <div style={{ marginBottom: 28 }}>
              <label style={labelStyle}>Password</label>
              <input type="password" value={pass} onChange={e => setPass(e.target.value)} required style={inputStyle} />
            </div>
            <button type="submit" style={primaryButton}>Log in</button>
          </form>
        </div>
      </div>
    );
  }

  // Authenticated dashboard
  return (
    <div style={{ minHeight: '100vh', background: PAPER, fontFamily: BODY_FONT, color: INK }}>
      <Toast message={toast} onDismiss={() => setToast('')} />

      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '60px 40px' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ color: ACCENT, marginBottom: 12, display: 'flex', justifyContent: 'center' }}>
            <Sprig size={36} />
          </div>
          <div style={{
            fontFamily: LABEL_FONT, fontSize: 11, letterSpacing: '0.32em',
            textTransform: 'uppercase', color: LABEL, marginBottom: 10,
          }}>back office</div>
          <div style={{
            fontFamily: HEAD_FONT, fontSize: 48, fontStyle: 'italic',
            lineHeight: 1, color: INK,
          }}>Admin</div>
        </div>

        <div style={{ borderBottom: `1px solid ${RULE}`, marginBottom: 28, display: 'flex', gap: 32 }}>
          {[
            { key: 'rsvps', label: `RSVPS · ${rsvps.length}` },
            { key: 'registry', label: `REGISTRY · ${registry.length}` },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontFamily: LABEL_FONT, fontSize: 11, letterSpacing: '0.32em',
                textTransform: 'uppercase',
                color: tab === key ? INK : LABEL,
                padding: '12px 4px',
                borderBottom: tab === key ? `2px solid ${ACCENT}` : '2px solid transparent',
                marginBottom: -1,
              }}
            >{label}</button>
          ))}
        </div>

        {tab === 'rsvps' && (
          <div style={{ border: `1px solid ${RULE}`, overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['ID','Name','Email','Attending','Event','Vegan','Meal','Dietary','Submitted'].map(h => (
                    <th key={h} style={thStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rsvps.map(r => (
                  <tr key={r.id}>
                    <td style={tdStyle}>{r.id}</td>
                    <td style={tdStyle}>{r.name}</td>
                    <td style={tdStyle}>{r.email}</td>
                    <td style={tdStyle}>{r.attending ? 'Yes' : 'No'}</td>
                    <td style={tdStyle}>{r.event_type === 'full' ? 'Full day' : r.event_type === 'ceremony_party' ? 'Ceremony / Evening' : '—'}</td>
                    <td style={tdStyle}>{r.is_vegan === 1 ? 'Yes' : '—'}</td>
                    <td style={tdStyle}>{r.meal_preference === 1 ? 'Veggie' : r.meal_preference === 2 ? 'Meat' : '—'}</td>
                    <td style={tdStyle}>{r.dietary_restrictions || '—'}</td>
                    <td style={{ ...tdStyle, color: INK_SOFT }}>{r.submitted_at}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {rsvps.length === 0 && (
              <div style={{
                padding: '40px', textAlign: 'center',
                fontFamily: HEAD_FONT, fontSize: 18, fontStyle: 'italic', color: LABEL,
              }}>No RSVPs yet.</div>
            )}
          </div>
        )}

        {tab === 'registry' && (
          <>
            <form
              onSubmit={handleAdd}
              style={{
                border: `1px solid ${RULE}`, padding: 24, marginBottom: 24,
                display: 'flex', gap: 16, alignItems: 'flex-end', flexWrap: 'wrap',
              }}
            >
              <div style={{ flex: '1 1 200px' }}>
                <label style={labelStyle}>Title</label>
                <input value={newTitle} onChange={e => setNewTitle(e.target.value)} required style={inputStyle} />
              </div>
              <div style={{ flex: '2 1 280px' }}>
                <label style={labelStyle}>Description (optional)</label>
                <input value={newDesc} onChange={e => setNewDesc(e.target.value)} style={inputStyle} />
              </div>
              <button type="submit" style={primaryButton}>Add gift</button>
            </form>
            {addError && <div style={{ color: ACCENT, fontSize: 14, marginBottom: 16 }}>{addError}</div>}

            <div style={{ border: `1px solid ${RULE}` }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {['Title','Description','Claimed by',''].map(h => (
                      <th key={h} style={thStyle}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {registry.map(item => (
                    <tr key={item.id}>
                      <td style={{ ...tdStyle, fontFamily: HEAD_FONT, fontStyle: 'italic', fontSize: 17 }}>{item.title}</td>
                      <td style={{ ...tdStyle, color: INK_SOFT }}>{item.description || '—'}</td>
                      <td style={tdStyle}>{item.claimer_name || '—'}</td>
                      <td style={{ ...tdStyle, width: 100 }}>
                        <button
                          onClick={() => setPendingDelete(item)}
                          disabled={!!item.claimer_name}
                          title={item.claimer_name ? 'Release claim first' : 'Delete gift'}
                          style={{
                            ...outlineButton,
                            cursor: item.claimer_name ? 'not-allowed' : 'pointer',
                            opacity: item.claimer_name ? 0.4 : 1,
                          }}
                        >Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {registry.length === 0 && (
                <div style={{
                  padding: '40px', textAlign: 'center',
                  fontFamily: HEAD_FONT, fontSize: 18, fontStyle: 'italic', color: LABEL,
                }}>No gifts yet — add one above.</div>
              )}
            </div>
          </>
        )}
      </div>

      <ConfirmModal
        open={!!pendingDelete}
        title="Delete this gift?"
        body={pendingDelete?.title}
        confirmLabel="Delete"
        destructive={true}
        onConfirm={() => performDelete(pendingDelete)}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
