// sections/Seating.jsx — sends guests to the seating chart.
import { Link } from 'react-router-dom';
import { SectionHead } from './helpers';
import { useIsMobile } from '../shared';

// The button renders unconditionally. SeatingPage already explains itself when
// the chart is not published yet, so there is no published rule to duplicate
// here — this stays a dumb link, with no fetch and no loading state.
function SeatingSection({ t, fonts }) {
  const isMobile = useIsMobile();
  return (
    <section style={{
      padding: isMobile ? '60px 20px 70px' : '90px 120px 100px',
      textAlign: 'center', position: 'relative',
    }}>
      <SectionHead t={t} fonts={fonts}
        kicker="and where do i sit?" title="The seating chart"
        subtitle="Find your name, find your table for dinner." align="center" />

      <Link to="/seating" style={{
        display: 'inline-block',
        background: t.ink, color: t.paper,
        padding: '12px 32px',
        fontFamily: fonts.label, fontSize: 13,
        letterSpacing: '0.18em', textTransform: 'uppercase',
        textDecoration: 'none',
      }}>Find your table</Link>
    </section>
  );
}

export { SeatingSection };
