import { _decorator, Component, Node } from 'cc';
import { advanceHorizontalPosition } from '../domain/machine-controls';
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

  update(deltaTime: number): void {
    if (!this.movementEnabled || !this.joystick || !this.config || !this.carriage) return;

    const current = this.carriage.position;
    const next = advanceHorizontalPosition(
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
    this.carriage.setPosition(next.x, current.y, next.z);
  }
}
