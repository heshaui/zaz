import { describe, expect, it } from 'vitest';
import sceneJson from '../../game/assets/scenes/prototype.scene?raw';
import coordinatorSource from '../../game/assets/scripts/prototype/prototype-coordinator.ts?raw';

const COORDINATOR_CLASS_ID = '8c4b1qcdSlGIo4TxcIURs+W';
describe('prototype scene model contract', () => {
  it('为运行协调器直接提供两台机的模型资源', () => {
    const sceneData = JSON.parse(sceneJson) as Array<Record<string, unknown>>;
    const coordinator = sceneData.find((entry) => entry.__type__ === COORDINATOR_CLASS_ID);
    const prefabs = coordinator?.machinePrefabs as Array<{ __uuid__?: string }> | undefined;

    expect(coordinator).toBeDefined();
    expect(prefabs?.map((prefab) => prefab.__uuid__)).toEqual([
      '2e88f543-9763-4a0b-b1a4-8b2eaf0236d5@beb32',
      'f1d3ea29-52e2-4b4c-b7e4-4136d4f55890@64bad',
    ]);
    expect(coordinator).not.toHaveProperty('machineAssets');
    expect(coordinator).not.toHaveProperty('machinePrefab');
  });

  it('loads the model in edit mode without starting gameplay', () => {
    expect(coordinatorSource).toContain('@executeInEditMode');
    expect(coordinatorSource).toContain('if (EDITOR) return;');
  });

  it('启动时恢复中断在下一批补充前的空机台', () => {
    expect(coordinatorSource).toContain('this.restorePendingRefillOnStart();');
    expect(coordinatorSource).toContain('private restorePendingRefillOnStart(): void');
    expect(coordinatorSource).toContain(
      'if (this.store.refillCurrentMachine()) this.persistPlayerState();',
    );
  });
});
