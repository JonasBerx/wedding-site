// sections/Faq.jsx — little questions.
import { SectionHead } from './helpers';
import { FAQS, useIsMobile } from '../shared';

function FaqSection({ t, fonts }) {
  const isMobile = useIsMobile();
  return (
    <section style={{
      padding: isMobile ? '60px 20px 80px' : '90px 120px 110px',
    }}>
      <div style={{ textAlign: 'center', marginBottom: isMobile ? 36 : 56 }}>
        <SectionHead t={t} fonts={fonts}
          kicker="things you might be wondering" title="The little questions" align="center" />
      </div>

      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        {FAQS.map(([q, a], i) => (
          <div key={i} style={{
            padding: isMobile ? '20px 0' : '26px 0',
            borderBottom: i < FAQS.length - 1 ? `1px solid ${t.rule}` : 'none',
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : '1fr 1.4fr',
            gap: isMobile ? 8 : 40,
            alignItems: 'baseline',
          }}>
            <div style={{
              fontFamily: fonts.script, fontSize: isMobile ? 24 : 28, color: t.accent,
              lineHeight: 1.15, transform: `rotate(${i % 2 ? 0.5 : -0.5}deg)`,
              display: 'inline-block',
            }}>{q}</div>
            <div style={{
              fontFamily: fonts.body, fontSize: isMobile ? 16 : 17, color: t.ink,
              lineHeight: 1.6,
            }}>{a}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

export { FaqSection };
