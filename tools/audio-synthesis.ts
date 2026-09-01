export const DEFAULT_SAMPLE_RATE = 44_100;

export interface ClawMachineSounds {
  coin: Float32Array;
  button: Float32Array;
  rail: Float32Array;
  prize: Float32Array;
}

const TAU = Math.PI * 2;

function createBuffer(durationSeconds: number, sampleRate: number): Float32Array {
  return new Float32Array(Math.round(durationSeconds * sampleRate));
}

function createNoise(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1_664_525) + 1_013_904_223) >>> 0;
    return (state / 0xffff_ffff) * 2 - 1;
  };
}

function addDampedTone(
  target: Float32Array,
  sampleRate: number,
  startSeconds: number,
  durationSeconds: number,
  frequency: number,
  amplitude: number,
  decay: number,
  phase = 0,
): void {
  const start = Math.round(startSeconds * sampleRate);
  const length = Math.min(Math.round(durationSeconds * sampleRate), target.length - start);
  for (let index = 0; index < length; index += 1) {
    const time = index / sampleRate;
    const envelope = Math.exp(-time / decay);
    target[start + index] += Math.sin(TAU * frequency * time + phase) * amplitude * envelope;
  }
}

function addFilteredNoise(
  target: Float32Array,
  sampleRate: number,
  startSeconds: number,
  durationSeconds: number,
  amplitude: number,
  seed: number,
  tone: 'low' | 'high',
): void {
  const random = createNoise(seed);
  const start = Math.round(startSeconds * sampleRate);
  const length = Math.min(Math.round(durationSeconds * sampleRate), target.length - start);
  let smoothed = 0;

  for (let index = 0; index < length; index += 1) {
    const time = index / sampleRate;
    const raw = random();
    smoothed += (raw - smoothed) * (tone === 'low' ? 0.055 : 0.22);
    const filtered = tone === 'low' ? smoothed : raw - smoothed;
    const attack = Math.min(1, time / 0.004);
    const release = Math.max(0, 1 - time / durationSeconds) ** 2;
    target[start + index] += filtered * amplitude * attack * release;
  }
}

function addMetalImpact(
  target: Float32Array,
  sampleRate: number,
  startSeconds: number,
  amplitude: number,
): void {
  // 多个非整数倍频率叠加，模拟硬币碰到币道时短促而不夸张的金属共振。
  const frequencies = [1_320, 2_460, 3_780, 5_240];
  frequencies.forEach((frequency, index) => {
    addDampedTone(
      target,
      sampleRate,
      startSeconds,
      0.13,
      frequency,
      amplitude / (1 + index * 0.28),
      0.026 + index * 0.006,
      index * 0.73,
    );
  });
  addFilteredNoise(target, sampleRate, startSeconds, 0.045, amplitude * 0.45, 1049, 'high');
}

function fadeEdges(
  samples: Float32Array,
  sampleRate: number,
  fadeInSeconds: number,
  fadeOutSeconds: number,
): void {
  const fadeIn = Math.min(samples.length, Math.round(fadeInSeconds * sampleRate));
  const fadeOut = Math.min(samples.length, Math.round(fadeOutSeconds * sampleRate));
  for (let index = 0; index < fadeIn; index += 1) {
    samples[index] *= index / Math.max(1, fadeIn - 1);
  }
  for (let index = 0; index < fadeOut; index += 1) {
    const offset = samples.length - fadeOut + index;
    samples[offset] *= 1 - index / Math.max(1, fadeOut - 1);
  }
}

function normalize(samples: Float32Array, targetPeak: number): Float32Array {
  let peak = 0;
  for (const sample of samples) peak = Math.max(peak, Math.abs(sample));
  if (peak === 0) return samples;
  const gain = targetPeak / peak;
  for (let index = 0; index < samples.length; index += 1) samples[index] *= gain;
  return samples;
}

function createCoinSound(sampleRate: number): Float32Array {
  const samples = createBuffer(0.62, sampleRate);
  addFilteredNoise(samples, sampleRate, 0, 0.24, 0.16, 2201, 'high');
  addMetalImpact(samples, sampleRate, 0.035, 0.42);
  addMetalImpact(samples, sampleRate, 0.19, 0.25);
  addDampedTone(samples, sampleRate, 0.35, 0.08, 1_850, 0.18, 0.012);
  addFilteredNoise(samples, sampleRate, 0.35, 0.035, 0.12, 805, 'high');
  fadeEdges(samples, sampleRate, 0.003, 0.12);
  return normalize(samples, 0.72);
}

