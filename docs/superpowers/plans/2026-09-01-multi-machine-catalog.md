# 多机台目录与草莓猫舍实施计划

> **执行方式：** 当前任务内逐项执行，每项使用复选框记录。现有工作区包含本功能依赖的模型和界面改动，因此在当前目录增量开发。

**目标：** 增加月亮兔仓与草莓猫舍两台可切换机台，使共享资产保持统一、幸运轮次和娃娃批次按机台独立保存。

**架构：** 纯数据目录定义机台名称、模型键、娃娃模板、主题和布局种子；第 3 版存档把共享资产与机台运行状态分开；`PrototypeStore` 作为唯一状态修改入口。Cocos 运行层先创建并校验候选模型，再用短距离横向动画替换当前模型，首页只在替换成功后确认选择。

**技术栈：** Cocos Creator 3.8.8、TypeScript、Vitest、Blender 5.2、GLB。

**设计文档：** `docs/superpowers/specs/2026-09-01-multi-machine-catalog-design.md`

## 全局约束

- Node.js 使用当前已切换的 22.20.0，不由脚本修改系统环境。
- Blender 可执行文件为 `D:\软件\Blender-5.2\blender.exe`。
- 不启动 Cocos 预览，由用户在编辑器中查看。
- 不进行版本提交操作。
- 复杂状态切换、旧存档升级和候选模型替换逻辑必须写中文注释。
- 月亮兔仓每批只放 8 只兔子，草莓猫舍每批只放 8 只猫咪。
- 单份 GLB 小于 4 MB、三角面少于 80,000，两份合计小于 8 MB。
- 切换动画约 0.18 秒，只做轻微横向移动，不改变镜头距离。

---

### 任务 1：扩展机台目录

**文件：**

- 修改：`game/assets/scripts/domain/home-machine-selection.ts`
- 修改：`tests/domain/home-machine-selection.test.ts`

**接口：**

- 产出：`MachineId`、`DollSpecies`、扩展后的 `HomeMachineDefinition` 和两项 `HOME_MACHINES`。
- 供后续使用：存档、状态层、运行层和首页都从同一目录读取机台资料。

- [ ] **步骤 1：先写失败测试**

```ts
it('目录包含月亮兔仓和草莓猫舍的完整运行资料', () => {
  expect(HOME_MACHINES).toEqual([
    expect.objectContaining({
      id: 'moon-rabbit', modelKey: 'moon-rabbit-model',
      dollTemplateName: 'DollRabbit', dollSpecies: 'rabbit', batchSize: 8,
    }),
    expect.objectContaining({
      id: 'strawberry-cat', modelKey: 'strawberry-cat-model',
      dollTemplateName: 'DollCat', dollSpecies: 'cat', batchSize: 8,
      leftAccent: '#F06B73', rightAccent: '#20B8B2',
    }),
  ]);
});
```

- [ ] **步骤 2：运行测试并确认因第二台机和字段尚不存在而失败**

运行：`npx vitest run tests/domain/home-machine-selection.test.ts`

预期：新用例失败，现有目录长度仍为 1。

- [ ] **步骤 3：实现最小目录扩展**

```ts
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
```

把原 `stockCount` 统一为 `batchSize`，并调整首页展示测试：两台机存在时第一台显示 `1 / 2`，第二台显示 `2 / 2`。

- [ ] **步骤 4：运行目录测试与类型检查**

运行：`npx vitest run tests/domain/home-machine-selection.test.ts && npx tsc --noEmit -p tsconfig.logic.json`

预期：命令成功结束。

### 任务 2：升级第 3 版存档

**文件：**

- 修改：`game/assets/scripts/domain/prototype-save.ts`
- 修改：`tests/domain/prototype-save.test.ts`

**接口：**

- 产出：`MachineRuntimeState`、第 3 版 `PrototypePlayerState`、`PrototypeSaveOptions`。
- 保持：本地键名仍为 `virtual-claw-game.player.v1`，只升级数据外层的版本数字。

- [ ] **步骤 1：先写第 3 版往返与旧版本升级测试**

