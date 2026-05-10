import React from 'react';
import firstDate from './assets/gallery/first-date.jpeg';
import firstPeru from './assets/gallery/first-peru.jpeg';
import firstSerbia from './assets/gallery/first-serbia.jpeg';
import firstWedding from './assets/gallery/first-wedding.jpeg';
import proposalImg from './assets/gallery/proposal.jpeg';
import secondSerbia from './assets/gallery/second-serbia.jpeg';

// Shared building blocks for both wedding-website variations.
// Hooks: useCountdown · useTweaks-aware mode (light/dark) · usePalette
// Components: Countdown display · RSVP form
// Both variations import these so the underlying behavior stays consistent
// while presentation diverges.

const WEDDING_DATE = new Date('2026-08-08T15:00:00+02:00');

const WEDDING_FONTS = {
  head:   '"DM Serif Display", serif',
  body:   '"EB Garamond", Georgia, serif',
  script: '"Caveat", cursive',
  label:  '"EB Garamond", serif',
};

function useIsMobile(breakpoint = 768) {
  const query = `(max-width: ${breakpoint}px)`;
  const [isMobile, setIsMobile] = React.useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(query).matches;
  });
  React.useEffect(() => {
    const mq = window.matchMedia(query);
    const handler = (e) => setIsMobile(e.matches);
    mq.addEventListener ? mq.addEventListener('change', handler) : mq.addListener(handler);
    return () => {
      mq.removeEventListener ? mq.removeEventListener('change', handler) : mq.removeListener(handler);
    };
  }, [query]);
  return isMobile;
}

function useCountdown(target) {
  const [now, setNow] = React.useState(() => new Date());
  React.useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  const diff = Math.max(0, target.getTime() - now.getTime());
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);
  return { days, hours, minutes, seconds };
}

// Two palette presets — golden hour (warm cream, terracotta accents) and
// evening (deep walnut bg, warm gold + cream type). Both keep the same
// chroma family so the artwork reads as the same wedding under different
// light, not two different brands.
const PALETTES = {
  day: {
    bg: '#f5ecdc',
    paper: '#fbf5ea',
    ink: '#2e2218',
    inkSoft: '#5a4a3a',
    accent: '#b85c4a',
    accentSoft: '#d9a98e',
    sand: '#d9c19a',
    rule: 'rgba(46, 34, 24, 0.18)',
    label: '#7a5a3e',
  },
  night: {
    bg: '#1f1812',
    paper: '#28201a',
    ink: '#f1e6d3',
    inkSoft: '#cdb89a',
    accent: '#d99a6c',
    accentSoft: '#a36d52',
    sand: '#8a7152',
    rule: 'rgba(241, 230, 211, 0.18)',
    label: '#cdb89a',
  },
};

const usePalette = (mode) => PALETTES[mode] || PALETTES.day;

