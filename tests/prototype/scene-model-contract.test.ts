import { describe, expect, it } from 'vitest';
import sceneJson from '../../game/assets/scenes/prototype.scene?raw';
import coordinatorSource from '../../game/assets/scripts/prototype/prototype-coordinator.ts?raw';

const COORDINATOR_CLASS_ID = '8c4b1qcdSlGIo4TxcIURs+W';
const MACHINE_PREFAB_UUID = '18b4cca9-9222-43c0-9699-a2dec424090d@57a81';

describe('prototype scene model contract', () => {
  it('provides the imported machine prefab to the runtime coordinator', () => {
    const sceneData = JSON.parse(sceneJson) as Array<Record<string, unknown>>;
    const coordinator = sceneData.find((entry) => entry.__type__ === COORDINATOR_CLASS_ID);

    expect(coordinator).toBeDefined();
    expect(coordinator?.machinePrefab).toEqual({ __uuid__: MACHINE_PREFAB_UUID });
  });

  it('loads the model in edit mode without starting gameplay', () => {
    expect(coordinatorSource).toContain('@executeInEditMode');
    expect(coordinatorSource).toContain('if (EDITOR) return;');
  });
});