```ts
const state: PrototypePlayerState = {
  coins: 42,
  ordinaryDolls: 7,
  premiumDolls: { 'premium-rabbit': 2 },
  selectedMachineId: 'strawberry-cat',
  machines: {
    'moon-rabbit': { progress: 3, strongTarget: 7, layoutSequence: 1, remainingDolls: 5 },
    'strawberry-cat': { progress: 1, strongTarget: 4, layoutSequence: 2, remainingDolls: 6 },
  },
};

it('第 2 版数据升级后原轮次归入月亮兔仓', () => {
  const result = parsePrototypePlayerState(JSON.stringify({ version: 2, state: legacy }), options);
  expect(result).toMatchObject({
    selectedMachineId: 'moon-rabbit',
    machines: {
      'moon-rabbit': { progress: legacy.progress, strongTarget: legacy.strongTarget },
      'strawberry-cat': { progress: 0, remainingDolls: 8 },
    },
  });
});
```

再增加：未知但有效的机台项会保留、已上架但异常的单项会重建、共享字段异常时整份返回空结果。

- [ ] **步骤 2：运行测试并确认旧实现无法识别第 3 版结构**

运行：`npx vitest run tests/domain/prototype-save.test.ts`

预期：第 3 版结构与升级用例失败。

- [ ] **步骤 3：实现分层校验和升级**

`PrototypeSaveOptions` 接收机台目录、最大幸运次数和可注入随机函数。第 1、2 版先保留共享资产，再把旧 `progress` 与 `strongTarget` 写入月亮兔仓；其他在架机台用 `selectStrongAttempt()` 创建初始目标。第 3 版逐项校验 `machines`，有效的未知项继续保留。

关键签名：

```ts
export function parsePrototypePlayerState(
  raw: string | null,
  options: PrototypeSaveOptions,
): PrototypePlayerState | null;

export function loadPrototypePlayerState(
  storage: PrototypeStoragePort,
  options: PrototypeSaveOptions,
): PrototypePlayerState | null;
```

- [ ] **步骤 4：运行存档测试和类型检查**

运行：`npx vitest run tests/domain/prototype-save.test.ts && npx tsc --noEmit -p tsconfig.logic.json`

预期：命令成功结束。

### 任务 3：让状态层支持独立机台轮次和批次

**文件：**

- 修改：`game/assets/scripts/domain/prototype-store.ts`
- 修改：`tests/domain/prototype-store.test.ts`

**接口：**

- 产出：`selectMachine(machineId): boolean`、`refillCurrentMachine(): boolean`。
- 扩展：`PrototypeSnapshot` 增加 `machineId`、`remainingDolls`、`layoutSequence`、`needsRefill`。

- [ ] **步骤 1：先写独立状态测试**

```ts
it('两台机共用余额但分别推进幸运轮次', () => {
  const store = createTwoMachineStore();
  runMiss(store);
  expect(store.exportPlayerState().machines['moon-rabbit'].progress).toBe(1);

  expect(store.selectMachine('strawberry-cat')).toBe(true);
  expect(store.snapshot()).toMatchObject({ coins: 27, machineId: 'strawberry-cat' });
  expect(store.exportPlayerState().machines['strawberry-cat'].progress).toBe(0);
});

it('投币后拒绝切换机台', () => {
  const store = createTwoMachineStore();
  store.startAttempt();
  expect(store.selectMachine('strawberry-cat')).toBe(false);
  expect(store.snapshot().machineId).toBe('moon-rabbit');
});

it('第八只进入出口后才需要补充下一批', () => {
  const store = createTwoMachineStore({ remainingDolls: 1 });
  runWin(store);
  expect(store.snapshot()).toMatchObject({ remainingDolls: 0, needsRefill: true });
  expect(store.refillCurrentMachine()).toBe(true);
  expect(store.snapshot()).toMatchObject({ remainingDolls: 8, layoutSequence: 1 });
});
```

- [ ] **步骤 2：运行测试并确认新接口尚不存在**

运行：`npx vitest run tests/domain/prototype-store.test.ts`

预期：新用例因缺少选择、补充和机台快照字段而失败。

- [ ] **步骤 3：实现共享资产与当前机台状态**

`PrototypeStore` 保存 `machines` 映射和 `activeMachineId`。投币、下爪和结算只访问当前机台的 `progress` 与 `strongTarget`；币、普通娃娃和精品收藏继续共用。获胜时把当前机台 `remainingDolls` 减一但不低于 0；只有为 0 时 `refillCurrentMachine()` 才恢复批次数量并增加布局序号。

- [ ] **步骤 4：更新全部旧状态测试并运行**

