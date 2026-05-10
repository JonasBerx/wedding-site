// sections/Footer.jsx — closing mark.
import { Link } from 'react-router-dom';
import { OliveBranch } from '../botanicals';

function FooterSection({ t, fonts }) {
  return (
    <footer style={{ padding: '70px 80px 90px', textAlign: 'center', borderTop: `1px solid ${t.rule}`, background: t.bg }}>
      <div style={{ display: 'flex', justifyContent: 'center', color: t.accentSoft, marginBottom: 28 }}>
        <OliveBranch size={280} />
      </div>
      <div style={{
        fontFamily: fonts.head, fontSize: 64, color: t.ink, fontStyle: 'italic', lineHeight: 1,
      }}>D &amp; J</div>
      <div style={{
        fontFamily: fonts.script, fontSize: 32, color: t.accent, marginTop: 14,
        transform: 'rotate(-1.5deg)', display: 'inline-block', lineHeight: 1,
      }}>see you in the woods</div>
      <div style={{
        marginTop: 32, fontFamily: fonts.label, fontSize: 11, letterSpacing: '0.5em',
        color: t.label, textTransform: 'uppercase',
      }}>VIII · VIII · MMXXVI</div>
      <div style={{ marginTop: 28 }}>
        <Link to="/registry" style={{
          fontFamily: fonts.label, fontSize: 11, letterSpacing: '0.4em',
          color: t.label, textTransform: 'uppercase', textDecoration: 'none', opacity: 0.7,
        }}>
          Gift Registry
        </Link>
      </div>
    </footer>
  );
}

export { FooterSection };
