import {
  _decorator,
  Color,
  Component,
  instantiate,
  Material,
  MeshRenderer,
  Node,
  Prefab,
  sys,
  tween,
  Vec3,
} from 'cc';
import { EDITOR } from 'cc/env';
import {
  createDollLayout,
  type DollPlacement,
} from '../domain/doll-layout';
import { getGlassOpacity } from '../domain/glass-material';
import {
  createGrabCycleTimeline,
  createWeakDropPlan,
  type GrabCyclePhase,
  type WeakDropPlan,
} from '../domain/grab-cycle';
import { findNearestTargetIndex, resolveGrabOutcome } from '../domain/grab-targeting';
import { GrabSession } from '../domain/grab-session';
import {
  HOME_MACHINES,
  type HomeMachineDefinition,
} from '../domain/home-machine-selection';
import {
  canSelectMachine,
  createMachineSwitchMotion,
  type MachineSwitchEasing,
} from '../domain/machine-switch';
import type { MainUiLayer, MainUiPhase } from '../domain/main-ui-flow';
import {
  loadPrototypePlayerState,
  savePrototypePlayerState,
  type MachineRuntimeState,
} from '../domain/prototype-save';
import { PrototypeStore } from '../domain/prototype-store';
import { ClawController } from './claw-controller';
import { ClawRig } from './claw-rig';
import { DollTarget } from './doll-target';
import { MachineConfig } from './machine-config';

const { ccclass, executeInEditMode, property } = _decorator;

export interface PrototypeRoundResult {
  won: boolean;
  dollId: string | null;
  dollColor: string | null;
  needsRefill: boolean;
}

interface ResolvedMachineParts {
  root: Node;
  carriage: Node;
  hub: Node;
  cable: Node | null;
  arms: Node[];
  dollsRoot: Node;
  prizeChuteTarget: Node;
  prizeChuteEntry: Node;
}

@ccclass('PrototypeCoordinator')
@executeInEditMode
export class PrototypeCoordinator extends Component {
  @property(ClawController)
  controller: ClawController | null = null;

  @property(ClawRig)
  rig: ClawRig | null = null;

  @property(MachineConfig)
  config: MachineConfig | null = null;

  @property(Node)
  modelRoot: Node | null = null;

  @property([Prefab])
  machinePrefabs: Prefab[] = [];

  @property(Node)
  carriage: Node | null = null;

  @property(Node)
  dollsRoot: Node | null = null;

  private runtimeStore = new PrototypeStore({
    coins: 300,
    cost: 3,
    strongMaxAttempts: 5,
  });
  readonly session = new GrabSession();
  onChanged: (() => void) | null = null;
  onResult: ((result: PrototypeRoundResult) => void) | null = null;
  private runtimeModelRoot: Node | null = null;
  private readonly dollMaterialCache = new Map<string, Material>();
  private readonly glassMaterialCache = new Map<string, Material>();
  private prizeChuteTarget: Node | null = null;
  private prizeChuteEntry: Node | null = null;
  private weakDropSequence = 0;
  private switchingMachine = false;
  private selectionUiPhase: MainUiPhase = 'home';
  private selectionUiLayer: MainUiLayer = 'none';

  get store(): PrototypeStore {
    return this.runtimeStore;
  }

  onLoad(): void {
    if (this.config) {
      const saveOptions = {
        machines: HOME_MACHINES,
        strongMaxAttempts: this.config.strongMaxAttempts,
      };
      const playerState = loadPrototypePlayerState(sys.localStorage, saveOptions);
      this.runtimeStore = new PrototypeStore({
        coins: this.config.initialCoins,
        cost: this.config.playCost,
        strongMaxAttempts: this.config.strongMaxAttempts,
        exchangeCost: this.config.exchangeCost,
        machines: HOME_MACHINES,
        playerState: playerState ?? undefined,
      });
      // 首次进入和旧格式迁移后立即保存隐藏目标，重开游戏时不会重新生成。
      if (!EDITOR) this.persistPlayerState();
    }
    this.runtimeModelRoot = this.ensureMachineModel();
  }

