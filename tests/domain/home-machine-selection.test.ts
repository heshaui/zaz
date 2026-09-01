import { describe, expect, it } from 'vitest';
import {
  HOME_MACHINES,
  moveHomeMachineSelection,
  presentHomeMachineSelection,
} from '../../game/assets/scripts/domain/home-machine-selection';

describe('home machine selection', () => {
  it('单台机时展示机台资料并隐藏切换入口', () => {
    expect(presentHomeMachineSelection(HOME_MACHINES, 0, '3 币 / 局')).toEqual({
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
    const machines = [
      HOME_MACHINES[0],
      { ...HOME_MACHINES[0], id: 'cat-garden', name: '猫咪花园' },
    ];

    expect(presentHomeMachineSelection(machines, 1, '5 币 / 局')).toMatchObject({
      machineId: 'cat-garden',
      machineName: '猫咪花园',
      badgeText: '猫咪花园',
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
    const machines = [
      HOME_MACHINES[0],
      { ...HOME_MACHINES[0], id: 'cat-garden', name: '猫咪花园' },
    ];

    expect(moveHomeMachineSelection(machines, 0, -1)).toBe(1);
    expect(moveHomeMachineSelection(machines, 1, 1)).toBe(0);
  });
});
