// sections/Schedule.jsx — the day, hour by hour.
import React from 'react';
import { SectionHead } from './helpers';
import { SCHEDULE, useIsMobile } from '../shared';
import { Sprig } from '../botanicals';

function ScheduleSection({ t, fonts }) {
  const isMobile = useIsMobile();
  return (
    <section style={{
      padding: isMobile ? '60px 20px 70px' : '90px 120px 100px',
      borderTop: `1px solid ${t.rule}`, position: 'relative',
    }}>
      <SectionHead t={t} fonts={fonts}
        kicker="the day, hour by hour" title="What happens when"
        subtitle="A loose plan — wander, linger, eat slowly. Nothing here runs to the minute." />

      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        {SCHEDULE.map((d, di) => (
          <div key={d.day} style={{ marginBottom: di < SCHEDULE.length - 1 ? 56 : 0 }}>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: isMobile ? 10 : 18, marginBottom: isMobile ? 20 : 28,
            }}>
              <span style={{ flex: 1, height: 1, background: t.rule }} />
              <span style={{ color: t.accent }}><Sprig size={isMobile ? 16 : 20} /></span>
              <span style={{
                fontFamily: fonts.script, fontSize: isMobile ? 26 : 38, color: t.accent,
                transform: `rotate(${di === 1 ? 0.8 : -0.8}deg)`,
                lineHeight: 1, display: 'inline-block', textAlign: 'center',
              }}>{d.day}</span>
              <span style={{ color: t.accent }}><Sprig size={isMobile ? 16 : 20} flip /></span>
              <span style={{ flex: 1, height: 1, background: t.rule }} />
            </div>

            <div>
              {d.items.map(([time, what, where], i) => (
                <div key={i} style={{
                  display: 'grid',
                  gridTemplateColumns: isMobile ? '70px 1fr' : '110px 1fr 1.1fr',
                  gap: isMobile ? 14 : 32, alignItems: 'baseline',
                  padding: isMobile ? '14px 0' : '20px 0',
                  borderBottom: i < d.items.length - 1 ? `1px solid ${t.rule}` : 'none',
                }}>
                  <div style={{
                    fontFamily: fonts.head, fontSize: isMobile ? 22 : 30, color: t.ink, fontStyle: 'italic',
                    fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.01em',
                  }}>{time}</div>
                  {isMobile ? (
                    <div>
                      <div style={{ fontFamily: fonts.head, fontSize: 18, color: t.ink, lineHeight: 1.2 }}
                        dangerouslySetInnerHTML={{ __html: what }} />
                      <div style={{
                        fontFamily: fonts.script, fontSize: 18, color: t.inkSoft, lineHeight: 1.2,
                        marginTop: 4,
                      }} dangerouslySetInnerHTML={{ __html: where }} />
                    </div>
                  ) : (
                    <React.Fragment>
                      <div style={{ fontFamily: fonts.head, fontSize: 24, color: t.ink, lineHeight: 1.2 }}
                        dangerouslySetInnerHTML={{ __html: what }} />
                      <div style={{
                        fontFamily: fonts.script, fontSize: 22, color: t.inkSoft, lineHeight: 1.2,
                      }} dangerouslySetInnerHTML={{ __html: where }} />
                    </React.Fragment>
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

export { ScheduleSection };
