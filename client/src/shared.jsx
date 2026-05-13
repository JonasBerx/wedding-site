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

function stripHtml(s) {
  return typeof s === 'string' ? s.replace(/&amp;/g, '&').replace(/<[^>]*>/g, '') : '';
}

// ─────────────────────────────────────────────────────────────
// RSVPForm — controlled local state, 'thank-you' state on submit.
// Renders inputs styled by the variation's `theme` prop (accent, ink, rule).
// ─────────────────────────────────────────────────────────────
function RSVPForm({ theme, headlineFont, labelFont, bodyFont, ctaLabel = 'Send our reply' }) {
  const isMobile = useIsMobile();
  const [form, setForm] = React.useState({
    names: '', email: '', attending: 'yes', song: '',
    eventType: 'full',
    partyNote: '',
  });
  const [attendees, setAttendees] = React.useState([
    { name: '', firstCourseId: '', mainCourseId: '', dietary: '' },
  ]);
  const [uiState, setUiState] = React.useState('idle');
  const [readOnly, setReadOnly] = React.useState(false);
  const [prefillCandidate, setPrefillCandidate] = React.useState(null);
  const [lookupEmail, setLookupEmail] = React.useState('');
  const editedSinceLoad = React.useRef(false);
  function setLeadName(value) {
    setForm(prev => ({ ...prev, names: value }));
    setAttendees(prev => {
      if (prev.length === 0) return [{ name: value, firstCourseId: '', mainCourseId: '', dietary: '' }];
      const copy = prev.slice();
      copy[0] = { ...copy[0], name: value };
      return copy;
    });
  }

  const [releasedGift, setReleasedGift] = React.useState(null);
  const [menu, setMenu] = React.useState(null);
  React.useEffect(() => {
    let cancelled = false;
    fetch('/api/menu')
      .then(r => (r.ok ? r.json() : []))
      .then(data => { if (!cancelled) setMenu(data); })
      .catch(() => { if (!cancelled) setMenu([]); });
    return () => { cancelled = true; };
  }, []);

  const prefillFromRsvp = React.useCallback((r) => {
    setForm(prev => ({
      ...prev,
      names: r.name || '',
      email: r.email || '',
      attending: r.attending === 1 ? 'yes' : 'no',
      eventType: r.event_type || 'full',
      partyNote: r.dietary_restrictions || '',
    }));
    const list = Array.isArray(r.attendees) && r.attendees.length > 0
      ? r.attendees.map(a => ({
          name: a.name || '',
          firstCourseId: a.first_course_id != null ? String(a.first_course_id) : '',
          mainCourseId:  a.main_course_id  != null ? String(a.main_course_id)  : '',
          dietary:       a.dietary_restrictions || '',
        }))
      : [{ name: r.name || '', firstCourseId: '', mainCourseId: '', dietary: '' }];
    setAttendees(list);
    setLookupEmail(r.email || '');
    editedSinceLoad.current = false;
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    let stored = '';
    try { stored = sessionStorage.getItem('rsvpEmail') || ''; } catch {}
    const url = stored ? `/api/rsvp?email=${encodeURIComponent(stored)}` : '/api/rsvp';
    fetch(url)
      .then(r => (r.ok ? r.json() : null))
      .then(data => {
        if (cancelled || !data) return;
        if (data.deadline_passed) setReadOnly(true);
        if (data.rsvp) prefillFromRsvp(data.rsvp);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [prefillFromRsvp]);

  function updateForm(patch) {
    if (!('email' in patch)) editedSinceLoad.current = true;
    setForm(prev => ({ ...prev, ...patch }));
  }

  async function handleEmailBlur() {
    const e = (form.email || '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return;
    if (e === lookupEmail) return;
    if (editedSinceLoad.current) return;
    setLookupEmail(e);
    try {
      const res = await fetch(`/api/rsvp?email=${encodeURIComponent(e)}`);
      if (!res.ok) return;
      const data = await res.json();
      if (data.deadline_passed) setReadOnly(true);
      if (data.rsvp) setPrefillCandidate(data.rsvp);
    } catch {}
  }

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
    if (form.attending === 'yes' && form.eventType === 'full' &&
        attendees.some(a => !a.firstCourseId || !a.mainCourseId)) {
      return;
    }
    setUiState('submitting');
    const body = {
      name: form.names,
      email: form.email,
      attending: form.attending === 'yes',
      dietary_restrictions: form.partyNote || null,
    };
    if (form.attending === 'yes') {
      body.event_type = form.eventType;
      body.attendees = attendees.map(a => ({
        name: a.name?.trim() || form.names,
        first_course_id: a.firstCourseId ? Number(a.firstCourseId) : null,
        main_course_id:  a.mainCourseId  ? Number(a.mainCourseId)  : null,
        dietary_restrictions: a.dietary?.trim() || null,
      }));
    }
    try {
      const res = await fetch('/api/rsvp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        try {
          const data = await res.json();
          if (data?.released_gift) setReleasedGift(data.released_gift);
          else setReleasedGift(null);
        } catch { setReleasedGift(null); }
        try { sessionStorage.setItem('rsvpEmail', form.email.trim().toLowerCase()); } catch {}
        setUiState('sent');
      } else if (res.status === 409) {
        try {
          const data = await res.json();
          if (data?.error === 'deadline_passed') {
            setReadOnly(true);
            setUiState('error');
            return;
          }
        } catch {}
        setUiState('error');
      } else {
        setUiState('error');
      }
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
        {releasedGift && (
          <div style={{
            marginTop: 18, fontFamily: bodyFont, fontSize: 15,
            color: theme.inkSoft, fontStyle: 'italic',
          }}>
            We've also released your gift (<em>{releasedGift.title}</em>) so someone else can pick it up.
          </div>
        )}
        <button type="button"
          onClick={() => { setReleasedGift(null); setUiState('idle'); }}
          style={{
            marginTop: 28, background: 'transparent',
            border: 'none', cursor: 'pointer', padding: 0,
            fontFamily: labelFont, fontSize: 11, letterSpacing: '0.32em',
            color: theme.label, textTransform: 'uppercase', opacity: 0.8,
          }}>Edit again</button>
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

  const submitting = uiState === 'submitting';
  const fullDay = form.attending === 'yes' && form.eventType === 'full';
  const menuMissing = fullDay && (menu === null || menu.length === 0);
  const disabled = submitting || menuMissing || readOnly;

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

      {readOnly && (
        <div style={{
          padding: '14px 16px',
          border: `1px solid ${theme.accent}`,
          background: `${theme.accent}11`,
          fontFamily: bodyFont, fontSize: 15, color: theme.ink, marginBottom: 8,
        }}>
          Replies are now closed — please contact us directly if you need a change.
        </div>
      )}

      {/* Names */}
      <div>
        <span style={labelStyle}>Names</span>
        <input style={inputStyle} value={form.names} disabled={disabled}
          onChange={(e) => { editedSinceLoad.current = true; setLeadName(e.target.value); }}
          placeholder="Camille &amp; Olivier" />
      </div>

      {/* Email */}
      <div>
        <span style={labelStyle}>Email</span>
        <input style={inputStyle} type="email" value={form.email} disabled={submitting}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          onBlur={handleEmailBlur}
          placeholder="you@example.com" />
      </div>

      {prefillCandidate && (
        <div style={{
          padding: '12px 14px',
          border: `1px solid ${theme.rule}`,
          background: `${theme.accentSoft}22`,
          fontFamily: bodyFont, fontSize: 15, color: theme.ink,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 12, flexWrap: 'wrap',
        }}>
          <span>We found a reply for <em>{prefillCandidate.email}</em>.</span>
          <span style={{ display: 'flex', gap: 14 }}>
            <button type="button"
              onClick={() => { prefillFromRsvp(prefillCandidate); setPrefillCandidate(null); }}
              style={{
                background: 'transparent', color: theme.accent,
                border: 'none', cursor: 'pointer',
                fontFamily: labelFont, fontSize: 12, letterSpacing: '0.18em',
                textTransform: 'uppercase', padding: 0,
              }}>Load it</button>
            <button type="button"
              onClick={() => setPrefillCandidate(null)}
              style={{
                background: 'transparent', color: theme.label,
                border: 'none', cursor: 'pointer',
                fontFamily: labelFont, fontSize: 12, letterSpacing: '0.18em',
                textTransform: 'uppercase', padding: 0,
              }}>Dismiss</button>
          </span>
        </div>
      )}

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
                onChange={(e) => updateForm({ attending: e.target.value })}
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
            {[['full', 'Full day (ceremony + dinner + party)'], ['ceremony_party', 'Ceremony or evening only']].map(([val, lbl]) => (
              <label key={val} style={{
                display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
                fontFamily: bodyFont, fontSize: 16, color: theme.ink,
              }}>
                <RadioDot selected={form.eventType === val} />
                <input type="radio" name="eventType" value={val}
                  checked={form.eventType === val}
                  onChange={() => {
                    updateForm({ eventType: val });
                    setAttendees(prev => prev.map(a => ({ ...a, firstCourseId: '', mainCourseId: '' })));
                  }}
                  style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }} />
                {lbl}
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Course dropdowns — full-day guests only */}
      {form.attending === 'yes' && form.eventType === 'full' && (
        <>
          {(menu === null) && (
            <div style={{ fontFamily: bodyFont, fontSize: 15, color: theme.inkSoft, fontStyle: 'italic' }}>
              Loading menu…
            </div>
          )}
          {menu && menu.length === 0 && (
            <div style={{ fontFamily: bodyFont, fontSize: 15, color: theme.accent }}>
              Menu is being finalised — please come back shortly to choose your courses.
            </div>
          )}
          {menu && menu.length > 0 && ['first', 'main'].map(course => {
            const list = menu.filter(i => i.course === course);
            const stateKey = course === 'first' ? 'firstCourseId' : 'mainCourseId';
            const heading  = course === 'first' ? 'First course' : 'Main course';
            const value = attendees[0]?.[stateKey] ?? '';
            return (
              <div key={course}>
                <span style={labelStyle}>{heading}</span>
                <select
                  required
                  value={value}
                  disabled={disabled}
                  onChange={(e) => {
                    editedSinceLoad.current = true;
                    setAttendees(prev => {
                      const copy = prev.slice();
                      copy[0] = { ...copy[0], [stateKey]: e.target.value };
                      return copy;
                    });
                  }}
                  style={{ ...inputStyle, padding: '10px 0 10px', appearance: 'auto' }}
                >
                  <option value="" disabled>— pick one —</option>
                  {list.map(item => (
                    <option key={item.id} value={item.id}>
                      {stripHtml(item.name)}{item.note ? ` — ${item.note}` : ''}{item.is_vegan ? ' (vegan)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            );
          })}
        </>
      )}

      {/* Party-wide note */}
      <div>
        <span style={labelStyle}>Anything we should know? (optional)</span>
        <input style={inputStyle} disabled={disabled} value={form.partyNote}
          onChange={(e) => updateForm({ partyNote: e.target.value })}
          placeholder="arrival time, accessibility, etc." />
      </div>

      {/* Song */}
      <div>
        <span style={labelStyle}>A song to dance to</span>
        <input style={inputStyle} disabled={disabled} value={form.song}
          onChange={(e) => updateForm({ song: e.target.value })}
          placeholder="something we'll love" />
      </div>

      {/* Error message */}
      {uiState === 'error' && (
        <div style={{ fontFamily: bodyFont, fontSize: 15, color: theme.accent }}>
          Something went wrong — please try again or contact us directly.
        </div>
      )}

      {/* Submit button */}
      {!readOnly && (
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
          {submitting ? 'Sending…' : ctaLabel}
        </button>
      )}
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

const SCHEDULE = [
  { day: 'Saturday · 8 August', items: [
    ['13:30', 'Reception Guests welcomed', 'reception arrivals'],
    ['14:00', 'Ceremony', 'the heart of the day'],
    ['15:00', 'Reception', 'six bites &amp; drinks, until 17:00'],
    ['17:00', 'Dinner', 'first &amp; main course, until 20:00'],
    ['20:00', 'Evening guests arrive', 'the party widens'],
    ['21:00', 'Dessert buffet &amp; first dance', 'the floor opens'],
    ['00:00', 'A special midnight snack', 'A true taste of Belgian culture'],
    ['01:00', 'And then we sleep', 'goodnight, with full hearts'],
  ]},
];

const FAQS = [
  ['Can we bring our children?', 'Mostly an adults\' affair — unless we\'ve named your little ones on your invitation, we\'d love for you to come without them. We promise to dance enough for everyone.'],
  ['Where should we stay?', 'A handful of hotels and B&Bs sit within easy reach of the venue — we\'ll share a few favourites closer to the date.'],
  ['What about the weather?', 'Belgian August is mild and green — expect 22–26°C in the afternoon, cool and breezy by evening. A light layer for after dinner is wise. (And rain is always possible — it\'s Belgium, after all.)'],
  ['Is there parking on site?', 'Plenty on site — and a taxi service running through the evening if you\'d rather not drive.'],
  ['Can we contribute photos?', 'Please do. We\'ll have a shared album, and you\'re welcome to tag #D&J2026.'],
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
  SCHEDULE, FAQS, DRESS_CODE, CAROUSEL_ITEMS,
};
