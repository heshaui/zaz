import { _decorator, BlockInputEvents, Button, Component, Graphics, Label, Node } from 'cc';
import type { PrototypeRoundResult } from '../prototype/prototype-coordinator';
import { resolveOrdinaryDollImagePath } from '../domain/home-machine-selection';
import { UI_COLORS } from './ui-theme';
import {
  color,
  drawCommandButton,
  drawPhysicalButton,
  drawTicketPanel,
  ensureLabel,
  ensureUiNode,
  sizeNode,
} from './ui-drawing';
import { attachResourceImage, type UiImageCleanup } from './ui-image-loader';

const { ccclass } = _decorator;

export interface ResultOverlayActions {
  onClose: () => void;
  onOpenCollection: () => void;
}

@ccclass('ResultOverlay')
export class ResultOverlay extends Component {
  actions: ResultOverlayActions | null = null;
  private title: Label | null = null;
  private detail: Label | null = null;
  private exchangeButton: Node | null = null;
  private replayButton: Node | null = null;
  private dollImage: Node | null = null;
  private dollImageCleanup: UiImageCleanup | null = null;

  onLoad(): void {
    this.node.addComponent(BlockInputEvents);
    drawTicketPanel(this.node, 620, 480);
    this.title = ensureLabel(this.node, 'Title', 480, 70, 38, color(UI_COLORS.paper), 'display');
    this.detail = ensureLabel(this.node, 'Detail', 420, 54, 26, color(UI_COLORS.ink), 'data');
    this.title.node.setPosition(0, 178);
    this.detail.node.setPosition(0, 106);
    const silhouette = ensureUiNode(this.node, 'DollSilhouette');
    silhouette.setPosition(0, 15);
    sizeNode(silhouette, 96, 120);
    if (!silhouette.getComponent(Graphics)) silhouette.addComponent(Graphics);
    this.dollImage = ensureUiNode(this.node, 'DollImage');
    this.dollImage.setPosition(0, -12);
    sizeNode(this.dollImage, 180, 180);
    this.dollImage.active = false;
    this.replayButton = this.commandButton('ReplayButton', 0, -170, UI_COLORS.coral, '再来一局', () => this.actions?.onClose());
    this.exchangeButton = this.commandButton('ExchangeButton', 138, -170, UI_COLORS.violet, '去兑换', () => this.actions?.onOpenCollection());
    this.iconButton('CloseButton', 260, 180, '×', () => this.actions?.onClose());
  }

  show(result: PrototypeRoundResult, canExchange: boolean, machineId: string): void {
    this.node.active = true;
    if (this.title) this.title.string = result.won ? '获得普通娃娃' : '这次没有获得';
    if (this.detail) this.detail.string = result.won ? '普通娃娃 +1' : '再试一次';
    this.dollImageCleanup?.();
    this.dollImageCleanup = null;
    if (this.dollImage) this.dollImage.active = false;
    const silhouette = this.node.getChildByName('DollSilhouette');
    if (silhouette) silhouette.active = true;
    const graphics = silhouette?.getComponent(Graphics);
    if (graphics) {
      graphics.clear();
      graphics.fillColor = result.won && result.dollColor ? color(result.dollColor) : color('#A9BBC1');
      graphics.circle(0, 28, 35);
      graphics.fill();
      graphics.roundRect(-43, -55, 86, 88, 8);
      graphics.fill();
    }
    const imagePath = result.won ? resolveOrdinaryDollImagePath(machineId) : null;
    if (imagePath && this.dollImage) {
      const imageNode = this.dollImage;
      this.dollImageCleanup = attachResourceImage(imageNode, imagePath, 180, 180, (loaded) => {
        if (!loaded || !imageNode.isValid) return;
        imageNode.active = true;
        if (silhouette?.isValid) silhouette.active = false;
      });
    }
    if (this.exchangeButton) this.exchangeButton.active = canExchange;
    this.replayButton?.setPosition(canExchange ? -138 : 0, -170);
  }
  hide(): void { this.node.active = false; }

  onDestroy(): void {
    this.dollImageCleanup?.();
    this.dollImageCleanup = null;
  }

  private commandButton(name: string, x: number, y: number, fill: string, text: string, handler: () => void): Node {
    const node = ensureUiNode(this.node, name);
    node.setPosition(x, y);
    drawCommandButton(node, 220, 78, color(fill), color(UI_COLORS.ink));
    ensureLabel(node, 'Text', 188, 60, 24, color(UI_COLORS.paper), 'display').string = text;
    node.addComponent(Button);
    node.on(Button.EventType.CLICK, handler, this);
    return node;
  }

  private iconButton(name: string, x: number, y: number, text: string, handler: () => void): Node {
    const node = ensureUiNode(this.node, name);
    node.setPosition(x, y);
    drawPhysicalButton(node, 70, color(UI_COLORS.aqua), color(UI_COLORS.ink));
    ensureLabel(node, 'Symbol', 48, 48, 38, color(UI_COLORS.paper), 'display').string = text;
    node.addComponent(Button);
    node.on(Button.EventType.CLICK, handler, this);
    return node;
  }
}
