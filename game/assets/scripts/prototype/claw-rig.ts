import { _decorator, Component, Node, tween, Vec3 } from 'cc';

const { ccclass, property } = _decorator;

@ccclass('ClawRig')
export class ClawRig extends Component {
  @property(Node)
  hub: Node | null = null;

  @property(Node)
  cable: Node | null = null;

  @property([Node])
  arms: Node[] = [];

  @property
  dropDistance = 1.55;

  @property
  armAnimationDuration = 0.22;

  @property
  idleCloseAngle = 8;

  private readonly home = new Vec3();
  private readonly cableHomeScale = new Vec3(1, 1, 1);
  private readonly cableHomePosition = new Vec3();
  private armHomeEulers: Vec3[] = [];
  private hasHomePose = false;

  bind(hub: Node, cable: Node | null, arms: Node[]): void {
    this.hub = hub;
    this.cable = cable;
    this.arms = arms;
    this.captureHomePose();
  }

  start(): void {
    if (!this.hasHomePose) this.captureHomePose();
  }

  async drop(): Promise<void> {
    if (!this.hub) return;
    await this.moveHub(new Vec3(this.home.x, this.home.y - this.dropDistance, this.home.z), 0.65);
  }

  close(strong: boolean): Promise<void> {
    const angle = strong ? 30 : 13;
    return this.animateArms((arm, index) => {
      const home = this.armHomeEulers[index] ?? arm.eulerAngles;
      return new Vec3(home.x + angle, home.y, home.z);
    });
  }

  attach(target: Node): void {
    if (this.hub) target.setParent(this.hub, true);
  }

  release(target: Node, parent: Node): void {
    target.setParent(parent, true);
  }

  async liftHalf(): Promise<void> {
    if (!this.hub) return;
    const midpoint = new Vec3();
    Vec3.lerp(midpoint, this.hub.position, this.home, 0.5);
    await this.moveHub(midpoint, 0.35);
  }

  async liftHome(): Promise<void> {
    await this.moveHub(this.home, 0.65);
  }

  open(): Promise<void> {
    return this.animateArms((arm, index) => (
      this.armHomeEulers[index]?.clone() ?? arm.eulerAngles.clone()
    ));
  }

  park(immediate = false): Promise<void> {
    const targets = this.arms.map((arm, index) => {
      const home = this.armHomeEulers[index] ?? arm.eulerAngles;
      return new Vec3(home.x + this.idleCloseAngle, home.y, home.z);
    });
    if (immediate) {
      this.arms.forEach((arm, index) => arm.setRotationFromEuler(targets[index]));
      return Promise.resolve();
    }
    return this.animateArms((_arm, index) => targets[index]);
  }

  private captureHomePose(): void {
    if (this.hub) this.home.set(this.hub.position);
    if (this.cable) {
      this.cableHomeScale.set(this.cable.scale);
      this.cableHomePosition.set(this.cable.position);
    }
    this.armHomeEulers = this.arms.map((arm) => arm.eulerAngles.clone());
    this.hasHomePose = true;
  }

  private animateArms(targetFor: (arm: Node, index: number) => Vec3): Promise<void> {
    if (this.arms.length === 0) return Promise.resolve();
    return Promise.all(this.arms.map((arm, index) => new Promise<void>((resolve) => {
      tween(arm)
        .to(
          this.armAnimationDuration,
          { eulerAngles: targetFor(arm, index) },
          { easing: 'sineInOut' },
        )
        .call(() => resolve())
        .start();
    }))).then(() => undefined);
  }

  private moveHub(target: Vec3, duration: number): Promise<void> {
    if (!this.hub) return Promise.resolve();

    const distance = Math.max(0, this.home.y - target.y);
    if (this.cable) {
      // 钢索以自身中心为缩放原点，因此长度增加时同时向下移动一半距离，顶端才会保持固定。
      const scaleY = this.cableHomeScale.y * (1 + distance / 0.78);
      tween(this.cable)
        .to(duration, {
          scale: new Vec3(this.cableHomeScale.x, scaleY, this.cableHomeScale.z),
          position: new Vec3(
            this.cableHomePosition.x,
            this.cableHomePosition.y - distance * 0.5,
            this.cableHomePosition.z,
          ),
        })
        .start();
    }

    return new Promise((resolve) => {
      tween(this.hub!).to(duration, { position: target }).call(() => resolve()).start();
    });
  }
}
