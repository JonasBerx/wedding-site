// sections/helpers.jsx — layout primitives shared across all sections.
// Both take t (palette from usePalette) and fonts ({ head, body, script, label }).
import { useIsMobile } from '../shared';

function SectionHead({ kicker, title, subtitle, align = 'left', t, fonts }) {
  const isMobile = useIsMobile();
  return (
    <div style={{ marginBottom: isMobile ? 36 : 56, textAlign: align }}>
      <div style={{
        fontFamily: fonts.script, fontSize: isMobile ? 24 : 30, color: t.accent,
        transform: 'rotate(-2deg)', marginBottom: 4,
        display: 'inline-block', lineHeight: 1,
      }}>{kicker}</div>
      <h2 style={{
        fontFamily: fonts.head, fontWeight: 400, fontStyle: 'italic',
        fontSize: isMobile ? 38 : 64, color: t.ink, margin: '6px 0 0', lineHeight: 1.05,
        letterSpacing: '-0.015em',
      }}>{title}</h2>
      {subtitle && (
        <div style={{
          fontFamily: fonts.body, fontStyle: 'italic', fontSize: isMobile ? 17 : 20,
          color: t.inkSoft, marginTop: isMobile ? 14 : 18, maxWidth: 560,
          lineHeight: 1.5,
          marginLeft: align === 'center' ? 'auto' : 0,
          marginRight: align === 'center' ? 'auto' : 0,
        }}>{subtitle}</div>
      )}
    </div>
  );
}

function HairRule({ t, children }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      gap: 18, color: t.accent, margin: '0 auto',
    }}>
      <span style={{ flex: 1, height: 1, background: t.rule, maxWidth: 120 }} />
      {children}
      <span style={{ flex: 1, height: 1, background: t.rule, maxWidth: 120 }} />
    </div>
  );
}

export { SectionHead, HairRule };
