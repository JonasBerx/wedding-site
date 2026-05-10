// sections/Menu.jsx — first + main course on display.
import { SectionHead } from './helpers';
import { MENU, useIsMobile } from '../shared';

function MenuSection({ t, fonts }) {
  const isMobile = useIsMobile();
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
        {[['First', MENU.first], ['Main', MENU.main]].map(([heading, items], colIdx) => (
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
              {items.map((item, i) => (
                <div key={item.id} style={{
                  padding: isMobile ? '18px 4px' : '22px 4px',
                  borderBottom: i < items.length - 1 ? `1px solid ${t.rule}` : 'none',
                  textAlign: 'center',
                }}>
                  <div style={{
                    fontFamily: fonts.head, fontStyle: 'italic', fontSize: isMobile ? 20 : 24,
                    color: t.ink, lineHeight: 1.2, marginBottom: 6,
                  }} dangerouslySetInnerHTML={{ __html: item.name }} />
                  <div style={{
                    fontFamily: fonts.body, fontStyle: 'italic', fontSize: isMobile ? 15 : 16,
                    color: t.inkSoft, lineHeight: 1.4,
                  }}>{item.note}</div>
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
