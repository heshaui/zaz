import { _decorator, Component, Label, Node, ResolutionPolicy, sys, view } from 'cc';
import { presentPrototypeHud } from '../domain/hud-presenter';
import { resolveGameUiVisibility } from '../domain/game-ui-visibility';
import { canUseGameConsoleAction, createInitialMainUiFlow, reduceMainUiFlow, type MainUiAction, type MainUiFlowState } from '../domain/main-ui-flow';
import { resolvePortraitLayout, resolveSafeAreaInsets } from '../domain/portrait-layout';
import { PREMIUM_CATALOG } from '../domain/premium-catalog';
import type { PrototypeRoundResult } from '../prototype/prototype-coordinator';
import { PrototypeCoordinator } from '../prototype/prototype-coordinator';
import { CameraSwitcher } from '../prototype/camera-switcher';
import { ArcadePortraitBackground } from '../prototype/arcade-portrait-background';
import { GameAudioPlayer } from '../prototype/game-audio-player';
import { CollectionOverlay, type CollectionOverlayActions } from './collection-overlay';
import { ConfirmOverlay } from './confirm-overlay';
import { GameConsole, type GameConsoleActions } from './game-console';
import { HomePanel, type HomePanelActions } from './home-panel';
import { RefillOverlay } from './refill-overlay';
import { ResultOverlay, type ResultOverlayActions } from './result-overlay';
import { UI_COLORS, UI_SIZES } from './ui-theme';
import { color, drawBeveledPanel, ensureLabel } from './ui-drawing';

const { ccclass, property } = _decorator;

@ccclass('GameUiRoot')
export class GameUiRoot extends Component {
  @property(PrototypeCoordinator) coordinator: PrototypeCoordinator | null = null;
  @property(CameraSwitcher) cameraSwitcher: CameraSwitcher | null = null;
  @property(HomePanel) homePanel: HomePanel | null = null;
  @property(GameConsole) gameConsole: GameConsole | null = null;
  @property(ResultOverlay) resultOverlay: ResultOverlay | null = null;
  @property(CollectionOverlay) collectionOverlay: CollectionOverlay | null = null;
  @property(ConfirmOverlay) confirmOverlay: ConfirmOverlay | null = null;
  @property(RefillOverlay) refillOverlay: RefillOverlay | null = null;
  @property(GameAudioPlayer) gameAudio: GameAudioPlayer | null = null;
  private flow: MainUiFlowState = createInitialMainUiFlow();
  private lastResult: PrototypeRoundResult | null = null;
  private readonly handleCoordinatorChanged = (): void => this.render();
  private readonly handleCoordinatorResult = (result: PrototypeRoundResult): void => this.settle(result);
  private readonly homePanelActions: HomePanelActions = {
    onInsertCoin: () => this.insertCoin(),
    onOpenCollection: () => this.openCollection(),
    onMachineSelected: (machineId, direction) => this.selectMachine(machineId, direction),
  };
  private readonly gameConsoleActions: GameConsoleActions = {
    onDrop: () => this.drop(),
    onToggleCamera: () => this.toggleCamera(),
    onRequestExit: () => this.requestExit(),
  };
  private readonly resultOverlayActions: ResultOverlayActions = {
    onClose: () => { void this.closeResult(false); },
    onOpenCollection: () => { void this.closeResult(true); },
  };
  private readonly collectionOverlayActions: CollectionOverlayActions = {
    onClose: () => this.dispatch({ type: 'CLOSE_COLLECTION' }),
    onRequestExchange: (id) => this.requestExchange(id),
  };
  private readonly handleConfirmCancel = (): void => this.dispatch({ type: 'CANCEL_EXIT' });
  private readonly handleMovementChanged = (moving: boolean): void => {
    this.gameAudio?.dispatch({ type: 'MOVEMENT_CHANGED', moving });
  };

  start(): void {
    view.setDesignResolutionSize(UI_SIZES.designWidth, UI_SIZES.designHeight, ResolutionPolicy.FIXED_WIDTH);
    view.on('canvas-resize', this.layout, this);
    this.bindActions();
    this.preparePortraitBackground();
    this.prepareTopHud();
    if (this.coordinator) {
      this.coordinator.onChanged = this.handleCoordinatorChanged;
      this.coordinator.onResult = this.handleCoordinatorResult;
      if (this.coordinator.controller) {
        this.coordinator.controller.onMovementChanged = this.handleMovementChanged;
      }
    }
    this.cameraSwitcher?.setMode('home');
    this.layout();
    this.render();
    // 小游戏平台首帧的安全区域可能仍沿用旧设计分辨率，下一帧再校准一次顶部位置。
    this.scheduleOnce(this.layout, 0);
  }

