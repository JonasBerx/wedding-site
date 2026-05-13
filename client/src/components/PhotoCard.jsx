import React from 'react';

// Polaroid-style card. Tape strip at the top, paper-cream body, caption + uploader.
export default function PhotoCard({ item, onOpen, rotate, t, fonts, isMobile }) {
  const isVideo = item.media_type === 'video';
  const size = isMobile ? 168 : 220;

  const [hover, setHover] = React.useState(false);
  const restRotate = rotate || 0;
  const liftRotate = hover ? 0 : restRotate;

  return (
    <button
      onClick={() => onOpen(item)}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        all: 'unset', cursor: 'pointer', display: 'inline-block',
        background: t.paper,
        padding: isMobile ? 8 : 12,
        paddingBottom: isMobile ? 26 : 36,
        boxShadow: hover
          ? `0 14px 30px rgba(46, 34, 24, 0.25)`
          : `0 6px 18px rgba(46, 34, 24, 0.14)`,
        transform: `rotate(${liftRotate}deg) translateY(${hover ? -4 : 0}px)`,
        transition: 'transform 0.28s cubic-bezier(.2,.7,.2,1), box-shadow 0.28s',
        margin: isMobile ? 4 : 8,
        position: 'relative',
      }}
    >
      {/* Strip of tape at top */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          top: -8,
          left: '50%',
          transform: `translateX(-50%) rotate(${-restRotate * 0.7}deg)`,
          width: isMobile ? 56 : 72,
          height: isMobile ? 14 : 18,
          background: `${t.accentSoft}cc`,
          opacity: 0.7,
          mixBlendMode: 'multiply',
          borderRadius: 1,
        }}
      />

      {/* Image */}
      <div style={{
        width: size, height: size,
        background: t.ink, overflow: 'hidden', position: 'relative',
      }}>
        <img
          src={item.thumb_url}
          alt={item.caption || ''}
          style={{
            width: '100%', height: '100%',
            objectFit: 'cover', display: 'block',
            filter: hover ? 'none' : 'saturate(0.96)',
            transition: 'filter 0.4s, transform 0.6s',
            transform: hover ? 'scale(1.04)' : 'scale(1)',
          }}
          loading="lazy"
        />
        {isVideo && (
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(46, 34, 24, 0.32)',
            color: t.paper, fontSize: 34,
            textShadow: '0 2px 8px rgba(0,0,0,0.4)',
          }}>
            ▶
          </div>
        )}
      </div>

      {/* Caption (handwritten) */}
      <div style={{
        textAlign: 'center', marginTop: isMobile ? 10 : 14,
        fontFamily: fonts.script, fontSize: isMobile ? 17 : 20,
        color: t.ink, lineHeight: 1.15,
        maxWidth: size, overflow: 'hidden',
        whiteSpace: 'nowrap', textOverflow: 'ellipsis',
        padding: '0 4px',
        transform: 'rotate(-0.4deg)',
      }}>
        {item.caption || ' '}
      </div>
      {item.uploader_name && (
        <div style={{
          textAlign: 'center',
          fontFamily: fonts.label, fontSize: 10, letterSpacing: '0.24em',
          textTransform: 'uppercase',
          color: t.label, marginTop: 4,
        }}>
          — {item.uploader_name}
        </div>
      )}
    </button>
  );
}
