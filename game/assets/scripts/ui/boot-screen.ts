import {
  _decorator,
  Button,
  Component,
  director,
  ImageAsset,
  Label,
  LabelOutline,
  Node,
  ResolutionPolicy,
  resources,
  Sprite,
  SpriteFrame,
  Texture2D,
  tween,
  UIOpacity,
  view,
} from 'cc';
import {
  calculateLoadingBarGeometry,
  calculateRemainingDisplayTime,
  presentLoadingProgress,
} from '../domain/loading-progress';
import { resolveCoverSize } from '../domain/portrait-layout';
import { UI_COLORS, UI_SIZES } from './ui-theme';
import {
  color,
  drawCommandButton,
  drawHardwarePanel,
  drawLoadingProgressBar,
  ensureLabel,
  ensureUiNode,
  sizeNode,
} from './ui-drawing';

const { ccclass, property } = _decorator;
const MINIMUM_DISPLAY_MS = 1200;
const BACKGROUND_RESOURCE_PATH = 'backgrounds/loading-dream-arcade-portrait';
const PROGRESS_TRACK_WIDTH = 480;
const PROGRESS_TRACK_HEIGHT = 42;
const PROGRESS_MARKER_RADIUS = 14;

@ccclass('BootScreen')
export class BootScreen extends Component {
  @property(Label) progressLabel: Label | null = null;
  @property(Node) retryButton: Node | null = null;
  @property([Node]) marqueeLights: Node[] = [];
  private requestId = 0;
  private progressTrack: Node | null = null;
  private backgroundNode: Node | null = null;
  private backgroundTexture: Texture2D | null = null;
  private backgroundFrame: SpriteFrame | null = null;

  onLoad(): void {
    view.setDesignResolutionSize(UI_SIZES.designWidth, UI_SIZES.designHeight, ResolutionPolicy.FIXED_WIDTH);
    view.on('canvas-resize', this.layoutBackground, this);
    this.layoutBackground();
    const backdrop = this.node.getChildByName('MachineBackdrop');
    const marquee = this.node.getChildByName('Marquee');
    if (backdrop) backdrop.active = false;
    if (marquee) marquee.active = false;
    this.marqueeLights.forEach((light) => { light.active = false; });

    this.createBackground();
    this.createBrandTitle();
    this.createProgressTrack();
    if (this.progressLabel) {
      this.progressLabel.fontFamily = 'Microsoft YaHei';
      this.progressLabel.fontSize = 30;
      this.progressLabel.isBold = true;
      this.progressLabel.color = color(UI_COLORS.ink);
      this.progressLabel.node.setPosition(0, -505);
      const outline = this.progressLabel.node.getComponent(LabelOutline)
        ?? this.progressLabel.node.addComponent(LabelOutline);
      outline.color = color(UI_COLORS.paper, 220);
      outline.width = 3;
    }
    if (this.retryButton) {
      this.retryButton.setPosition(0, -570);
      drawCommandButton(this.retryButton, 180, 68, color(UI_COLORS.coral), color(UI_COLORS.ink));
      ensureLabel(this.retryButton, 'Text', 160, 54, 24, color(UI_COLORS.paper), 'display').string = '重试';
      this.retryButton.getComponent(Button) ?? this.retryButton.addComponent(Button);
      this.retryButton.on(Button.EventType.CLICK, this.retry, this);
      this.retryButton.active = false;
    }
  }

  onDestroy(): void {
    view.off('canvas-resize', this.layoutBackground, this);
    this.backgroundFrame?.destroy();
    this.backgroundTexture?.destroy();
    this.backgroundNode = null;
    this.backgroundFrame = null;
    this.backgroundTexture = null;
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
    if (!this.progressTrack) return;
    const geometry = calculateLoadingBarGeometry(
      progress.ratio,
      PROGRESS_TRACK_WIDTH,
      PROGRESS_MARKER_RADIUS,
    );
    drawLoadingProgressBar(
      this.progressTrack,
      PROGRESS_TRACK_WIDTH,
      PROGRESS_TRACK_HEIGHT,
      geometry.fillWidth,
      geometry.markerX,
      PROGRESS_MARKER_RADIUS,
    );
  }

  private createBackground(): void {
    const backgroundNode = ensureUiNode(this.node, 'LoadingBackground');
    this.backgroundNode = backgroundNode;
    backgroundNode.setSiblingIndex(0);
    backgroundNode.setPosition(0, 0);
    this.layoutBackground();
    const sprite = backgroundNode.getComponent(Sprite) ?? backgroundNode.addComponent(Sprite);
    sprite.sizeMode = Sprite.SizeMode.CUSTOM;
    resources.load(BACKGROUND_RESOURCE_PATH, ImageAsset, (error, imageAsset) => {
      if (error || !imageAsset || !this.node.isValid || !backgroundNode.isValid) return;
      this.backgroundTexture = new Texture2D('LoadingDreamArcadeTexture');
      this.backgroundTexture.image = imageAsset;
      this.backgroundTexture.setWrapMode(
        Texture2D.WrapMode.CLAMP_TO_EDGE,
        Texture2D.WrapMode.CLAMP_TO_EDGE,
      );
      this.backgroundFrame = new SpriteFrame('LoadingDreamArcadeFrame');
      this.backgroundFrame.texture = this.backgroundTexture;
      sprite.spriteFrame = this.backgroundFrame;
    });
  }

  private layoutBackground(): void {
    const visibleSize = view.getVisibleSize();
    const coverSize = resolveCoverSize(visibleSize.width, visibleSize.height, 9 / 16);

    // 长屏会得到高于 1280 的设计高度，背景必须覆盖实际可视区，超出部分由屏幕边缘自然裁切。
    drawHardwarePanel(
      this.node,
      coverSize.width,
      coverSize.height,
      color('#EAF7F5'),
      color('#EAF7F5'),
      0,
    );
    if (this.backgroundNode) sizeNode(this.backgroundNode, coverSize.width, coverSize.height);
  }

  private createBrandTitle(): void {
    const titleNode = ensureUiNode(this.node, 'BrandTitle');
    titleNode.setPosition(0, 420);
    sizeNode(titleNode, 640, 118);
    const title = ensureLabel(
      titleNode,
      'Text',
      620,
      104,
      58,
      color(UI_COLORS.paper),
      'display',
    );
    title.string = '星愿抓抓屋';
    const outline = title.node.getComponent(LabelOutline) ?? title.node.addComponent(LabelOutline);
    outline.color = color(UI_COLORS.ink, 230);
    outline.width = 6;

    const opacity = titleNode.getComponent(UIOpacity) ?? titleNode.addComponent(UIOpacity);
    opacity.opacity = 0;
    tween(opacity).to(0.42, { opacity: 255 }).start();
  }

  private createProgressTrack(): void {
    this.progressTrack = ensureUiNode(this.node, 'LoadingTrack');
    this.progressTrack.setPosition(0, -445);
    drawLoadingProgressBar(
      this.progressTrack,
      PROGRESS_TRACK_WIDTH,
      PROGRESS_TRACK_HEIGHT,
      0,
      -PROGRESS_TRACK_WIDTH / 2 + PROGRESS_MARKER_RADIUS,
      PROGRESS_MARKER_RADIUS,
    );
  }
}
