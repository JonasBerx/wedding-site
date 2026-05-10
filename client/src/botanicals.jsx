// Botanical line illustrations — simple SVG strokes, no fills.
// Drawn from generic geometric primitives (paths, ellipses) — botanicals as
// shape, not species portraiture. Stroke color inherits via currentColor so
// each motif takes the surrounding text color.

const Sprig = ({ size = 80, style = {}, flip = false }) => (
  <svg width={size} height={size * 1.6} viewBox="0 0 50 80" fill="none"
    stroke="currentColor" strokeWidth="1" strokeLinecap="round"
    style={{ transform: flip ? 'scaleX(-1)' : 'none', ...style }}>
    <path d="M25 78 Q25 50 25 4" />
    <path d="M25 70 Q15 66 10 60 Q14 62 25 64" />
    <path d="M25 60 Q35 56 40 50 Q36 52 25 54" />
    <path d="M25 50 Q15 46 10 40 Q14 42 25 44" />
    <path d="M25 40 Q35 36 40 30 Q36 32 25 34" />
    <path d="M25 30 Q15 26 10 20 Q14 22 25 24" />
    <path d="M25 20 Q35 16 40 10 Q36 12 25 14" />
    <ellipse cx="20" cy="64" rx="6" ry="2" transform="rotate(-30 20 64)" />
    <ellipse cx="30" cy="54" rx="6" ry="2" transform="rotate(30 30 54)" />
    <ellipse cx="20" cy="44" rx="6" ry="2" transform="rotate(-30 20 44)" />
    <ellipse cx="30" cy="34" rx="6" ry="2" transform="rotate(30 30 34)" />
    <ellipse cx="20" cy="24" rx="6" ry="2" transform="rotate(-30 20 24)" />
    <ellipse cx="30" cy="14" rx="5" ry="1.8" transform="rotate(30 30 14)" />
  </svg>
);

const OliveBranch = ({ size = 200, style = {}, flip = false }) => (
  <svg width={size} height={size * 0.4} viewBox="0 0 200 80" fill="none"
    stroke="currentColor" strokeWidth="1" strokeLinecap="round"
    style={{ transform: flip ? 'scaleX(-1)' : 'none', ...style }}>
    <path d="M4 40 Q60 38 120 36 Q160 34 196 34" />
    {[20, 40, 60, 80, 100, 120, 140, 160].map((x, i) => (
      <g key={i}>
        <ellipse cx={x} cy={i % 2 ? 28 : 50} rx="9" ry="3.5"
          transform={`rotate(${i % 2 ? -25 : 25} ${x} ${i % 2 ? 28 : 50})`} />
        <line x1={x} y1="38" x2={x + (i % 2 ? -2 : 2)} y2={i % 2 ? 30 : 46} />
      </g>
    ))}
    {[30, 70, 110, 150].map((x, i) => (
      <circle key={i} cx={x} cy="38" r="2.2" />
    ))}
  </svg>
);

const Wreath = ({ size = 240, style = {} }) => (
  <svg width={size} height={size} viewBox="0 0 240 240" fill="none"
    stroke="currentColor" strokeWidth="1" strokeLinecap="round" style={style}>
    {/* outer circle of leaves, going around clockwise */}
    {Array.from({ length: 32 }).map((_, i) => {
      const angle = (i / 32) * Math.PI * 2;
      const cx = 120 + Math.cos(angle) * 95;
      const cy = 120 + Math.sin(angle) * 95;
      const rot = (angle * 180) / Math.PI + 90;
      return (
        <ellipse key={i} cx={cx} cy={cy} rx="11" ry="3.5"
          transform={`rotate(${rot} ${cx} ${cy})`} />
      );
    })}
    {/* inner accent berries */}
    {Array.from({ length: 8 }).map((_, i) => {
      const angle = (i / 8) * Math.PI * 2 + 0.2;
      const cx = 120 + Math.cos(angle) * 78;
      const cy = 120 + Math.sin(angle) * 78;
      return <circle key={i} cx={cx} cy={cy} r="2" />;
    })}
    {/* circle outline guide */}
    <circle cx="120" cy="120" r="95" strokeDasharray="1 8" opacity="0.35" />
  </svg>
);

