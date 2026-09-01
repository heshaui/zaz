import { _decorator, Prefab } from 'cc';

const { ccclass, property } = _decorator;

@ccclass('MachineAssetBinding')
export class MachineAssetBinding {
  @property
  modelKey = '';

  @property(Prefab)
  prefab: Prefab | null = null;
}
