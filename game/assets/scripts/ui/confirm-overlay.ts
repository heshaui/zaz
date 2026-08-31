import { _decorator, BlockInputEvents, Button, Component, Node } from 'cc';
import { UI_COLORS } from './ui-theme';
import { color, drawHardwarePanel, drawPhysicalButton, ensureLabel } from './ui-drawing';

const { ccclass } = _decorator;
export type ConfirmKind = 'exit-round' | 'exchange-prize';

@ccclass('ConfirmOverlay')
export class ConfirmOverlay extends Component {
  onCancel: (() => void) | null = null;
  private onConfirm: (() => void) | null = null;
  private messageNode: Node | null = null;

  onLoad(): void {
    this.node.addComponent(BlockInputEvents);
    drawHardwarePanel(this.node, 620, 360, color(UI_COLORS.ink, 250), color(UI_COLORS.gold), 8);
    this.messageNode = new Node('Message');
    this.messageNode.setParent(this.node);
    this.messageNode.setPosition(0, 54);
    const confirm = this.button('ConfirmButton', -120, -92, UI_COLORS.coral, '确认', this.confirm);
    const cancel = this.button('CancelButton', 120, -92, UI_COLORS.aqua, '取消', this.cancel);
    confirm?.setSiblingIndex(this.node.children.length - 1);
    cancel?.setSiblingIndex(this.node.children.length - 1);
  }

  show(_kind: ConfirmKind, message: string, onConfirm: () => void): void {
    this.onConfirm = onConfirm;
    this.node.active = true;
    const label = ensureLabel(this.messageNode ?? this.node, 'Text', 520, 150, 28, color(UI_COLORS.paper), 'body');
    label.string = message;
  }
  hide(): void { this.node.active = false; this.onConfirm = null; }
  confirm(): void { const action = this.onConfirm; this.hide(); action?.(); }
  cancel(): void { this.hide(); this.onCancel?.(); }

  private button(name: string, x: number, y: number, fill: string, text: string, handler: () => void): Node {
    const node = new Node(name);
    node.setParent(this.node);
    node.setPosition(x, y);
    drawPhysicalButton(node, 116, color(fill), color(UI_COLORS.ink));
    ensureLabel(node, 'Text', 92, 64, 24, color(UI_COLORS.paper), 'display').string = text;
    node.addComponent(Button);
    node.on(Button.EventType.CLICK, handler, this);
    return node;
  }
}
