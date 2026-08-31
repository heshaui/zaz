import { _decorator, BlockInputEvents, Button, Component, Label, Node } from 'cc';
import { PREMIUM_CATALOG } from '../domain/premium-catalog';
import type { PrototypeSnapshot } from '../domain/prototype-store';
import { UI_COLORS } from './ui-theme';
import { color, drawHardwarePanel, drawPhysicalButton, ensureLabel } from './ui-drawing';

const { ccclass } = _decorator;

export interface CollectionOverlayActions {
  onClose: () => void;
  onRequestExchange: (premiumId: string) => void;
}

@ccclass('CollectionOverlay')
export class CollectionOverlay extends Component {
  actions: CollectionOverlayActions | null = null;
  private ordinaryLabel: Label | null = null;
  private requirementLabel: Label | null = null;
  private messageLabel: Label | null = null;
  private snapshot: PrototypeSnapshot | null = null;

  onLoad(): void {
    this.node.addComponent(BlockInputEvents);
    drawHardwarePanel(this.node, 720, 1280, color(UI_COLORS.ink, 252), color(UI_COLORS.violet), 0);
    this.ordinaryLabel = ensureLabel(this.node, 'OrdinaryCount', 360, 64, 30, color(UI_COLORS.gold), 'data');
    this.ordinaryLabel.node.setPosition(0, 548);
    this.requirementLabel = ensureLabel(this.node, 'Requirement', 420, 48, 22, color(UI_COLORS.paper), 'body');
    this.requirementLabel.node.setPosition(0, 492);
    this.messageLabel = ensureLabel(this.node, 'Message', 500, 52, 23, color(UI_COLORS.aqua), 'body');
    this.messageLabel.node.setPosition(0, -500);
    const close = new Node('CloseButton');
    close.setParent(this.node);
    close.setPosition(-294, 548);
    drawPhysicalButton(close, 78, color(UI_COLORS.aqua), color(UI_COLORS.ink));
    ensureLabel(close, 'Symbol', 54, 54, 42, color(UI_COLORS.paper), 'display').string = '‹';
    close.addComponent(Button);
    close.on(Button.EventType.CLICK, this.close, this);

    const shelf = this.node.getChildByName('PrizeShelf');
    PREMIUM_CATALOG.forEach((prize, index) => {
      const item = shelf?.children[index];
      if (!item) return;
      const row = index < 2 ? 1 : -1;
      const column = index % 2 === 0 ? -1 : 1;
      item.setPosition(column * 168, row * 218);
      drawHardwarePanel(item, 282, 330, color(prize.colorHex), color(UI_COLORS.paper), 8);
      ensureLabel(item, 'DollGlyph', 132, 150, 72, color(UI_COLORS.ink), 'display').string = prize.name.slice(-1);
      ensureLabel(item, 'PrizeName', 230, 48, 28, color(UI_COLORS.ink), 'display').string = prize.name;
      item.getChildByName('PrizeName')?.setPosition(0, -76);
      const button = new Node('ExchangeButton');
      button.setParent(item);
      button.setPosition(0, -130);
      drawHardwarePanel(button, 190, 54, color(UI_COLORS.violet), color(UI_COLORS.ink), 8);
      ensureLabel(button, 'Text', 170, 44, 21, color(UI_COLORS.paper), 'display').string = '兑换';
      button.addComponent(Button);
      button.on(Button.EventType.CLICK, () => this.actions?.onRequestExchange(prize.id), this);
    });
  }

  render(snapshot: PrototypeSnapshot): void {
    this.node.active = true;
    this.snapshot = snapshot;
    if (this.ordinaryLabel) this.ordinaryLabel.string = `普通娃娃 ${snapshot.ordinaryDolls}`;
    if (this.requirementLabel) this.requirementLabel.string = `每件精品需要 ${snapshot.exchangeCost} 只`;
    const canExchange = snapshot.ordinaryDolls >= snapshot.exchangeCost;
    const shelf = this.node.getChildByName('PrizeShelf');
    shelf?.children.forEach((item) => {
      const button = item.getChildByName('ExchangeButton')?.getComponent(Button);
      if (button) button.interactable = canExchange;
    });
  }

  selectPrize(index: number): void {
    const prize = PREMIUM_CATALOG[index];
    if (prize) this.actions?.onRequestExchange(prize.id);
  }
  close(): void { this.node.active = false; this.actions?.onClose(); }
  showMessage(message: string): void { if (this.messageLabel) this.messageLabel.string = message; }
}
