import { _decorator, Button, Component, Label, Node, UIOpacity } from 'cc';
import type { PrototypeHudView } from '../domain/hud-presenter';
import {
  HOME_MACHINES,
  moveHomeMachineSelection,
  presentHomeMachineSelection,
} from '../domain/home-machine-selection';
import { HOME_UI_SIZES, UI_COLORS, UI_SIZES } from './ui-theme';
import {
  color,
  drawAngledMarquee,
  drawAssetBadge,
  drawChevronButton,
  drawConsoleDeck,
  drawLedDisplay,
  drawMachineNameTicket,
  drawPhysicalButton,
  drawScrew,
  ensureLabel,
  ensureUiNode,
} from './ui-drawing';

const { ccclass, property } = _decorator;

export interface HomePanelActions {
  onInsertCoin: () => void;
  onOpenCollection: () => void;
  onMachineSelected?: (machineId: string) => void;
}

@ccclass('HomePanel')
export class HomePanel extends Component {
  @property(Label) coinLabel: Label | null = null;
  @property(Label) ordinaryLabel: Label | null = null;
  @property(Label) feeLabel: Label | null = null;
  @property(Label) coinButtonLabel: Label | null = null;
  @property(Button) coinButton: Button | null = null;
  actions: HomePanelActions | null = null;
  private machineNameLabel: Label | null = null;
  private machinePositionLabel: Label | null = null;
  private machineFrame: Node | null = null;
  private previousMachineButton: Button | null = null;
  private nextMachineButton: Button | null = null;
  private selectedMachineIndex = 0;
  private lastFeeText = '';
  private currentStockCount: number | undefined;

  start(): void {
    const marquee = this.node.getChildByName('Marquee');
    if (marquee) {
      marquee.setPosition(0, 520);
      drawAngledMarquee(
        marquee,
        HOME_UI_SIZES.marqueeWidth,
        HOME_UI_SIZES.marqueeHeight,
        color(UI_COLORS.violet),
        color(UI_COLORS.ink),
      );
      const kicker = ensureLabel(marquee, 'KickerLabel', 300, 26, 16, color(UI_COLORS.gold), 'display');
      kicker.node.setPosition(0, 34);
      kicker.string = '软萌电玩城';
      const brand = ensureLabel(marquee, 'BrandLabel', 470, 64, 42, color(UI_COLORS.paper), 'display');
      brand.node.setPosition(0, -12);
      brand.string = '星愿抓抓屋';
    }

    this.coinLabel = this.prepareCounter('CoinCounter', 'CoinText', -158, 432, 'coin');
    this.ordinaryLabel = this.prepareCounter('CollectionButton', 'CollectionText', 158, 432, 'doll');
    this.prepareMachineShowcase();

    const homeConsole = this.node.getChildByName('HomeConsole');
    if (homeConsole) {
      drawConsoleDeck(homeConsole, 720, HOME_UI_SIZES.homeConsoleHeight);
      this.addScrew(homeConsole, 'LeftDeckScrew', -326, 88);
      this.addScrew(homeConsole, 'RightDeckScrew', 326, 88);
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

  render(view: PrototypeHudView, stockCount?: number): void {
    this.lastFeeText = view.feeText;
    this.currentStockCount = stockCount;
    if (this.coinLabel) this.coinLabel.string = view.coinText;
    if (this.ordinaryLabel) this.ordinaryLabel.string = view.ordinaryText;
    if (this.feeLabel) this.feeLabel.string = view.feeText;
    this.renderMachineSelection();
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
    icon: 'coin' | 'doll',
  ): Label | null {
    const node = this.node.getChildByName(nodeName);
    if (!node) return null;
    node.setPosition(x, y);
    drawAssetBadge(node, HOME_UI_SIZES.assetBadgeWidth, HOME_UI_SIZES.assetBadgeHeight, icon);
    const label = ensureLabel(node, labelName, 202, 48, 23, color(UI_COLORS.ink), 'data');
    label.node.setPosition(22, 0);
    return label;
  }

  private prepareMachineShowcase(): void {
    const frame = ensureUiNode(this.node, 'MachineShowcaseFrame');
    this.machineFrame = frame;
    frame.setPosition(0, -4);
    const initial = presentHomeMachineSelection(HOME_MACHINES, 0, '');
    frame.active = initial.showcaseFrameVisible;

    const nameTicket = ensureUiNode(this.node, 'MachineNameTicket');
    nameTicket.setPosition(-172, -340);
    drawMachineNameTicket(nameTicket, 274, 58);
    this.machineNameLabel = ensureLabel(nameTicket, 'MachineNameText', 238, 44, 22, color(UI_COLORS.ink), 'display');

    const previous = ensureUiNode(this.node, 'PreviousMachineButton');
    const next = ensureUiNode(this.node, 'NextMachineButton');
    previous.setPosition(-316, 18);
    next.setPosition(316, 18);
    drawChevronButton(previous, -1);
    drawChevronButton(next, 1);
    this.previousMachineButton = previous.getComponent(Button) ?? previous.addComponent(Button);
    this.nextMachineButton = next.getComponent(Button) ?? next.addComponent(Button);
    previous.on(Button.EventType.CLICK, () => this.selectMachine(-1), this);
    next.on(Button.EventType.CLICK, () => this.selectMachine(1), this);

    const position = ensureUiNode(this.node, 'MachinePosition');
    position.setPosition(212, -340);
    this.machinePositionLabel = ensureLabel(position, 'MachinePositionText', 124, 44, 18, color(UI_COLORS.paper), 'data');
  }

  private selectMachine(direction: -1 | 1): void {
    this.selectedMachineIndex = moveHomeMachineSelection(
      HOME_MACHINES,
      this.selectedMachineIndex,
      direction,
    );
    this.renderMachineSelection();
    this.actions?.onMachineSelected?.(HOME_MACHINES[this.selectedMachineIndex].id);
  }

  private renderMachineSelection(): void {
    const selection = presentHomeMachineSelection(
      HOME_MACHINES,
      this.selectedMachineIndex,
      this.lastFeeText,
      this.currentStockCount,
    );
    this.selectedMachineIndex = selection.selectedIndex;
    if (this.machineFrame) {
      this.machineFrame.active = selection.showcaseFrameVisible;
    }
    if (this.machineNameLabel) {
      this.machineNameLabel.string = selection.badgeText;
    }
    if (this.machinePositionLabel) {
      this.machinePositionLabel.string = selection.positionText;
      this.machinePositionLabel.node.parent!.active = selection.canSwitch;
    }
    if (this.previousMachineButton) this.previousMachineButton.node.active = selection.canSwitch;
    if (this.nextMachineButton) this.nextMachineButton.node.active = selection.canSwitch;
  }

  private addScrew(parent: Node, name: string, x: number, y: number): void {
    const screw = ensureUiNode(parent, name);
    screw.setPosition(x, y);
    drawScrew(screw, 8);
  }
}
