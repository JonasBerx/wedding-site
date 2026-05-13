import React, { useEffect } from 'react';

export default function PhotoLightbox({ items, index, onClose, onNav, t, fonts }) {
  useEffect(() => {
    function key(e) {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') onNav(-1);
      if (e.key === 'ArrowRight') onNav(1);
    }
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [onClose, onNav]);

  if (index == null || !items[index]) return null;
  const it = items[index];
  const hasPrev = index > 0;
  const hasNext = index < items.length - 1;

  // Use the paper palette if provided (themed inside PhotosPage); fall back to neutral.
  const paper = t?.paper || '#fbf5ea';
  const accent = t?.accent || '#b85c4a';
  const labelFont = fonts?.label || '"EB Garamond", serif';
  const scriptFont = fonts?.script || '"Caveat", cursive';

  const navButton = {
    background: 'transparent', color: paper,
    border: `1px solid ${paper}66`,
    width: 44, height: 44, borderRadius: '50%',
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 20, transition: 'background .2s, border-color .2s',
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(20, 14, 8, 0.92)',
        backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000, padding: 24,
      }}
    >
      {/* Top bar */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0,
        padding: '18px 22px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        fontFamily: labelFont, fontSize: 11, letterSpacing: '0.32em',
        textTransform: 'uppercase', color: `${paper}cc`,
      }}>
        <span>{index + 1} / {items.length}</span>
        <button
          onClick={(e) => { e.stopPropagation(); onClose(); }}
          aria-label="Close"
          style={{
            background: 'transparent', color: paper,
            border: `1px solid ${paper}66`,
            padding: '6px 16px',
            fontFamily: labelFont, fontSize: 11, letterSpacing: '0.32em',
            textTransform: 'uppercase', cursor: 'pointer',
            borderRadius: 0,
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = `${paper}1a`; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
        >
          Close
        </button>
      </div>

      {/* Prev / next */}
      {hasPrev && (
        <button
          onClick={(e) => { e.stopPropagation(); onNav(-1); }}
          aria-label="Previous"
          style={{ ...navButton, position: 'fixed', left: 18, top: '50%', transform: 'translateY(-50%)' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = `${paper}1a`; e.currentTarget.style.borderColor = paper; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = `${paper}66`; }}
        >
          ‹
        </button>
      )}
      {hasNext && (
        <button
          onClick={(e) => { e.stopPropagation(); onNav(1); }}
          aria-label="Next"
          style={{ ...navButton, position: 'fixed', right: 18, top: '50%', transform: 'translateY(-50%)' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = `${paper}1a`; e.currentTarget.style.borderColor = paper; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = `${paper}66`; }}
        >
          ›
        </button>
      )}

      {/* Image + caption */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '92vw', maxHeight: '92vh',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
        }}
      >
        <div style={{
          background: paper, padding: 12,
          boxShadow: '0 24px 60px rgba(0,0,0,0.45)',
        }}>
          {it.media_type === 'video' ? (
            <video
              src={it.media_url} controls autoPlay
              style={{ maxWidth: 'min(86vw, 1100px)', maxHeight: '74vh', display: 'block' }}
            />
          ) : (
            <img
              src={it.media_url} alt={it.caption || ''}
              style={{ maxWidth: 'min(86vw, 1100px)', maxHeight: '74vh', objectFit: 'contain', display: 'block' }}
            />
          )}
        </div>

        {(it.caption || it.uploader_name) && (
          <div style={{
            marginTop: 18, textAlign: 'center',
            color: paper, maxWidth: 'min(86vw, 600px)',
          }}>
            {it.caption && (
              <div style={{
                fontFamily: scriptFont, fontSize: 26, lineHeight: 1.2,
                color: paper, transform: 'rotate(-0.6deg)', display: 'inline-block',
              }}>
                {it.caption}
              </div>
            )}
            {it.uploader_name && (
              <div style={{
                marginTop: it.caption ? 10 : 0,
                fontFamily: labelFont, fontSize: 11, letterSpacing: '0.32em',
                textTransform: 'uppercase', color: `${paper}aa`,
              }}>
                — {it.uploader_name}
              </div>
            )}
          </div>
        )}
        {/* Faint accent underline for caption */}
        {it.caption && (
          <div style={{
            width: 60, height: 1, background: `${accent}99`, marginTop: 14, opacity: 0.8,
          }} />
        )}
      </div>
    </div>
  );
}