  private preparePortraitBackground(): void {
    const scene = this.node.scene;
    if (!scene) return;
    let backgroundNode = scene.getChildByName('ArcadePortraitBackground');
    if (!backgroundNode) {
      backgroundNode = new Node('ArcadePortraitBackground');
      backgroundNode.setParent(scene);
    }
    const background = backgroundNode.getComponent(ArcadePortraitBackground)
      ?? backgroundNode.addComponent(ArcadePortraitBackground);
    background.setCameras(this.cameraSwitcher?.front ?? null, this.cameraSwitcher?.side ?? null);
    const machineRoot = scene.getChildByName('PrototypeRoot')?.getChildByName('Machine') ?? null;
    background.setMachineRoot(machineRoot);
  }

  onDestroy(): void {
    view.off('canvas-resize', this.layout, this);
    // 只清除仍由本实例持有的绑定，避免旧实例销毁时误删后来界面实例的新绑定。
    if (this.coordinator?.onChanged === this.handleCoordinatorChanged) this.coordinator.onChanged = null;
    if (this.coordinator?.onResult === this.handleCoordinatorResult) this.coordinator.onResult = null;
    if (this.homePanel?.actions === this.homePanelActions) this.homePanel.actions = null;
    if (this.gameConsole?.actions === this.gameConsoleActions) this.gameConsole.actions = null;
    if (this.resultOverlay?.actions === this.resultOverlayActions) this.resultOverlay.actions = null;
    if (this.collectionOverlay?.actions === this.collectionOverlayActions) this.collectionOverlay.actions = null;
    if (this.confirmOverlay?.onCancel === this.handleConfirmCancel) this.confirmOverlay.onCancel = null;
    if (this.coordinator?.controller?.onMovementChanged === this.handleMovementChanged) {
      this.coordinator.controller.onMovementChanged = null;
    }
  }

  private bindActions(): void {
    if (this.homePanel) this.homePanel.actions = this.homePanelActions;
    if (this.gameConsole) this.gameConsole.actions = this.gameConsoleActions;
    if (this.resultOverlay) this.resultOverlay.actions = this.resultOverlayActions;
    if (this.collectionOverlay) this.collectionOverlay.actions = this.collectionOverlayActions;
    if (this.confirmOverlay) this.confirmOverlay.onCancel = this.handleConfirmCancel;
  }

  private insertCoin(): void {
    try {
      if (!this.coordinator?.insertCoin()) return;
      this.gameAudio?.dispatch({ type: 'COIN_ACCEPTED' });
      this.dispatch({ type: 'COIN_ACCEPTED' });
      this.cameraSwitcher?.setMode('play');
    } catch { this.homePanel?.render(presentPrototypeHud(this.coordinator!.store.snapshot())); }
  }

  private async selectMachine(machineId: string, direction: -1 | 1): Promise<boolean> {
    if (!this.coordinator) return false;
    this.coordinator.setMachineSelectionContext(this.flow.phase, this.flow.layer);
    return this.coordinator.selectMachine(machineId, direction);
  }

  private drop(): void {
    if (!canUseGameConsoleAction(this.flow, 'drop')) return;
    this.gameAudio?.dispatch({ type: 'DROP_STARTED' });
    this.dispatch({ type: 'DROP_STARTED' });
    void this.coordinator?.grab();
  }

  private toggleCamera(): void {
    if (!canUseGameConsoleAction(this.flow, 'camera')) return;
    this.cameraSwitcher?.toggle();
  }

  private settle(result: PrototypeRoundResult): void {
    this.lastResult = result;
    this.gameAudio?.dispatch({ type: 'ROUND_SETTLED', won: result.won });
    this.dispatch({ type: 'ROUND_SETTLED', outcome: result.won ? 'won' : 'missed', needsRefill: result.needsRefill });
  }

  private async closeResult(openCollection: boolean): Promise<void> {
    this.resultOverlay?.hide();
    this.dispatch({ type: 'CLOSE_RESULT' });
    if (this.flow.layer === 'refilling' && this.refillOverlay) {
      await this.refillOverlay.play(() => this.coordinator?.refillDollsAfterResult());
      this.dispatch({ type: 'REFILL_FINISHED' });
    }
    this.cameraSwitcher?.setMode('home');
    if (openCollection) this.openCollection();
  }

