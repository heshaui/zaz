import { _decorator, Button, Color, Component, director, Label, Node, ResolutionPolicy, view } from 'cc';
import { calculateRemainingDisplayTime, presentLoadingProgress } from '../domain/loading-progress';
import { UI_COLORS, UI_SIZES } from './ui-theme';
import { color, drawHardwarePanel, drawPhysicalButton, ensureLabel, sizeNode } from './ui-drawing';

const { ccclass, property } = _decorator;
const MINIMUM_DISPLAY_MS = 1200;

@ccclass('BootScreen')
export class BootScreen extends Component {
  @property(Label) progressLabel: Label | null = null;
  @property(Node) retryButton: Node | null = null;
  @property([Node]) marqueeLights: Node[] = [];
  private requestId = 0;

  onLoad(): void {
    view.setDesignResolutionSize(UI_SIZES.designWidth, UI_SIZES.designHeight, ResolutionPolicy.FIXED_WIDTH);
    drawHardwarePanel(this.node, 720, 1280, color(UI_COLORS.ink), color(UI_COLORS.ink), 0);
    const backdrop = this.node.getChildByName('MachineBackdrop');
    if (backdrop) drawHardwarePanel(backdrop, 430, 720, color(UI_COLORS.ink), color(UI_COLORS.aqua, 150), 8);
    const marquee = this.node.getChildByName('Marquee');
    if (marquee) drawHardwarePanel(marquee, 560, 140, color(UI_COLORS.violet), color(UI_COLORS.ink), 8);
    const brandNode = marquee?.getChildByName('BrandLabel');
    if (brandNode) ensureLabel(brandNode, 'Text', 500, 90, 44, color(UI_COLORS.paper), 'display').string = '星愿抓抓屋';
    this.marqueeLights.forEach((light) => {
      sizeNode(light, 30, 30);
      const label = light.getComponent(Label) ?? light.addComponent(Label);
      label.string = '●';
      label.fontSize = 28;
      label.color = new Color(47, 61, 70);
    });
    if (this.progressLabel) {
      this.progressLabel.fontFamily = 'Microsoft YaHei';
      this.progressLabel.fontSize = 34;
      this.progressLabel.color = color(UI_COLORS.paper);
    }
    if (this.retryButton) {
      drawPhysicalButton(this.retryButton, 132, color(UI_COLORS.coral), color(UI_COLORS.ink));
      ensureLabel(this.retryButton, 'Text', 110, 82, 24, color(UI_COLORS.paper), 'display').string = '重试';
      this.retryButton.addComponent(Button);
      this.retryButton.on(Button.EventType.CLICK, this.retry, this);
      this.retryButton.active = false;
    }
  }

  start(): void { this.beginPreload(); }
  retry(): void { if (this.retryButton) this.retryButton.active = false; this.beginPreload(); }

  private beginPreload(): void {
    const requestId = ++this.requestId;
    const startedAt = Date.now();
    this.render(0, 1);
    director.preloadScene(
      'prototype',
      (completed, total) => { if (requestId === this.requestId) this.render(completed, total); },
      (error) => {
        if (requestId !== this.requestId) return;
        if (error) {
          if (this.progressLabel) this.progressLabel.string = '加载未完成';
          if (this.retryButton) this.retryButton.active = true;
          return;
        }
        this.render(1, 1);
        const remainingMs = calculateRemainingDisplayTime(Date.now() - startedAt, MINIMUM_DISPLAY_MS);
        this.scheduleOnce(() => {
          if (requestId === this.requestId) director.loadScene('prototype');
        }, remainingMs / 1000);
      },
    );
  }

  private render(completed: number, total: number): void {
    const progress = presentLoadingProgress(completed, total, this.marqueeLights.length);
    if (this.progressLabel) this.progressLabel.string = `${progress.percent}%`;
    this.marqueeLights.forEach((light, index) => {
      const label = light.getComponent(Label);
      if (label) label.color = index < progress.litCount ? new Color(255, 200, 61) : new Color(47, 61, 70);
    });
  }
}
