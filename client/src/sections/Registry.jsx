// sections/Registry.jsx — gift-direction cards.
import { SectionHead } from './helpers';
import { REGISTRY } from '../shared';
import { Wildflower, Lavender, Sprig } from '../botanicals';

function RegistrySection({ t, fonts }) {
  // tilt + icon cycle through the list so any number of cards still feels hand-laid
  const tilts = [-1.4, 0.7, -0.5, 0.9, -1.1, 0.5, -0.7];
  const icons = [
    <Wildflower size={42} />, <Lavender size={36} />, <Sprig size={36} />,
    <Wildflower size={42} />, <Lavender size={36} />, <Sprig size={36} />,
    <Wildflower size={42} />,
  ];

  return (
    <section style={{ padding: '90px 120px 100px' }}>
      <div style={{ textAlign: 'center', marginBottom: 64 }}>
        <SectionHead t={t} fonts={fonts}
          kicker="a small, kind ask" title="If you'd like to give us something"
          subtitle="Honestly — your being there is everything. But here are a few small directions, in case you'd like one." align="center" />
      </div>

      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 36, maxWidth: 980, margin: '0 auto',
      }}>
        {REGISTRY.map((r, i) => (
          <div key={i} style={{
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
            <div style={{
              fontFamily: fonts.body, fontSize: 17, color: t.inkSoft,
              lineHeight: 1.6,
            }}>{r.body}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

export { RegistrySection };