const Vine = ({ width = 300, height = 60, style = {} }) => (
  <svg width={width} height={height} viewBox="0 0 300 60" fill="none"
    stroke="currentColor" strokeWidth="1" strokeLinecap="round" style={style}>
    <path d="M2 30 Q50 10 100 30 T200 30 T298 30" />
    {[40, 80, 120, 160, 200, 240].map((x, i) => (
      <g key={i}>
        <ellipse cx={x} cy={i % 2 ? 14 : 46} rx="8" ry="3"
          transform={`rotate(${i % 2 ? -20 : 20} ${x} ${i % 2 ? 14 : 46})`} />
        <line x1={x} y1="30" x2={x} y2={i % 2 ? 18 : 42} />
      </g>
    ))}
  </svg>
);

const Wildflower = ({ size = 60, style = {} }) => (
  <svg width={size} height={size * 1.4} viewBox="0 0 40 56" fill="none"
    stroke="currentColor" strokeWidth="1" strokeLinecap="round" style={style}>
    <path d="M20 56 Q20 38 20 18" />
    {/* flower head — five petals around center */}
    {Array.from({ length: 6 }).map((_, i) => {
      const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
      const cx = 20 + Math.cos(a) * 6;
      const cy = 12 + Math.sin(a) * 6;
      return <ellipse key={i} cx={cx} cy={cy} rx="3.5" ry="2"
        transform={`rotate(${(a * 180) / Math.PI + 90} ${cx} ${cy})`} />;
    })}
    <circle cx="20" cy="12" r="1.5" />
    {/* leaves */}
    <ellipse cx="14" cy="34" rx="5" ry="2" transform="rotate(-30 14 34)" />
    <ellipse cx="26" cy="44" rx="5" ry="2" transform="rotate(30 26 44)" />
  </svg>
);

const Lavender = ({ size = 50, style = {} }) => (
  <svg width={size} height={size * 1.8} viewBox="0 0 30 54" fill="none"
    stroke="currentColor" strokeWidth="1" strokeLinecap="round" style={style}>
    <path d="M15 54 L15 22" />
    {/* bud cluster — small ovals stacked */}
    {[0, 1, 2, 3, 4, 5].map((i) => (
      <g key={i} transform={`translate(0 ${i * 4})`}>
        <ellipse cx="11" cy="20" rx="2.2" ry="1.5" />
        <ellipse cx="19" cy="20" rx="2.2" ry="1.5" />
        <ellipse cx="15" cy="18" rx="2" ry="1.5" />
      </g>
    ))}
    <ellipse cx="15" cy="18" rx="2.5" ry="2" />
  </svg>
);

const CornerFlourish = ({ size = 140, style = {}, flip = false }) => (
  <svg width={size} height={size} viewBox="0 0 140 140" fill="none"
    stroke="currentColor" strokeWidth="1" strokeLinecap="round"
    style={{ transform: flip ? 'scaleX(-1)' : 'none', ...style }}>
    <path d="M4 4 Q40 20 60 50 Q70 70 70 100" />
    <path d="M4 4 Q20 40 50 60 Q70 70 100 70" />
    {/* leaves along the curves */}
    {[
      [22, 14, -20], [38, 28, -30], [52, 44, -40],
      [14, 22, 60], [28, 38, 50], [44, 52, 40],
      [62, 65, 0], [68, 80, -10], [80, 68, 80],
    ].map(([x, y, r], i) => (
      <ellipse key={i} cx={x} cy={y} rx="6" ry="2"
        transform={`rotate(${r} ${x} ${y})`} />
    ))}
    <circle cx="60" cy="50" r="1.6" />
    <circle cx="50" cy="60" r="1.6" />
  </svg>
);

const Ribbon = ({ width = 260, style = {}, label = '' }) => (
  <svg width={width} height={width * 0.22} viewBox="0 0 260 56" fill="none"
    stroke="currentColor" strokeWidth="1" strokeLinecap="round" style={style}>
    <path d="M2 28 L20 10 L240 10 L258 28 L240 46 L20 46 Z" />
    <path d="M20 10 L30 28 L20 46" />
    <path d="M240 10 L230 28 L240 46" />
    {label && (
      <text x="130" y="33" textAnchor="middle"
        style={{ font: '500 13px "EB Garamond", serif', letterSpacing: '0.3em' }}
        stroke="none" fill="currentColor">{label.toUpperCase()}</text>
    )}
  </svg>
);

export { Sprig, OliveBranch, Wreath, Vine, Wildflower, Lavender, CornerFlourish, Ribbon };
