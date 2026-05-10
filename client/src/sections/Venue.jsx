// sections/Venue.jsx — De Bosch + travel info.
import React from 'react';
import { SectionHead } from './helpers';
import { PhotoPlaceholder } from '../shared';

function VenueSection({ t, fonts }) {
  return (
    <section style={{ padding: '90px 120px 100px', background: t.paper, borderTop: `1px solid ${t.rule}`, borderBottom: `1px solid ${t.rule}` }}>
      <SectionHead t={t} fonts={fonts}
        kicker="the place" title="An old farmhouse, in the hills"
        subtitle="Stone walls, woodland edges, an old chestnut tree old enough to remember everything. Worth the drive." />

      <div style={{ display: 'grid', gridTemplateColumns: '1.05fr 1fr', gap: 70, alignItems: 'flex-start' }}>
        <div style={{ position: 'relative', height: 520 }}>
          <div style={{ position: 'absolute', top: 0, left: 20 }}>
            <PhotoPlaceholder width={300} height={380} label="the courtyard" theme={t} rotate={-2.5} />
          </div>
          <div style={{ position: 'absolute', top: 90, left: 290 }}>
            <PhotoPlaceholder width={220} height={280} label="the woods" theme={t} rotate={3} />
          </div>
          <div style={{ position: 'absolute', top: 320, left: 130 }}>
            <PhotoPlaceholder width={260} height={180} label="the chestnut tree" theme={t} rotate={-1} />
          </div>
        </div>

        <div style={{ paddingTop: 12 }}>
          <div style={{
            fontFamily: fonts.head, fontSize: 44, fontStyle: 'italic',
            color: t.ink, lineHeight: 1.05, marginBottom: 8,
          }}>De Bosch</div>
          <div style={{
            fontFamily: fonts.script, fontSize: 26, color: t.accent,
            transform: 'rotate(-1.5deg)', display: 'inline-block', marginBottom: 32,
          }}>Lummen · Limburg</div>

          <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr', rowGap: 22, columnGap: 24 }}>
            {[
              ['where', 'Rekhovenstraat 20, 3560 Lummen'],
              ['by air', 'Brussels (BRU) — 1h drive\nLiège (LGG) — 35 min'],
              ['by rail', 'Hasselt — 15 min\nLeuven — 35 min'],
              ['parking', 'Plenty on site, signed from the main road.'],
            ].map(([k, v]) => (
              <React.Fragment key={k}>
                <div style={{
                  fontFamily: fonts.label, fontSize: 11, letterSpacing: '0.32em',
                  textTransform: 'uppercase', color: t.label, paddingTop: 6,
                }}>{k}</div>
                <div style={{
                  fontFamily: fonts.body, fontSize: 18, color: t.ink,
                  lineHeight: 1.55, whiteSpace: 'pre-line',
                }}>{v}</div>
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export { VenueSection };
