export type MachineId = 'moon-rabbit' | 'strawberry-cat';
export type DollSpecies = 'rabbit' | 'cat';

export interface HomeMachineDefinition {
  id: MachineId;
  name: string;
  modelKey: string;
  dollTemplateName: 'DollRabbit' | 'DollCat';
  dollSpecies: DollSpecies;
  batchSize: number;
  layoutSeed: number;
  leftAccent: string;
  rightAccent: string;
}

export interface HomeMachineSelectionView {
  machineId: string;
  machineName: string;
  badgeText: string;
  showcaseFrameVisible: boolean;
  stockText: string;
  feeText: string;
  leftAccent: string;
  rightAccent: string;
  canSwitch: boolean;
  positionText: string;
  selectedIndex: number;
}

export const HOME_MACHINES: readonly HomeMachineDefinition[] = [{
  id: 'moon-rabbit',
  name: '月亮兔仓',
  modelKey: 'moon-rabbit-model',
  dollTemplateName: 'DollRabbit',
  dollSpecies: 'rabbit',
  batchSize: 8,
  layoutSeed: 20260827,
  leftAccent: '#15B8BE',
  rightAccent: '#EF607D',
}, {
  id: 'strawberry-cat',
  name: '草莓猫舍',
  modelKey: 'strawberry-cat-model',
  dollTemplateName: 'DollCat',
  dollSpecies: 'cat',
  batchSize: 8,
  layoutSeed: 20260901,
  leftAccent: '#F06B73',
  rightAccent: '#20B8B2',
}];

export function presentHomeMachineSelection(
  machines: readonly HomeMachineDefinition[],
  selectedIndex: number,
  feeText: string,
  stockCount?: number,
): HomeMachineSelectionView {
  if (machines.length === 0) throw new Error('machine catalog must not be empty');
  const index = normalizeIndex(machines.length, selectedIndex);
  const machine = machines[index];
  const canSwitch = machines.length > 1;
  const visibleStockCount = typeof stockCount === 'number'
    && Number.isInteger(stockCount)
    && stockCount >= 0
    ? stockCount
    : machine.batchSize;
  return {
    machineId: machine.id,
    machineName: machine.name,
    badgeText: machine.name,
    showcaseFrameVisible: false,
    stockText: `${visibleStockCount} 只`,
    feeText,
    leftAccent: machine.leftAccent,
    rightAccent: machine.rightAccent,
    canSwitch,
    positionText: canSwitch ? `${index + 1} / ${machines.length}` : '',
    selectedIndex: index,
  };
}

export function moveHomeMachineSelection(
  machines: readonly HomeMachineDefinition[],
  selectedIndex: number,
  direction: -1 | 1,
): number {
  if (machines.length === 0) return 0;
  return normalizeIndex(machines.length, selectedIndex + direction);
}

export function confirmHomeMachineSelection(
  machines: readonly HomeMachineDefinition[],
  currentIndex: number,
  candidateIndex: number,
  confirmed: boolean,
): number {
  if (machines.length === 0) return 0;
  return normalizeIndex(machines.length, confirmed ? candidateIndex : currentIndex);
}

function normalizeIndex(length: number, index: number): number {
  // 连续取模两次可同时处理负数和超出数组末尾的索引，让左右选择自然循环。
  return ((Math.trunc(index) % length) + length) % length;
}
