import { _decorator, Button, Component, Label, Node, UIOpacity } from 'cc';
import type { PrototypeHudView } from '../domain/hud-presenter';
import { UI_COLORS, UI_SIZES } from './ui-theme';
import { color, drawHardwarePanel, drawPhysicalButton, ensureLabel } from './ui-drawing';

const { ccclass, property } = _decorator;

export interface HomePanelActions {
  onInsertCoin: () => void;
  onOpenCollection: () => void;
}

@ccclass('HomePanel')
export class HomePanel extends Component {
  @property(Label) coinLabel: Label | null = null;
  @property(Label) ordinaryLabel: Label | null = null;
  @property(Label) feeLabel: Label | null = null;
  @property(Label) coinButtonLabel: Label | null = null;
  @property(Button) coinButton: Button | null = null;
  actions: HomePanelActions | null = null;

  start(): void {
    const marquee = this.node.getChildByName('Marquee');
    if (marquee) {
      drawHardwarePanel(marquee, 520, 96, color(UI_COLORS.violet), color(UI_COLORS.ink), 8);
      const brand = ensureLabel(marquee, 'BrandLabel', 480, 76, 42, color(UI_COLORS.paper), 'display');
      brand.string = '星愿抓抓屋';
    }
    this.coinLabel = this.prepareCounter('CoinCounter', 'CoinText', -210, 450);
    this.ordinaryLabel = this.prepareCounter('CollectionButton', 'CollectionText', 210, 450);
    const feeTicket = this.node.getChildByPath('HomeConsole/FeeTicket');
    if (feeTicket) {
      drawHardwarePanel(feeTicket, 250, 72, color(UI_COLORS.gold), color(UI_COLORS.ink), 8);
      this.feeLabel = ensureLabel(feeTicket, 'FeeText', 220, 60, 26, color(UI_COLORS.ink), 'data');
    }
    const buttonNode = this.node.getChildByPath('HomeConsole/CoinButton');
    if (buttonNode) {
      drawPhysicalButton(buttonNode, UI_SIZES.dropButtonDiameter, color(UI_COLORS.coral), color(UI_COLORS.ink));
      this.coinButtonLabel = ensureLabel(buttonNode, 'CoinButtonText', 150, 120, 30, color(UI_COLORS.paper), 'display');
      this.coinButton = buttonNode.getComponent(Button) ?? buttonNode.addComponent(Button);
      this.coinButton.transition = Button.Transition.SCALE;
      this.coinButton.zoomScale = 0.94;
      buttonNode.on(Button.EventType.CLICK, this.insertCoin, this);
    }
    const collection = this.node.getChildByName('CollectionButton');
    const collectionButton = collection?.getComponent(Button) ?? collection?.addComponent(Button);
    collection?.on(Button.EventType.CLICK, this.openCollection, this);
    if (collectionButton) collectionButton.transition = Button.Transition.SCALE;
  }

  render(view: PrototypeHudView): void {
    if (this.coinLabel) this.coinLabel.string = view.coinText;
    if (this.ordinaryLabel) this.ordinaryLabel.string = view.ordinaryText;
    if (this.feeLabel) this.feeLabel.string = view.feeText;
    if (this.coinButtonLabel) this.coinButtonLabel.string = '投币\n开始';
    if (this.coinButton) this.coinButton.interactable = view.coinButtonEnabled;
    const opacity = this.node.getComponent(UIOpacity) ?? this.node.addComponent(UIOpacity);
    opacity.opacity = view.coinButtonEnabled ? 255 : 205;
  }

  insertCoin(): void { this.actions?.onInsertCoin(); }
  openCollection(): void { this.actions?.onOpenCollection(); }

  private prepareCounter(nodeName: string, labelName: string, x: number, y: number): Label | null {
    const node = this.node.getChildByName(nodeName);
    if (!node) return null;
    node.setPosition(x, y);
    drawHardwarePanel(node, 250, 66, color(UI_COLORS.ink), color(UI_COLORS.aqua), 6);
    return ensureLabel(node, labelName, 225, 56, 24, color(UI_COLORS.gold), 'data');
  }
}
