import {
  _decorator,
  AudioClip,
  AudioSource,
  Component,
  Node,
  resources,
} from 'cc';
import {
  createInitialGameAudioState,
  reduceGameAudio,
  type GameAudioAction,
  type GameAudioCommand,
  type GameAudioCue,
  type GameAudioState,
} from '../domain/game-audio-policy';
import { moveAudioGainTowards } from '../domain/audio-fade';

const { ccclass } = _decorator;

const AUDIO_PATHS: Record<GameAudioCue, string> = {
  coin: 'audio/sfx/coin-real',
  'drop-button': 'audio/sfx/drop-button-real',
  mechanical: 'audio/sfx/rail-loop',
  success: 'audio/sfx/prize-chute',
};

@ccclass('GameAudioPlayer')
export class GameAudioPlayer extends Component {
  private state: GameAudioState = createInitialGameAudioState();
  private oneShotSource: AudioSource | null = null;
  private mechanicalSource: AudioSource | null = null;
  private mechanicalTargetVolume = 0;
  private readonly mechanicalFadeSpeed = 1.6;
  private readonly clips = new Map<GameAudioCue, AudioClip>();
  private readonly pendingOneShots = new Map<Exclude<GameAudioCue, 'mechanical'>, GameAudioCommand>();

  onLoad(): void {
    this.oneShotSource = this.createAudioSource('OneShotAudio');
    this.mechanicalSource = this.createAudioSource('MechanicalAudio');
    (Object.keys(AUDIO_PATHS) as GameAudioCue[]).forEach((cue) => this.loadClip(cue));
  }

  dispatch(action: GameAudioAction): void {
    const transition = reduceGameAudio(this.state, action);
    this.state = transition.state;
    transition.commands.forEach((command) => this.execute(command));
  }

  onDestroy(): void {
    this.unscheduleAllCallbacks();
    this.oneShotSource?.stop();
    this.mechanicalSource?.stop();
    this.clips.clear();
    this.pendingOneShots.clear();
  }

  update(deltaTime: number): void {
    const source = this.mechanicalSource;
    if (!source?.playing) return;

    source.volume = moveAudioGainTowards(
      source.volume,
      this.mechanicalTargetVolume,
      deltaTime,
      this.mechanicalFadeSpeed,
    );

    // 降到静音后再停止循环，避免轨道声在任意波形位置被硬切产生突兀杂音。
    if (this.mechanicalTargetVolume === 0 && source.volume === 0) source.stop();
  }

  private createAudioSource(name: string): AudioSource {
    const sourceNode = new Node(name);
    sourceNode.setParent(this.node);
    return sourceNode.addComponent(AudioSource);
  }

  private loadClip(cue: GameAudioCue): void {
    resources.load(AUDIO_PATHS[cue], AudioClip, (error, clip) => {
      if (error || !clip || !this.node.isValid) return;
      this.clips.set(cue, clip);

      // 首次点击发生在资源载入完成前时保留一次播放，避免玩家第一次投币没有声音反馈。
      if (cue === 'mechanical') {
        if (this.state.mechanicalPlaying) this.startMechanical(0.16);
        return;
      }
      const pending = this.pendingOneShots.get(cue);
      if (pending?.type === 'PLAY_ONE_SHOT') {
        this.pendingOneShots.delete(cue);
        this.playOneShot(cue, pending.volume);
      }
    });
  }

  private execute(command: GameAudioCommand): void {
    switch (command.type) {
      case 'PLAY_ONE_SHOT':
        if (command.delaySeconds > 0) {
          this.scheduleOnce(
            () => this.playOneShot(command.cue, command.volume),
            command.delaySeconds,
          );
        } else {
          this.playOneShot(command.cue, command.volume);
        }
        break;
      case 'START_LOOP':
        this.startMechanical(command.volume);
        break;
      case 'STOP_LOOP':
        this.stopMechanical();
        break;
    }
  }

  private playOneShot(cue: Exclude<GameAudioCue, 'mechanical'>, volume: number): void {
    const clip = this.clips.get(cue);
    if (!clip || !this.oneShotSource) {
      this.pendingOneShots.set(cue, {
        type: 'PLAY_ONE_SHOT',
        cue,
        volume,
        delaySeconds: 0,
      });
      return;
    }
    this.oneShotSource.playOneShot(clip, volume);
  }

  private startMechanical(volume: number): void {
    const clip = this.clips.get('mechanical');
    if (!clip || !this.mechanicalSource) return;
    this.mechanicalTargetVolume = volume;
    if (this.mechanicalSource.playing) return;
    this.mechanicalSource.clip = clip;
    this.mechanicalSource.loop = true;
    this.mechanicalSource.volume = 0;
    this.mechanicalSource.play();
  }

  private stopMechanical(): void {
    if (!this.mechanicalSource?.playing) return;
    this.mechanicalTargetVolume = 0;
  }
}
