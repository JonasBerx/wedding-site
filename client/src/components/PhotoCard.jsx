import React from 'react';

export default function PhotoCard({ item, onOpen, rotate }) {
  const isVideo = item.media_type === 'video';
  return (
    <button
      onClick={() => onOpen(item)}
      style={{
        all: 'unset', cursor: 'pointer', display: 'inline-block',
        background: '#fbf7ee',
        padding: 10, paddingBottom: 28,
        boxShadow: '0 6px 18px rgba(0,0,0,0.12)',
        transform: `rotate(${rotate}deg)`,
        margin: 8,
        position: 'relative',
      }}
    >
      <div style={{ width: 220, height: 220, background: '#000', overflow: 'hidden', position: 'relative' }}>
        <img
          src={item.thumb_url}
          alt={item.caption || ''}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          loading="lazy"
        />
        {isVideo && (
          <div style={{
            position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.25)', color: 'white', fontSize: 36,
          }}>▶</div>
        )}
      </div>
      <div style={{
        textAlign: 'center', marginTop: 10, fontFamily: 'serif', fontSize: 14,
        color: '#3a2d1e', maxWidth: 220, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
      }}>
        {item.caption || ' '}
      </div>
      {item.uploader_name && (
        <div style={{ textAlign: 'center', fontSize: 11, color: '#7a6a55', marginTop: 2 }}>
          — {item.uploader_name}
        </div>
      )}
    </button>
  );
}
