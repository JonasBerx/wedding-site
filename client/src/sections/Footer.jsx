import { Link, useLocation } from 'react-router-dom';
import { OliveBranch } from '../botanicals';
import { useIsMobile } from '../shared';

function FooterSection({ t, fonts }) {
  const isMobile = useIsMobile();
  const { pathname } = useLocation();
  const onRegistry = pathname === '/registry';
  const linkTo = onRegistry ? '/' : '/registry';
  const linkText = onRegistry ? '← back to the wedding' : 'Gift Registry';

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
      <div style={{ marginTop: 28 }}>
        <Link to={linkTo} style={{
          fontFamily: fonts.label, fontSize: isMobile ? 10 : 11, letterSpacing: '0.32em',
          color: t.label, textTransform: 'uppercase', textDecoration: 'none', opacity: 0.7,
        }}>
          {linkText}
        </Link>
      </div>
    </footer>
  );
}

export { FooterSection };
