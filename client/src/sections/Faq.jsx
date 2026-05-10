// sections/Faq.jsx — little questions.
import { SectionHead } from './helpers';
import { FAQS } from '../shared';

function FaqSection({ t, fonts }) {
  return (
    <section style={{ padding: '90px 120px 110px' }}>
      <div style={{ textAlign: 'center', marginBottom: 56 }}>
        <SectionHead t={t} fonts={fonts}
          kicker="things you might be wondering" title="The little questions" align="center" />
      </div>

      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        {FAQS.map(([q, a], i) => (
          <div key={i} style={{
            padding: '26px 0',
            borderBottom: i < FAQS.length - 1 ? `1px solid ${t.rule}` : 'none',
            display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 40,
            alignItems: 'baseline',
          }}>
            <div style={{
              fontFamily: fonts.script, fontSize: 28, color: t.accent,
              lineHeight: 1.15, transform: `rotate(${i % 2 ? 0.5 : -0.5}deg)`,
              display: 'inline-block',
            }}>{q}</div>
            <div style={{
              fontFamily: fonts.body, fontSize: 17, color: t.ink,
              lineHeight: 1.6,
            }}>{a}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

export { FaqSection };