// ─────────────────────────────────────────────────────────────
// CountdownBlock — minimal four-cell number row, takes a font family +
// label style from props so each variation can theme it.
// ─────────────────────────────────────────────────────────────
function CountdownBlock({ font, labelFont, color, accent, separator = '·' }) {
  const { days, hours, minutes, seconds } = useCountdown(WEDDING_DATE);
  const isMobile = useIsMobile();
  const cells = [
    [days, 'days'], [hours, 'hours'], [minutes, 'minutes'], [seconds, 'seconds'],
  ];
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start',
      gap: isMobile ? 10 : 28, justifyContent: 'center',
      flexWrap: 'nowrap',
    }}>
      {cells.map(([n, label], i) => (
        <React.Fragment key={label}>
          <div style={{ textAlign: 'center', minWidth: isMobile ? 0 : 80, flex: isMobile ? '1 1 0' : 'none' }}>
            <div style={{
              fontFamily: font, fontSize: isMobile ? 38 : 64, lineHeight: 1, color,
              fontVariantNumeric: 'tabular-nums', fontWeight: 400,
            }}>{String(n).padStart(2, '0')}</div>
            <div style={{
              fontFamily: labelFont, fontSize: isMobile ? 10 : 11, letterSpacing: '0.28em',
              textTransform: 'uppercase', color: accent, marginTop: isMobile ? 8 : 12,
            }}>{label}</div>
          </div>
          {i < 3 && (
            <div style={{ fontFamily: font, fontSize: isMobile ? 28 : 48, color: accent, opacity: 0.5, lineHeight: 1.3 }}>
              {separator}
            </div>
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// RSVPForm — controlled local state, 'thank-you' state on submit.
// Renders inputs styled by the variation's `theme` prop (accent, ink, rule).
// ─────────────────────────────────────────────────────────────
function RSVPForm({ theme, headlineFont, labelFont, bodyFont, ctaLabel = 'Send our reply' }) {
  const isMobile = useIsMobile();
  const [form, setForm] = React.useState({
    names: '', email: '', attending: 'yes', guests: 2, diet: '', song: '',
    eventType: 'full', isVegan: false, mealChoice: '',
  });
  const [uiState, setUiState] = React.useState('idle');

  const inputStyle = {
    width: '100%',
    padding: '14px 0 10px',
    border: 'none',
    borderBottom: `1px solid ${theme.rule}`,
    background: 'transparent',
    fontFamily: bodyFont,
    fontSize: 17,
    color: theme.ink,
    outline: 'none',
    borderRadius: 0,
    transition: 'border-color .2s',
  };
  const labelStyle = {
    fontFamily: labelFont,
    fontSize: 11,
    letterSpacing: '0.28em',
    textTransform: 'uppercase',
    color: theme.label,
    marginBottom: 4,
    display: 'block',
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.attending === 'maybe') {
      setUiState('deciding');
      return;
    }
    setUiState('submitting');
    const body = {
      name: form.names,
      email: form.email,
      attending: form.attending === 'yes',
      dietary_restrictions: form.diet || null,
    };
    if (form.attending === 'yes') {
      body.event_type = form.eventType;
      if (form.eventType === 'full') {
        body.is_vegan = form.isVegan;
        if (!form.isVegan && form.mealChoice !== '') body.meal_preference = Number(form.mealChoice);
      }
    }
    try {
      const res = await fetch('/api/rsvp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      setUiState(res.ok ? 'sent' : 'error');
    } catch {
      setUiState('error');
    }
  };

  if (uiState === 'sent') {
    return (
      <div style={{ textAlign: 'center', padding: '60px 0' }}>
        <div style={{ fontFamily: headlineFont, fontSize: 44, color: theme.ink, marginBottom: 16 }}>
          Merci.
        </div>
        <div style={{ fontFamily: bodyFont, fontSize: 18, color: theme.inkSoft, fontStyle: 'italic' }}>
          We've noted your reply — we can't wait to share<br />
          this day with you in the woods.
        </div>
      </div>
    );
  }

  if (uiState === 'deciding') {
    return (
      <div style={{ textAlign: 'center', padding: '60px 0' }}>
        <div style={{ fontFamily: bodyFont, fontSize: 18, color: theme.inkSoft, fontStyle: 'italic' }}>
          No worries! Come back when you know and we'll save your spot.
        </div>
      </div>
    );
  }

  const disabled = uiState === 'submitting';

  const RadioDot = ({ selected }) => (
    <span style={{
      width: 18, height: 18, borderRadius: '50%',
      border: `1px solid ${theme.accent}`,
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      background: selected ? theme.accent : 'transparent',
      flex: '0 0 auto', transition: 'background .15s',
    }}>
      {selected && <span style={{ width: 8, height: 8, borderRadius: '50%', background: theme.paper }} />}
    </span>
  );

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 26 }}>

      {/* Names */}
      <div>
        <span style={labelStyle}>Names</span>
        <input style={inputStyle} value={form.names} disabled={disabled}
          onChange={(e) => setForm({ ...form, names: e.target.value })}
          placeholder="Camille &amp; Olivier" />
      </div>

      {/* Email */}
      <div>
        <span style={labelStyle}>Email</span>
        <input style={inputStyle} type="email" value={form.email} disabled={disabled}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          placeholder="you@example.com" />
      </div>

      {/* Attending radio */}
      <div>
        <span style={labelStyle}>Will you join us?</span>
        <div style={{ display: 'flex', gap: 24, marginTop: 8, flexWrap: 'wrap' }}>
          {[['yes', 'Joyfully accept'], ['no', 'Regretfully decline'], ['maybe', 'Still deciding']].map(([val, lbl]) => (
            <label key={val} style={{
              display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
              fontFamily: bodyFont, fontSize: 16, color: theme.ink,
            }}>
              <RadioDot selected={form.attending === val} />
              <input type="radio" name="att" value={val}
                checked={form.attending === val}
                onChange={(e) => setForm({ ...form, attending: e.target.value })}
                style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }} />
              {lbl}
            </label>
          ))}
        </div>
      </div>

      {/* Event type toggle */}
      {form.attending === 'yes' && (
        <div>
          <span style={labelStyle}>Day plan</span>
          <div style={{ display: 'flex', gap: 24, marginTop: 8, flexWrap: 'wrap' }}>
            {[['full', 'Full day (ceremony + dinner + party)'], ['ceremony_party', 'Ceremony & evening only']].map(([val, lbl]) => (
              <label key={val} style={{
                display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
                fontFamily: bodyFont, fontSize: 16, color: theme.ink,
              }}>
                <RadioDot selected={form.eventType === val} />
                <input type="radio" name="eventType" value={val}
                  checked={form.eventType === val}
                  onChange={() => setForm({ ...form, eventType: val, isVegan: false, mealChoice: '' })}
                  style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }} />
                {lbl}
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Meal preference — full-day guests only */}
      {form.attending === 'yes' && form.eventType === 'full' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Vegan checkbox */}
          <label style={{
            display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
            fontFamily: bodyFont, fontSize: 16, color: theme.ink,
          }}>
            <span style={{
              width: 18, height: 18,
              border: `1px solid ${theme.accent}`,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              background: form.isVegan ? theme.accent : 'transparent',
              flex: '0 0 auto', transition: 'background .15s',
            }}>
              {form.isVegan && <span style={{ width: 10, height: 10, background: theme.paper }} />}
            </span>
            <input type="checkbox" checked={form.isVegan}
              onChange={(e) => setForm({ ...form, isVegan: e.target.checked, mealChoice: '' })}
              style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }} />
            I follow a vegan diet (special menu)
          </label>

          {/* Meal radio — hidden when vegan */}
          {!form.isVegan && (
            <div>
              <span style={labelStyle}>Meal preference</span>
              <div style={{ display: 'flex', gap: 24, marginTop: 8 }}>
                {[['1', 'Veggie'], ['2', 'Meat']].map(([val, lbl]) => (
                  <label key={val} style={{
                    display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
                    fontFamily: bodyFont, fontSize: 16, color: theme.ink,
                  }}>
                    <RadioDot selected={form.mealChoice === val} />
                    <input type="radio" name="meal" value={val}
                      checked={form.mealChoice === val}
                      onChange={(e) => setForm({ ...form, mealChoice: e.target.value })}
                      style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }} />
                    {lbl}
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Guests + Dietary */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '120px 1fr', gap: isMobile ? 26 : 32 }}>
        <div>
          <span style={labelStyle}>Guests</span>
          <input style={inputStyle} type="number" min="1" max="6" disabled={disabled}
            value={form.guests}
            onChange={(e) => setForm({ ...form, guests: e.target.value })} />
        </div>
        <div>
          <span style={labelStyle}>Dietary notes</span>
          <input style={inputStyle} disabled={disabled} value={form.diet}
            onChange={(e) => setForm({ ...form, diet: e.target.value })}
            placeholder="allergies, etc." />
        </div>
      </div>

      {/* Song */}
      <div>
        <span style={labelStyle}>A song to dance to</span>
        <input style={inputStyle} disabled={disabled} value={form.song}
          onChange={(e) => setForm({ ...form, song: e.target.value })}
          placeholder="something we'll love" />
      </div>

      {/* Error message */}
      {uiState === 'error' && (
        <div style={{ fontFamily: bodyFont, fontSize: 15, color: theme.accent }}>
          Something went wrong — please try again or contact us directly.
        </div>
      )}

      {/* Submit button */}
      <button type="submit" disabled={disabled} style={{
        marginTop: 12,
        alignSelf: 'flex-start',
        padding: '14px 36px',
        background: theme.accent,
        color: theme.paper,
        border: 'none',
        fontFamily: labelFont,
        fontSize: 12,
        letterSpacing: '0.32em',
        textTransform: 'uppercase',
        cursor: disabled ? 'default' : 'pointer',
        borderRadius: 0,
        opacity: disabled ? 0.6 : 1,
        transition: 'background .2s, transform .2s, opacity .2s',
      }}
        onMouseEnter={(e) => { if (!disabled) e.currentTarget.style.transform = 'translateY(-1px)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}>
        {disabled ? 'Sending…' : ctaLabel}
      </button>
    </form>
  );
}

// ─────────────────────────────────────────────────────────────
// Photo placeholder — diagonal stripe pattern + monospace caption,
// because we don't have real photos yet. Borrowed from the default
// aesthetic guidance.
// ─────────────────────────────────────────────────────────────
function PhotoPlaceholder({ width = 220, height = 280, label = 'photo', theme, rotate = 0, src }) {
  const stripe = `repeating-linear-gradient(45deg, ${theme.sand}33 0, ${theme.sand}33 6px, transparent 6px, transparent 14px)`;
  return (
    <div style={{
      width, height, background: theme.paper, position: 'relative',
      backgroundImage: src ? 'none' : stripe,
      transform: `rotate(${rotate}deg)`,
      boxShadow: `0 1px 3px rgba(0,0,0,.05), 0 8px 24px rgba(0,0,0,.04)`,
      border: `1px solid ${theme.rule}`,
      overflow: 'hidden',
    }}>
      {src && (
        <img src={src} alt={label} style={{
          position: 'absolute', inset: 0,
          width: '100%', height: '100%', objectFit: 'cover', display: 'block',
        }} />
      )}
      {!src && (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace',
          fontSize: 11, color: theme.label, letterSpacing: '0.18em',
          textTransform: 'uppercase',
        }}>{label}</div>
      )}
      {src && label && (
        <div style={{
          position: 'absolute', bottom: 10, left: '50%', transform: 'translateX(-50%)',
          fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace',
          fontSize: 10, color: theme.label, letterSpacing: '0.18em',
          textTransform: 'uppercase',
          background: `${theme.bg}d0`, padding: '4px 10px',
          whiteSpace: 'nowrap',
        }}>{label}</div>
      )}
    </div>
  );
}

// Content data — shared between both variations so they stay in sync.
const MENU = {
  first: [
    { id: 'tomato-burrata', name: 'Heirloom tomato &amp; burrata', note: 'with basil oil &amp; aged balsamic' },
    { id: 'beet-chevre', name: 'Roasted beet &amp; goat cheese', note: 'honey, walnut, dressed leaves' },
    { id: 'trout', name: 'Smoked trout, pickled fennel', note: 'crème fraîche, dill, rye toast' },
  ],
  main: [
    { id: 'lamb', name: 'Slow-braised lamb shoulder', note: 'rosemary jus, summer vegetables' },
    { id: 'seabass', name: 'Pan-seared sea bass', note: 'fennel, lemon butter, samphire' },
    { id: 'mushroom-risotto', name: 'Wild mushroom risotto', note: 'truffle, parmesan — vegetarian' },
  ],
};

const SCHEDULE = [
  { day: 'Saturday · 8 August', items: [
    ['13:30', 'Guests welcomed', 'reception arrivals'],
    ['14:00', 'Ceremony', 'the heart of the day'],
    ['15:00', 'Reception', 'six bites &amp; drinks, until 17:00'],
    ['17:00', 'Dinner', 'first &amp; main course, until 20:00'],
    ['20:00', 'Evening guests arrive', 'the party widens'],
    ['21:00', 'Dessert buffet &amp; first dance', 'the floor opens'],
    ['00:00', 'A special midnight snack', 'a quiet ritual at the witching hour'],
    ['01:00', 'And then we sleep', 'goodnight, with full hearts'],
  ]},
];

const FAQS = [
  ['Can we bring our children?', 'Yes — little ones are welcome at the ceremony and dinner. There will be a quiet room for naps and a few games in the courtyard.'],
  ['Where should we stay?', 'A handful of lovely B&Bs are within ten minutes of the farmhouse. We\'ve gathered our favourites in the Travel section above.'],
  ['What about the weather?', 'Belgian August is mild and green — expect 22–26°C in the afternoon, cool and breezy by evening. A light layer for after dinner is wise.'],
  ['Is there parking on site?', 'Plenty — and a shuttle from the village square at 14:30 if you\'d rather not drive.'],
  ['Can we contribute photos?', 'Please do. We\'ll have a shared album, and you\'re welcome to tag #JonasAndDragana.'],
  ['Plus-ones?', 'If your invitation names a plus-one, absolutely. Otherwise we\'re keeping the day intimate — we hope you understand.'],
];

const DRESS_CODE = {
  title: 'Garden formal',
  notes: [
    'Soft, natural tones — whatever feels right to you.',
    'Linen, cotton, lace — fabrics that breathe.',
    'No stilettos, please — the grounds are forgiving but uneven.',
    'A light wrap or jacket once the sun sets behind the trees.',
  ],
};

// ─────────────────────────────────────────────────────────────
// HeroCarousel — auto-cycling photo carousel with ken-burns zoom +
// crossfade. The active slide slowly scales up over its display window
// (6s linear) and crossfades to the next every `interval` ms. Tap a dot
// to jump. Pauses on hover.
// ─────────────────────────────────────────────────────────────
function HeroCarousel({ items, theme, width = 640, height = 380, interval = 4200, frame = 'plain' }) {
  const [idx, setIdx] = React.useState(0);
  const [paused, setPaused] = React.useState(false);

  React.useEffect(() => {
    if (paused) return;
    const id = setInterval(() => {
      setIdx((i) => (i + 1) % items.length);
    }, interval);
    return () => clearInterval(id);
  }, [items.length, interval, paused]);

  const stripe = `repeating-linear-gradient(45deg, ${theme.sand}33 0, ${theme.sand}33 6px, transparent 6px, transparent 14px)`;

  return (
    <div
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      style={{
        width: '100%', maxWidth: width, aspectRatio: `${width} / ${height}`,
        position: 'relative', overflow: 'hidden',
        background: theme.paper,
        boxShadow: frame === 'shadow' ? `0 12px 40px rgba(0,0,0,.08), 0 2px 6px rgba(0,0,0,.04)` : 'none',
        border: `1px solid ${theme.rule}`,
      }}>
      {items.map((item, i) => {
        const isString = typeof item === 'string';
        const src = isString ? null : item.src;
        const label = isString ? item : item.label;
        const active = i === idx;
        return (
          <div key={i} style={{
            position: 'absolute', inset: 0,
            opacity: active ? 1 : 0,
            transition: 'opacity 1.2s ease',
            backgroundImage: src ? 'none' : stripe,
            backgroundColor: theme.paper,
            transform: active ? 'scale(1.08)' : 'scale(1)',
            transformOrigin: ['center center', 'top right', 'bottom left', 'top left', 'bottom right'][i % 5],
            transitionProperty: 'opacity, transform',
            transitionDuration: '1.2s, 7s',
            transitionTimingFunction: 'ease, linear',
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
            padding: 24,
          }}>
            {src && (
              <img src={src} alt={label || ''} style={{
                position: 'absolute', inset: 0,
                width: '100%', height: '100%', objectFit: 'cover', display: 'block',
              }} />
            )}
            {label && (
              <div style={{
                position: 'relative', zIndex: 1,
                fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace',
                fontSize: 11, letterSpacing: '0.18em',
                textTransform: 'uppercase', color: theme.label,
                background: `${theme.bg}cc`, padding: '6px 12px',
              }}>{label}</div>
            )}
          </div>
        );
      })}

      {/* dot indicators */}
      <div style={{
        position: 'absolute', bottom: 14, left: 0, right: 0,
        display: 'flex', justifyContent: 'center', gap: 8, zIndex: 2,
      }}>
        {items.map((_, i) => (
          <button key={i} onClick={() => setIdx(i)} aria-label={`slide ${i + 1}`} style={{
            width: i === idx ? 28 : 8, height: 8, borderRadius: 4,
            background: i === idx ? theme.accent : `${theme.ink}40`,
            border: 'none', cursor: 'pointer', padding: 0,
            transition: 'all .35s ease',
          }} />
        ))}
      </div>
    </div>
  );
}

const CAROUSEL_ITEMS = [
  { src: firstDate,    label: 'first date' },
  { src: firstSerbia,    label: 'first time serbia' },
  { src: secondSerbia,  label: 'serbia, AGAIN!' },
  { src: firstPeru, label: 'peru' },
  { src: proposalImg,  label: 'the proposal' },
  { src: firstWedding, label: 'dressup time' },
];

export {
  WEDDING_DATE, WEDDING_FONTS, useCountdown, useIsMobile, usePalette, PALETTES,
  CountdownBlock, RSVPForm, PhotoPlaceholder, HeroCarousel,
  SCHEDULE, FAQS, DRESS_CODE, MENU, CAROUSEL_ITEMS,
};
