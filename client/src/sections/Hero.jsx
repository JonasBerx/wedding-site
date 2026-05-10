// sections/Hero.jsx — names + date + carousel.
import { Sprig } from '../botanicals';
import { HeroCarousel, CAROUSEL_ITEMS } from '../shared';

function HeroSection({ t, fonts }) {
  return (
    <section style={{ padding: '88px 80px 70px', textAlign: 'center', position: 'relative' }}>
      <div style={{
        fontFamily: fonts.label, fontSize: 11, letterSpacing: '0.6em',
        color: t.label, textTransform: 'uppercase', marginBottom: 28,
      }}>De Bosch · Lummen · Belgium</div>

      <div style={{
        fontFamily: fonts.script, fontSize: 32, color: t.accent,
        transform: 'rotate(-2deg)', marginBottom: 4, display: 'inline-block',
      }}>the wedding of</div>

      {/* names — flanked by small sprigs that sit beside, not behind */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: 28, marginTop: 8,
      }}>
        <span style={{ color: t.accentSoft, opacity: 0.8, transform: 'rotate(-20deg)' }}>
          <Sprig size={56} />
        </span>
        <div style={{ position: 'relative', textAlign: 'center' }}>
          <div style={{
            fontFamily: fonts.head, fontSize: 132, color: t.ink, lineHeight: 0.95,
            fontStyle: 'italic', letterSpacing: '-0.02em',
          }}>Dragana</div>
          <div style={{
            fontFamily: fonts.script, fontSize: 84, color: t.accent,
            margin: '-4px 0 -4px', lineHeight: 1, transform: 'rotate(-3deg)',
            display: 'inline-block',
          }}>&amp;</div>
          <div style={{
            fontFamily: fonts.head, fontSize: 132, color: t.ink, lineHeight: 0.95,
            fontStyle: 'italic', letterSpacing: '-0.02em',
          }}>Jonas</div>
        </div>
        <span style={{ color: t.accentSoft, opacity: 0.8, transform: 'rotate(20deg) scaleX(-1)' }}>
          <Sprig size={56} />
        </span>
      </div>

      {/* date */}
      <div style={{ marginTop: 56 }}>
        <div style={{
          fontFamily: fonts.script, fontSize: 30, color: t.accent,
          transform: 'rotate(-1.5deg)', display: 'inline-block', marginBottom: 6,
        }}>Saturday afternoon ·</div>
        <div style={{
          display: 'flex', alignItems: 'baseline', justifyContent: 'center',
          gap: 22, fontFamily: fonts.head, color: t.ink, fontStyle: 'italic',
        }}>
          <span style={{ fontSize: 96, lineHeight: 1 }}>08</span>
          <span style={{ fontSize: 36, color: t.accent, opacity: 0.7 }}>·</span>
          <span style={{ fontSize: 96, lineHeight: 1 }}>08</span>
          <span style={{ fontSize: 36, color: t.accent, opacity: 0.7 }}>·</span>
          <span style={{ fontSize: 96, lineHeight: 1 }}>2026</span>
        </div>
      </div>

      {/* hero carousel */}
      <div style={{ marginTop: 64, display: 'flex', justifyContent: 'center' }}>
        <div style={{
          transform: 'rotate(-1.2deg)',
          boxShadow: `10px 10px 0 ${t.accentSoft}40, 0 1px 3px rgba(0,0,0,.08)`,
          padding: 14, background: t.paper,
        }}>
          <HeroCarousel items={CAROUSEL_ITEMS} theme={t} width={680} height={400} />
          <div style={{
            fontFamily: fonts.script, fontSize: 26, color: t.inkSoft,
            textAlign: 'center', marginTop: 10, lineHeight: 1,
          }}>five years, in five frames</div>
        </div>
      </div>
    </section>
  );
}

export { HeroSection };
