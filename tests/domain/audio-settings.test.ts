import { describe, expect, it } from 'vitest';

interface AudioSettingsSubject {
  loadAudioSettings: (storage: MemoryStorage) => {
    backgroundMusicEnabled: boolean;
    soundEffectsEnabled: boolean;
  };
  saveAudioSettings: (
    storage: MemoryStorage,
    settings: { backgroundMusicEnabled: boolean; soundEffectsEnabled: boolean },
  ) => boolean;
  toggleAudioSetting: (
    settings: { backgroundMusicEnabled: boolean; soundEffectsEnabled: boolean },
    key: 'backgroundMusicEnabled' | 'soundEffectsEnabled',
  ) => { backgroundMusicEnabled: boolean; soundEffectsEnabled: boolean };
}

class MemoryStorage {
  private readonly values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

async function loadSubject(): Promise<AudioSettingsSubject | null> {
  try {
    return await import('../../game/assets/scripts/domain/audio-settings') as AudioSettingsSubject;
  } catch {
    return null;
  }
}

describe('audio settings persistence', () => {
  it('enables both audio channels when no valid preference exists', async () => {
    const subject = await loadSubject();
    const storage = new MemoryStorage();

    expect(subject?.loadAudioSettings(storage)).toEqual({
      backgroundMusicEnabled: true,
      soundEffectsEnabled: true,
    });
  });

  it('round-trips independent background and sound-effect preferences', async () => {
    const subject = await loadSubject();
    const storage = new MemoryStorage();
    const settings = {
      backgroundMusicEnabled: false,
      soundEffectsEnabled: true,
    };

    expect(subject?.saveAudioSettings(storage, settings)).toBe(true);
    expect(subject?.loadAudioSettings(storage)).toEqual(settings);
  });

  it('toggles only the selected audio channel', async () => {
    const subject = await loadSubject();

    expect(subject?.toggleAudioSetting({
      backgroundMusicEnabled: true,
      soundEffectsEnabled: false,
    }, 'backgroundMusicEnabled')).toEqual({
      backgroundMusicEnabled: false,
      soundEffectsEnabled: false,
    });
  });
});