  start(): void {
    if (EDITOR) return;
    this.restorePendingRefillOnStart();
    const parts = this.resolveMachineParts(this.runtimeModelRoot);
    if (parts) {
      this.applyResolvedMachine(parts);
      this.prepareGlassMaterials(parts.root);
      const state = this.store.exportPlayerState().machines[this.store.snapshot().machineId];
      this.prepareDolls(parts.dollsRoot, this.getActiveMachineDefinition(), state);
    }
    this.placeCarriageAtChute();
    void this.rig?.park(true);
    if (this.controller) this.controller.movementEnabled = false;
    this.onChanged?.();
  }

  onDestroy(): void {
    this.dollMaterialCache.forEach((material) => material.destroy());
    this.dollMaterialCache.clear();
    this.glassMaterialCache.forEach((material) => material.destroy());
    this.glassMaterialCache.clear();
  }

  private ensureMachineModel(): Node | null {
    const definition = this.getActiveMachineDefinition();
    const prefab = this.findMachinePrefab(definition.modelKey);
    if (!this.modelRoot || !prefab) return this.modelRoot;

    const runtimeName = this.getRuntimeModelName(definition.id);
    const existing = this.modelRoot.getChildByName(runtimeName);
    if (existing) return existing;

    this.modelRoot.children
      .filter((child) => child.name.startsWith('RuntimeMachineModel'))
      .forEach((child) => {
        child.removeFromParent();
        child.destroy();
      });

    // 导入的 GLB 预制体在编辑模式和游戏运行时都显式实例化，场景视图因此能直接看到最终模型。
    const instance = instantiate(prefab);
    instance.name = runtimeName;
    instance.setParent(this.modelRoot);
    instance.setPosition(Vec3.ZERO);
    return instance;
  }

  setMachineSelectionContext(phase: MainUiPhase, layer: MainUiLayer): void {
    this.selectionUiPhase = phase;
    this.selectionUiLayer = layer;
  }

  async selectMachine(machineId: string, direction: -1 | 1): Promise<boolean> {
    const definition = HOME_MACHINES.find((machine) => machine.id === machineId);
    const snapshot = this.store.snapshot();
    const allowed = canSelectMachine({
      known: definition !== undefined,
      sameMachine: snapshot.machineId === machineId,
      sessionState: this.session.state,
      attemptState: snapshot.attemptState,
      uiPhase: this.selectionUiPhase,
      uiLayer: this.selectionUiLayer,
      transitioning: this.switchingMachine,
    });
    if (!allowed || !definition || !this.modelRoot || !this.config) return false;

    const prefab = this.findMachinePrefab(definition.modelKey);
    if (!prefab) return false;

    const previous = this.runtimeModelRoot;
    const motion = createMachineSwitchMotion(direction);
    const candidate = instantiate(prefab);
    candidate.name = this.getRuntimeModelName(definition.id);
    candidate.setParent(this.modelRoot);
    candidate.setPosition(motion.incomingStartX, 0, 0);
    candidate.active = previous === null;
    const parts = this.resolveMachineParts(candidate);
    const machineState = this.store.exportPlayerState().machines[machineId];
    if (!parts || !machineState || !this.prepareDolls(parts.dollsRoot, definition, machineState)) {
      candidate.removeFromParent();
      candidate.destroy();
      return false;
    }
    this.prepareGlassMaterials(candidate);

    this.switchingMachine = true;
    try {
      await this.animateMachineSwitch(previous, candidate, direction);
      if (!this.store.selectMachine(machineId)) {
        this.restorePreviousMachine(previous, candidate);
        return false;
      }

      // 状态确认放在候选校验与动画之后，确保资源异常时首页、存档和原模型都不发生变化。
      if (previous && previous !== candidate) {
        previous.removeFromParent();
        previous.destroy();
      }
      this.runtimeModelRoot = candidate;
      this.applyResolvedMachine(parts);
      this.weakDropSequence = 0;
      this.placeCarriageAtChute();
      void this.rig?.park(true);
      this.persistPlayerState();
      this.onChanged?.();
      return true;
    } catch {
      this.restorePreviousMachine(previous, candidate);
      return false;
    } finally {
      this.switchingMachine = false;
    }
  }