  private requestExit(): void {
    if (!canUseGameConsoleAction(this.flow, 'exit')) return;
    this.dispatch({ type: 'REQUEST_EXIT' });
    this.confirmOverlay?.show('exit-round', '本局已经投币，离开后费用不会返还', () => {
      this.coordinator?.abandonAttempt();
      this.dispatch({ type: 'CONFIRM_EXIT' });
      this.cameraSwitcher?.setMode('home');
    });
  }

  private openCollection(): void {
    const previous = this.flow;
    this.dispatch({ type: 'OPEN_COLLECTION' });
    if (this.flow !== previous) this.collectionOverlay?.showMessage('');
  }

  private requestExchange(id: string): void {
    if (!this.coordinator) return;
    const snapshot = this.coordinator.store.snapshot();
    const prize = PREMIUM_CATALOG.find((item) => item.id === id);
    if (!prize || snapshot.ordinaryDolls < snapshot.exchangeCost) return;
    this.confirmOverlay?.show('exchange-prize', `使用 ${snapshot.exchangeCost} 只普通娃娃兑换${prize.name}`, () => {
      this.coordinator?.exchangePremium(id);
      this.collectionOverlay?.render(this.coordinator!.store.snapshot());
      this.collectionOverlay?.showMessage('兑换完成');
    });
  }

  private dispatch(action: MainUiAction): void { this.flow = reduceMainUiFlow(this.flow, action); this.render(); }

  private render(): void {
    if (!this.coordinator) return;
    this.coordinator.setMachineSelectionContext(this.flow.phase, this.flow.layer);
    const snapshot = this.coordinator.store.snapshot();
    const hud = presentPrototypeHud(snapshot);
    const visibility = resolveGameUiVisibility(this.flow);
    const topHud = this.node.getChildByName('TopHud');
    if (topHud) topHud.active = visibility.showTopHud;
    if (this.homePanel) this.homePanel.node.active = visibility.showHomePanel;
    if (this.gameConsole) {
      this.gameConsole.node.active = visibility.showGameConsole;
    }
    if (visibility.showHomePanel) {
      this.homePanel?.render(hud, snapshot.remainingDolls, snapshot.machineId);
    }
    if (this.gameConsole?.node.active) this.gameConsole.render(hud);
    const coin = topHud?.getChildByName('CoinText')?.getComponent(Label);
    const dolls = topHud?.getChildByName('DollText')?.getComponent(Label);
    if (coin) coin.string = hud.coinText;
    if (dolls) dolls.string = hud.ordinaryText;
    if (this.flow.layer === 'result' && this.lastResult) this.resultOverlay?.show(this.lastResult, snapshot.ordinaryDolls >= snapshot.exchangeCost);
    if (this.flow.layer === 'collection') this.collectionOverlay?.render(snapshot);
  }

  private layout(): void {
    const visibleSize = view.getVisibleSize();
    const safe = sys.getSafeAreaRect(false);
    // Cocos 已把安全区域换算到设计坐标，这里不能再次按设备像素比例缩放。
    const safeInsets = resolveSafeAreaInsets(visibleSize.height, safe);
    const layout = resolvePortraitLayout(visibleSize.height, safeInsets.top, safeInsets.bottom);
    const homeLayout = resolvePortraitLayout(
      visibleSize.height,
      safeInsets.top,
      safeInsets.bottom,
      'home',
    );
    this.node.getChildByName('TopHud')?.setPosition(0, layout.topHudY);
    this.gameConsole?.node.setPosition(0, layout.consoleCenterY);
    this.homePanel?.node.getChildByName('HomeConsole')?.setPosition(0, homeLayout.consoleCenterY);
    const utilityY = layout.topHudY - layout.consoleCenterY;
    this.gameConsole?.node.getChildByName('BackButton')?.setPosition(-292, utilityY);
    this.gameConsole?.node.getChildByName('CameraButton')?.setPosition(292, utilityY);
  }

  private prepareTopHud(): void {
    const topHud = this.node.getChildByName('TopHud');
    if (!topHud) return;
    const left = ensureLabel(topHud, 'CoinText', 240, 60, 23, color(UI_COLORS.gold), 'data');
    const right = ensureLabel(topHud, 'DollText', 240, 60, 23, color(UI_COLORS.paper), 'data');
    left.node.setPosition(-138, 0);
    right.node.setPosition(138, 0);
    drawBeveledPanel(
      topHud,
      590,
      78,
      color(UI_COLORS.ink, 238),
      color(UI_COLORS.ink),
      color(UI_COLORS.aqua),
    );
  }
}
