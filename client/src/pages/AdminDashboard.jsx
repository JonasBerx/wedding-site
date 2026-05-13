import React from 'react';
import { Sprig } from '../botanicals';
import Toast from '../components/Toast';
import ConfirmModal from '../components/ConfirmModal';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, useSortable, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

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

function GuestPhotosAdminTab({ apiFetch }) {
  const [data, setData] = React.useState({ items: [], stats: { total: 0, hidden: 0, total_bytes: 0 } });
  const [qrTarget, setQrTarget] = React.useState('');
  const [qrSvgUrl, setQrSvgUrl] = React.useState('');
  const [qrPngUrl, setQrPngUrl] = React.useState('');
  const [filter, setFilter] = React.useState('all');

  const load = React.useCallback(async () => {
    const r = await apiFetch('/api/admin/photos');
    if (r.ok) setData(await r.json());
    const t = await apiFetch('/api/admin/photos/qr-target');
    if (t.ok) { const j = await t.json(); setQrTarget(j.url); }
    const svg = await apiFetch('/api/admin/photos/qr.svg');
    if (svg.ok) setQrSvgUrl(URL.createObjectURL(await svg.blob()));
    const png = await apiFetch('/api/admin/photos/qr.png?size=1024');
    if (png.ok) setQrPngUrl(URL.createObjectURL(await png.blob()));
  }, [apiFetch]);
  React.useEffect(() => { load(); }, [load]);
  React.useEffect(() => () => {
    if (qrSvgUrl) URL.revokeObjectURL(qrSvgUrl);
    if (qrPngUrl) URL.revokeObjectURL(qrPngUrl);
  }, [qrSvgUrl, qrPngUrl]);

  async function toggleHidden(id, currentlyHidden) {
    await apiFetch(`/api/admin/photos/${id}`, null, {
      method: 'PATCH',
      body: JSON.stringify({ hidden: !currentlyHidden }),
    });
    load();
  }

  async function remove(id) {
    if (!window.confirm('Delete this photo? This cannot be undone.')) return;
    await apiFetch(`/api/admin/photos/${id}`, null, { method: 'DELETE' });
    load();
  }

  const visible = data.items.filter((i) => {
    const isHidden = i.hidden === 1 || i.hidden === true;
    if (filter === 'visible') return !isHidden;
    if (filter === 'hidden') return isHidden;
    return true;
  });

  const mb = (data.stats.total_bytes / (1024 * 1024)).toFixed(1);

  return (
    <div>
      <h2 style={{ fontFamily: HEAD_FONT, fontSize: 28, fontStyle: 'italic', color: INK, margin: '0 0 8px' }}>
        Guest Photos
      </h2>
      <div style={{ marginBottom: 20, fontFamily: LABEL_FONT, fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: LABEL }}>
        {data.stats.total} total · {data.stats.hidden} hidden · {mb} MB used
      </div>

      <details open style={{ marginBottom: 28, border: `1px solid ${RULE}`, padding: 16 }}>
        <summary style={{ cursor: 'pointer', fontFamily: LABEL_FONT, fontSize: 11, letterSpacing: '0.32em', textTransform: 'uppercase', color: INK }}>
          Print QR
        </summary>
        <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start', marginTop: 16, flexWrap: 'wrap' }}>
          {qrSvgUrl
            ? <img src={qrSvgUrl} alt="QR code" style={{ width: 180, height: 180, background: 'white', border: `1px solid ${RULE}` }} />
            : <div style={{ width: 180, height: 180, background: PAPER_DARK, border: `1px solid ${RULE}` }} />}
          <div style={{ fontFamily: BODY_FONT, fontSize: 14, color: INK }}>
            <div style={{ marginBottom: 6, fontFamily: LABEL_FONT, fontSize: 10, letterSpacing: '0.22em', textTransform: 'uppercase', color: LABEL }}>Encodes:</div>
            <code style={{ display: 'block', background: PAPER_DARK, border: `1px solid ${RULE_SOFT}`, padding: '6px 10px', wordBreak: 'break-all', fontSize: 13 }}>{qrTarget}</code>
            <div style={{ marginTop: 16, display: 'flex', gap: 12 }}>
              <a href={qrPngUrl || '#'} download="wedding-qr.png" style={{ textDecoration: 'none', pointerEvents: qrPngUrl ? 'auto' : 'none', opacity: qrPngUrl ? 1 : 0.5 }}>
                <button style={outlineButton} disabled={!qrPngUrl}>Download PNG (1024)</button>
              </a>
              <a href={qrSvgUrl || '#'} download="wedding-qr.svg" style={{ textDecoration: 'none', pointerEvents: qrSvgUrl ? 'auto' : 'none', opacity: qrSvgUrl ? 1 : 0.5 }}>
                <button style={outlineButton} disabled={!qrSvgUrl}>Download SVG</button>
              </a>
            </div>
          </div>
        </div>
      </details>

      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontFamily: LABEL_FONT, fontSize: 10, letterSpacing: '0.22em', textTransform: 'uppercase', color: LABEL }}>Filter:</span>
        {['all', 'visible', 'hidden'].map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            style={{
              ...outlineButton,
              fontWeight: filter === f ? 700 : 400,
              background: filter === f ? INK : 'transparent',
              color: filter === f ? PAPER : INK,
            }}>{f}</button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
        {visible.map((it) => {
          const isHidden = it.hidden === 1 || it.hidden === true;
          return (
            <div key={it.id} style={{ border: `1px solid ${RULE}`, padding: 8, background: isHidden ? '#fdf0ee' : PAPER }}>
              <img src={it.thumb_url} alt="" style={{ width: '100%', height: 140, objectFit: 'cover', display: 'block' }} />
              <div style={{ fontFamily: BODY_FONT, fontSize: 12, marginTop: 8, color: INK_SOFT }}>
                <div>{it.caption || <em>no caption</em>}</div>
                {it.uploader_name && <div style={{ marginTop: 2 }}>— {it.uploader_name}</div>}
                <div style={{ color: LABEL, marginTop: 2 }}>{new Date(it.uploaded_at).toLocaleString()}</div>
              </div>
              <div style={{ marginTop: 10, display: 'flex', gap: 6 }}>
                <button onClick={() => toggleHidden(it.id, isHidden)} style={outlineButton}>
                  {isHidden ? 'Show' : 'Hide'}
                </button>
                <button onClick={() => remove(it.id)} style={{ ...outlineButton, color: ACCENT, borderColor: ACCENT }}>Delete</button>
              </div>
            </div>
          );
        })}
      </div>

      {visible.length === 0 && (
        <div style={{
          padding: '40px', textAlign: 'center',
          fontFamily: HEAD_FONT, fontSize: 18, fontStyle: 'italic', color: LABEL,
        }}>No photos yet.</div>
      )}
    </div>
  );
}