  private animateMachineSwitch(
    previous: Node | null,
    candidate: Node,
    direction: -1 | 1,
  ): Promise<void> {
    const motion = createMachineSwitchMotion(direction);
    if (previous) {
      // 先完整退出旧机台，再显示新机台，避免两套模型重叠时出现生硬的瞬间变形。
      return this.tweenNodePosition(
        previous,
        new Vec3(motion.outgoingEndX, 0, 0),
        motion.outgoingDuration,
        motion.outgoingEasing,
      ).then(() => {
        previous.active = false;
        candidate.active = true;
        return this.tweenNodePosition(
          candidate,
          Vec3.ZERO,
          motion.incomingDuration,
          motion.incomingEasing,
        );
      });
    }
    candidate.active = true;
    return this.tweenNodePosition(
      candidate,
      Vec3.ZERO,
      motion.incomingDuration,
      motion.incomingEasing,
    );
  }

  private tweenNodePosition(
    node: Node,
    position: Vec3,
    duration: number,
    easing: MachineSwitchEasing,
  ): Promise<void> {
    return new Promise((resolve) => {
      tween(node)
        .to(duration, { position }, { easing })
        .call(() => resolve())
        .start();
    });
  }

  private restorePreviousMachine(previous: Node | null, candidate: Node): void {
    if (previous) {
      previous.active = true;
      previous.setPosition(Vec3.ZERO);
    }
    candidate.removeFromParent();
    candidate.destroy();
  }

  private findMachinePrefab(modelKey: string): Prefab | null {
    // 机台目录与预制体数组使用同一顺序，避免引擎对嵌套自定义绑定解析不完整时首页变空。
    const machineIndex = HOME_MACHINES.findIndex((machine) => machine.modelKey === modelKey);
    return machineIndex >= 0 ? this.machinePrefabs[machineIndex] ?? null : null;
  }

  private getActiveMachineDefinition(): HomeMachineDefinition {
    const machineId = this.store.snapshot().machineId;
    return HOME_MACHINES.find((machine) => machine.id === machineId) ?? HOME_MACHINES[0];
  }

  private getRuntimeModelName(machineId: string): string {
    return `RuntimeMachineModel_${machineId}`;
  }

  insertCoin(): boolean {
    if (this.switchingMachine || this.session.state !== 'idle' || !this.controller) return false;

    // 扣币成功后才进入可移动状态；扣币失败时状态保持不变，由界面给出反馈。
    this.store.startAttempt();
    this.session.startMoving();
    this.controller.movementEnabled = true;
    this.onChanged?.();
    return true;
  }

  async grab(): Promise<void> {
    if (
      this.session.state !== 'moving'
      || this.store.snapshot().attemptState !== 'ready'
      || !this.rig
      || !this.carriage
      || !this.config
      || !this.controller
    ) return;

    const drop = this.store.executeDrop();
    this.controller.movementEnabled = false;
    this.onChanged?.();

    const target = this.findNearestTarget();
    const targetParent = target?.node.parent ?? null;
    const aimedCorrectly = target !== null;
    const outcome = resolveGrabOutcome(drop.isStrong, aimedCorrectly);

    const timeline = createGrabCycleTimeline(outcome);
    for (const phase of timeline) {
      await this.runGrabPhase(
        phase,
        drop.isStrong,
        target,
        targetParent,
      );
    }
    this.store.settleAttempt(outcome.won);
    this.persistPlayerState();
    this.session.settle();
    // 结果必须等到动作、门店结算和存档都完成后再通知界面，延迟补货由结果层关闭时触发。
    const wonDoll = outcome.won && target
      ? target
      : null;
    this.onResult?.({
      won: outcome.won,
      dollId: wonDoll?.dollId ?? null,
      dollColor: wonDoll?.displayColor ?? null,
      needsRefill: this.needsDollRefill(),
    });
    this.session.reset();
    this.controller.movementEnabled = false;
    this.onChanged?.();
  }

