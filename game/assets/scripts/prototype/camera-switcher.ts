import { _decorator, Camera, Component, tween, Tween, Vec3, view } from 'cc';
import {
  createMachineCameraPlacements,
  getMachineCameraMargin,
  toggleMachineCameraView,
  type MachineCameraMode,
  type MachineCameraView,
  PROTOTYPE_MACHINE_VIEW_BOUNDS,
} from '../domain/camera-framing';

const { ccclass, property } = _decorator;

@ccclass('CameraSwitcher')
export class CameraSwitcher extends Component {
  @property(Camera)
  front: Camera | null = null;

  @property(Camera)
  side: Camera | null = null;

  private currentView: MachineCameraView = 'front';
  private mode: MachineCameraMode = 'home';

  onEnable(): void {
    view.on('canvas-resize', this.frameMachine, this);
  }

  onDisable(): void {
    view.off('canvas-resize', this.frameMachine, this);
  }

  start(): void {
    this.frameMachine();
    this.apply();
  }

  toggle(): MachineCameraView {
    this.currentView = toggleMachineCameraView(this.currentView);
    this.apply();
    return this.currentView;
  }

  setMode(mode: MachineCameraMode): void {
    if (this.mode === mode) return;
    this.mode = mode;
    this.frameMachine(true);
  }

  private apply(): void {
    const showingFront = this.currentView === 'front';
    if (this.front) this.front.enabled = showingFront;
    if (this.side) this.side.enabled = !showingFront;
  }

  private frameMachine(animate = false): void {
    const visibleSize = view.getVisibleSize();
    if (visibleSize.width <= 0 || visibleSize.height <= 0) return;

    const placements = createMachineCameraPlacements({
      bounds: PROTOTYPE_MACHINE_VIEW_BOUNDS,
      verticalFov: this.front?.fov ?? this.side?.fov ?? 45,
      aspectRatio: visibleSize.width / visibleSize.height,
      margin: getMachineCameraMargin(this.mode),
      elevationDegrees: 16,
    });

    if (this.front) {
      const { position, rotationX, rotationY } = placements.front;
      this.applyPlacement(this.front, position, rotationX, rotationY, animate);
    }
    if (this.side) {
      const { position, rotationX, rotationY } = placements.side;
      this.applyPlacement(this.side, position, rotationX, rotationY, animate);
    }
  }

  private applyPlacement(
    camera: Camera,
    position: { x: number; y: number; z: number },
    rotationX: number,
    rotationY: number,
    animate: boolean,
  ): void {
    const target = new Vec3(position.x, position.y, position.z);
    camera.node.setRotationFromEuler(rotationX, rotationY, 0);
    if (!animate) {
      camera.node.setPosition(target);
      return;
    }

    // 两台相机都更新节点变换，避免禁用相机在切换后沿用旧机位。
    Tween.stopAllByTarget(camera.node);
    tween(camera.node)
      .to(0.35, { position: target }, { easing: 'sineInOut' })
      .start();
  }
}
