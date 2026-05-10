// sections/DressCode.jsx — what to wear.
import { SectionHead } from './helpers';
import { DRESS_CODE, useIsMobile } from '../shared';
import { Lavender } from '../botanicals';

function DressCodeSection({ t, fonts }) {
  const isMobile = useIsMobile();
  return (
    <section style={{
      padding: isMobile ? '60px 20px 70px' : '90px 120px 100px',
      textAlign: 'center', position: 'relative',
    }}>
      <SectionHead t={t} fonts={fonts}
        kicker="and what to wear?" title="Garden formal, mostly"
        subtitle="Linen, soft tones, comfortable shoes. Dress as if you were in a Sunday painting." align="center" />

      <div style={{ maxWidth: 540, margin: '0 auto', textAlign: 'left' }}>
        {DRESS_CODE.notes.map((n, i) => (
          <div key={i} style={{
            display: 'flex', gap: 16, alignItems: 'flex-start',
            padding: '12px 0',
            borderTop: i === 0 ? 'none' : `1px solid ${t.rule}`,
          }}>
            <span style={{ color: t.accent, fontFamily: fonts.script, fontSize: 30, lineHeight: 1, marginTop: -4, flex: '0 0 auto' }}>{i + 1}</span>
            <span style={{ fontFamily: fonts.body, fontSize: 19, color: t.ink, lineHeight: 1.55 }}>{n}</span>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 44, display: 'flex', justifyContent: 'center', color: t.accentSoft }}>
        <Lavender size={48} />
      </div>
    </section>
  );
}

export { DressCodeSection };