运行：`npx vitest run tests/domain/prototype-store.test.ts tests/domain/prototype-save.test.ts`

预期：命令成功结束。

### 任务 4：生成两套模型和模型检查器

**文件：**

- 修改：`tools/blender/generate-prototype-assets.py`
- 修改：`tools/blender/inspect-prototype-assets.py`
- 修改：`tests/prototype/blender-model-contract.test.ts`
- 生成：`art/blender/moon-rabbit.blend`
- 生成：`art/blender/strawberry-cat.blend`
- 生成：`art/renders/moon-rabbit.png`
- 生成：`art/renders/strawberry-cat.png`
- 生成：`game/assets/models/machines/moon-rabbit.glb`
- 生成：`game/assets/models/machines/strawberry-cat.glb`

**接口：**

- 月亮兔仓只含 `DollRabbit` 模板。
- 草莓猫舍只含 `DollCat` 模板，并带 `CatEarCanopy`、`CatPawSign`、`StrawberryBackboard`、`YarnBallBackboard` 标识节点。

- [ ] **步骤 1：先把模型检查测试改为两份资源**

```ts
const machines = [
  { id: 'moon-rabbit', doll: 'DollRabbit' },
  { id: 'strawberry-cat', doll: 'DollCat' },
] as const;

it.each(machines)('$id 只导出指定的普通娃娃模板', ({ id, doll }) => {
  const summary = inspectModel(id);
  expect(Object.keys(summary.dollPartCounts)).toEqual([doll]);
});
```

增加两份模型的稳定节点、草莓猫舍装饰节点、单份预算和合计预算用例。

- [ ] **步骤 2：运行模型测试并确认两份目标文件尚不存在**

运行：`$env:BLENDER_PATH='D:\软件\Blender-5.2\blender.exe'; npx vitest run tests/prototype/blender-model-contract.test.ts`

预期：测试因新的 GLB 尚未生成而失败。

- [ ] **步骤 3：扩展 Blender 生成脚本**

把机械结构创建保留为共享函数，为外壳加入 `theme` 参数，为娃娃创建加入单一 `species` 参数。月亮兔仓保留当前外观；草莓猫舍使用珊瑚红、浅粉、青色材质，并创建猫耳顶棚、猫爪灯牌、草莓和毛线球背板。每套场景分别保存 `.blend`、渲染 PNG 并导出 GLB。

- [ ] **步骤 4：运行 Blender 5.2 生成资源**

运行：`& 'D:\软件\Blender-5.2\blender.exe' --background --factory-startup --python tools/blender/generate-prototype-assets.py`

预期：两份 `.blend`、PNG 和 GLB 均存在，命令成功结束。

- [ ] **步骤 5：重新运行模型测试并查看两张渲染图**

运行：`$env:BLENDER_PATH='D:\软件\Blender-5.2\blender.exe'; npx vitest run tests/prototype/blender-model-contract.test.ts`

预期：两套模型节点、娃娃种类和预算用例全部通过。随后查看两张 PNG，确认草莓猫舍配色和装饰清晰、没有遮住操作区。

### 任务 5：实现运行层候选模型切换

**文件：**

- 新建：`game/assets/scripts/domain/machine-switch.ts`
- 新建：`game/assets/scripts/domain/machine-switch.ts.meta`
- 新建：`game/assets/scripts/prototype/machine-asset-binding.ts`
- 新建：`game/assets/scripts/prototype/machine-asset-binding.ts.meta`
- 修改：`game/assets/scripts/prototype/prototype-coordinator.ts`
- 新建：`tests/domain/machine-switch.test.ts`
- 修改：`tests/prototype/scene-model-contract.test.ts`

**接口：**

- 产出：`canSelectMachine(options): boolean`。
- 产出：`PrototypeCoordinator.selectMachine(machineId, direction): Promise<boolean>`。
- 产出：编辑器可配置的 `MachineAssetBinding[]`。

- [ ] **步骤 1：先写状态门禁与场景资源契约测试**

```ts
expect(canSelectMachine({
  known: true,
  sameMachine: false,
  sessionState: 'idle',
  attemptState: 'waiting',
  uiLayer: 'home',
  transitioning: false,
})).toBe(true);

expect(canSelectMachine({
  known: true,
  sameMachine: false,
  sessionState: 'moving',
  attemptState: 'ready',
  uiLayer: 'play',
  transitioning: false,
})).toBe(false);
```