function SortableMenuRow({ item, onToggleVegan, onDelete }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    background: isDragging ? PAPER_DARK : 'transparent',
  };
  return (
    <tr ref={setNodeRef} style={style}>
      <td style={{ ...tdStyle, width: 36, cursor: 'grab' }} {...attributes} {...listeners} aria-label="Reorder">⋮⋮</td>
      <td style={{ ...tdStyle, fontFamily: HEAD_FONT, fontStyle: 'italic', fontSize: 17 }}>{item.name}</td>
      <td style={{ ...tdStyle, color: INK_SOFT }}>{item.note || '—'}</td>
      <td style={tdStyle}>
        <button
          type="button"
          onClick={() => onToggleVegan(item)}
          style={{
            ...outlineButton,
            background: item.is_vegan ? ACCENT : 'transparent',
            color:      item.is_vegan ? PAPER  : INK,
            borderColor: item.is_vegan ? ACCENT : INK,
          }}
        >{item.is_vegan ? 'Vegan' : 'Mark vegan'}</button>
      </td>
      <td style={tdStyle}>{item.referenced_count}</td>
      <td style={{ ...tdStyle, width: 100 }}>
        <button
          onClick={() => onDelete(item)}
          disabled={item.referenced_count > 0}
          title={item.referenced_count > 0 ? 'An RSVP picked this' : 'Delete dish'}
          style={{
            ...outlineButton,
            cursor: item.referenced_count > 0 ? 'not-allowed' : 'pointer',
            opacity: item.referenced_count > 0 ? 0.4 : 1,
          }}
        >Delete</button>
      </td>
    </tr>
  );
}

