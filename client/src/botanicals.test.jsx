import { describe, test, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Sprig, OliveBranch, Wreath } from './botanicals';

describe('botanicals', () => {
  test('Sprig renders an svg at its default size', () => {
    const { container } = render(<Sprig />);
    const svg = container.querySelector('svg');
    expect(svg).not.toBeNull();
    expect(svg.getAttribute('width')).toBe('80');
  });

  test('Sprig respects the size prop', () => {
    const { container } = render(<Sprig size={120} />);
    expect(container.querySelector('svg').getAttribute('width')).toBe('120');
  });

  test('OliveBranch respects the size prop', () => {
    const { container } = render(<OliveBranch size={300} />);
    expect(container.querySelector('svg').getAttribute('width')).toBe('300');
  });

  test('Wreath renders an svg', () => {
    const { container } = render(<Wreath />);
    expect(container.querySelector('svg')).not.toBeNull();
  });
});
