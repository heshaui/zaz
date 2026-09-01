import { _decorator, Component, Node, profiler } from 'cc';
import { CollectionOverlay } from '../ui/collection-overlay';
import { ConfirmOverlay } from '../ui/confirm-overlay';
import { GameConsole } from '../ui/game-console';
import { GameUiRoot } from '../ui/game-ui-root';
import { HomePanel } from '../ui/home-panel';
import { RefillOverlay } from '../ui/refill-overlay';
import { ResultOverlay } from '../ui/result-overlay';
import { CameraSwitcher } from './camera-switcher';
import { GameAudioPlayer } from './game-audio-player';
import { PrototypeCoordinator } from './prototype-coordinator';

const { ccclass, property } = _decorator;

@ccclass('PrototypeHud')
export class PrototypeHud extends Component {
  @property(PrototypeCoordinator) coordinator: PrototypeCoordinator | null = null;
  @property(CameraSwitcher) cameraSwitcher: CameraSwitcher | null = null;

  start(): void {
    profiler.hideStats();
    // 该桥接仅保留一版，用来复用旧场景中的脚本序列化引用；正式页面树已全部预建在场景中。
    const safeArea = this.node.getChildByName('SafeArea');
    if (!safeArea || !this.coordinator) return;
    const home = this.attach(safeArea, 'HomePanel', HomePanel);
    const gameConsole = this.attach(safeArea, 'GameConsole', GameConsole);
    const result = this.attach(safeArea, 'ResultOverlay', ResultOverlay);
    const collection = this.attach(safeArea, 'CollectionOverlay', CollectionOverlay);
    const confirm = this.attach(safeArea, 'ConfirmOverlay', ConfirmOverlay);
    const refill = this.attach(safeArea, 'RefillOverlay', RefillOverlay);
    const audioNode = safeArea.getChildByName('GameAudio') ?? new Node('GameAudio');
    if (!audioNode.parent) audioNode.setParent(safeArea);
    const gameAudio = audioNode.getComponent(GameAudioPlayer) ?? audioNode.addComponent(GameAudioPlayer);
    const root = safeArea.getComponent(GameUiRoot) ?? safeArea.addComponent(GameUiRoot);
    root.coordinator = this.coordinator;
    root.cameraSwitcher = this.cameraSwitcher;
    root.homePanel = home;
    root.gameConsole = gameConsole;
    root.resultOverlay = result;
    root.collectionOverlay = collection;
    root.confirmOverlay = confirm;
    root.refillOverlay = refill;
    root.gameAudio = gameAudio;
    if (gameConsole) gameConsole.joystickNode = gameConsole.node.getChildByName('Joystick');
  }

  private attach<T extends Component>(
    parent: Node,
    name: string,
    component: new () => T,
  ): T | null {
    const node = parent.getChildByName(name);
    return node ? (node.getComponent(component) ?? node.addComponent(component)) : null;
  }
}
