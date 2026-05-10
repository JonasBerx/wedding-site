import React from 'react';
import { SectionHead } from './helpers';
import { useIsMobile } from '../shared';

function VeganPill({ t, fonts }) {
  return (
    <span style={{
      display: 'inline-block', marginLeft: 8,
      padding: '2px 8px',
      background: t.accent, color: t.paper,
      fontFamily: fonts.label, fontSize: 9, letterSpacing: '0.28em',
      textTransform: 'uppercase', verticalAlign: 'middle',
    }}>vegan</span>
  );
}

function MenuSection({ t, fonts }) {
  const isMobile = useIsMobile();
  const [items, setItems] = React.useState(null);

  React.useEffect(() => {
    let cancelled = false;
    fetch('/api/menu')
      .then(r => (r.ok ? r.json() : []))
      .then(data => { if (!cancelled) setItems(data); })
      .catch(() => { if (!cancelled) setItems([]); });
    return () => { cancelled = true; };
  }, []);

  if (items === null) {
    return <section style={{ padding: isMobile ? '60px 20px 70px' : '90px 120px 100px', minHeight: 320 }} />;
  }
  if (items.length === 0) return null;

  const first = items.filter(i => i.course === 'first');
  const main  = items.filter(i => i.course === 'main');
  const columns = [['First', first], ['Main', main]];

  return (
    <section style={{
      padding: isMobile ? '60px 20px 70px' : '90px 120px 100px',
      borderTop: `1px solid ${t.rule}`,
    }}>
      <div style={{ textAlign: 'center', marginBottom: isMobile ? 36 : 56 }}>
        <SectionHead t={t} fonts={fonts}
          kicker="and to eat" title="At table, then"
          subtitle="A long, slow dinner. Two courses to choose from — tell us yours when you RSVP." align="center" />
      </div>

      <div style={{
        maxWidth: 880, margin: '0 auto',
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
        gap: isMobile ? 40 : 80,
      }}>
        {columns.map(([heading, list], colIdx) => (
          <div key={heading}>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: 14, marginBottom: 20, color: t.accent,
            }}>
              <span style={{ flex: 1, height: 1, background: t.rule }} />
              <span style={{
                fontFamily: fonts.script, fontSize: isMobile ? 30 : 38, lineHeight: 1,
                transform: `rotate(${colIdx ? 1 : -1}deg)`, display: 'inline-block',
              }}>{heading}</span>
              <span style={{ flex: 1, height: 1, background: t.rule }} />
            </div>
            <div>
              {list.map((item, i) => (
                <div key={item.id} style={{
                  padding: isMobile ? '18px 4px' : '22px 4px',
                  borderBottom: i < list.length - 1 ? `1px solid ${t.rule}` : 'none',
                  textAlign: 'center',
                }}>
                  <div style={{
                    fontFamily: fonts.head, fontStyle: 'italic', fontSize: isMobile ? 20 : 24,
                    color: t.ink, lineHeight: 1.2, marginBottom: 6,
                  }}>
                    <span dangerouslySetInnerHTML={{ __html: item.name }} />
                    {item.is_vegan ? <VeganPill t={t} fonts={fonts} /> : null}
                  </div>
                  {item.note && (
                    <div style={{
                      fontFamily: fonts.body, fontStyle: 'italic', fontSize: isMobile ? 15 : 16,
                      color: t.inkSoft, lineHeight: 1.4,
                    }}>{item.note}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export { MenuSection };
