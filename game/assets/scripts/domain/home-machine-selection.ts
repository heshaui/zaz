export interface HomeMachineDefinition {
  id: string;
  name: string;
  stockCount: number;
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
  stockCount: 8,
  leftAccent: '#15B8BE',
  rightAccent: '#EF607D',
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
    : machine.stockCount;
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

function normalizeIndex(length: number, index: number): number {
  // 连续取模两次可同时处理负数和超出数组末尾的索引，让左右选择自然循环。
  return ((Math.trunc(index) % length) + length) % length;
}
