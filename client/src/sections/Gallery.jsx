// sections/Gallery.jsx — scattered polaroids.
import { SectionHead } from './helpers';
import { PhotoPlaceholder, useIsMobile } from '../shared';
import goldenHour from '../assets/looking/IMG_2844.jpg';
import budapest from '../assets/looking/IMG_3848.jpg';
import amsterdam from '../assets/looking/IMG_3055-web.jpg';
import peru from '../assets/looking/IMG_1759.jpg';
import baku from '../assets/looking/IMG_2139.jpg';
import valparaiso from '../assets/looking/IMG_9462.jpg';
import bruges from '../assets/looking/IMG_3580.jpg';
import dressedUp from '../assets/looking/IMG_0106.jpg';

const GALLERY_LAYOUT = [
  { x: 30,  y: 20,  w: 220, h: 260, r: -4, l: 'golden hour',   src: goldenHour },
  { x: 285, y: 70,  w: 200, h: 240, r:  3, l: 'amsterdam',     src: amsterdam },
  { x: 525, y: 20,  w: 240, h: 280, r: -2, l: 'budapest',      src: budapest },
  { x: 800, y: 90,  w: 180, h: 220, r:  4, l: 'peru',          src: baku },
  { x: 90,  y: 320, w: 240, h: 220, r:  2, l: 'baku',          src: peru },
  { x: 365, y: 350, w: 220, h: 280, r: -3, l: 'valparaíso',    src: valparaiso },
  { x: 625, y: 330, w: 200, h: 240, r:  1, l: 'all dressed up', src: dressedUp },
  { x: 855, y: 370, w: 130, h: 180, r: -5, l: 'bruges',        src: bruges },
];

function GallerySection({ t, fonts }) {
  const isMobile = useIsMobile();
  return (
    <section style={{
      padding: isMobile ? '60px 20px 80px' : '90px 80px 110px',
      background: t.paper,
      borderTop: `1px solid ${t.rule}`, borderBottom: `1px solid ${t.rule}`,
    }}>
      <div style={{ textAlign: 'center', marginBottom: isMobile ? 36 : 56 }}>
        <SectionHead t={t} fonts={fonts}
          kicker="our pile of photos" title="Look at us look at each other"
          subtitle="A scrappy collection so far. After August this becomes a proper album — and we'd love your photos in it." align="center" />
      </div>

      {isMobile ? (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 14, maxWidth: 460, margin: '0 auto',
        }}>
          {GALLERY_LAYOUT.map((p, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'center' }}>
              <PhotoPlaceholder
                width="100%" height={170}
                label={p.l} theme={t} rotate={p.r * 0.5} src={p.src}
              />
            </div>
          ))}
        </div>
      ) : (
        <div style={{ position: 'relative', height: 680, maxWidth: 1020, margin: '0 auto' }}>
          {GALLERY_LAYOUT.map((p, i) => (
            <div key={i} style={{ position: 'absolute', left: p.x, top: p.y }}>
              <PhotoPlaceholder width={p.w} height={p.h} label={p.l} theme={t} rotate={p.r} src={p.src} />
            </div>
          ))}
        </div>
      )}

      <div style={{
        textAlign: 'center', marginTop: isMobile ? 32 : 48,
        fontFamily: fonts.script, fontSize: isMobile ? 24 : 30, color: t.accent,
        transform: 'rotate(-1.5deg)', display: 'flex',
        justifyContent: 'center', gap: 12, flexWrap: 'wrap',
      }}>
        <a href="/photos" style={{ color: t.accent, textDecoration: 'underline' }}>
          add yours →
        </a>
      </div>
    </section>
  );
}

export { GallerySection };
