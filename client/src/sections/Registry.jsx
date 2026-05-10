import React from 'react';
import { Link } from 'react-router-dom';
import { SectionHead } from './helpers';
import { Wildflower, Lavender, Sprig } from '../botanicals';

function RegistrySection({ t, fonts }) {
  const [items, setItems] = React.useState(null);

  React.useEffect(() => {
    let cancelled = false;
    fetch('/api/registry')
      .then(r => (r.ok ? r.json() : []))
      .then(data => { if (!cancelled) setItems(data); })
      .catch(() => { if (!cancelled) setItems([]); });
    return () => { cancelled = true; };
  }, []);

  if (items === null) {
    return <section style={{ padding: '90px 120px 100px', minHeight: 360 }} />;
  }

  if (items.length === 0) {
    return null;
  }

  const unclaimed = items.filter(i => !i.claimed);
  const preview = unclaimed.slice(0, 3);
  const allClaimed = unclaimed.length === 0;

  const tilts = [-1.4, 0.7, -0.5];
  const icons = [
    <Wildflower size={42} />,
    <Lavender size={36} />,
    <Sprig size={36} />,
  ];

  return (
    <section style={{ padding: '90px 120px 100px' }}>
      <div style={{ textAlign: 'center', marginBottom: 64 }}>
        <SectionHead t={t} fonts={fonts}
          kicker="a small, kind ask" title="If you'd like to give us something"
          subtitle="Honestly — your being there is everything. But here are a few small directions, in case you'd like one." align="center" />
      </div>

      {!allClaimed && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 36, maxWidth: 980, margin: '0 auto 56px',
        }}>
          {preview.map((r, i) => (
            <div key={r.id} style={{
              padding: '40px 30px 32px', background: t.paper,
              border: `1px solid ${t.rule}`,
              transform: `rotate(${tilts[i % tilts.length]}deg)`,
              boxShadow: `7px 7px 0 ${t.accentSoft}38`,
              position: 'relative', textAlign: 'center',
            }}>
              <div style={{
                position: 'absolute', top: -14, left: '50%',
                transform: 'translateX(-50%)',
                background: t.accent, color: t.paper,
                padding: '4px 16px', fontFamily: fonts.label, fontSize: 11,
                letterSpacing: '0.32em', textTransform: 'uppercase',
              }}>n° {i + 1}</div>
              <div style={{ marginBottom: 16, color: t.accent, display: 'flex', justifyContent: 'center' }}>
                {icons[i % icons.length]}
              </div>
              <div style={{
                fontFamily: fonts.head, fontSize: 26, color: t.ink,
                marginBottom: 14, lineHeight: 1.15, fontStyle: 'italic',
              }}>{r.title}</div>
              {r.description && (
                <div style={{
                  fontFamily: fonts.body, fontSize: 17, color: t.inkSoft,
                  lineHeight: 1.6,
                }}>{r.description}</div>
              )}
            </div>
          ))}
        </div>
      )}

      {allClaimed && (
        <div style={{
          textAlign: 'center', maxWidth: 600, margin: '0 auto 56px',
          fontFamily: fonts.head, fontSize: 22, fontStyle: 'italic',
          color: t.inkSoft,
        }}>
          All gifts have been claimed — thank you.
        </div>
      )}

      <div style={{ textAlign: 'center' }}>
        <Link to="/registry" style={{
          display: 'inline-block',
          background: t.ink, color: t.paper,
          padding: '12px 32px',
          fontFamily: fonts.label, fontSize: 13,
          letterSpacing: '0.18em', textTransform: 'uppercase',
          textDecoration: 'none',
        }}>See the full registry</Link>
      </div>
    </section>
  );
}

export { RegistrySection };
