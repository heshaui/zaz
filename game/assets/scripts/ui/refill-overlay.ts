import { _decorator, BlockInputEvents, Component, tween, UIOpacity } from 'cc';
import { UI_COLORS } from './ui-theme';
import { color, drawHardwarePanel } from './ui-drawing';

const { ccclass } = _decorator;

@ccclass('RefillOverlay')
export class RefillOverlay extends Component {
  private opacity: UIOpacity | null = null;

  onLoad(): void {
    this.opacity = this.node.getComponent(UIOpacity) ?? this.node.addComponent(UIOpacity);
    this.node.addComponent(BlockInputEvents);
    drawHardwarePanel(this.node, 720, 1280, color(UI_COLORS.ink), color(UI_COLORS.ink), 0);
  }

  play(onReveal: () => void): Promise<void> {
    this.node.active = true;
    if (!this.opacity) return Promise.resolve();
    this.opacity.opacity = 0;
    // 遮板完全覆盖后才补充场内对象，Promise 在淡出结束后释放输入，避免中间帧被操作。
    return new Promise((resolve) => {
      tween(this.opacity!)
        .to(0.22, { opacity: 255 })
        .call(onReveal)
        .to(0.42, { opacity: 0 })
        .call(() => { this.node.active = false; resolve(); })
        .start();
    });
  }
}
