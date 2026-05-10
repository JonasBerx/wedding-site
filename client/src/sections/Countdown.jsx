// sections/Countdown.jsx — small countdown block under the hero.
import { HairRule } from './helpers';
import { CountdownBlock } from '../shared';

function CountdownSection({ t, fonts }) {
  return (
    <section style={{ padding: '40px 80px 90px', textAlign: 'center' }}>
      <HairRule t={t}>
        <span style={{
          fontFamily: fonts.script, fontSize: 32, color: t.accent,
          transform: 'rotate(-1deg)', display: 'inline-block', lineHeight: 1,
        }}>counting the days</span>
      </HairRule>
      <div style={{ marginTop: 36, display: 'flex', justifyContent: 'center' }}>
        <CountdownBlock font={fonts.head} labelFont={fonts.label}
          color={t.ink} accent={t.accent} separator="·" />
      </div>
    </section>
  );
}

export { CountdownSection };
