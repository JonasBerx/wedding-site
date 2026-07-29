import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { OliveBranch } from '../botanicals';
import { useIsMobile } from '../shared';

// The standalone pages guests are meant to find on their own. Whichever one you
// are already on drops out of the row and is replaced by the way back.
const SIDE_PAGES = [
  { to: '/registry', text: 'Gift Registry' },
  { to: '/seating', text: 'Seating Chart' },
];

function FooterSection({ t, fonts }) {
  const isMobile = useIsMobile();
  const { pathname } = useLocation();
  const onSidePage = SIDE_PAGES.some(p => p.to === pathname);
  const links = onSidePage
    ? [{ to: '/', text: '← back to the wedding' }, ...SIDE_PAGES.filter(p => p.to !== pathname)]
    : SIDE_PAGES;

  return (
    <footer style={{
      padding: isMobile ? '50px 20px 70px' : '70px 80px 90px',
      textAlign: 'center', borderTop: `1px solid ${t.rule}`, background: t.bg,
    }}>
      <div style={{ display: 'flex', justifyContent: 'center', color: t.accentSoft, marginBottom: 28 }}>
        <OliveBranch size={isMobile ? 180 : 280} />
      </div>
      <div style={{
        fontFamily: fonts.head, fontSize: isMobile ? 48 : 64, color: t.ink, fontStyle: 'italic', lineHeight: 1,
      }}>D &amp; J</div>
      <div style={{
        fontFamily: fonts.script, fontSize: isMobile ? 26 : 32, color: t.accent, marginTop: 14,
        transform: 'rotate(-1.5deg)', display: 'inline-block', lineHeight: 1,
      }}>see you in the woods</div>
      <div style={{
        marginTop: 32, fontFamily: fonts.label, fontSize: isMobile ? 10 : 11, letterSpacing: '0.4em',
        color: t.label, textTransform: 'uppercase',
      }}>VIII · VIII · MMXXVI</div>
      <div style={{
        marginTop: 28, display: 'flex', justifyContent: 'center',
        alignItems: 'center', gap: isMobile ? 14 : 22, flexWrap: 'wrap',
      }}>
        {links.map((link, i) => (
          <React.Fragment key={link.to}>
            {i > 0 && (
              <span aria-hidden="true" style={{ color: t.label, opacity: 0.35, fontSize: 11 }}>·</span>
            )}
            <Link to={link.to} style={{
              fontFamily: fonts.label, fontSize: isMobile ? 10 : 11, letterSpacing: '0.32em',
              color: t.label, textTransform: 'uppercase', textDecoration: 'none', opacity: 0.7,
            }}>
              {link.text}
            </Link>
          </React.Fragment>
        ))}
      </div>
    </footer>
  );
}

export { FooterSection };