export default function AdminDashboard() {
  const [tab, setTab] = React.useState('rsvps');
  const [user, setUser] = React.useState('');
  const [pass, setPass] = React.useState('');
  const [auth, setAuth] = React.useState(null);
  const [authError, setAuthError] = React.useState('');
  const [rsvps, setRsvps] = React.useState([]);
  const [mealCounts, setMealCounts] = React.useState([]);
  const [registry, setRegistry] = React.useState([]);
  const [newTitle, setNewTitle] = React.useState('');
  const [newDesc, setNewDesc] = React.useState('');
  const [newUnclaimable, setNewUnclaimable] = React.useState(false);
  const [addError, setAddError] = React.useState('');
  const [toast, setToast] = React.useState('');
  const [pendingDelete, setPendingDelete] = React.useState(null); // null | item
  const [menu, setMenu] = React.useState([]);
  const [pendingMenuDelete, setPendingMenuDelete] = React.useState(null);
  const [newMenu, setNewMenu] = React.useState({ course: 'first', name: '', note: '', is_vegan: false });
  const [invites, setInvites] = React.useState([]);
  const [newInvite, setNewInvite] = React.useState({ event_type: 'full', max_party_size: 2, label: '' });
  const [creatingInvite, setCreatingInvite] = React.useState(false);
  const [copyOk, setCopyOk] = React.useState(null);
  const [confirmReleaseId, setConfirmReleaseId] = React.useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = React.useState(null);

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
    const [rsvpsRes, regRes, menuRes, mealCountsRes, invitesRes] = await Promise.all([
      apiFetch('/api/admin/rsvps', creds),
      apiFetch('/api/admin/registry', creds),
      apiFetch('/api/admin/menu', creds),
      apiFetch('/api/admin/meal-counts', creds),
      apiFetch('/api/admin/invites', creds),
    ]);
    if (rsvpsRes.status === 401) {
      setAuth(null);
      setAuthError('Session expired. Please log in again.');
      return;
    }
    setRsvps(await rsvpsRes.json());
    setRegistry(await regRes.json());
    setMenu(await menuRes.json());
    setMealCounts(mealCountsRes.ok ? await mealCountsRes.json() : []);
    if (invitesRes.ok) {
      const body = await invitesRes.json();
      setInvites(body.invites || []);
    }
  }

  async function handleInviteCreate(e) {
    e.preventDefault();
    setCreatingInvite(true);
    try {
      const res = await apiFetch('/api/admin/invites', null, {
        method: 'POST',
        body: JSON.stringify({
          event_type: newInvite.event_type,
          max_party_size: Number(newInvite.max_party_size),
          label: newInvite.label.trim() || null,
        }),
      });
      if (!res.ok) {
        setToast('Could not create invite.');
        return;
      }
      const body = await res.json();
      setInvites(prev => [body, ...prev]);
      setNewInvite({ event_type: 'full', max_party_size: 2, label: '' });
    } finally {
      setCreatingInvite(false);
    }
  }

  async function handleInviteCopy(inv) {
    try {
      await navigator.clipboard.writeText(inv.url);
      setCopyOk(inv.id);
      setTimeout(() => setCopyOk(prev => (prev === inv.id ? null : prev)), 1500);
    } catch {
      setToast('Clipboard copy failed.');
    }
  }

  async function handleInviteRelease(id) {
    setConfirmReleaseId(null);
    const res = await apiFetch(`/api/admin/invites/${id}/release`, null, { method: 'POST' });
    if (!res.ok) {
      setToast('Release failed.');
      return;
    }
    const body = await res.json();
    setInvites(prev => prev.map(it => (it.id === id ? body.invite : it)));
    await loadData();
    if (body.released_gift) {
      setToast(`Released registry item: ${body.released_gift.title}`);
    } else {
      setToast('Invite released.');
    }
  }

  async function handleInviteDelete(id) {
    setConfirmDeleteId(null);
    const res = await apiFetch(`/api/admin/invites/${id}`, null, { method: 'DELETE' });
    if (!res.ok) {
      setToast('Delete failed.');
      return;
    }
    setInvites(prev => prev.filter(it => it.id !== id));
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
      body: JSON.stringify({
        title: newTitle,
        description: newDesc || null,
        unclaimable: !!newUnclaimable,
      }),
    });
    if (!res.ok) {
      try { setAddError((await res.json()).error || 'Failed to add gift.'); }
      catch { setAddError('Failed to add gift.'); }
      return;
    }
    setNewTitle('');
    setNewDesc('');
    setNewUnclaimable(false);
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

  async function handleMenuAdd(e) {
    e.preventDefault();
    if (!newMenu.name.trim()) return;
    const res = await apiFetch('/api/admin/menu', null, {
      method: 'POST',
      body: JSON.stringify({
        course: newMenu.course,
        name: newMenu.name.trim(),
        note: newMenu.note.trim() || null,
        is_vegan: !!newMenu.is_vegan,
      }),
    });
    if (!res.ok) { setToast('Could not add menu item.'); return; }
    setNewMenu({ course: newMenu.course, name: '', note: '', is_vegan: false });
    await loadData();
  }

  async function handleMenuToggleVegan(item) {
    const res = await apiFetch(`/api/admin/menu/${item.id}`, null, {
      method: 'PATCH',
      body: JSON.stringify({ is_vegan: !item.is_vegan }),
    });
    if (!res.ok) { setToast('Could not update item.'); return; }
    await loadData();
  }

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  async function handleMenuDragEnd(course, event) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const list = menu.filter(i => i.course === course);
    const oldIndex = list.findIndex(i => i.id === active.id);
    const newIndex = list.findIndex(i => i.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const reordered = arrayMove(list, oldIndex, newIndex);
    // Optimistic local update
    setMenu(prev => {
      const others = prev.filter(i => i.course !== course);
      return [...others, ...reordered];
    });
    const ordered_ids = reordered.map(i => i.id);
    const res = await apiFetch('/api/admin/menu/reorder', null, {
      method: 'POST',
      body: JSON.stringify({ course, ordered_ids }),
    });
    if (!res.ok) {
      setToast('Reorder failed — refreshing.');
      await loadData();
    }
  }

  async function performMenuDelete(item) {
    const res = await apiFetch(`/api/admin/menu/${item.id}`, null, { method: 'DELETE' });
    setPendingMenuDelete(null);
    if (res.status === 409) { setToast('Cannot delete — at least one RSVP picked this dish.'); return; }
    if (!res.ok) { setToast('Could not delete the item.'); return; }
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

      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '40px 16px' }}>
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

        <div style={{ borderBottom: `1px solid ${RULE}`, marginBottom: 28, display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          {[
            { key: 'rsvps',    label: `RSVPS · ${rsvps.length}` },
            { key: 'registry', label: `REGISTRY · ${registry.length}` },
            { key: 'menu',     label: `MENU · ${menu.length}` },
            { key: 'invites',  label: `INVITES · ${invites.length}` },
            { key: 'photos',   label: 'PHOTOS' },
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
          <>
            <div style={{ border: `1px solid ${RULE}`, overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {['ID','Name','Email','Attending','Event','# Attendees','Party note','Submitted'].map(h => (
                      <th key={h} style={thStyle}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rsvps.map(r => (
                    <React.Fragment key={r.id}>
                      <tr>
                        <td style={tdStyle}>{r.id}</td>
                        <td style={tdStyle}>{r.name}</td>
                        <td style={tdStyle}>{r.email}</td>
                        <td style={tdStyle}>{r.attending ? 'Yes' : 'No'}</td>
                        <td style={tdStyle}>
                          {r.event_type === 'full' ? 'Full day'
                            : r.event_type === 'ceremony_party' ? 'Ceremony / Evening'
                            : '—'}
                        </td>
                        <td style={tdStyle}>{(r.attendees || []).length}</td>
                        <td style={tdStyle}>{r.dietary_restrictions || '—'}</td>
                        <td style={{ ...tdStyle, color: INK_SOFT }}>{r.submitted_at}</td>
                      </tr>
                      {(r.attendees || []).length > 0 && (
                        <tr>
                          <td colSpan={8} style={{ ...tdStyle, background: PAPER_DARK, paddingLeft: 36 }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                              <thead>
                                <tr>
                                  {['#','Name','First','Main','Dietary'].map(h => (
                                    <th key={h} style={{ ...thStyle, background: 'transparent' }}>{h}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {r.attendees.map(a => (
                                  <tr key={a.position}>
                                    <td style={tdStyle}>{a.position}</td>
                                    <td style={tdStyle}>{a.name}</td>
                                    <td style={tdStyle}>{a.first_course_name || '—'}</td>
                                    <td style={tdStyle}>{a.main_course_name  || '—'}</td>
                                    <td style={tdStyle}>{a.dietary_restrictions || '—'}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
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

            <div style={{ marginTop: 36 }}>
              <h2 style={{
                fontFamily: HEAD_FONT, fontSize: 22, color: INK,
                margin: '0 0 16px', fontStyle: 'italic',
              }}>Meal totals</h2>
              <div style={{ border: `1px solid ${RULE}`, overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      {['Course','Dish','Count'].map(h => (
                        <th key={h} style={thStyle}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {mealCounts.map(c => (
                      <tr key={`${c.course}:${c.menu_item_id}`}>
                        <td style={tdStyle}>{c.course === 'first' ? 'First' : 'Main'}</td>
                        <td style={tdStyle}>{c.name}</td>
                        <td style={tdStyle}>{c.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {mealCounts.length === 0 && (
                  <div style={{
                    padding: 24, textAlign: 'center',
                    fontFamily: HEAD_FONT, fontStyle: 'italic', color: LABEL,
                  }}>No meal choices yet.</div>
                )}
              </div>
            </div>
          </>
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
              <label style={{
                display: 'flex', alignItems: 'center', gap: 8,
                fontFamily: BODY_FONT, fontSize: 14, color: INK,
              }}>
                <input type="checkbox" checked={newUnclaimable}
                  onChange={e => setNewUnclaimable(e.target.checked)} />
                Universal (no claim)
              </label>
              <button type="submit" style={primaryButton}>Add gift</button>
            </form>
            {addError && <div style={{ color: ACCENT, fontSize: 14, marginBottom: 16 }}>{addError}</div>}

            <div style={{ border: `1px solid ${RULE}` }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {['Title','Description','Universal','Claimed by',''].map(h => (
                      <th key={h} style={thStyle}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {registry.map(item => (
                    <tr key={item.id}>
                      <td style={{ ...tdStyle, fontFamily: HEAD_FONT, fontStyle: 'italic', fontSize: 17 }}>{item.title}</td>
                      <td style={{ ...tdStyle, color: INK_SOFT }}>{item.description || '—'}</td>
                      <td style={tdStyle}>{item.unclaimable === 1 ? 'Yes' : '—'}</td>
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

        {tab === 'menu' && (
          <>
            <form
              onSubmit={handleMenuAdd}
              style={{
                border: `1px solid ${RULE}`, padding: 24, marginBottom: 24,
                display: 'flex', gap: 16, alignItems: 'flex-end', flexWrap: 'wrap',
              }}
            >
              <div style={{ flex: '0 0 120px' }}>
                <label style={labelStyle}>Course</label>
                <select
                  value={newMenu.course}
                  onChange={e => setNewMenu({ ...newMenu, course: e.target.value })}
                  style={inputStyle}
                >
                  <option value="first">First</option>
                  <option value="main">Main</option>
                </select>
              </div>
              <div style={{ flex: '1 1 200px' }}>
                <label style={labelStyle}>Name</label>
                <input value={newMenu.name} onChange={e => setNewMenu({ ...newMenu, name: e.target.value })} required style={inputStyle} />
              </div>
              <div style={{ flex: '2 1 240px' }}>
                <label style={labelStyle}>Note (optional)</label>
                <input value={newMenu.note} onChange={e => setNewMenu({ ...newMenu, note: e.target.value })} style={inputStyle} />
              </div>
              <label style={{
                display: 'flex', alignItems: 'center', gap: 8,
                fontFamily: BODY_FONT, fontSize: 14, color: INK,
              }}>
                <input type="checkbox" checked={newMenu.is_vegan}
                  onChange={e => setNewMenu({ ...newMenu, is_vegan: e.target.checked })} />
                Vegan
              </label>
              <button type="submit" style={primaryButton}>Add dish</button>
            </form>

            {['first', 'main'].map(course => {
              const list = menu.filter(i => i.course === course);
              return (
                <div key={course} style={{ marginBottom: 24 }}>
                  <div style={{
                    fontFamily: LABEL_FONT, fontSize: 11, letterSpacing: '0.32em',
                    textTransform: 'uppercase', color: LABEL, marginBottom: 8,
                  }}>{course} course · {list.length}</div>
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={(e) => handleMenuDragEnd(course, e)}
                  >
                    <SortableContext items={list.map(i => i.id)} strategy={verticalListSortingStrategy}>
                      <div style={{ border: `1px solid ${RULE}` }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                          <thead>
                            <tr>
                              {['','Name','Note','Vegan','RSVPs',''].map((h, i) => (
                                <th key={i} style={thStyle}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {list.map(item => (
                              <SortableMenuRow
                                key={item.id}
                                item={item}
                                onToggleVegan={handleMenuToggleVegan}
                                onDelete={(it) => setPendingMenuDelete(it)}
                              />
                            ))}
                          </tbody>
                        </table>
                        {list.length === 0 && (
                          <div style={{
                            padding: '24px', textAlign: 'center',
                            fontFamily: HEAD_FONT, fontSize: 16, fontStyle: 'italic', color: LABEL,
                          }}>No {course} courses yet.</div>
                        )}
                      </div>
                    </SortableContext>
                  </DndContext>
                </div>
              );
            })}
          </>
        )}

        {tab === 'invites' && (
          <>
            <form
              onSubmit={handleInviteCreate}
              style={{
                border: `1px solid ${RULE}`, padding: 24, marginBottom: 24,
                display: 'flex', gap: 16, alignItems: 'flex-end', flexWrap: 'wrap',
              }}
            >
              <div style={{ flex: '0 0 180px' }}>
                <label style={labelStyle}>Event type</label>
                <select
                  value={newInvite.event_type}
                  onChange={e => setNewInvite(s => ({ ...s, event_type: e.target.value }))}
                  style={inputStyle}
                >
                  <option value="full">Full day</option>
                  <option value="ceremony_party">Ceremony &amp; evening</option>
                </select>
              </div>
              <div style={{ flex: '0 0 100px' }}>
                <label style={labelStyle}>Max party</label>
                <select
                  value={newInvite.max_party_size}
                  onChange={e => setNewInvite(s => ({ ...s, max_party_size: e.target.value }))}
                  style={inputStyle}
                >
                  {[1,2,3,4,5,6].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <div style={{ flex: '1 1 200px' }}>
                <label style={labelStyle}>Label (optional)</label>
                <input
                  type="text"
                  value={newInvite.label}
                  maxLength={120}
                  onChange={e => setNewInvite(s => ({ ...s, label: e.target.value }))}
                  style={inputStyle}
                />
              </div>
              <button type="submit" style={primaryButton} disabled={creatingInvite}>
                {creatingInvite ? 'Creating…' : '+ New invite'}
              </button>
            </form>

            <div style={{ border: `1px solid ${RULE}`, overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {['Label','Type','Cap','Status','Linked RSVP','Link','Actions'].map(h => (
                      <th key={h} style={thStyle}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {invites.map(inv => (
                    <tr key={inv.id}>
                      <td style={tdStyle}>{inv.label || '—'}</td>
                      <td style={tdStyle}>{inv.event_type === 'full' ? 'Full day' : 'Ceremony / Evening'}</td>
                      <td style={tdStyle}>{inv.max_party_size}</td>
                      <td style={tdStyle}>{inv.status}</td>
                      <td style={tdStyle}>
                        {inv.rsvp_email
                          ? `${inv.rsvp_email} (${inv.rsvp_attending ? 'Yes' : 'No'}, ${inv.rsvp_party_size} ppl)`
                          : '—'}
                      </td>
                      <td style={tdStyle}>
                        <button type="button" style={outlineButton} onClick={() => handleInviteCopy(inv)}>
                          {copyOk === inv.id ? 'Copied!' : 'Copy'}
                        </button>
                      </td>
                      <td style={{ ...tdStyle, width: 120 }}>
                        {inv.status === 'open' && (
                          <button type="button" style={outlineButton} onClick={() => setConfirmDeleteId(inv.id)}>Delete</button>
                        )}
                        {inv.status === 'consumed' && (
                          <button type="button" style={outlineButton} onClick={() => setConfirmReleaseId(inv.id)}>Release</button>
                        )}
                        {inv.status === 'released' && (
                          <span style={{
                            fontFamily: LABEL_FONT, fontSize: 10, letterSpacing: '0.18em',
                            textTransform: 'uppercase', color: LABEL,
                          }}>Released</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {invites.length === 0 && (
                <div style={{
                  padding: '40px', textAlign: 'center',
                  fontFamily: HEAD_FONT, fontSize: 18, fontStyle: 'italic', color: LABEL,
                }}>No invites yet — create one above.</div>
              )}
            </div>
          </>
        )}

        {tab === 'photos' && (
          <GuestPhotosAdminTab apiFetch={apiFetch} />
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
      <ConfirmModal
        open={!!pendingMenuDelete}
        title="Delete this dish?"
        body={pendingMenuDelete?.name}
        confirmLabel="Delete"
        destructive={true}
        onConfirm={() => performMenuDelete(pendingMenuDelete)}
        onCancel={() => setPendingMenuDelete(null)}
      />
      <ConfirmModal
        open={confirmDeleteId != null}
        title="Delete this invite?"
        body="This unused invite link will be permanently deleted."
        confirmLabel="Delete"
        destructive={true}
        onConfirm={() => handleInviteDelete(confirmDeleteId)}
        onCancel={() => setConfirmDeleteId(null)}
      />
      <ConfirmModal
        open={confirmReleaseId != null}
        title="Release this invite?"
        body="This will delete the household's RSVP (including any meal choices and registry claims). Continue?"
        confirmLabel="Release"
        destructive={true}
        onConfirm={() => handleInviteRelease(confirmReleaseId)}
        onCancel={() => setConfirmReleaseId(null)}
      />
    </div>
  );
}
