import { _decorator, Color, Component, Vec3 } from 'cc';
import { DEFAULT_MACHINE_BOUNDS } from '../domain/machine-bounds';

const { ccclass, property } = _decorator;

@ccclass('MachineConfig')
export class MachineConfig extends Component {
  @property({ min: 0, step: 1 })
  readonly initialCoins = 300;

  @property({ min: 1, step: 1 })
  readonly playCost = 3;

  @property({ min: 1, step: 1 })
  readonly strongMaxAttempts = 5;

  @property({ min: 1, step: 1 })
  readonly exchangeCost = 10;

  @property(Vec3)
  readonly minPosition = new Vec3(
    DEFAULT_MACHINE_BOUNDS.minX,
    3.85,
    DEFAULT_MACHINE_BOUNDS.minZ,
  );

  @property(Vec3)
  readonly maxPosition = new Vec3(
    DEFAULT_MACHINE_BOUNDS.maxX,
    3.85,
    DEFAULT_MACHINE_BOUNDS.maxZ,
  );

  @property
  readonly moveSpeed = 1.8;

  @property
  readonly aimRadius = 0.42;

  @property({ min: 0, max: 50, step: 1 })
  readonly dollCount = 8;

  @property({ step: 1 })
  readonly dollLayoutSeed = 20260827;

  @property(Vec3)
  readonly dollMinPosition = new Vec3(-1.82, 0, -1.32);

  @property(Vec3)
  readonly dollMaxPosition = new Vec3(1.82, 0, 1.38);

  @property(Vec3)
  readonly dollExclusionMinPosition = new Vec3(-1.86, 0, 0.38);

  @property(Vec3)
  readonly dollExclusionMaxPosition = new Vec3(-0.52, 0, 1.42);

  @property(Vec3)
  readonly dollLocalMinPosition = new Vec3(-0.668, -0.033, -0.52);

  @property(Vec3)
  readonly dollLocalMaxPosition = new Vec3(0.643, 1.927, 0.494);

  @property
  readonly dollBaseHeight = 1.38;

  @property({ min: 0.1, step: 0.01 })
  readonly dollMinScale = 0.68;

  @property({ min: 0.1, step: 0.01 })
  readonly dollMaxScale = 0.82;

  @property({ min: 0, step: 0.05 })
  readonly dollMinCenterDistance = 0.45;

  @property({ min: 0.1, step: 0.05 })
  readonly weakDropMinOffset = 0.1;

  @property({ min: 0.1, step: 0.05 })
  readonly weakDropMaxOffset = 0.25;

  @property({ min: 0.01, step: 0.01 })
  readonly weakDropFirstBounceHeight = 0.14;

  @property({ min: 0.01, step: 0.01 })
  readonly weakDropSecondBounceHeight = 0.06;

  @property({ min: 0.1, step: 0.05 })
  readonly weakDropDuration = 0.72;

  @property({ min: 0.1, step: 0.05 })
  readonly returnToChuteDuration = 0.75;

  @property({ min: 0.1, step: 0.05 })
  readonly prizeDeliveryDuration = 0.5;

  @property([Color])
  readonly dollColors = [
    new Color(255, 143, 177, 255),
    new Color(101, 220, 196, 255),
    new Color(255, 216, 106, 255),
    new Color(168, 160, 255, 255),
  ];
}