  abandonAttempt(): void {
    // 已付费但未下爪时退出不改变本轮隐藏进度，保存后同步收回操作状态与爪机姿态。
    this.store.abandonAttempt();
    this.persistPlayerState();
    this.session.abandon();
    if (this.controller) this.controller.movementEnabled = false;
    this.placeCarriageAtChute();
    void this.rig?.park(true);
    this.onChanged?.();
  }

  needsDollRefill(): boolean {
    return this.store.snapshot().needsRefill;
  }

  refillDollsAfterResult(): boolean {
    if (!this.dollsRoot || !this.config || !this.needsDollRefill()) return false;
    if (!this.store.refillCurrentMachine()) return false;
    this.refreshDolls();
    this.persistPlayerState();
    this.onChanged?.();
    return true;
  }

  private restorePendingRefillOnStart(): void {
    // 若上次在最后一只结算后退出，启动时直接恢复下一批，避免机台长期停在空库存。
    if (this.store.refillCurrentMachine()) this.persistPlayerState();
  }

  refreshDolls(): void {
    if (!this.dollsRoot || !this.config) return;
    const targets = this.dollsRoot.children.filter((node) => node.getComponent(DollTarget));
    if (targets.length === 0) return;
    const definition = this.getActiveMachineDefinition();
    const state = this.store.exportPlayerState().machines[definition.id];

    const layout = this.buildDollLayout(
      targets.length,
      definition.layoutSeed + state.layoutSequence,
      this.config.dollMinCenterDistance,
    );
    targets.forEach((target, index) => {
      const placement = layout[index];
      this.applyDollPlacement(target, placement);
      this.applyDollColor(target, placement.color);
      const dollTarget = target.getComponent(DollTarget);
      if (dollTarget) dollTarget.displayColor = placement.color;
      target.active = true;
    });
  }

  exchangePremium(premiumId: string): void {
    this.store.exchange(premiumId);
    this.persistPlayerState();
    this.onChanged?.();
  }

  private persistPlayerState(): void {
    // 写入失败不会中断当前游戏；下一次启动会自然回到初始数据或上一次有效数据。
    savePrototypePlayerState(sys.localStorage, this.store.exportPlayerState(), {
      machines: HOME_MACHINES,
      strongMaxAttempts: this.config?.strongMaxAttempts ?? 5,
    });
  }

  private resolveMachineParts(runtimeModelRoot: Node | null): ResolvedMachineParts | null {
    if (!runtimeModelRoot) return null;
    const carriage = this.findDescendant(runtimeModelRoot, 'ClawCarriage');
    const hub = this.findDescendant(runtimeModelRoot, 'ClawHub');
    const cable = this.findDescendant(runtimeModelRoot, 'ClawCable');
    const dolls = this.findDescendant(runtimeModelRoot, 'Dolls');
    const prizeChuteTarget = this.findDescendant(runtimeModelRoot, 'PrizeChuteTarget');
    const prizeChuteEntry = this.findDescendant(runtimeModelRoot, 'PrizeChuteEntry');
    const arms = ['ClawArm_0', 'ClawArm_1', 'ClawArm_2']
      .map((name) => this.findDescendant(runtimeModelRoot, name))
      .filter((node): node is Node => node !== null);
    if (
      !carriage
      || !hub
      || !dolls
      || !prizeChuteTarget
      || !prizeChuteEntry
      || arms.length !== 3
    ) return null;
    return {
      root: runtimeModelRoot,
      carriage,
      hub,
      cable,
      arms,
      dollsRoot: dolls,
      prizeChuteTarget,
      prizeChuteEntry,
    };
  }

