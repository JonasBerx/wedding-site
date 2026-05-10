// sections/Rsvp.jsx — reply form.
import { SectionHead } from './helpers';
import { RSVPForm } from '../shared';

function RsvpSection({ t, fonts }) {
  return (
    <section style={{ padding: '90px 120px 110px', background: t.paper, borderTop: `1px solid ${t.rule}`, borderBottom: `1px solid ${t.rule}`, position: 'relative' }}>
      <div style={{ maxWidth: 600, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 50 }}>
          <SectionHead t={t} fonts={fonts}
            kicker="please &amp; thank you" title="Tell us you're coming"
            subtitle="By the first of June, if you can. The pétanque set in your honour is on standby." align="center" />
        </div>

        <div style={{
          background: t.bg, padding: '44px 40px',
          border: `1px solid ${t.rule}`,
          transform: 'rotate(-0.4deg)',
          boxShadow: `7px 7px 0 ${t.accentSoft}38`,
        }}>
          <RSVPForm theme={t} headlineFont={fonts.head}
            labelFont={fonts.label} bodyFont={fonts.body}
            ctaLabel="Send our reply" />
        </div>
      </div>
    </section>
  );
}

export { RsvpSection };
