export interface AudioSettings {
  backgroundMusicEnabled: boolean;
  soundEffectsEnabled: boolean;
}

export interface AudioSettingsStoragePort {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export type AudioSettingKey = keyof AudioSettings;

export const DEFAULT_AUDIO_SETTINGS: AudioSettings = {
  backgroundMusicEnabled: true,
  soundEffectsEnabled: true,
};

const AUDIO_SETTINGS_KEY = 'virtual-claw-game.audio.v1';
const AUDIO_SETTINGS_VERSION = 1;

export function loadAudioSettings(storage: AudioSettingsStoragePort): AudioSettings {
  try {
    const raw = storage.getItem(AUDIO_SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_AUDIO_SETTINGS };
    const parsed = JSON.parse(raw) as unknown;
    if (!isRecord(parsed) || parsed.version !== AUDIO_SETTINGS_VERSION) {
      return { ...DEFAULT_AUDIO_SETTINGS };
    }
    if (
      typeof parsed.backgroundMusicEnabled !== 'boolean'
      || typeof parsed.soundEffectsEnabled !== 'boolean'
    ) {
      return { ...DEFAULT_AUDIO_SETTINGS };
    }
    return {
      backgroundMusicEnabled: parsed.backgroundMusicEnabled,
      soundEffectsEnabled: parsed.soundEffectsEnabled,
    };
  } catch {
    return { ...DEFAULT_AUDIO_SETTINGS };
  }
}

export function saveAudioSettings(
  storage: AudioSettingsStoragePort,
  settings: AudioSettings,
): boolean {
  try {
    storage.setItem(AUDIO_SETTINGS_KEY, JSON.stringify({
      version: AUDIO_SETTINGS_VERSION,
      ...settings,
    }));
    return true;
  } catch {
    return false;
  }
}

export function toggleAudioSetting(
  settings: AudioSettings,
  key: AudioSettingKey,
): AudioSettings {
  return {
    ...settings,
    [key]: !settings[key],
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
