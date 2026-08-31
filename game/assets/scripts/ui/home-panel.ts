import { _decorator, Button, Component, Label, Node, UIOpacity } from 'cc';
import type { PrototypeHudView } from '../domain/hud-presenter';
import { UI_COLORS, UI_SIZES } from './ui-theme';
import {
  color,
  drawBeveledPanel,
  drawConsoleDeck,
  drawLedDisplay,
  drawPhysicalButton,
  drawScrew,
  ensureLabel,
  ensureUiNode,
} from './ui-drawing';

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
      drawBeveledPanel(
        marquee,
        570,
        116,
        color(UI_COLORS.coral),
        color(UI_COLORS.ink),
        color(UI_COLORS.gold),
      );
      const brand = ensureLabel(marquee, 'BrandLabel', 470, 76, 40, color(UI_COLORS.paper), 'display');
      brand.string = '星愿抓抓屋';
      this.addScrew(marquee, 'LeftScrew', -252, 0);
      this.addScrew(marquee, 'RightScrew', 252, 0);
    }

    this.coinLabel = this.prepareCounter('CoinCounter', 'CoinText', -190, 445, UI_COLORS.gold);
    this.ordinaryLabel = this.prepareCounter('CollectionButton', 'CollectionText', 190, 445, UI_COLORS.aqua);

    const homeConsole = this.node.getChildByName('HomeConsole');
    if (homeConsole) {
      drawConsoleDeck(homeConsole, 720, UI_SIZES.consoleHeight);
      this.addScrew(homeConsole, 'LeftDeckScrew', -326, 112);
      this.addScrew(homeConsole, 'RightDeckScrew', 326, 112);
    }
    const feeTicket = this.node.getChildByPath('HomeConsole/FeeTicket');
    if (feeTicket) {
      feeTicket.setPosition(-150, 2);
      drawLedDisplay(feeTicket, 280, 84, color(UI_COLORS.gold));
      this.feeLabel = ensureLabel(feeTicket, 'FeeText', 238, 60, 27, color(UI_COLORS.gold), 'data');
    }
    const buttonNode = this.node.getChildByPath('HomeConsole/CoinButton');
    if (buttonNode) {
      buttonNode.setPosition(218, 6);
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
    const buttonNode = this.coinButton?.node;
    if (!buttonNode) return;
    const opacity = buttonNode.getComponent(UIOpacity) ?? buttonNode.addComponent(UIOpacity);
    opacity.opacity = view.coinButtonEnabled ? 255 : 205;
  }

  insertCoin(): void { this.actions?.onInsertCoin(); }
  openCollection(): void { this.actions?.onOpenCollection(); }

  private prepareCounter(
    nodeName: string,
    labelName: string,
    x: number,
    y: number,
    accent: string,
  ): Label | null {
    const node = this.node.getChildByName(nodeName);
    if (!node) return null;
    node.setPosition(x, y);
    drawLedDisplay(node, 288, 72, color(accent));
    return ensureLabel(node, labelName, 252, 54, 24, color(accent), 'data');
  }

  private addScrew(parent: Node, name: string, x: number, y: number): void {
    const screw = ensureUiNode(parent, name);
    screw.setPosition(x, y);
    drawScrew(screw, 8);
  }
}
