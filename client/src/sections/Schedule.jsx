// sections/Schedule.jsx — the day, hour by hour.
import { SectionHead } from './helpers';
import { SCHEDULE } from '../shared';
import { Sprig } from '../botanicals';

function ScheduleSection({ t, fonts }) {
  return (
    <section style={{ padding: '90px 120px 100px', borderTop: `1px solid ${t.rule}`, position: 'relative' }}>
      <SectionHead t={t} fonts={fonts}
        kicker="the day, hour by hour" title="What happens when"
        subtitle="A loose plan — wander, linger, eat slowly. Nothing here runs to the minute." />

      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        {SCHEDULE.map((d, di) => (
          <div key={d.day} style={{ marginBottom: di < SCHEDULE.length - 1 ? 56 : 0 }}>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: 18, marginBottom: 28,
            }}>
              <span style={{ flex: 1, height: 1, background: t.rule }} />
              <span style={{ color: t.accent }}><Sprig size={20} /></span>
              <span style={{
                fontFamily: fonts.script, fontSize: 38, color: t.accent,
                transform: `rotate(${di === 1 ? 0.8 : -0.8}deg)`,
                lineHeight: 1, display: 'inline-block',
              }}>{d.day}</span>
              <span style={{ color: t.accent }}><Sprig size={20} flip /></span>
              <span style={{ flex: 1, height: 1, background: t.rule }} />
            </div>

            <div>
              {d.items.map(([time, what, where], i) => (
                <div key={i} style={{
                  display: 'grid', gridTemplateColumns: '110px 1fr 1.1fr',
                  gap: 32, alignItems: 'baseline', padding: '20px 0',
                  borderBottom: i < d.items.length - 1 ? `1px solid ${t.rule}` : 'none',
                }}>
                  <div style={{
                    fontFamily: fonts.head, fontSize: 30, color: t.ink, fontStyle: 'italic',
                    fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.01em',
                  }}>{time}</div>
                  <div style={{ fontFamily: fonts.head, fontSize: 24, color: t.ink, lineHeight: 1.2 }}
                    dangerouslySetInnerHTML={{ __html: what }} />
                  <div style={{
                    fontFamily: fonts.script, fontSize: 22, color: t.inkSoft, lineHeight: 1.2,
                  }} dangerouslySetInnerHTML={{ __html: where }} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export { ScheduleSection };
