import { _decorator, Component, Node } from 'cc';
import { advanceHorizontalMovement } from '../domain/machine-controls';
import { MachineConfig } from './machine-config';
import { VirtualJoystick } from './virtual-joystick';

const { ccclass, property } = _decorator;

@ccclass('ClawController')
export class ClawController extends Component {
  @property(VirtualJoystick)
  joystick: VirtualJoystick | null = null;

  @property(MachineConfig)
  config: MachineConfig | null = null;

  @property(Node)
  carriage: Node | null = null;

  movementEnabled = true;
  onMovementChanged: ((moving: boolean) => void) | null = null;
  private wasMoving = false;

  update(deltaTime: number): void {
    if (!this.movementEnabled || !this.joystick || !this.config || !this.carriage) {
      this.setMovementState(false);
      return;
    }

    const current = this.carriage.position;
    const movement = advanceHorizontalMovement(
      { x: current.x, z: current.z },
      this.joystick.value,
      this.config.moveSpeed,
      deltaTime,
      {
        minX: this.config.minPosition.x,
        maxX: this.config.maxPosition.x,
        minZ: this.config.minPosition.z,
        maxZ: this.config.maxPosition.z,
      },
    );
    // Node.position 是内部位置对象，先算出移动状态再更新节点，避免更新后前后值变成相同。
    this.carriage.setPosition(movement.position.x, current.y, movement.position.z);
    this.setMovementState(movement.moving);
  }

  onDisable(): void {
    this.setMovementState(false);
  }

  private setMovementState(moving: boolean): void {
    if (moving === this.wasMoving) return;
    this.wasMoving = moving;
    this.onMovementChanged?.(moving);
  }
}
