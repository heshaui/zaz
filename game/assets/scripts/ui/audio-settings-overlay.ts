import { _decorator, BlockInputEvents, Button, Component, Label, Node, view } from 'cc';
import type { AudioSettingKey, AudioSettings } from '../domain/audio-settings';
import { resolveFullscreenOverlaySize } from '../domain/portrait-layout';
import { UI_COLORS } from './ui-theme';
import {
  color,
  drawBeveledPanel,
  drawHardwarePanel,
  drawPhysicalButton,
  drawScrew,
  drawToggleSwitch,
  ensureLabel,
  ensureUiNode,
} from './ui-drawing';

const { ccclass } = _decorator;

export interface AudioSettingsOverlayActions {
  onClose: () => void;
  onToggle: (key: AudioSettingKey) => AudioSettings;
}

@ccclass('AudioSettingsOverlay')
export class AudioSettingsOverlay extends Component {
  actions: AudioSettingsOverlayActions | null = null;
  private backgroundToggle: Node | null = null;
  private effectsToggle: Node | null = null;
  private backgroundStatus: Label | null = null;
  private effectsStatus: Label | null = null;
  private readonly layoutMask = (): void => {
    const visibleSize = view.getVisibleSize();
    const overlaySize = resolveFullscreenOverlaySize(visibleSize.width, visibleSize.height);
    this.node.setPosition(0, 0);
    drawHardwarePanel(
      this.node,
      overlaySize.width,
      overlaySize.height,
      color(UI_COLORS.ink, 188),
      color(UI_COLORS.ink, 188),
      0,
    );
  };

  onLoad(): void {
    this.node.addComponent(BlockInputEvents);
    view.on('canvas-resize', this.layoutMask, this);
    this.layoutMask();

    const panel = ensureUiNode(this.node, 'SettingsPanel');
    panel.setPosition(0, 42);
    drawBeveledPanel(
      panel,
      578,
      430,
      color('#24343E'),
      color(UI_COLORS.ink),
      color(UI_COLORS.gold),
    );
    ensureLabel(panel, 'Title', 320, 64, 34, color(UI_COLORS.paper), 'display').string = '声音设置';
    panel.getChildByName('Title')?.setPosition(0, 158);

    this.addScrew(panel, 'TopLeftScrew', -252, 184);
    this.addScrew(panel, 'BottomRightScrew', 252, -184);
    this.prepareCloseButton(panel);
    const background = this.prepareSettingRow(panel, 'BackgroundMusic', 54, '背景音乐', UI_COLORS.coral);
    this.backgroundToggle = background.toggle;
    this.backgroundStatus = background.status;
    const effects = this.prepareSettingRow(panel, 'SoundEffects', -74, '游戏音效', UI_COLORS.aqua);
    this.effectsToggle = effects.toggle;
    this.effectsStatus = effects.status;
  }

  show(settings: AudioSettings): void {
    this.node.active = true;
    this.layoutMask();
    this.render(settings);
  }

  onDestroy(): void {
    view.off('canvas-resize', this.layoutMask, this);
  }

  hide(): void {
    this.node.active = false;
  }

  render(settings: AudioSettings): void {
    this.renderToggle(
      this.backgroundToggle,
      this.backgroundStatus,
      settings.backgroundMusicEnabled,
      UI_COLORS.coral,
    );
    this.renderToggle(
      this.effectsToggle,
      this.effectsStatus,
      settings.soundEffectsEnabled,
      UI_COLORS.aqua,
    );
  }

  close(): void {
    this.actions?.onClose();
  }

  private toggleBackgroundMusic(): void {
    const settings = this.actions?.onToggle('backgroundMusicEnabled');
    if (settings) this.render(settings);
  }

  private toggleSoundEffects(): void {
    const settings = this.actions?.onToggle('soundEffectsEnabled');
    if (settings) this.render(settings);
  }

  private prepareSettingRow(
    panel: Node,
    name: string,
    y: number,
    labelText: string,
    accentHex: string,
  ): { toggle: Node; status: Label } {
    const row = ensureUiNode(panel, name);
    row.setPosition(0, y);
    drawHardwarePanel(row, 492, 98, color('#10212A'), color(accentHex), 8);
    const label = ensureLabel(row, 'Label', 180, 56, 27, color(UI_COLORS.paper), 'display');
    label.node.setPosition(-150, 0);
    label.string = labelText;
    const toggle = ensureUiNode(row, 'Toggle');
    toggle.setPosition(165, 0);
    const button = toggle.getComponent(Button) ?? toggle.addComponent(Button);
    button.transition = Button.Transition.SCALE;
    button.zoomScale = 0.94;
    toggle.on(
      Button.EventType.CLICK,
      name === 'BackgroundMusic' ? this.toggleBackgroundMusic : this.toggleSoundEffects,
      this,
    );
    const status = ensureLabel(row, 'Status', 88, 34, 17, color(UI_COLORS.gold), 'data');
    status.node.setPosition(18, 0);
    return { toggle, status };
  }

  private renderToggle(node: Node | null, status: Label | null, enabled: boolean, accentHex: string): void {
    if (node) drawToggleSwitch(node, enabled, color(accentHex));
    if (status) status.string = enabled ? '已开启' : '已关闭';
  }

  private prepareCloseButton(panel: Node): void {
    const node = ensureUiNode(panel, 'CloseButton');
    node.setPosition(244, 158);
    drawPhysicalButton(node, 68, color(UI_COLORS.coral), color(UI_COLORS.ink));
    ensureLabel(node, 'Symbol', 46, 46, 38, color(UI_COLORS.paper), 'display').string = '×';
    const button = node.getComponent(Button) ?? node.addComponent(Button);
    button.transition = Button.Transition.SCALE;
    button.zoomScale = 0.92;
    node.on(Button.EventType.CLICK, this.close, this);
  }

  private addScrew(parent: Node, name: string, x: number, y: number): void {
    const screw = ensureUiNode(parent, name);
    screw.setPosition(x, y);
    drawScrew(screw, 8);
  }
}
