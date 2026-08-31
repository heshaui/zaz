import { _decorator, BlockInputEvents, Button, Component, Node } from 'cc';
import { UI_COLORS } from './ui-theme';
import {
  color,
  drawCommandButton,
  drawHardwarePanel,
  drawTicketPanel,
  ensureLabel,
  ensureUiNode,
} from './ui-drawing';

const { ccclass } = _decorator;
export type ConfirmKind = 'exit-round' | 'exchange-prize';

@ccclass('ConfirmOverlay')
export class ConfirmOverlay extends Component {
  onCancel: (() => void) | null = null;
  private onConfirm: (() => void) | null = null;
  private messageNode: Node | null = null;

  onLoad(): void {
    this.node.addComponent(BlockInputEvents);
    drawHardwarePanel(this.node, 720, 1280, color(UI_COLORS.ink, 190), color(UI_COLORS.ink, 190), 0);
    const dialog = this.node.getChildByName('DialogPanel');
    if (!dialog) return;
    drawTicketPanel(dialog, 620, 380);
    ensureLabel(dialog, 'Title', 420, 68, 34, color(UI_COLORS.paper), 'display').string = '确认操作';
    dialog.getChildByName('Title')?.setPosition(0, 132);
    this.messageNode = ensureUiNode(dialog, 'Message');
    this.messageNode.setPosition(0, 36);
    this.button(dialog, 'ConfirmButton', -122, -110, UI_COLORS.coral, '确认', this.confirm);
    this.button(dialog, 'CancelButton', 122, -110, UI_COLORS.aqua, '取消', this.cancel);
  }

  show(_kind: ConfirmKind, message: string, onConfirm: () => void): void {
    this.onConfirm = onConfirm;
    this.node.active = true;
    const label = ensureLabel(this.messageNode ?? this.node, 'Text', 520, 150, 28, color(UI_COLORS.ink), 'body');
    label.string = message;
  }
  hide(): void { this.node.active = false; this.onConfirm = null; }
  confirm(): void { const action = this.onConfirm; this.hide(); action?.(); }
  cancel(): void { this.hide(); this.onCancel?.(); }

  private button(parent: Node, name: string, x: number, y: number, fill: string, text: string, handler: () => void): Node {
    const node = ensureUiNode(parent, name);
    node.setPosition(x, y);
    drawCommandButton(node, 210, 72, color(fill), color(UI_COLORS.ink));
    ensureLabel(node, 'Text', 176, 56, 24, color(UI_COLORS.paper), 'display').string = text;
    node.addComponent(Button);
    node.on(Button.EventType.CLICK, handler, this);
    return node;
  }
}