function createButtonSound(sampleRate: number): Float32Array {
  const samples = createBuffer(0.19, sampleRate);
  addFilteredNoise(samples, sampleRate, 0.008, 0.045, 0.42, 723, 'low');
  addDampedTone(samples, sampleRate, 0.012, 0.055, 430, 0.34, 0.012);
  addDampedTone(samples, sampleRate, 0.044, 0.04, 2_150, 0.19, 0.008);
  addFilteredNoise(samples, sampleRate, 0.105, 0.026, 0.2, 443, 'high');
  addDampedTone(samples, sampleRate, 0.105, 0.035, 780, 0.13, 0.009);
  fadeEdges(samples, sampleRate, 0.002, 0.055);
  return normalize(samples, 0.62);
}

function createRailLoop(sampleRate: number): Float32Array {
  const durationSeconds = 2.5;
  const samples = createBuffer(durationSeconds, sampleRate);
  const sampleCount = samples.length;
  const components: Array<[number, number, number]> = [
    [235, 0.38, 0.1],
    [470, 0.16, 1.2],
    [705, 0.075, 2.1],
    [1_175, 0.038, 0.7],
    [1_880, 0.022, 2.8],
  ];

  // 轨道底噪由整周期正弦组成，既保留细微机械质感，也保证首尾自然衔接。
  const random = createNoise(9_731);
  for (let index = 0; index < 18; index += 1) {
    const cycles = 1_250 + index * 173;
    components.push([cycles, 0.012 + random() * 0.002, random() * Math.PI]);
  }

  for (let index = 0; index < sampleCount; index += 1) {
    let value = 0;
    for (const [cycles, amplitude, phase] of components) {
      value += Math.sin(TAU * cycles * index / sampleCount + phase) * amplitude;
    }
    samples[index] = value;
  }
  return normalize(samples, 0.18);
}

function createPrizeChuteSound(sampleRate: number): Float32Array {
  const samples = createBuffer(0.78, sampleRate);
  addFilteredNoise(samples, sampleRate, 0.045, 0.22, 0.52, 3307, 'low');
  addDampedTone(samples, sampleRate, 0.05, 0.24, 96, 0.55, 0.07);
  addDampedTone(samples, sampleRate, 0.055, 0.18, 158, 0.28, 0.055, 0.8);

  addFilteredNoise(samples, sampleRate, 0.225, 0.16, 0.26, 8821, 'low');
  addDampedTone(samples, sampleRate, 0.23, 0.17, 118, 0.25, 0.05, 0.4);

  addFilteredNoise(samples, sampleRate, 0.36, 0.08, 0.13, 6151, 'high');
  addDampedTone(samples, sampleRate, 0.36, 0.1, 520, 0.12, 0.025);
  fadeEdges(samples, sampleRate, 0.004, 0.18);
  return normalize(samples, 0.68);
}

export function generateClawMachineSounds(
  sampleRate = DEFAULT_SAMPLE_RATE,
): ClawMachineSounds {
  return {
    coin: createCoinSound(sampleRate),
    button: createButtonSound(sampleRate),
    rail: createRailLoop(sampleRate),
    prize: createPrizeChuteSound(sampleRate),
  };
}

export function encodeMonoPcm16Wav(samples: Float32Array, sampleRate: number): Uint8Array {
  const bytesPerSample = 2;
  const dataLength = samples.length * bytesPerSample;
  const bytes = new Uint8Array(44 + dataLength);
  const view = new DataView(bytes.buffer);

  const writeText = (offset: number, value: string) => {
    for (let index = 0; index < value.length; index += 1) {
      bytes[offset + index] = value.charCodeAt(index);
    }
  };

  writeText(0, 'RIFF');
  view.setUint32(4, 36 + dataLength, true);
  writeText(8, 'WAVE');
  writeText(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * bytesPerSample, true);
  view.setUint16(32, bytesPerSample, true);
  view.setUint16(34, 16, true);
  writeText(36, 'data');
  view.setUint32(40, dataLength, true);

  for (let index = 0; index < samples.length; index += 1) {
    const limited = Math.max(-1, Math.min(1, samples[index]));
    const integer = limited < 0 ? Math.round(limited * 32_768) : Math.round(limited * 32_767);
    view.setInt16(44 + index * bytesPerSample, integer, true);
  }
  return bytes;
}
