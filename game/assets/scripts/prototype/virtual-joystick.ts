import { _decorator, Component, EventTouch, Node, UITransform, Vec2, Vec3 } from 'cc';
import { normalizeJoystickOffset } from '../domain/machine-controls';

const { ccclass, property } = _decorator;

@ccclass('VirtualJoystick')
export class VirtualJoystick extends Component {
  @property(Node)
  knob: Node | null = null;

  @property
  radius = 70;

  readonly value = new Vec2();

  onEnable(): void {
    this.node.on(Node.EventType.TOUCH_START, this.onTouch, this);
    this.node.on(Node.EventType.TOUCH_MOVE, this.onTouch, this);
    this.node.on(Node.EventType.TOUCH_END, this.reset, this);
    this.node.on(Node.EventType.TOUCH_CANCEL, this.reset, this);
  }

  onDisable(): void {
    this.node.off(Node.EventType.TOUCH_START, this.onTouch, this);
    this.node.off(Node.EventType.TOUCH_MOVE, this.onTouch, this);
    this.node.off(Node.EventType.TOUCH_END, this.reset, this);
    this.node.off(Node.EventType.TOUCH_CANCEL, this.reset, this);
    this.reset();
  }

  private onTouch(event: EventTouch): void {
    const transform = this.node.getComponent(UITransform);
    if (!transform || !this.knob) return;

    const uiLocation = event.getUILocation();
    const local = transform.convertToNodeSpaceAR(new Vec3(uiLocation.x, uiLocation.y, 0));
    const output = normalizeJoystickOffset(local.x, local.y, this.radius);
    this.knob.setPosition(output.knobX, output.knobY, 0);
    this.value.set(output.valueX, output.valueY);
  }

  private reset(): void {
    this.value.set(0, 0);
    this.knob?.setPosition(0, 0, 0);
  }
}
