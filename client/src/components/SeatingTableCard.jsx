const HEAD_FONT = '"DM Serif Display", serif';
const LABEL_FONT = '"EB Garamond", serif';

const PAPER_DARK = '#f5ecdc';
const INK = '#2e2218';
const INK_SOFT = '#5a4a3a';
const LABEL = '#7a5a3e';
const RULE = 'rgba(46,34,24,0.18)';

export default function SeatingTableCard({ table }) {
  const { table_number, name, guests } = table;
  return (
    <div style={{ border: `1px solid ${RULE}`, background: PAPER_DARK, padding: '16px 18px 18px' }}>
      <div style={{
        fontFamily: LABEL_FONT, fontSize: 10, letterSpacing: '0.3em',
        textTransform: 'uppercase', color: LABEL,
      }}>
        Tafel {String(table_number).padStart(2, '0')}
      </div>
      {name && (
        <h3 style={{
          fontFamily: HEAD_FONT, fontWeight: 400, fontSize: 21,
          margin: '6px 0 10px', color: INK,
        }}>{name}</h3>
      )}
      <div style={{ height: 1, background: 'rgba(46,34,24,0.14)', margin: '10px 0' }} />
      <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
        {guests.map((g, i) => (
          <li key={`${i}-${g}`} style={{ fontSize: 15, color: INK_SOFT, lineHeight: 1.8 }}>{g}</li>
        ))}
      </ul>
    </div>
  );
}
