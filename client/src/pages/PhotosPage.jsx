import React, { useEffect, useRef, useState, useCallback } from 'react';
import { usePaletteMode } from '../PaletteShell';
import { useIsMobile } from '../shared';
import { Sprig, Wildflower } from '../botanicals';
import { FooterSection } from '../sections/Footer';
import PhotoUploader from '../components/PhotoUploader';
import PhotoCard from '../components/PhotoCard';
import PhotoLightbox from '../components/PhotoLightbox';

const ROTATIONS = [-3.2, 2.1, -1.4, 3.6, -2.6, 1.9, -3.8, 0.8, 2.7, -2.2];

export default function PhotosPage() {
  const { t, fonts } = usePaletteMode();
  const isMobile = useIsMobile();

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
      setError('That password doesn’t match the one on your card.');
      return false;
    } catch {
      setError('Network error — please try again.');
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
    <div style={{
      minHeight: '100vh', background: t.bg, color: t.ink,
      paddingBottom: 40,
      // subtle paper grain via repeating linear-gradients
      backgroundImage: `
        radial-gradient(circle at 15% 18%, ${t.accentSoft}11 0px, transparent 380px),
        radial-gradient(circle at 88% 72%, ${t.sand}1c 0px, transparent 420px)
      `,
    }}>
      {/* ── Header ─────────────────────────────────────── */}
      <header style={{
        padding: isMobile ? '54px 22px 28px' : '90px 80px 44px',
        textAlign: 'center', position: 'relative',
      }}>
        <div style={{
          display: 'flex', justifyContent: 'center', color: t.accentSoft,
          marginBottom: isMobile ? 18 : 26,
        }}>
          <Sprig size={isMobile ? 64 : 96} />
        </div>
        <div style={{
          fontFamily: fonts.label, fontSize: isMobile ? 10 : 11,
          letterSpacing: '0.42em', textTransform: 'uppercase',
          color: t.label, marginBottom: isMobile ? 14 : 18,
        }}>
          08 · 08 · 2026 — guest album
        </div>
        <h1 style={{
          fontFamily: fonts.head, fontStyle: 'italic',
          fontSize: isMobile ? 46 : 78, lineHeight: 1.02,
          color: t.ink, margin: 0, fontWeight: 400,
        }}>
          Show us the night
        </h1>
        <div style={{
          fontFamily: fonts.script, fontSize: isMobile ? 22 : 28,
          color: t.accent, marginTop: 14,
          transform: 'rotate(-1.2deg)', display: 'inline-block', lineHeight: 1,
        }}>
          the moments we missed
        </div>
        <p style={{
          fontFamily: fonts.body, fontSize: isMobile ? 16 : 18, lineHeight: 1.6,
          color: t.inkSoft, maxWidth: 520, margin: isMobile ? '22px auto 0' : '30px auto 0',
        }}>
          Snap, scan the card, slip in a memory. Everything you share lands here, scattered like polaroids on the kitchen table the morning after.
        </p>
      </header>

      {/* ── Lock card or Uploader ──────────────────────── */}
      <div style={{ padding: isMobile ? '0 20px' : '0 40px' }}>
        {!authed ? (
          <LockCard
            t={t} fonts={fonts} isMobile={isMobile}
            value={pwInput} onChange={setPwInput}
            onSubmit={(e) => { e.preventDefault(); submitPassword(pwInput); }}
            error={error}
          />
        ) : (
          <PhotoUploader t={t} fonts={fonts} isMobile={isMobile} onUploaded={handleUploaded} />
        )}
      </div>

      {/* ── Wall of polaroids ──────────────────────────── */}
      <div style={{
        marginTop: isMobile ? 46 : 70,
        padding: isMobile ? '0 8px' : '0 32px',
        position: 'relative',
      }}>
        {items.length === 0 && !loading && (
          <div style={{
            textAlign: 'center', padding: isMobile ? '40px 20px' : '80px 20px',
            fontFamily: fonts.body, fontSize: 17, color: t.inkSoft, fontStyle: 'italic',
          }}>
            <div style={{ display: 'flex', justifyContent: 'center', color: t.accentSoft, marginBottom: 18, opacity: 0.6 }}>
              <Wildflower size={isMobile ? 38 : 52} />
            </div>
            The wall is empty for now. Be the first to pin something up.
          </div>
        )}

        <div style={{
          display: 'flex', flexWrap: 'wrap',
          justifyContent: 'center', alignItems: 'flex-start',
          gap: isMobile ? 14 : 22,
          maxWidth: 1180, margin: '0 auto',
        }}>
          {items.map((it, i) => (
            <PhotoCard
              key={it.id}
              item={it}
              rotate={ROTATIONS[i % ROTATIONS.length]}
              t={t} fonts={fonts} isMobile={isMobile}
              onOpen={() => setLightboxIdx(i)}
            />
          ))}
        </div>

        {cursor && (
          <div style={{ textAlign: 'center', marginTop: 44 }}>
            <button
              onClick={() => fetchPage(cursor)}
              disabled={loading}
              style={{
                padding: isMobile ? '12px 28px' : '14px 38px',
                background: 'transparent', color: t.ink,
                border: `1px solid ${t.ink}`,
                fontFamily: fonts.label, fontSize: isMobile ? 11 : 12,
                letterSpacing: '0.32em', textTransform: 'uppercase',
                cursor: loading ? 'default' : 'pointer',
                opacity: loading ? 0.5 : 1, borderRadius: 0,
                transition: 'background .2s, color .2s',
              }}
              onMouseEnter={(e) => { if (!loading) { e.currentTarget.style.background = t.ink; e.currentTarget.style.color = t.paper; } }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = t.ink; }}
            >
              {loading ? 'Loading…' : 'Show more'}
            </button>
          </div>
        )}
      </div>

      <PhotoLightbox
        items={items}
        index={lightboxIdx}
        t={t} fonts={fonts}
        onClose={() => setLightboxIdx(null)}
        onNav={(d) => setLightboxIdx((i) => Math.max(0, Math.min(items.length - 1, i + d)))}
      />

      <FooterSection t={t} fonts={fonts} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// LockCard — styled like a sealed envelope on the paper page.