  private applyResolvedMachine(parts: ResolvedMachineParts): void {
    this.carriage = parts.carriage;
    this.dollsRoot = parts.dollsRoot;
    this.prizeChuteTarget = parts.prizeChuteTarget;
    this.prizeChuteEntry = parts.prizeChuteEntry;
    if (this.controller) this.controller.carriage = parts.carriage;
    this.rig?.bind(parts.hub, parts.cable, parts.arms);
  }

  private prepareDolls(
    dollsRoot: Node,
    definition: HomeMachineDefinition,
    machineState: MachineRuntimeState,
  ): boolean {
    if (!this.config) return false;
    const template = dollsRoot.children.find(
      (child) => child.name === definition.dollTemplateName,
    );
    if (!template) return false;

    const layout = this.buildDollLayout(
      definition.batchSize,
      definition.layoutSeed + machineState.layoutSequence,
      this.config.dollMinCenterDistance,
    );

    for (let index = 0; index < layout.length; index += 1) {
      const placement = layout[index];
      const clone = instantiate(template);
      const sequence = index + 1 < 10 ? `0${index + 1}` : String(index + 1);
      clone.name = `OrdinaryDoll_${sequence}`;
      clone.active = index < machineState.remainingDolls;
      clone.setParent(dollsRoot);
      this.applyDollPlacement(clone, placement);
      this.applyDollColor(clone, placement.color);
      const target = clone.addComponent(DollTarget);
      target.dollId = `${definition.id}-ordinary-${sequence}`;
      target.displayColor = placement.color;
    }

    // 原始节点只作为克隆模板；非本机台模板即使误入资源也不会参与普通娃娃批次。
    dollsRoot.children.forEach((child) => {
      if (!child.name.startsWith('OrdinaryDoll_')) child.active = false;
    });
    return true;
  }

  private buildDollLayout(
    count: number,
    seed: number,
    minCenterDistance: number,
  ): DollPlacement[] {
    if (!this.config) return [];
    return createDollLayout({
      count,
      colors: this.config.dollColors.map((color) => `#${color.toHEX('#rrggbb')}`),
      seed,
      bounds: {
        minX: this.config.dollMinPosition.x,
        maxX: this.config.dollMaxPosition.x,
        minZ: this.config.dollMinPosition.z,
        maxZ: this.config.dollMaxPosition.z,
      },
      baseY: this.config.dollBaseHeight,
      minScale: this.config.dollMinScale,
      maxScale: this.config.dollMaxScale,
      minCenterDistance,
      localBounds: {
        minX: this.config.dollLocalMinPosition.x,
        maxX: this.config.dollLocalMaxPosition.x,
        minY: this.config.dollLocalMinPosition.y,
        maxY: this.config.dollLocalMaxPosition.y,
        minZ: this.config.dollLocalMinPosition.z,
        maxZ: this.config.dollLocalMaxPosition.z,
      },
      exclusions: [{
        minX: this.config.dollExclusionMinPosition.x,
        maxX: this.config.dollExclusionMaxPosition.x,
        minZ: this.config.dollExclusionMinPosition.z,
        maxZ: this.config.dollExclusionMaxPosition.z,
      }],
    });
  }

  private applyDollPlacement(node: Node, placement: DollPlacement): void {
    node.setPosition(placement.x, placement.y, placement.z);
    node.setRotationFromEuler(
      placement.rotationX,
      placement.rotationY,
      placement.rotationZ,
    );
    node.setScale(placement.scale, placement.scale, placement.scale);
  }

  private applyDollColor(root: Node, colorHex: string): void {
    this.visitDescendants(root, (node) => {
      node.getComponents(MeshRenderer).forEach((renderer) => {
        renderer.sharedMaterials.forEach((baseMaterial, materialIndex) => {
          if (!baseMaterial || !baseMaterial.name.endsWith('Body')) return;
          const material = this.getDollMaterial(baseMaterial, colorHex);
          renderer.setMaterialInstance(material, materialIndex);
        });
      });
    });
  }

