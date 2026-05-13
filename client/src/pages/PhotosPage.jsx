import React, { useEffect, useRef, useState, useCallback } from 'react';
import PhotoUploader from '../components/PhotoUploader';
import PhotoCard from '../components/PhotoCard';
import PhotoLightbox from '../components/PhotoLightbox';

const ROTATIONS = [-3, 2, -1, 4, -2, 3, -4, 1];

export default function PhotosPage() {
  const [authed, setAuthed] = useState(false);
  const [pwInput, setPwInput] = useState('');
  const [error, setError] = useState(null);
  const [items, setItems] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [loading, setLoading] = useState(false);
  const [lightboxIdx, setLightboxIdx] = useState(null);
  const triedAutoUnlock = useRef(false);

  const submitPassword = useCallback(async (password) => {
    setError(null);
    try {
      const r = await fetch('/api/photos/session', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (r.status === 204) { setAuthed(true); return true; }
      setError('Wrong password');
      return false;
    } catch (e) {
      setError('Network error');
      return false;
    }
  }, []);

  useEffect(() => {
    if (triedAutoUnlock.current) return;
    triedAutoUnlock.current = true;
    const params = new URLSearchParams(window.location.search);
    const k = params.get('k');
    if (k) {
      submitPassword(k).then((ok) => {
        if (ok) {
          params.delete('k');
          const next = window.location.pathname + (params.toString() ? `?${params}` : '');
          window.history.replaceState({}, '', next);
        }
      });
    }
  }, [submitPassword]);

  const fetchPage = useCallback(async (curs) => {
    setLoading(true);
    try {
      const url = curs ? `/api/photos?limit=30&cursor=${encodeURIComponent(curs)}` : '/api/photos?limit=30';
      const r = await fetch(url);
      const data = await r.json();
      setItems((prev) => curs ? [...prev, ...data.items] : data.items);
      setCursor(data.next_cursor);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchPage(null); }, [fetchPage]);

  const handleUploaded = useCallback((newOnes) => {
    if (newOnes && newOnes.length) {
      setItems((prev) => [...newOnes, ...prev]);
    }
    fetchPage(null);
  }, [fetchPage]);

  return (
    <div style={{ minHeight: '100vh', background: '#f4ecd9', padding: '40px 20px' }}>
      <header style={{ textAlign: 'center', maxWidth: 720, margin: '0 auto 32px' }}>
        <div style={{ fontFamily: 'cursive', fontSize: 22, color: '#a68a4f' }}>guest photos</div>
        <h1 style={{ fontFamily: 'serif', fontSize: 38, margin: '8px 0' }}>Show us the night</h1>
        <p style={{ color: '#5b4e3a', fontFamily: 'serif' }}>
          Snap, scan the card, add a memory. They'll show up here for everyone.
        </p>
      </header>

      {!authed ? (
        <div style={{ maxWidth: 360, margin: '40px auto', background: '#fbf7ee', padding: 24, borderRadius: 8, textAlign: 'center' }}>
          <p style={{ fontFamily: 'serif' }}>Enter the password from the card.</p>
          <form onSubmit={(e) => { e.preventDefault(); submitPassword(pwInput); }}>
            <input type="password" value={pwInput} onChange={(e) => setPwInput(e.target.value)}
              autoFocus style={{ width: '100%', padding: 10, fontFamily: 'serif' }} />
            <button type="submit" style={{ marginTop: 12, padding: '10px 24px', background: '#5a4a35', color: 'white', border: 0, cursor: 'pointer' }}>
              Unlock
            </button>
          </form>
          {error && <div style={{ color: '#a33', marginTop: 8 }}>{error}</div>}
        </div>
      ) : (
        <PhotoUploader onUploaded={handleUploaded} />
      )}

      <div style={{ marginTop: 40, display: 'flex', flexWrap: 'wrap', justifyContent: 'center', maxWidth: 1100, marginLeft: 'auto', marginRight: 'auto' }}>
        {items.map((it, i) => (
          <PhotoCard
            key={it.id}
            item={it}
            rotate={ROTATIONS[i % ROTATIONS.length]}
            onOpen={() => setLightboxIdx(i)}
          />
        ))}
      </div>

      {cursor && (
        <div style={{ textAlign: 'center', marginTop: 24 }}>
          <button onClick={() => fetchPage(cursor)} disabled={loading}
            style={{ padding: '10px 24px', background: 'transparent', border: '1px solid #5a4a35', cursor: 'pointer' }}>
            {loading ? 'Loading…' : 'Show more'}
          </button>
        </div>
      )}

      <PhotoLightbox items={items} index={lightboxIdx}
        onClose={() => setLightboxIdx(null)}
        onNav={(d) => setLightboxIdx((i) => Math.max(0, Math.min(items.length - 1, i + d)))} />
    </div>
  );
}
