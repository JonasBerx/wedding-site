import '@testing-library/jest-dom';

// jsdom does not implement matchMedia; PaletteShell -> useIsMobile calls it on mount.
if (!globalThis.window.matchMedia) {
  globalThis.window.matchMedia = (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  });
}