  private getDollMaterial(baseMaterial: Material, colorHex: string): Material {
    const cacheKey = `${baseMaterial.uuid}:${colorHex}`;
    const cached = this.dollMaterialCache.get(cacheKey);
    if (cached) return cached;

    // 同一身体材质与颜色组合只创建一次，减少大量娃娃同时显示时的材质数量。
    const material = new Material();
    material.copy(baseMaterial);
    material.name = `${baseMaterial.name}_${colorHex.slice(1)}`;
    const dollColor = new Color().fromHEX(colorHex);
    material.setProperty('mainColor', dollColor);
    // 同色低强度柔光只抬高背光面的亮度，保留布偶的明暗与法线细节，避免出现发光塑料感。
    material.setProperty('emissive', dollColor);
    material.setProperty('emissiveScale', new Vec3(0.3, 0.3, 0.3));
    this.dollMaterialCache.set(cacheKey, material);
    return material;
  }

  private prepareGlassMaterials(root: Node | null): void {
    if (!root) return;
    this.visitDescendants(root, (node) => {
      node.getComponents(MeshRenderer).forEach((renderer) => {
        renderer.sharedMaterials.forEach((baseMaterial, materialIndex) => {
          if (!baseMaterial) return;
          const opacity = getGlassOpacity(baseMaterial.name);
          if (opacity === null) return;
          renderer.setMaterialInstance(
            this.getGlassMaterial(baseMaterial, opacity),
            materialIndex,
          );
        });
      });
    });
  }

  private getGlassMaterial(baseMaterial: Material, opacity: number): Material {
    const cacheKey = `${baseMaterial.uuid}:${opacity}`;
    const cached = this.glassMaterialCache.get(cacheKey);
    if (cached) return cached;

    // GLB 导入后混合状态仍在，但透明度没有写入主颜色；运行时补齐 Alpha 即可保留原玻璃色调。
    const material = new Material();
    material.copy(baseMaterial);
    material.name = `${baseMaterial.name}_RuntimeTransparent`;
    material.setProperty('mainColor', new Color(255, 255, 255, Math.round(opacity * 255)));
    this.glassMaterialCache.set(cacheKey, material);
    return material;
  }

  private async runGrabPhase(
    phase: GrabCyclePhase,
    strong: boolean,
    target: DollTarget | null,
    targetParent: Node | null,
  ): Promise<void> {
    // 阶段表是整轮动作的唯一顺序来源，保证任何结果都先回到出口再结束。
    switch (phase) {
      case 'open-and-drop':
        this.session.startDropping();
        await Promise.all([this.rig!.open(), this.rig!.drop()]);
        break;
      case 'close':
        this.session.startGrabbing();
        if (target) this.rig!.attach(target.node);
        await this.rig!.close(strong);
        await this.wait(0.12);
        break;
      case 'lift-half':
        this.session.startLifting();
        await this.rig!.liftHalf();
        break;
      case 'lift-home':
        if (this.session.state === 'grabbing') this.session.startLifting();
        await this.rig!.liftHome();
        break;
      case 'release-midway':
        if (target && targetParent) {
          await this.animateMissedDoll(target.node, targetParent);
        }
        break;
      case 'return-to-chute':
        this.session.startReturning();
        await this.moveCarriageToChute();
        break;
      case 'open-over-chute':
        await this.rig!.open();
        break;
      case 'deliver-prize':
        if (target && targetParent) await this.deliverPrize(target, targetParent);
        break;
      case 'park':
        await this.rig!.park();
        break;
    }
  }

