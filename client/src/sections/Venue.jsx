// sections/Venue.jsx — De Bosch + travel info.
import React from 'react';
import { SectionHead } from './helpers';
import { PhotoPlaceholder, useIsMobile } from '../shared';
import picsTxt from '../assets/location/pics.txt?raw';

const LOCATION_PICS = picsTxt.trim().split('\n').map(s => s.trim()).filter(Boolean);

function VenueSection({ t, fonts }) {
  const isMobile = useIsMobile();
  return (
    <section style={{
      padding: isMobile ? '60px 20px 70px' : '90px 120px 100px',
      background: t.paper,
      borderTop: `1px solid ${t.rule}`, borderBottom: `1px solid ${t.rule}`,
    }}>
      <SectionHead t={t} fonts={fonts}
        kicker="the place" title="An old farmhouse, in the hills"
        subtitle="Stone walls, woodland edges, an old chestnut tree old enough to remember everything. Worth the drive." />

      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : '1.05fr 1fr',
        gap: isMobile ? 36 : 70, alignItems: 'flex-start',
      }}>
        {isMobile ? (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 12,
          }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <PhotoPlaceholder width="100%" height={240} label="the interior" theme={t} rotate={-1.5} src={LOCATION_PICS[0]} />
            </div>
            <PhotoPlaceholder width="100%" height={180} label="the fields" theme={t} rotate={1.5} src={LOCATION_PICS[1]} />
            <PhotoPlaceholder width="100%" height={180} label="the farmhouse" theme={t} rotate={-1} src={LOCATION_PICS[2]} />
          </div>
        ) : (
          <div style={{ position: 'relative', height: 520 }}>
            <div style={{ position: 'absolute', top: 0, left: 20 }}>
              <PhotoPlaceholder width={300} height={380} label="the interior" theme={t} rotate={-2.5} src={LOCATION_PICS[0]} />
            </div>
            <div style={{ position: 'absolute', top: 90, left: 290 }}>
              <PhotoPlaceholder width={220} height={280} label="the fields" theme={t} rotate={3} src={LOCATION_PICS[1]} />
            </div>
            <div style={{ position: 'absolute', top: 320, left: 130 }}>
              <PhotoPlaceholder width={260} height={180} label="the farmhouse" theme={t} rotate={-1} src={LOCATION_PICS[2]} />
            </div>
          </div>
        )}

        <div style={{ paddingTop: isMobile ? 0 : 12 }}>
          <div style={{
            fontFamily: fonts.head, fontSize: isMobile ? 36 : 44, fontStyle: 'italic',
            color: t.ink, lineHeight: 1.05, marginBottom: 8,
          }}>De Bosch</div>
          <div style={{
            fontFamily: fonts.script, fontSize: isMobile ? 22 : 26, color: t.accent,
            transform: 'rotate(-1.5deg)', display: 'inline-block', marginBottom: isMobile ? 24 : 32,
          }}>Lummen · Limburg</div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '90px 1fr' : '90px 1fr',
            rowGap: isMobile ? 16 : 22, columnGap: isMobile ? 16 : 24,
          }}>
            {[
              ['where', 'Rekhovenstraat 20, 3560 Lummen'],
              ['by air', 'Brussels (BRU) — 1h drive\nEindhoven (EIN) — 50 min drive'],
              ['by car', 'Hasselt — 15 min\nLeuven — 35 min'],
              ['by train & bus', 'Hasselt — 40 min\nLeuven — 1.5hr'],
              ['parking', 'Plenty on site, signed from the main road.'],
            ].map(([k, v]) => (
              <React.Fragment key={k}>
                <div style={{
                  fontFamily: fonts.label, fontSize: isMobile ? 10 : 11, letterSpacing: '0.28em',
                  textTransform: 'uppercase', color: t.label, paddingTop: 6,
                }}>{k}</div>
                <div style={{
                  fontFamily: fonts.body, fontSize: isMobile ? 16 : 18, color: t.ink,
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
