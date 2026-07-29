import { PALETTES, WEDDING_FONTS } from '../shared';

export default function SeatingTableCard({ table, t = PALETTES.day, fonts = WEDDING_FONTS }) {
  const { table_number, name, guests } = table;
  return (
    <div style={{ border: `1px solid ${t.rule}`, background: t.paper, padding: '16px 18px 18px' }}>
      <div style={{
        fontFamily: fonts.label, fontSize: 10, letterSpacing: '0.3em',
        textTransform: 'uppercase', color: t.label,
      }}>
        Table {String(table_number).padStart(2, '0')}
      </div>
      {name && (
        <h3 style={{
          fontFamily: fonts.head, fontWeight: 400, fontSize: 21,
          margin: '6px 0 10px', color: t.ink,
        }}>{name}</h3>
      )}
      <div style={{ height: 1, background: t.rule, margin: '10px 0' }} />
      <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
        {guests.map((g, i) => (
          <li key={`${i}-${g}`} style={{ fontSize: 15, color: t.inkSoft, lineHeight: 1.8 }}>{g}</li>
        ))}
      </ul>
    </div>
  );
}