// ─────────────────────────────────────────────────────────────
function LockCard({ t, fonts, isMobile, value, onChange, onSubmit, error }) {
  return (
    <div style={{
      maxWidth: 460, margin: '20px auto 0',
      background: t.paper,
      padding: isMobile ? '32px 24px 34px' : '44px 44px 40px',
      border: `1px solid ${t.rule}`,
      boxShadow: `8px 8px 0 ${t.accentSoft}33`,
      transform: isMobile ? 'none' : 'rotate(-0.6deg)',
      position: 'relative',
    }}>
      {/* Tiny wax-seal dot */}
      <div style={{
        position: 'absolute', top: -10, left: '50%', transform: 'translateX(-50%) rotate(8deg)',
        width: 28, height: 28, borderRadius: '50%',
        background: t.accent,
        boxShadow: `inset 0 0 0 2px ${t.paper}, 0 1px 4px rgba(0,0,0,0.15)`,
      }} />

      <div style={{
        textAlign: 'center', fontFamily: fonts.label,
        fontSize: 10, letterSpacing: '0.42em', textTransform: 'uppercase',
        color: t.label, marginBottom: 12,
      }}>
        private album
      </div>
      <div style={{
        textAlign: 'center', fontFamily: fonts.head, fontStyle: 'italic',
        fontSize: isMobile ? 30 : 36, color: t.ink, lineHeight: 1.1, marginBottom: 8,
      }}>
        Sealed
      </div>
      <p style={{
        textAlign: 'center', fontFamily: fonts.body, fontSize: 15,
        color: t.inkSoft, margin: '0 0 24px', lineHeight: 1.5,
      }}>
        The password lives on your invitation card —<br />or scan the QR to skip this step.
      </p>

      <form onSubmit={onSubmit}>
        <div style={{
          fontFamily: fonts.label, fontSize: 11, letterSpacing: '0.28em',
          textTransform: 'uppercase', color: t.label, marginBottom: 6,
        }}>
          Password
        </div>
        <input
          type="password" value={value}
          onChange={(e) => onChange(e.target.value)}
          autoFocus
          style={{
            width: '100%', boxSizing: 'border-box',
            background: 'transparent', border: 'none',
            borderBottom: `1px solid ${t.rule}`,
            fontFamily: fonts.body, fontSize: 18, color: t.ink,
            padding: '10px 0 8px', outline: 'none', borderRadius: 0,
            letterSpacing: '0.2em',
          }}
          onFocus={(e) => { e.target.style.borderBottomColor = t.accent; }}
          onBlur={(e) => { e.target.style.borderBottomColor = t.rule; }}
        />
        {error && (
          <div style={{
            marginTop: 14, fontFamily: fonts.body, fontStyle: 'italic',
            fontSize: 14, color: t.accent,
          }}>
            {error}
          </div>
        )}
        <button
          type="submit"
          style={{
            marginTop: 22, width: '100%',
            padding: '14px 0', background: t.accent, color: t.paper,
            border: 'none', borderRadius: 0,
            fontFamily: fonts.label, fontSize: 12, letterSpacing: '0.36em',
            textTransform: 'uppercase', cursor: 'pointer',
            transition: 'transform .15s, box-shadow .15s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = `0 4px 0 ${t.accentSoft}66`; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
        >
          Open the album
        </button>
      </form>
    </div>
  );
}
