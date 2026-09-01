import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import {
  DEFAULT_SAMPLE_RATE,
  encodeMonoPcm16Wav,
  generateClawMachineSounds,
} from './audio-synthesis';

const outputDirectory = resolve('game/assets/resources/audio/sfx');
const sounds = generateClawMachineSounds(DEFAULT_SAMPLE_RATE);
const files = {
  'coin-real.wav': sounds.coin,
  'drop-button-real.wav': sounds.button,
  'rail-loop.wav': sounds.rail,
  'prize-chute.wav': sounds.prize,
};

await mkdir(outputDirectory, { recursive: true });
await Promise.all(
  Object.entries(files).map(([name, samples]) =>
    writeFile(resolve(outputDirectory, name), encodeMonoPcm16Wav(samples, DEFAULT_SAMPLE_RATE)),
  ),
);

console.log(`Generated ${Object.keys(files).length} game audio files in ${outputDirectory}`);
