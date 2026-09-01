import { _decorator, BlockInputEvents, Button, Component, Label, Node } from 'cc';
import { PREMIUM_CATALOG, presentPremiumCatalog } from '../domain/premium-catalog';
import type { PrototypeSnapshot } from '../domain/prototype-store';
import { UI_COLORS } from './ui-theme';
import {
  color,
  drawBeveledPanel,
  drawCommandButton,
  drawHardwarePanel,
  drawPhysicalButton,
  ensureLabel,
  ensureUiNode,
} from './ui-drawing';
import { attachResourceImage, type UiImageCleanup } from './ui-image-loader';

const { ccclass } = _decorator;
const PREMIUM_NODE_NAMES = ['PremiumRabbit', 'PremiumCat', 'PremiumDog', 'PremiumCow'] as const;

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
  private readonly imageCleanups: UiImageCleanup[] = [];

  onLoad(): void {
    this.node.addComponent(BlockInputEvents);
    drawHardwarePanel(this.node, 720, 1280, color('#12212B', 252), color(UI_COLORS.aqua), 0);
    const header = ensureUiNode(this.node, 'CabinetHeader');
    header.setPosition(0, 515);
    drawBeveledPanel(header, 620, 132, color(UI_COLORS.violet), color(UI_COLORS.ink), color(UI_COLORS.gold));
    ensureLabel(header, 'Title', 420, 58, 34, color(UI_COLORS.paper), 'display').string = '精品陈列柜';
    header.getChildByName('Title')?.setPosition(0, 30);
    this.ordinaryLabel = ensureLabel(this.node, 'OrdinaryCount', 360, 64, 30, color(UI_COLORS.gold), 'data');
    this.ordinaryLabel.node.setPosition(0, 485);
    this.requirementLabel = ensureLabel(this.node, 'Requirement', 420, 48, 22, color(UI_COLORS.paper), 'body');
    this.requirementLabel.node.setPosition(0, 440);
    this.messageLabel = ensureLabel(this.node, 'Message', 500, 52, 23, color(UI_COLORS.aqua), 'body');
    this.messageLabel.node.setPosition(0, -500);
    const close = ensureUiNode(this.node, 'CloseButton');
    close.setPosition(-294, 515);
    drawPhysicalButton(close, 78, color(UI_COLORS.aqua), color(UI_COLORS.ink));
    ensureLabel(close, 'Symbol', 54, 54, 42, color(UI_COLORS.paper), 'display').string = '‹';
    close.addComponent(Button);
    close.on(Button.EventType.CLICK, this.close, this);

    const shelf = this.node.getChildByName('PrizeShelf');
    this.prepareShelfRail(shelf, 'UpperShelfRail', 30);
    this.prepareShelfRail(shelf, 'LowerShelfRail', -405);
    PREMIUM_CATALOG.forEach((prize, index) => {
      const item = shelf?.getChildByName(PREMIUM_NODE_NAMES[index]);
      if (!item) return;
      const row = index < 2 ? 1 : -1;
      const column = index % 2 === 0 ? -1 : 1;
      item.setPosition(column * 168, row * 218);
      drawBeveledPanel(item, 282, 330, color('#EAF4F4'), color(UI_COLORS.ink), color(prize.colorHex));
      const ownedCount = ensureLabel(item, 'OwnedCount', 72, 38, 22, color(prize.colorHex), 'data');
      ownedCount.string = '×0';
      ownedCount.node.setPosition(92, 132);
      const glyph = ensureLabel(item, 'DollGlyph', 132, 150, 72, color(prize.colorHex), 'display');
      glyph.string = prize.name.slice(-1);
      const dollImage = ensureUiNode(item, 'DollImage');
      dollImage.setPosition(0, 28);
      dollImage.active = false;
      this.imageCleanups.push(attachResourceImage(dollImage, prize.imagePath, 168, 168, (loaded) => {
        if (!loaded || !dollImage.isValid) return;
        dollImage.active = true;
        if (glyph.node.isValid) glyph.node.active = false;
      }));
      ensureLabel(item, 'PrizeName', 230, 48, 28, color(UI_COLORS.ink), 'display').string = prize.name;
      item.getChildByName('PrizeName')?.setPosition(0, -76);
      const button = ensureUiNode(item, 'ExchangeButton');
      button.setPosition(0, -130);
      drawCommandButton(button, 190, 54, color(UI_COLORS.violet), color(UI_COLORS.ink));
      ensureLabel(button, 'Text', 170, 44, 21, color(UI_COLORS.paper), 'display').string = '兑换';
      button.addComponent(Button);
      button.on(Button.EventType.CLICK, () => this.actions?.onRequestExchange(prize.id), this);
    });
  }

  render(snapshot: PrototypeSnapshot): void {
    this.node.active = true;
    this.snapshot = snapshot;
    const catalogView = presentPremiumCatalog(snapshot.premiumDolls);
    if (this.ordinaryLabel) {
      this.ordinaryLabel.string = `普通娃娃 ${snapshot.ordinaryDolls} · 精品 ${catalogView.totalOwned}`;
    }
    if (this.requirementLabel) this.requirementLabel.string = `每件精品需要 ${snapshot.exchangeCost} 只`;
    const canExchange = snapshot.ordinaryDolls >= snapshot.exchangeCost;
    const shelf = this.node.getChildByName('PrizeShelf');
    PREMIUM_NODE_NAMES.map((name) => shelf?.getChildByName(name)).forEach((item, index) => {
      if (!item) return;
      const ownedCount = item.getChildByName('OwnedCount')?.getComponent(Label);
      if (ownedCount) ownedCount.string = catalogView.items[index]?.ownedText ?? '×0';
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

  onDestroy(): void {
    this.imageCleanups.splice(0).forEach((cleanup) => cleanup());
  }

  private prepareShelfRail(shelf: Node | null, name: string, y: number): void {
    if (!shelf) return;
    const rail = ensureUiNode(shelf, name);
    rail.setPosition(0, y);
    drawBeveledPanel(rail, 660, 26, color(UI_COLORS.aqua), color(UI_COLORS.ink), color(UI_COLORS.paper), 4);
    rail.setSiblingIndex(0);
  }
}
