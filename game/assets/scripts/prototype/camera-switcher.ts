import { _decorator, Camera, Component, tween, Tween, view } from 'cc';
import {
  createMachineCameraPlacements,
  getMachineCameraProfile,
  interpolateMachineCameraPlacement,
  selectMachineCameraPlacement,
  toggleMachineCameraView,
  type MachineCameraMode,
  type MachineCameraView,
  PROTOTYPE_MACHINE_VIEW_BOUNDS,
} from '../domain/camera-framing';

const { ccclass, property } = _decorator;
const MACHINE_ORBIT_CENTER = {
  x: (PROTOTYPE_MACHINE_VIEW_BOUNDS.minX + PROTOTYPE_MACHINE_VIEW_BOUNDS.maxX) / 2,
  z: (PROTOTYPE_MACHINE_VIEW_BOUNDS.minZ + PROTOTYPE_MACHINE_VIEW_BOUNDS.maxZ) / 2,
};

@ccclass('CameraSwitcher')
export class CameraSwitcher extends Component {
  @property(Camera)
  front: Camera | null = null;

  @property(Camera)
  side: Camera | null = null;

  private currentView: MachineCameraView = 'front';
  private mode: MachineCameraMode = 'home';
  private transitionDriver: { ratio: number } | null = null;

  onEnable(): void {
    view.on('canvas-resize', this.frameMachine, this);
  }

  onDisable(): void {
    view.off('canvas-resize', this.frameMachine, this);
    this.stopTransition();
  }

  start(): void {
    this.frameMachine();
    this.apply();
  }

  toggle(): MachineCameraView {
    this.currentView = toggleMachineCameraView(this.currentView);
    this.frameMachine(true);
    return this.currentView;
  }

  setMode(mode: MachineCameraMode): void {
    const viewChanged = mode === 'home' && this.currentView !== 'front';
    if (this.mode === mode && !viewChanged) return;
    this.mode = mode;
    if (mode === 'home') {
      this.currentView = 'front';
    }
    this.frameMachine(true);
  }

  private apply(): void {
    const activeCamera = this.front ?? this.side;
    if (this.front) this.front.enabled = this.front === activeCamera;
    if (this.side) this.side.enabled = this.side === activeCamera;
  }

  private frameMachine(animate = false): void {
    const visibleSize = view.getVisibleSize();
    if (visibleSize.width <= 0 || visibleSize.height <= 0) return;
    const profile = getMachineCameraProfile(this.mode);

    const activeCamera = this.front ?? this.side;
    if (!activeCamera) return;
    const placements = createMachineCameraPlacements({
      bounds: PROTOTYPE_MACHINE_VIEW_BOUNDS,
      verticalFov: activeCamera.fov,
      aspectRatio: visibleSize.width / visibleSize.height,
      margin: profile.margin,
      elevationDegrees: profile.elevationDegrees,
      frontYawDegrees: profile.yawDegrees,
    });
    const { position, rotationX, rotationY } = selectMachineCameraPlacement(
      placements,
      this.currentView,
    );
    this.applyPlacement(activeCamera, position, rotationX, rotationY, animate);
  }

  private applyPlacement(
    camera: Camera,
    position: { x: number; y: number; z: number },
    rotationX: number,
    rotationY: number,
    animate: boolean,
  ): void {
    const targetPlacement = {
      position: { x: position.x, y: position.y, z: position.z },
      rotationX,
      rotationY,
    };
    if (!animate) {
      this.stopTransition();
      camera.node.setPosition(position.x, position.y, position.z);
      camera.node.setRotationFromEuler(rotationX, rotationY, 0);
      return;
    }

    const fromPlacement = {
      position: {
        x: camera.node.position.x,
        y: camera.node.position.y,
        z: camera.node.position.z,
      },
      rotationX: camera.node.eulerAngles.x,
      rotationY: camera.node.eulerAngles.y,
    };
    this.stopTransition();
    const driver = { ratio: 0 };
    this.transitionDriver = driver;

    // 只补间进度，每一帧沿固定圆弧计算相机位置，避免直线路径从机台前方穿近。
    tween(driver)
      .to(
        0.35,
        { ratio: 1 },
        {
          easing: 'sineInOut',
          onUpdate: (state) => {
            if (!state) return;
            const placement = interpolateMachineCameraPlacement(
              fromPlacement,
              targetPlacement,
              MACHINE_ORBIT_CENTER,
              state.ratio,
            );
            camera.node.setPosition(
              placement.position.x,
              placement.position.y,
              placement.position.z,
            );
            camera.node.setRotationFromEuler(
              placement.rotationX,
              placement.rotationY,
              0,
            );
          },
        },
      )
      .call(() => {
        if (this.transitionDriver === driver) this.transitionDriver = null;
      })
      .start();
  }

  private stopTransition(): void {
    if (!this.transitionDriver) return;
    Tween.stopAllByTarget(this.transitionDriver);
    this.transitionDriver = null;
  }
}
