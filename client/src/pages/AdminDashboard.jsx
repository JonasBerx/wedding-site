import React from 'react';

function b64(user, pass) {
  return btoa(`${user}:${pass}`);
}

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
    setRsvps(await res.json());
    const regRes = await apiFetch('/api/admin/registry', creds);
    setRegistry(await regRes.json());
  }

  async function handleAdd(e) {
    e.preventDefault();
    setAddError('');
    const res = await apiFetch('/api/admin/registry', null, {
      method: 'POST',
      body: JSON.stringify({ title: newTitle, description: newDesc || null }),
    });
    if (!res.ok) {
      try {
        const data = await res.json();
        setAddError(data.error || 'Failed to add gift.');
      } catch {
        setAddError('Failed to add gift.');
      }
      return;
    }
    setNewTitle('');
    setNewDesc('');
    await loadData();
  }

  async function handleDelete(id) {
    const res = await apiFetch(`/api/admin/registry/${id}`, null, { method: 'DELETE' });
    if (res.status === 409) {
      alert('Cannot delete: release the claim first.');
      return;
    }
    await loadData();
  }

  const th = { textAlign: 'left', padding: '8px 10px', borderBottom: '2px solid #ccc', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', background: '#f5f5f5' };
  const td = { padding: '8px 10px', borderBottom: '1px solid #eee', fontSize: 14, verticalAlign: 'top' };

  if (!auth) {
    return (
      <div style={{ maxWidth: 380, margin: '80px auto', padding: '0 24px', fontFamily: 'sans-serif' }}>
        <h1 style={{ marginBottom: 24 }}>Admin</h1>
        {authError && <p style={{ color: '#a00', marginBottom: 16 }}>{authError}</p>}
        <form onSubmit={handleLogin}>
          <input placeholder="Username" value={user} onChange={e => setUser(e.target.value)} required style={{ display: 'block', width: '100%', padding: 8, marginBottom: 10, boxSizing: 'border-box', fontSize: 15 }} />
          <input type="password" placeholder="Password" value={pass} onChange={e => setPass(e.target.value)} required style={{ display: 'block', width: '100%', padding: 8, marginBottom: 16, boxSizing: 'border-box', fontSize: 15 }} />
          <button type="submit" style={{ padding: '9px 24px', fontSize: 14, cursor: 'pointer' }}>Log in</button>
        </form>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 960, margin: '40px auto', padding: '0 24px', fontFamily: 'sans-serif' }}>
      <h1 style={{ marginBottom: 20 }}>Admin</h1>
      <div style={{ marginBottom: 24, borderBottom: '2px solid #eee', paddingBottom: 0 }}>
        {['rsvps', 'registry'].map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{ marginRight: 4, padding: '8px 20px', cursor: 'pointer', border: 'none', borderBottom: tab === t ? '2px solid #333' : '2px solid transparent', background: 'none', fontWeight: tab === t ? 700 : 400, fontSize: 14, textTransform: 'capitalize' }}
          >
            {t === 'rsvps' ? `RSVPs (${rsvps.length})` : `Registry (${registry.length})`}
          </button>
        ))}
      </div>

      {tab === 'rsvps' && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['ID','Name','Email','Attending','Event','Vegan','Meal','Dietary','Submitted'].map(h => (
                  <th key={h} style={th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rsvps.map(r => (
                <tr key={r.id}>
                  <td style={td}>{r.id}</td>
                  <td style={td}>{r.name}</td>
                  <td style={td}>{r.email}</td>
                  <td style={td}>{r.attending ? 'Yes' : 'No'}</td>
                  <td style={td}>{r.event_type === 'full' ? 'Full day' : r.event_type === 'ceremony_party' ? 'Ceremony / Evening' : '—'}</td>
                  <td style={td}>{r.is_vegan === 1 ? 'Yes' : '—'}</td>
                  <td style={td}>{r.meal_preference === 1 ? 'Veggie' : r.meal_preference === 2 ? 'Meat' : '—'}</td>
                  <td style={td}>{r.dietary_restrictions || '—'}</td>
                  <td style={td}>{r.submitted_at}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {rsvps.length === 0 && <p style={{ opacity: 0.5, marginTop: 16 }}>No RSVPs yet.</p>}
        </div>
      )}

      {tab === 'registry' && (
        <>
          <form onSubmit={handleAdd} style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
            <input
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              placeholder="Gift title (required)"
              required
              style={{ flex: '1 1 200px', padding: '8px 10px', fontSize: 14 }}
            />
            <input
              value={newDesc}
              onChange={e => setNewDesc(e.target.value)}
              placeholder="Description (optional)"
              style={{ flex: '2 1 280px', padding: '8px 10px', fontSize: 14 }}
            />
            <button type="submit" style={{ padding: '8px 20px', cursor: 'pointer', fontSize: 14 }}>Add gift</button>
          </form>
          {addError && <p style={{ color: '#a00', marginBottom: 12 }}>{addError}</p>}
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 8 }}>
            <thead>
              <tr>
                {['Title','Description','Claimed by',''].map(h => (
                  <th key={h} style={th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {registry.map(item => (
                <tr key={item.id}>
                  <td style={td}>{item.title}</td>
                  <td style={td}>{item.description || '—'}</td>
                  <td style={td}>{item.claimer_name || '—'}</td>
                  <td style={{ ...td, width: 100 }}>
                    <button
                      onClick={() => handleDelete(item.id)}
                      disabled={!!item.claimer_name}
                      title={item.claimer_name ? 'Release claim first' : 'Delete gift'}
                      style={{ cursor: item.claimer_name ? 'not-allowed' : 'pointer', opacity: item.claimer_name ? 0.4 : 1, padding: '4px 12px', fontSize: 13 }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {registry.length === 0 && <p style={{ opacity: 0.5, marginTop: 16 }}>No gifts yet. Add one above.</p>}
        </>
      )}
    </div>
  );
}
