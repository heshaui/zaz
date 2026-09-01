import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import {
  DEFAULT_SAMPLE_RATE,
  encodeMonoPcm16Wav,
  generateClawMachineSounds,
} from './audio-synthesis';

const outputDirectory = resolve('game/assets/resources/audio/sfx');
const sounds = generateClawMachineSounds(DEFAULT_SAMPLE_RATE);
const backgroundSampleRate = 22_050;
const background = generateClawMachineSounds(backgroundSampleRate).background;
const files = {
  'coin-real.wav': { samples: sounds.coin, sampleRate: DEFAULT_SAMPLE_RATE },
  'drop-button-real.wav': { samples: sounds.button, sampleRate: DEFAULT_SAMPLE_RATE },
  'rail-loop.wav': { samples: sounds.rail, sampleRate: DEFAULT_SAMPLE_RATE },
  'prize-chute.wav': { samples: sounds.prize, sampleRate: DEFAULT_SAMPLE_RATE },
  'dream-arcade-loop.wav': { samples: background, sampleRate: backgroundSampleRate },
};

await mkdir(outputDirectory, { recursive: true });
await Promise.all(
  Object.entries(files).map(([name, audio]) =>
    writeFile(
      resolve(outputDirectory, name),
      encodeMonoPcm16Wav(audio.samples, audio.sampleRate),
    ),
  ),
);

console.log(`Generated ${Object.keys(files).length} game audio files in ${outputDirectory}`);
