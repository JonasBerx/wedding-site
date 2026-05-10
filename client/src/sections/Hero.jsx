// sections/Hero.jsx — names + date + carousel.
import { Sprig } from '../botanicals';
import { HeroCarousel, CAROUSEL_ITEMS, useIsMobile } from '../shared';

function HeroSection({ t, fonts }) {
  const isMobile = useIsMobile();
  const namesSize = isMobile ? 64 : 132;
  const ampSize = isMobile ? 44 : 84;
  const dateSize = isMobile ? 52 : 96;
  const sprigSize = isMobile ? 32 : 56;

  return (
    <section style={{
      padding: isMobile ? '56px 20px 48px' : '88px 80px 70px',
      textAlign: 'center', position: 'relative',
    }}>
      <div style={{
        fontFamily: fonts.label, fontSize: isMobile ? 10 : 11, letterSpacing: '0.5em',
        color: t.label, textTransform: 'uppercase', marginBottom: isMobile ? 20 : 28,
      }}>De Bosch · Lummen · Belgium</div>

      <div style={{
        fontFamily: fonts.script, fontSize: isMobile ? 24 : 32, color: t.accent,
        transform: 'rotate(-2deg)', marginBottom: 4, display: 'inline-block',
      }}>the wedding of</div>

      {/* names — flanked by small sprigs that sit beside, not behind */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: isMobile ? 12 : 28, marginTop: 8,
      }}>
        <span style={{ color: t.accentSoft, opacity: 0.8, transform: 'rotate(-20deg)', flex: '0 0 auto' }}>
          <Sprig size={sprigSize} />
        </span>
        <div style={{ position: 'relative', textAlign: 'center', minWidth: 0 }}>
          <div style={{
            fontFamily: fonts.head, fontSize: namesSize, color: t.ink, lineHeight: 0.95,
            fontStyle: 'italic', letterSpacing: '-0.02em',
          }}>Dragana</div>
          <div style={{
            fontFamily: fonts.script, fontSize: ampSize, color: t.accent,
            margin: '-4px 0 -4px', lineHeight: 1, transform: 'rotate(-3deg)',
            display: 'inline-block',
          }}>&amp;</div>
          <div style={{
            fontFamily: fonts.head, fontSize: namesSize, color: t.ink, lineHeight: 0.95,
            fontStyle: 'italic', letterSpacing: '-0.02em',
          }}>Jonas</div>
        </div>
        <span style={{ color: t.accentSoft, opacity: 0.8, transform: 'rotate(20deg) scaleX(-1)', flex: '0 0 auto' }}>
          <Sprig size={sprigSize} />
        </span>
      </div>

      {/* date */}
      <div style={{ marginTop: isMobile ? 36 : 56 }}>
        <div style={{
          fontFamily: fonts.script, fontSize: isMobile ? 22 : 30, color: t.accent,
          transform: 'rotate(-1.5deg)', display: 'inline-block', marginBottom: 6,
        }}>Saturday afternoon ·</div>
        <div style={{
          display: 'flex', alignItems: 'baseline', justifyContent: 'center',
          gap: isMobile ? 10 : 22, fontFamily: fonts.head, color: t.ink, fontStyle: 'italic',
          flexWrap: 'wrap',
        }}>
          <span style={{ fontSize: dateSize, lineHeight: 1 }}>08</span>
          <span style={{ fontSize: isMobile ? 22 : 36, color: t.accent, opacity: 0.7 }}>·</span>
          <span style={{ fontSize: dateSize, lineHeight: 1 }}>08</span>
          <span style={{ fontSize: isMobile ? 22 : 36, color: t.accent, opacity: 0.7 }}>·</span>
          <span style={{ fontSize: dateSize, lineHeight: 1 }}>2026</span>
        </div>
      </div>

      {/* hero carousel */}
      <div style={{ marginTop: isMobile ? 40 : 64, display: 'flex', justifyContent: 'center' }}>
        <div style={{
          transform: isMobile ? 'none' : 'rotate(-1.2deg)',
          boxShadow: `10px 10px 0 ${t.accentSoft}40, 0 1px 3px rgba(0,0,0,.08)`,
          padding: isMobile ? 8 : 14, background: t.paper,
          width: '100%', maxWidth: 708,
        }}>
          <HeroCarousel items={CAROUSEL_ITEMS} theme={t} width={680} height={400} />
          <div style={{
            fontFamily: fonts.script, fontSize: isMobile ? 20 : 26, color: t.inkSoft,
            textAlign: 'center', marginTop: 10, lineHeight: 1,
          }}>five years, in five frames</div>
        </div>
      </div>
    </section>
  );
}

export { HeroSection };
