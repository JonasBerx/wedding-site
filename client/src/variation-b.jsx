// variation-b.jsx — "Le Verger" composer.
// Each section lives in its own file under sections/. This file just
// builds the palette + font config and arranges them in order.
import { usePalette } from './shared';
import { HeroSection } from './sections/Hero';
import { CountdownSection } from './sections/Countdown';
import { ScheduleSection } from './sections/Schedule';
import { VenueSection } from './sections/Venue';
import { MenuSection } from './sections/Menu';
import { DressCodeSection } from './sections/DressCode';
import { GallerySection } from './sections/Gallery';
import { RegistrySection } from './sections/Registry';
import { RsvpSection } from './sections/Rsvp';
import { FaqSection } from './sections/Faq';
import { FooterSection } from './sections/Footer';

function VariationB({ mode = 'day' }) {
  const t = usePalette(mode);
  const fonts = {
    head:   '"DM Serif Display", serif',
    body:   '"EB Garamond", Georgia, serif',
    script: '"Caveat", cursive',
    label:  '"EB Garamond", serif',
  };

  return (
    <div style={{
      width: '100%', minHeight: '100%', background: t.bg, color: t.ink,
      fontFamily: fonts.body, position: 'relative', overflow: 'hidden',
      transition: 'background .4s ease, color .4s ease',
    }}>
      <HeroSection      t={t} fonts={fonts} />
      <CountdownSection t={t} fonts={fonts} />
      <ScheduleSection  t={t} fonts={fonts} />
      <VenueSection     t={t} fonts={fonts} />
      <MenuSection      t={t} fonts={fonts} />
      <DressCodeSection t={t} fonts={fonts} />
      <GallerySection   t={t} fonts={fonts} />
      <RegistrySection  t={t} fonts={fonts} />
      <RsvpSection      t={t} fonts={fonts} />
      <FaqSection       t={t} fonts={fonts} />
      <FooterSection    t={t} fonts={fonts} />
    </div>
  );
}

export { VariationB };
