import { describe, expect, it } from 'vitest';
import drawingSource from '../../game/assets/scripts/ui/ui-drawing.ts?raw';

describe('home machine controls contract', () => {
  it('左右选择按钮的尖端与 direction 方向一致', () => {
    const chevronFunction = drawingSource.match(
      /export function drawChevronButton[\s\S]*?\n}\n/,
    )?.[0];

    expect(chevronFunction).toBeDefined();
    expect(chevronFunction).toContain('graphics.moveTo(direction * -8, 18);');
    expect(chevronFunction).toContain('graphics.lineTo(direction * 10, 0);');
    expect(chevronFunction).toContain('graphics.lineTo(direction * -8, -18);');
  });
});