  private animateMissedDoll(target: Node, parent: Node): Promise<void> {
    this.rig!.release(target, parent);
    const current = target.position.clone();
    const startRotation = target.eulerAngles.clone();
    const plan = this.buildWeakDropPlan(current, startRotation, target.scale.x);
    const landing = new Vec3(plan.landing.x, plan.landing.y, plan.landing.z);
    const duration = this.config?.weakDropDuration ?? 0.72;
    const firstBounceHeight = this.config?.weakDropFirstBounceHeight ?? 0.14;
    const secondBounceHeight = this.config?.weakDropSecondBounceHeight ?? 0.06;
    const positionAt = (ratio: number, height: number) => new Vec3(
      current.x + (landing.x - current.x) * ratio,
      landing.y + height,
      current.z + (landing.z - current.z) * ratio,
    );
    const rotationAt = (ratio: number) => new Vec3(
      startRotation.x + plan.rotationDelta.x * ratio,
      startRotation.y + plan.rotationDelta.y * ratio,
      startRotation.z + plan.rotationDelta.z * ratio,
    );
    return new Promise((resolve) => {
      // 水平偏移分散到下落和两次反弹中，配合持续旋转形成触底后翻身滚动的效果。
      tween(target)
        .to(
          duration * 0.48,
          { position: positionAt(0.66, 0), eulerAngles: rotationAt(0.55) },
          { easing: 'quadIn' },
        )
        .to(
          duration * 0.16,
          { position: positionAt(0.8, firstBounceHeight), eulerAngles: rotationAt(0.72) },
          { easing: 'quadOut' },
        )
        .to(
          duration * 0.14,
          { position: positionAt(0.9, 0), eulerAngles: rotationAt(0.84) },
          { easing: 'quadIn' },
        )
        .to(
          duration * 0.1,
          { position: positionAt(0.96, secondBounceHeight), eulerAngles: rotationAt(0.94) },
          { easing: 'quadOut' },
        )
        .to(
          duration * 0.12,
          { position: landing, eulerAngles: rotationAt(1) },
          { easing: 'quadIn' },
        )
        .call(() => resolve())
        .start();
    });
  }

  private deliverPrize(target: DollTarget, parent: Node): Promise<void> {
    const targetNode = target.node;
    this.rig!.release(targetNode, parent);
    if (!this.prizeChuteEntry || !this.config) {
      targetNode.active = false;
      return Promise.resolve();
    }

    const entryLocal = new Vec3();
    parent.inverseTransformPoint(entryLocal, this.prizeChuteEntry.worldPosition);
    const endRotation = targetNode.eulerAngles.clone();
    endRotation.z += 75;
    return new Promise((resolve) => {
      tween(targetNode)
        .to(
          this.config!.prizeDeliveryDuration,
          { position: entryLocal, eulerAngles: endRotation },
          { easing: 'quadIn' },
        )
        .call(() => {
          targetNode.active = false;
          resolve();
        })
        .start();
    });
  }

  private placeCarriageAtChute(): void {
    const target = this.createCarriageChutePosition();
    if (target && this.carriage) this.carriage.setPosition(target);
  }

  private moveCarriageToChute(): Promise<void> {
    const target = this.createCarriageChutePosition();
    if (!target || !this.carriage || !this.config) return Promise.resolve();
    return new Promise((resolve) => {
      tween(this.carriage!)
        .to(
          this.config!.returnToChuteDuration,
          { position: target },
          { easing: 'sineInOut' },
        )
        .call(() => resolve())
        .start();
    });
  }

