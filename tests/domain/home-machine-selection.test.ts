import { describe, expect, it } from 'vitest';
import {
  confirmHomeMachineSelection,
  HOME_MACHINES,
  moveHomeMachineSelection,
  presentHomeMachineSelection,
} from '../../game/assets/scripts/domain/home-machine-selection';

describe('home machine selection', () => {
  it('目录包含两台机的模型、娃娃和主题资料', () => {
    expect(HOME_MACHINES).toEqual([
      expect.objectContaining({
        id: 'moon-rabbit',
        name: '月亮兔仓',
        modelKey: 'moon-rabbit-model',
        dollTemplateName: 'DollRabbit',
        dollSpecies: 'rabbit',
        batchSize: 8,
        layoutSeed: 20260827,
      }),
      expect.objectContaining({
        id: 'strawberry-cat',
        name: '草莓猫舍',
        modelKey: 'strawberry-cat-model',
        dollTemplateName: 'DollCat',
        dollSpecies: 'cat',
        batchSize: 8,
        leftAccent: '#F06B73',
        rightAccent: '#20B8B2',
      }),
    ]);
  });

  it('单台机时展示机台资料并隐藏切换入口', () => {
    expect(presentHomeMachineSelection([HOME_MACHINES[0]], 0, '3 币 / 局')).toEqual({
      machineId: 'moon-rabbit',
      machineName: '月亮兔仓',
      badgeText: '月亮兔仓',
      showcaseFrameVisible: false,
      stockText: '8 只',
      feeText: '3 币 / 局',
      leftAccent: '#15B8BE',
      rightAccent: '#EF607D',
      canSwitch: false,
      positionText: '',
      selectedIndex: 0,
    });
  });

  it('多台机时展示切换入口和当前位置', () => {
    expect(presentHomeMachineSelection(HOME_MACHINES, 1, '5 币 / 局')).toMatchObject({
      machineId: 'strawberry-cat',
      machineName: '草莓猫舍',
      badgeText: '草莓猫舍',
      feeText: '5 币 / 局',
      canSwitch: true,
      positionText: '2 / 2',
      selectedIndex: 1,
    });
  });

  it('机台配置调整后更新库存文本', () => {
    expect(presentHomeMachineSelection(HOME_MACHINES, 0, '3 币 / 局', 5)).toMatchObject({
      stockText: '5 只',
    });
  });

  it('左右选择在机台列表两端循环衔接', () => {
    expect(moveHomeMachineSelection(HOME_MACHINES, 0, -1)).toBe(1);
    expect(moveHomeMachineSelection(HOME_MACHINES, 1, 1)).toBe(0);
  });

  it('候选模型成功后才确认新的首页索引', () => {
    expect(confirmHomeMachineSelection(HOME_MACHINES, 0, 1, true)).toBe(1);
    expect(confirmHomeMachineSelection(HOME_MACHINES, 0, 1, false)).toBe(0);
  });
});
