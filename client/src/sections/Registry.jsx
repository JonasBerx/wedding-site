import React from 'react';
import { Link } from 'react-router-dom';
import { SectionHead } from './helpers';
import { Wildflower, Lavender, Sprig } from '../botanicals';
import { useIsMobile } from '../shared';

function RegistryCard({ item, t, fonts, tilt, icon, ribbon }) {
  return (
    <div style={{
      padding: '40px 30px 32px', background: t.paper,
      border: `1px solid ${t.rule}`,
      transform: `rotate(${tilt}deg)`,
      boxShadow: `7px 7px 0 ${t.accentSoft}38`,
      position: 'relative', textAlign: 'center',
    }}>
      {ribbon && (
        <div style={{
          position: 'absolute', top: -14, left: '50%',
          transform: 'translateX(-50%)',
          background: t.accent, color: t.paper,
          padding: '4px 16px', fontFamily: fonts.label, fontSize: 11,
          letterSpacing: '0.32em', textTransform: 'uppercase',
        }}>{ribbon}</div>
      )}
      <div style={{ marginBottom: 16, color: t.accent, display: 'flex', justifyContent: 'center' }}>
        {icon}
      </div>
      <div style={{
        fontFamily: fonts.head, fontSize: 26, color: t.ink,
        marginBottom: 14, lineHeight: 1.15, fontStyle: 'italic',
      }}>{item.title}</div>
      {item.description && (
        <div style={{
          fontFamily: fonts.body, fontSize: 17, color: t.inkSoft,
          lineHeight: 1.6,
        }}>{item.description}</div>
      )}
    </div>
  );
}

function RegistrySection({ t, fonts }) {
  const isMobile = useIsMobile();
  const [items, setItems] = React.useState(null);

  React.useEffect(() => {
    let cancelled = false;
    fetch('/api/registry')
      .then(r => (r.ok ? r.json() : []))
      .then(data => { if (!cancelled) setItems(data); })
      .catch(() => { if (!cancelled) setItems([]); });
    return () => { cancelled = true; };
  }, []);

  // Fisher-Yates shuffle of unclaimed claimable items, memoised on the items
  // reference so the random pick stays stable across re-renders within a load.
  // Placed BEFORE early returns to satisfy the Rules of Hooks.
  const claimablePreview = React.useMemo(() => {
    if (!items) return [];
    const pool = items.filter(i => i.unclaimable !== 1 && !i.claimed);
    const shuffled = [...pool];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled.slice(0, 3);
  }, [items]);

  if (items === null) {
    return <section style={{ padding: isMobile ? '60px 20px 70px' : '90px 120px 100px', minHeight: 360 }} />;
  }
  if (items.length === 0) return null;

  const universal = items.filter(i => i.unclaimable === 1);
  const claimable = items.filter(i => i.unclaimable !== 1);
  const allClaimed = claimable.length > 0 && claimablePreview.length === 0;

  const tilts = [-1.4, 0.7, -0.5];
  const icons = [
    <Wildflower key="wf" size={42} />,
    <Lavender key="lv" size={36} />,
    <Sprig key="sp" size={36} />,
  ];

  const gridStyle = {
    display: 'grid',
    gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: isMobile ? 28 : 36, maxWidth: 980, margin: '0 auto',
  };

  const groupKickerStyle = {
    fontFamily: fonts.label, fontSize: 11, letterSpacing: '0.32em',
    textTransform: 'uppercase', color: t.label, textAlign: 'center',
    marginBottom: 24,
  };

  const showBothKickers = universal.length > 0 && claimablePreview.length > 0;

  return (
    <section style={{ padding: isMobile ? '60px 20px 70px' : '90px 120px 100px' }}>
      <div style={{ textAlign: 'center', marginBottom: isMobile ? 40 : 64 }}>
        <SectionHead t={t} fonts={fonts}
          kicker="a small, kind ask" title="If you'd like to give us something"
          subtitle="Honestly — your being there is everything. But here are a few small directions, in case you'd like one." align="center" />
      </div>

      {universal.length > 0 && (
        <div style={{ marginBottom: claimablePreview.length > 0 || allClaimed ? (isMobile ? 40 : 56) : 0 }}>
          {showBothKickers && <div style={groupKickerStyle}>Always welcome</div>}
          <div style={gridStyle}>
            {universal.map((r, i) => (
              <RegistryCard key={r.id} item={r} t={t} fonts={fonts}
                tilt={tilts[i % tilts.length]}
                icon={icons[i % icons.length]} />
            ))}
          </div>
        </div>
      )}

      {claimablePreview.length > 0 && (
        <div style={{ marginBottom: isMobile ? 40 : 56 }}>
          {showBothKickers && <div style={groupKickerStyle}>A few specific gifts</div>}
          <div style={gridStyle}>
            {claimablePreview.map((r, i) => (
              <RegistryCard key={r.id} item={r} t={t} fonts={fonts}
                tilt={tilts[i % tilts.length]}
                icon={icons[i % icons.length]}
                ribbon={`n° ${i + 1}`} />
            ))}
          </div>
        </div>
      )}

      {allClaimed && universal.length === 0 && (
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