  private buildWeakDropPlan(origin: Vec3, startRotation: Vec3, scale: number): WeakDropPlan {
    const config = this.config;
    if (!config) {
      return {
        landing: { x: origin.x, y: origin.y, z: origin.z },
        rotationDelta: { x: 70, y: 0, z: 90 },
      };
    }
    const plan = createWeakDropPlan({
      origin: { x: origin.x, z: origin.z },
      bounds: {
        minX: config.dollMinPosition.x,
        maxX: config.dollMaxPosition.x,
        minZ: config.dollMinPosition.z,
        maxZ: config.dollMaxPosition.z,
      },
      blockedAreas: [{
        minX: config.dollExclusionMinPosition.x,
        maxX: config.dollExclusionMaxPosition.x,
        minZ: config.dollExclusionMinPosition.z,
        maxZ: config.dollExclusionMaxPosition.z,
      }],
      minOffset: config.weakDropMinOffset,
      maxOffset: config.weakDropMaxOffset,
      seed: this.getActiveMachineDefinition().layoutSeed + 2000 + this.weakDropSequence,
      localBounds: {
        minX: config.dollLocalMinPosition.x,
        maxX: config.dollLocalMaxPosition.x,
        minY: config.dollLocalMinPosition.y,
        maxY: config.dollLocalMaxPosition.y,
        minZ: config.dollLocalMinPosition.z,
        maxZ: config.dollLocalMaxPosition.z,
      },
      startRotation: {
        x: startRotation.x,
        y: startRotation.y,
        z: startRotation.z,
      },
      scale,
      baseY: config.dollBaseHeight,
    });
    this.weakDropSequence += 1;
    return plan;
  }

  private createCarriageChutePosition(): Vec3 | null {
    if (!this.carriage || !this.prizeChuteTarget) return null;
    const targetWorld = this.prizeChuteTarget.worldPosition;
    const destinationWorld = new Vec3(
      targetWorld.x,
      this.carriage.worldPosition.y,
      targetWorld.z,
    );
    if (!this.carriage.parent) return destinationWorld;
    return this.carriage.parent.inverseTransformPoint(new Vec3(), destinationWorld);
  }

  private visitDescendants(root: Node, visitor: (node: Node) => void): void {
    visitor(root);
    root.children.forEach((child) => this.visitDescendants(child, visitor));
  }

  private getHorizontalVisualBounds(root: Node): {
    minX: number;
    maxX: number;
    minZ: number;
    maxZ: number;
  } | null {
    let minX = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let minZ = Number.POSITIVE_INFINITY;
    let maxZ = Number.NEGATIVE_INFINITY;
    this.visitDescendants(root, (node) => {
      node.getComponents(MeshRenderer).forEach((renderer) => {
        const bounds = renderer.model?.worldBounds;
        if (!bounds) return;
        minX = Math.min(minX, bounds.center.x - bounds.halfExtents.x);
        maxX = Math.max(maxX, bounds.center.x + bounds.halfExtents.x);
        minZ = Math.min(minZ, bounds.center.z - bounds.halfExtents.z);
        maxZ = Math.max(maxZ, bounds.center.z + bounds.halfExtents.z);
      });
    });
    return Number.isFinite(minX) ? { minX, maxX, minZ, maxZ } : null;
  }

  private findNearestTarget(): DollTarget | null {
    if (!this.dollsRoot || !this.carriage || !this.config) return null;
    const targets = this.dollsRoot.children
      .map((node) => ({ node, component: node.getComponent(DollTarget) }))
      .filter((item): item is { node: Node; component: DollTarget } => item.component !== null);
    const index = findNearestTargetIndex(
      { x: this.carriage.worldPosition.x, z: this.carriage.worldPosition.z },
      targets.map(({ node }) => {
        const horizontalBounds = this.getHorizontalVisualBounds(node);
        return {
          x: node.worldPosition.x,
          z: node.worldPosition.z,
          active: node.activeInHierarchy,
          horizontalBounds: horizontalBounds ?? undefined,
        };
      }),
      this.config.aimRadius,
    );
    return index === null ? null : targets[index].component;
  }

  private findDescendant(root: Node, name: string): Node | null {
    if (root.name === name) return root;
    for (const child of root.children) {
      const found = this.findDescendant(child, name);
      if (found) return found;
    }
    return null;
  }

  private wait(seconds: number): Promise<void> {
    return new Promise((resolve) => this.scheduleOnce(resolve, seconds));
  }
}
