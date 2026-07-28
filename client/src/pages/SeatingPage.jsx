import React from 'react';
import SeatingTableCard from '../components/SeatingTableCard';

const HEAD_FONT = '"DM Serif Display", serif';
const BODY_FONT = '"EB Garamond", Georgia, serif';
const LABEL_FONT = '"EB Garamond", serif';

const PAPER = '#fbf5ea';
const INK = '#2e2218';
const INK_SOFT = '#5a4a3a';
const LABEL = '#7a5a3e';
const ACCENT = '#b85c4a';

export default function SeatingPage() {
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

  return (
    <div style={{ background: PAPER, minHeight: '100vh', fontFamily: BODY_FONT, padding: '64px 20px 90px' }}>
      <div style={{ maxWidth: 1040, margin: '0 auto' }}>
        <div style={{
          fontFamily: LABEL_FONT, fontSize: 10, letterSpacing: '0.34em',
          textTransform: 'uppercase', color: LABEL, textAlign: 'center',
        }}>6 september 2026</div>

        <h1 style={{
          fontFamily: HEAD_FONT, fontWeight: 400, fontSize: 44,
          margin: '12px 0 8px', textAlign: 'center', color: INK,
        }}>Tafelschikking</h1>

        <div style={{ width: 54, height: 1, background: ACCENT, margin: '20px auto 30px' }} />

        {state.loading ? null : state.published ? (
          <>
            <p style={{
              textAlign: 'center', color: INK_SOFT, fontSize: 16,
              maxWidth: 460, margin: '0 auto 40px', lineHeight: 1.7,
            }}>
              Zoek je naam en vind je tafel. Het diner begint om 18u30.
            </p>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
              gap: 18,
            }}>
              {state.tables.map(t => (
                <SeatingTableCard key={t.table_number} table={t} />
              ))}
            </div>
          </>
        ) : (
          <p style={{
            textAlign: 'center', color: INK_SOFT, fontSize: 16,
            maxWidth: 420, margin: '40px auto 0', lineHeight: 1.8,
          }}>
            De tafelschikking wordt kort voor de trouwdag bekendgemaakt.
            Kom zeker nog eens terug kijken!
          </p>
        )}
      </div>
    </div>
  );
}
