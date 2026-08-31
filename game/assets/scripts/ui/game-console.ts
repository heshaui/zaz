import { _decorator, Button, Component, Label, Node } from 'cc';
import type { PrototypeHudView } from '../domain/hud-presenter';
import { UI_COLORS, UI_SIZES } from './ui-theme';
import { color, drawHardwarePanel, drawPhysicalButton, ensureLabel } from './ui-drawing';

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

  start(): void {
    drawHardwarePanel(this.node, 720, UI_SIZES.consoleHeight, color(UI_COLORS.ink, 245), color(UI_COLORS.ink), 0);
    this.instructionLabel = ensureLabel(this.node.getChildByName('InstructionSign') ?? this.node, 'InstructionText', 270, 76, 23, color(UI_COLORS.gold), 'data');
    this.dropButton = this.prepareButton('DropButton', UI_SIZES.dropButtonDiameter, UI_COLORS.coral, '下爪', this.drop);
    this.cameraButton = this.prepareButton('CameraButton', UI_SIZES.utilityButtonSize, UI_COLORS.aqua, '◉', this.toggleCamera);
    this.backButton = this.prepareButton('BackButton', UI_SIZES.utilityButtonSize, UI_COLORS.violet, '‹', this.requestExit);
    if (this.joystickNode) {
      drawPhysicalButton(this.joystickNode, UI_SIZES.joystickDiameter, color(UI_COLORS.ink), color(UI_COLORS.aqua));
      const knob = this.joystickNode.getChildByName('JoystickKnob');
      if (knob) drawPhysicalButton(knob, 72, color(UI_COLORS.aqua), color(UI_COLORS.ink));
    }
  }

  render(view: PrototypeHudView): void {
    if (this.instructionLabel) this.instructionLabel.string = `${view.feeText}\n${view.instructionText}`;
    [this.dropButton, this.cameraButton, this.backButton].forEach((button) => {
      if (button) button.interactable = view.controlsEnabled;
    });
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
}
