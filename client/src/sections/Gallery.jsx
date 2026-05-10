// sections/Gallery.jsx — scattered polaroids.
import { SectionHead } from './helpers';
import { PhotoPlaceholder } from '../shared';

const GALLERY_LAYOUT = [
  { x: 30,  y: 20,  w: 220, h: 260, r: -4, l: 'first hike, 2021' },
  { x: 285, y: 70,  w: 200, h: 240, r:  3, l: 'in Mostar' },
  { x: 525, y: 20,  w: 240, h: 280, r: -2, l: 'kitchen disaster' },
  { x: 800, y: 90,  w: 180, h: 220, r:  4, l: 'the proposal' },
  { x: 90,  y: 320, w: 240, h: 220, r:  2, l: 'avec maman' },
  { x: 365, y: 350, w: 220, h: 280, r: -3, l: 'ring fitting' },
  { x: 625, y: 330, w: 200, h: 240, r:  1, l: 'mas, may' },
  { x: 855, y: 370, w: 130, h: 180, r: -5, l: 'the cat — voting yes' },
];

function GallerySection({ t, fonts }) {
  return (
    <section style={{ padding: '90px 80px 110px', background: t.paper, borderTop: `1px solid ${t.rule}`, borderBottom: `1px solid ${t.rule}` }}>
      <div style={{ textAlign: 'center', marginBottom: 56 }}>
        <SectionHead t={t} fonts={fonts}
          kicker="our pile of photos" title="Look at us look at each other"
          subtitle="A scrappy collection so far. After August this becomes a proper album — and we'd love your photos in it." align="center" />
      </div>

      <div style={{ position: 'relative', height: 680, maxWidth: 1020, margin: '0 auto' }}>
        {GALLERY_LAYOUT.map((p, i) => (
          <div key={i} style={{ position: 'absolute', left: p.x, top: p.y }}>
            <PhotoPlaceholder width={p.w} height={p.h} label={p.l} theme={t} rotate={p.r} />
          </div>
        ))}
      </div>

      <div style={{
        textAlign: 'center', marginTop: 48,
        fontFamily: fonts.script, fontSize: 30, color: t.accent,
        transform: 'rotate(-1.5deg)', display: 'flex',
        justifyContent: 'center', gap: 12,
      }}>
        add yours: <span style={{ fontStyle: 'italic' }}>#JonasAndDragana</span>
      </div>
    </section>
  );
}

export { GallerySection };
