import React, { useEffect } from 'react';

export default function PhotoLightbox({ items, index, onClose, onNav }) {
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
  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: '92vw', maxHeight: '92vh' }}>
        {it.media_type === 'video'
          ? <video src={it.media_url} controls autoPlay style={{ maxWidth: '92vw', maxHeight: '85vh' }} />
          : <img src={it.media_url} alt={it.caption || ''} style={{ maxWidth: '92vw', maxHeight: '85vh', objectFit: 'contain' }} />}
        {(it.caption || it.uploader_name) && (
          <div style={{ color: 'white', textAlign: 'center', marginTop: 12, fontFamily: 'serif' }}>
            {it.caption} {it.uploader_name && <span style={{ opacity: 0.7 }}>— {it.uploader_name}</span>}
          </div>
        )}
      </div>
      <button onClick={onClose} aria-label="Close"
        style={{ position: 'fixed', top: 16, right: 16, background: 'transparent', color: 'white', border: '1px solid white', padding: '4px 10px', cursor: 'pointer' }}>
        Close
      </button>
    </div>
  );
}
