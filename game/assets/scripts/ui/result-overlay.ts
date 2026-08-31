import { _decorator, BlockInputEvents, Button, Component, Graphics, Label, Node } from 'cc';
import type { PrototypeRoundResult } from '../prototype/prototype-coordinator';
import { UI_COLORS } from './ui-theme';
import { color, drawHardwarePanel, drawPhysicalButton, ensureLabel, sizeNode } from './ui-drawing';

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

  onLoad(): void {
    this.node.addComponent(BlockInputEvents);
    drawHardwarePanel(this.node, 620, 430, color(UI_COLORS.ink, 242), color(UI_COLORS.aqua), 8);
    this.title = ensureLabel(this.node, 'Title', 500, 70, 38, color(UI_COLORS.paper), 'display');
    this.detail = ensureLabel(this.node, 'Detail', 420, 54, 26, color(UI_COLORS.gold), 'data');
    this.title.node.setPosition(0, 142);
    this.detail.node.setPosition(0, 88);
    const silhouette = new Node('DollSilhouette');
    silhouette.setParent(this.node);
    silhouette.setPosition(0, -2);
    sizeNode(silhouette, 96, 120);
    silhouette.addComponent(Graphics);
    this.button('CloseButton', -128, -150, UI_COLORS.coral, '再来一局', () => this.actions?.onClose());
    this.exchangeButton = this.button('ExchangeButton', 128, -150, UI_COLORS.violet, '去兑换', () => this.actions?.onOpenCollection());
  }

  show(result: PrototypeRoundResult, canExchange: boolean): void {
    this.node.active = true;
    if (this.title) this.title.string = result.won ? '获得普通娃娃' : '这次没有获得';
    if (this.detail) this.detail.string = result.won ? '普通娃娃 +1' : '再试一次';
    const graphics = this.node.getChildByName('DollSilhouette')?.getComponent(Graphics);
    if (graphics) {
      graphics.clear();
      graphics.fillColor = result.won && result.dollColor ? color(result.dollColor) : color(UI_COLORS.paper, 110);
      graphics.circle(0, 28, 35);
      graphics.fill();
      graphics.roundRect(-43, -55, 86, 88, 8);
      graphics.fill();
    }
    if (this.exchangeButton) this.exchangeButton.active = canExchange;
  }
  hide(): void { this.node.active = false; }

  private button(name: string, x: number, y: number, fill: string, text: string, handler: () => void): Node {
    const node = new Node(name);
    node.setParent(this.node);
    node.setPosition(x, y);
    drawPhysicalButton(node, 132, color(fill), color(UI_COLORS.ink));
    ensureLabel(node, 'Text', 108, 74, 22, color(UI_COLORS.paper), 'display').string = text;
    node.addComponent(Button);
    node.on(Button.EventType.CLICK, handler, this);
    return node;
  }
}
