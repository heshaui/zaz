import { _decorator, Button, Component, Label, Node } from 'cc';
import type { PrototypeHudView } from '../domain/hud-presenter';
import { VirtualJoystick } from '../prototype/virtual-joystick';
import { UI_COLORS, UI_SIZES } from './ui-theme';
import {
  color,
  drawConsoleDeck,
  drawLedDisplay,
  drawPhysicalButton,
  drawScrew,
  ensureLabel,
  ensureUiNode,
} from './ui-drawing';

const { ccclass, property } = _decorator;

export interface GameConsoleActions {
  onDrop: () => void;
  onToggleCamera: () => void;
  onRequestExit: () => void;
}

@ccclass('GameConsole')
export class GameConsole extends Component {
  @property(Node) joystickNode: Node | null = null;
  @property(Button) dropButton: Button | null = null;
  @property(Button) cameraButton: Button | null = null;
  @property(Button) backButton: Button | null = null;
  @property(Label) instructionLabel: Label | null = null;
  actions: GameConsoleActions | null = null;

  onLoad(): void {
    drawConsoleDeck(this.node, 720, UI_SIZES.consoleHeight);
    this.addScrew('LeftDeckScrew', -326, 112);
    this.addScrew('RightDeckScrew', 326, 112);
    const instruction = this.node.getChildByName('InstructionSign') ?? this.node;
    instruction.setPosition(0, 74);
    drawLedDisplay(instruction, 310, 78, color(UI_COLORS.gold));
    this.instructionLabel = ensureLabel(instruction, 'InstructionText', 275, 66, 22, color(UI_COLORS.gold), 'data');
    this.dropButton = this.prepareButton('DropButton', UI_SIZES.dropButtonDiameter, UI_COLORS.coral, '下爪', this.drop);
    this.cameraButton = this.prepareButton('CameraButton', UI_SIZES.utilityButtonSize, UI_COLORS.aqua, '◉', this.toggleCamera);
    this.backButton = this.prepareButton('BackButton', UI_SIZES.utilityButtonSize, UI_COLORS.violet, '‹', this.requestExit);
    if (this.joystickNode) {
      this.joystickNode.setPosition(-220, -22);
      drawPhysicalButton(this.joystickNode, UI_SIZES.joystickDiameter, color(UI_COLORS.ink), color(UI_COLORS.aqua));
      const knob = this.joystickNode.getChildByName('JoystickKnob');
      if (knob) drawPhysicalButton(knob, 72, color(UI_COLORS.aqua), color(UI_COLORS.ink));
    }
    this.dropButton?.node.setPosition(220, -22);
  }

  render(view: PrototypeHudView): void {
    if (this.instructionLabel) this.instructionLabel.string = `${view.feeText}\n${view.instructionText}`;
    [this.dropButton, this.cameraButton, this.backButton].forEach((button) => {
      if (button) button.interactable = view.controlsEnabled;
    });
    const joystick = this.joystickNode?.getComponent(VirtualJoystick);
    if (joystick) joystick.enabled = view.controlsEnabled;
  }

  drop(): void { this.actions?.onDrop(); }
  toggleCamera(): void { this.actions?.onToggleCamera(); }
  requestExit(): void { this.actions?.onRequestExit(); }

  private prepareButton(name: string, size: number, fill: string, text: string, handler: () => void): Button | null {
    const node = this.node.getChildByName(name);
    if (!node) return null;
    drawPhysicalButton(node, size, color(fill), color(UI_COLORS.ink));
    ensureLabel(node, 'Symbol', size - 18, size - 18, size > 100 ? 36 : 52, color(UI_COLORS.paper), 'display').string = text;
    const button = node.getComponent(Button) ?? node.addComponent(Button);
    button.transition = Button.Transition.SCALE;
    button.zoomScale = 0.92;
    node.on(Button.EventType.CLICK, handler, this);
    return button;
  }

  private addScrew(name: string, x: number, y: number): void {
    const screw = ensureUiNode(this.node, name);
    screw.setPosition(x, y);
    drawScrew(screw, 8);
  }
}