场景契约检查协调器包含两项模型绑定，不再依赖单个 `machinePrefab`。

- [ ] **步骤 2：运行测试并确认新模块与资源数组尚不存在**

运行：`npx vitest run tests/domain/machine-switch.test.ts tests/prototype/scene-model-contract.test.ts`

预期：新模块缺失，场景仍只有旧模型字段。

- [ ] **步骤 3：实现候选创建、完整校验和横向替换**

先把节点解析改为返回完整 `ResolvedMachineParts | null`，不得在候选检查阶段改写当前引用。候选通过后创建指定数量和种类的娃娃，再执行 0.18 秒横向动画；动画结束才调用状态层选择、保存并更新机械爪引用。失败时销毁候选节点并把旧模型位置恢复为零。

复杂流程旁写中文注释，明确“先校验、后动画、最后确认状态”的顺序原因。

- [ ] **步骤 4：运行运行层测试和游戏类型检查**

运行：`npx vitest run tests/domain/machine-switch.test.ts tests/prototype/scene-model-contract.test.ts && npx tsc --noEmit -p game/tsconfig.json`

预期：命令成功结束。

### 任务 6：首页异步确认选择并连接剩余数量

**文件：**

- 修改：`game/assets/scripts/ui/home-panel.ts`
- 修改：`game/assets/scripts/ui/game-ui-root.ts`
- 修改：`tests/domain/home-machine-selection.test.ts`
- 修改：`tests/prototype/scene-model-contract.test.ts`
- 修改：`game/assets/scenes/prototype.scene`

**接口：**

- 修改：`onMachineSelected(machineId, direction): Promise<boolean>`。
- 首页只在返回 `true` 后改写 `selectedMachineIndex`。

- [ ] **步骤 1：先补首页候选选择测试和源码契约**

纯数据测试覆盖方向循环；源码契约检查首页回调返回异步结果、切换期间按钮不可用、失败时索引不变。场景契约检查两项模型资源已连接。

- [ ] **步骤 2：运行相关测试并确认旧同步回调不满足要求**

运行：`npx vitest run tests/domain/home-machine-selection.test.ts tests/prototype/scene-model-contract.test.ts`

预期：异步确认与两项资源连接用例失败。

- [ ] **步骤 3：连接首页、界面根节点和协调器**

`HomePanel` 增加 `switching` 标记，发起选择时锁住左右按钮；`GameUiRoot` 只有在首页层才调用协调器；成功后刷新名称、主题色、位置和 `snapshot.remainingDolls`，失败时恢复原索引。投币按钮在切换期间不可用。

- [ ] **步骤 4：更新场景绑定**

等 Cocos 为两份 GLB 生成资源信息后，把 `prototype.scene` 中的协调器字段改为两项 `MachineAssetBinding`。月亮兔仓连接 `moon-rabbit.glb`，草莓猫舍连接 `strawberry-cat.glb`。

- [ ] **步骤 5：运行首页、场景和两套类型检查**

运行：`npx vitest run tests/domain/home-machine-selection.test.ts tests/prototype/scene-model-contract.test.ts && npx tsc --noEmit -p tsconfig.logic.json && npx tsc --noEmit -p game/tsconfig.json`

预期：命令成功结束。

### 任务 7：全量回归与交付检查

**文件：**

- 按测试结果修正本计划涉及的文件。

**验收：**

- [ ] **步骤 1：运行全量自动测试**

运行：`$env:BLENDER_PATH='D:\软件\Blender-5.2\blender.exe'; npm test`

预期：所有测试通过，失败数为 0。

- [ ] **步骤 2：运行两套 TypeScript 检查**

运行：`npx tsc --noEmit -p tsconfig.logic.json && npx tsc --noEmit -p game/tsconfig.json`

预期：两个命令都成功结束。

- [ ] **步骤 3：检查资源预算与工作区差异**

确认两份 GLB 单份小于 4 MB、合计小于 8 MB，并核对修改范围只涉及多机台功能及其生成资源，不覆盖用户已有改动。

- [ ] **步骤 4：交给用户在 Cocos 中查看**

不启动预览服务。告知用户重新聚焦 Cocos 等待资源导入后，检查首页左右切换、草莓猫舍外观、单一猫咪批次、投币后禁止切换和两机台独立恢复。
