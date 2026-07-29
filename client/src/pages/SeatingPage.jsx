import React from 'react';
import { usePaletteMode } from '../PaletteShell';
import { useIsMobile, WEDDING_DATE, SCHEDULE } from '../shared';
import { FooterSection } from '../sections/Footer';
import SeatingTableCard from '../components/SeatingTableCard';

// Both of the facts on this page come from shared.jsx, the site's single source
// of truth, so editing the date or the schedule moves this page with it.
// The date is formatted in the venue's timezone on purpose: a guest reading
// this from another continent should see the wedding day, not their own local
// rollover of the same instant.
const WEDDING_DAY = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/Brussels', day: 'numeric', month: 'long', year: 'numeric',
}).format(WEDDING_DATE);

const DINNER_TIME = SCHEDULE
  .flatMap(day => day.items)
  .find(([, label]) => label === 'Dinner')?.[0] || null;

// Shown both before the chart is published and when it is published but empty —
// in either case there is genuinely nothing for a guest to look up yet, and the
// worst outcome would be a confident "find your table" over a blank page.
const COMING_SOON = 'The seating chart goes up in the last days before the wedding. Do come back and look for your name.';

const LEDE = DINNER_TIME
  ? `Find your name, find your table. Dinner begins at ${DINNER_TIME}.`
  : 'Find your name, find your table.';

export default function SeatingPage() {
  const { t, fonts } = usePaletteMode();
  const isMobile = useIsMobile();
  const [state, setState] = React.useState({ loading: true, published: false, tables: [] });

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/seating');
        const body = await res.json();
        if (!cancelled) {
          setState({
            loading: false,
            published: Boolean(body.published),
            tables: Array.isArray(body.tables) ? body.tables : [],
          });
        }
      } catch {
        // A guest hitting this during a blip sees the calm panel, never an error.
        if (!cancelled) setState({ loading: false, published: false, tables: [] });
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const hasChart = state.published && state.tables.length > 0;

  const panelStyle = {
    textAlign: 'center', color: t.inkSoft, fontSize: 16,
    maxWidth: 430, margin: '40px auto 0', lineHeight: 1.8,
  };

  return (
    <div style={{
      minHeight: '100vh', background: t.bg, color: t.ink,
      fontFamily: fonts.body,
      transition: 'background .4s ease, color .4s ease',
    }}>
      <div style={{
        maxWidth: 1040, margin: '0 auto',
        padding: isMobile ? '46px 20px 70px' : '64px 20px 90px',
      }}>
        <div style={{
          fontFamily: fonts.label, fontSize: 10, letterSpacing: '0.34em',
          textTransform: 'uppercase', color: t.label, textAlign: 'center',
        }}>{WEDDING_DAY}</div>

        <h1 style={{
          fontFamily: fonts.head, fontWeight: 400, fontSize: isMobile ? 36 : 44,
          margin: '12px 0 8px', textAlign: 'center', color: t.ink,
        }}>Seating Chart</h1>

        <div style={{ width: 54, height: 1, background: t.accent, margin: '20px auto 30px' }} />

        {state.loading ? null : hasChart ? (
          <>
            <p style={{
              textAlign: 'center', color: t.inkSoft, fontSize: 16,
              maxWidth: 460, margin: '0 auto 40px', lineHeight: 1.7,
            }}>
              {LEDE}
            </p>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
              gap: 18,
            }}>
              {state.tables.map(table => (
                <SeatingTableCard key={table.table_number} table={table} t={t} fonts={fonts} />
              ))}
            </div>
          </>
        ) : (
          <p style={panelStyle}>{COMING_SOON}</p>
        )}
      </div>

      <FooterSection t={t} fonts={fonts} />
    </div>
  );
}
