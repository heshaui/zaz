# 星愿抓抓屋 UI 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在不改变现有玩法规则的前提下，完成竖屏加载页、单机台首页、游戏操作台、本局结果、收藏兑换和整批补充界面。

**Architecture:** 新增轻量 `boot.scene`，继续使用 `prototype.scene` 承载唯一一台三维机台。纯 TypeScript 模块负责 UI 流程与显示数据，Cocos 组件只负责节点绑定、动画和输入，并通过 `GameUiRoot` 与现有 `PrototypeCoordinator` 通信。

**Tech Stack:** Cocos Creator 3.8.8、TypeScript、Vitest、Cocos UI、现有 GLB 机台资源

**Spec:** `docs/superpowers/specs/2026-08-31-claw-game-ui-design.md`

## 全局约束

- 不执行任何 Git 写操作。
- 不调整 Node 环境；当前版本为 Node 22.20.0。
- 较难理解的流程、坐标换算和异步动画必须添加中文注释。
- 设计分辨率固定为 `720 x 1280`，屏幕方向为竖屏 9:16。
- 不新增运行时第三方依赖。
- 保留现有投币、随机完整力度周期、结算、混合兑换和本地保存规则。
- UI 不展示力度、隐藏目标或周期进度。
- 每局费用、兑换数量与每批娃娃数量继续读取 `MachineConfig`。
- 最后一只娃娃结算后，关闭结果层时才补充新的一批。
- 不启动 Cocos 预览；视觉结果由用户在 Cocos 中查看。

---

## 文件结构

### 新增领域文件

```text
game/assets/scripts/domain/
  main-ui-flow.ts          # UI 阶段与覆盖层的纯状态转换
  portrait-layout.ts       # 竖屏尺寸换算
  premium-catalog.ts       # 精品娃娃静态目录

tests/domain/
  main-ui-flow.test.ts
  portrait-layout.test.ts
  premium-catalog.test.ts
```

### 新增 Cocos UI 文件

```text
game/assets/scripts/ui/
  boot-screen.ts           # 启动场景预载与重试
  game-ui-root.ts          # 主界面总控
  home-panel.ts            # 首页
  game-console.ts          # 游戏操作台
  result-overlay.ts        # 本局结果
  collection-overlay.ts    # 收藏与兑换
  confirm-overlay.ts       # 退出与兑换确认
  refill-overlay.ts        # 整批补充过渡
  ui-theme.ts              # 颜色和统一尺寸

game/assets/ui/
  textures/
  fonts/
  icons/

game/assets/scenes/
  boot.scene
```

### 修改文件

```text
game/assets/scripts/domain/hud-presenter.ts
game/assets/scripts/domain/prototype-store.ts
game/assets/scripts/prototype/doll-target.ts
game/assets/scripts/prototype/prototype-coordinator.ts
game/assets/scripts/prototype/prototype-hud.ts
game/assets/scenes/prototype.scene
tests/domain/hud-presenter.test.ts
tests/domain/prototype-store.test.ts
```

### 新增结构检查

```text
tests/prototype/boot-scene-contract.test.ts
tests/prototype/game-ui-scene-contract.test.ts
tests/prototype/deferred-refill-contract.test.ts
```

---

### Task 1: 建立 UI 流程状态

**Files:**
- Create: `game/assets/scripts/domain/main-ui-flow.ts`
- Test: `tests/domain/main-ui-flow.test.ts`

**Interfaces:**
- Produces: `createInitialMainUiFlow()`、`reduceMainUiFlow(state, action)`、`MainUiFlowState`
- Consumes: 无

- [ ] **Step 1: 写 UI 流程测试**

Create `tests/domain/main-ui-flow.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  createInitialMainUiFlow,
  reduceMainUiFlow,
} from '../../game/assets/scripts/domain/main-ui-flow';

describe('main UI flow', () => {
  it('投币后进入选择落点，下爪后锁定操作', () => {
    const home = createInitialMainUiFlow();
    const aiming = reduceMainUiFlow(home, { type: 'COIN_ACCEPTED' });
    const running = reduceMainUiFlow(aiming, { type: 'DROP_STARTED' });

    expect(aiming).toMatchObject({ phase: 'aiming', layer: 'none' });
    expect(running).toMatchObject({ phase: 'running', layer: 'none' });
  });

  it('本局结束后显示结果层并保留补充标记', () => {
    const state = reduceMainUiFlow(
      { phase: 'running', layer: 'none', outcome: null, needsRefill: false },
      { type: 'ROUND_SETTLED', outcome: 'won', needsRefill: true },
    );

    expect(state).toEqual({
      phase: 'home',
      layer: 'result',
      outcome: 'won',
      needsRefill: true,
    });
  });

  it('有补充标记时先进入补充层，再回到首页', () => {
    const resultState = {
      phase: 'home' as const,
      layer: 'result' as const,
      outcome: 'won' as const,
      needsRefill: true,
    };
    const refilling = reduceMainUiFlow(resultState, { type: 'CLOSE_RESULT' });
    const home = reduceMainUiFlow(refilling, { type: 'REFILL_FINISHED' });

    expect(refilling.layer).toBe('refilling');
    expect(home).toEqual(createInitialMainUiFlow());
  });

  it('投币后返回先打开确认层，取消后继续本局', () => {
    const aiming = reduceMainUiFlow(createInitialMainUiFlow(), { type: 'COIN_ACCEPTED' });
    const confirming = reduceMainUiFlow(aiming, { type: 'REQUEST_EXIT' });
    const resumed = reduceMainUiFlow(confirming, { type: 'CANCEL_EXIT' });

    expect(confirming.layer).toBe('exit-confirm');
    expect(resumed).toEqual(aiming);
  });

  it('只允许从首页打开收藏页', () => {
    const home = createInitialMainUiFlow();
    const collection = reduceMainUiFlow(home, { type: 'OPEN_COLLECTION' });
    const aiming = reduceMainUiFlow(home, { type: 'COIN_ACCEPTED' });

    expect(collection.layer).toBe('collection');
    expect(reduceMainUiFlow(aiming, { type: 'OPEN_COLLECTION' })).toEqual(aiming);
  });
});
```

- [ ] **Step 2: 运行测试并确认当前失败**

Run:

```powershell
npm test -- tests/domain/main-ui-flow.test.ts
```

Expected: FAIL，原因是 `main-ui-flow.ts` 尚不存在。

- [ ] **Step 3: 实现纯状态转换**

Create `game/assets/scripts/domain/main-ui-flow.ts`:

```ts
export type MainUiPhase = 'home' | 'aiming' | 'running';
export type MainUiLayer =
  | 'none'
  | 'collection'
  | 'result'
  | 'exit-confirm'
  | 'refilling';
export type RoundOutcome = 'won' | 'missed';

export interface MainUiFlowState {
  phase: MainUiPhase;
  layer: MainUiLayer;
  outcome: RoundOutcome | null;
  needsRefill: boolean;
}

export type MainUiAction =
  | { type: 'COIN_ACCEPTED' }
  | { type: 'DROP_STARTED' }
  | { type: 'ROUND_SETTLED'; outcome: RoundOutcome; needsRefill: boolean }
  | { type: 'OPEN_COLLECTION' }
  | { type: 'CLOSE_COLLECTION' }
  | { type: 'REQUEST_EXIT' }
  | { type: 'CANCEL_EXIT' }
  | { type: 'CONFIRM_EXIT' }
  | { type: 'CLOSE_RESULT' }
  | { type: 'REFILL_FINISHED' };

export function createInitialMainUiFlow(): MainUiFlowState {
  return { phase: 'home', layer: 'none', outcome: null, needsRefill: false };
}

export function reduceMainUiFlow(
  state: MainUiFlowState,
  action: MainUiAction,
): MainUiFlowState {
  switch (action.type) {
    case 'COIN_ACCEPTED':
      return state.phase === 'home' && state.layer === 'none'
        ? { ...state, phase: 'aiming' }
        : state;
    case 'DROP_STARTED':
      return state.phase === 'aiming' && state.layer === 'none'
        ? { ...state, phase: 'running' }
        : state;
    case 'ROUND_SETTLED':
      return {
        phase: 'home',
        layer: 'result',
        outcome: action.outcome,
        needsRefill: action.needsRefill,
      };
    case 'OPEN_COLLECTION':
      return state.phase === 'home' && state.layer === 'none'
        ? { ...state, layer: 'collection' }
        : state;
    case 'CLOSE_COLLECTION':
      return state.layer === 'collection' ? { ...state, layer: 'none' } : state;
    case 'REQUEST_EXIT':
      return state.phase === 'aiming' && state.layer === 'none'
        ? { ...state, layer: 'exit-confirm' }
        : state;
    case 'CANCEL_EXIT':
      return state.layer === 'exit-confirm' ? { ...state, layer: 'none' } : state;
    case 'CONFIRM_EXIT':
      return state.layer === 'exit-confirm' ? createInitialMainUiFlow() : state;
    case 'CLOSE_RESULT':
      if (state.layer !== 'result') return state;
      return state.needsRefill
        ? { ...state, layer: 'refilling', outcome: null }
        : createInitialMainUiFlow();
    case 'REFILL_FINISHED':
      return state.layer === 'refilling' ? createInitialMainUiFlow() : state;
    default:
      return state;
  }
}
```

- [ ] **Step 4: 运行目标测试**

Run: `npm test -- tests/domain/main-ui-flow.test.ts`

Expected: 5 项全部 PASS。

---

### Task 2: 扩充显示数据与精品目录

**Files:**
- Create: `game/assets/scripts/domain/premium-catalog.ts`
- Modify: `game/assets/scripts/domain/hud-presenter.ts`
- Create: `tests/domain/premium-catalog.test.ts`
- Modify: `tests/domain/hud-presenter.test.ts`

**Interfaces:**
- Consumes: `PrototypeHudState`
- Produces: `PREMIUM_CATALOG`、扩充后的 `PrototypeHudView`

- [ ] **Step 1: 增加显示数据测试**

在 `tests/domain/hud-presenter.test.ts` 增加：

```ts
it('首页文字使用实体机台语气并读取动态费用', () => {
  expect(presentPrototypeHud({
    coins: 27,
    ordinaryDolls: 4,
    premiumDolls: { 'premium-rabbit': 1 },
    cost: 5,
    exchangeCost: 10,
    attemptState: 'waiting',
  })).toMatchObject({
    coinText: '游戏币 27',
    ordinaryText: '普通娃娃 4',
    premiumText: '精品 1',
    feeText: '5 币 / 局',
    coinButtonText: '投入 5 币',
    instructionText: '请先投币',
  });
});

it('操作期间只显示动作提示，不包含力度相关字段', () => {
  const view = presentPrototypeHud({
    coins: 27,
    ordinaryDolls: 0,
    premiumDolls: {},
    cost: 3,
    exchangeCost: 10,
    attemptState: 'running',
  });

  expect(view.instructionText).toBe('正在完成本局动作');
  expect(Object.keys(view)).not.toContain('chargeText');
  expect(Object.keys(view)).not.toContain('progressText');
});
```

Create `tests/domain/premium-catalog.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { PREMIUM_CATALOG } from '../../game/assets/scripts/domain/premium-catalog';

describe('premium catalog', () => {
  it('首版提供四个稳定且不重复的精品编号', () => {
    expect(PREMIUM_CATALOG.map((item) => item.id)).toEqual([
      'premium-rabbit',
      'premium-cat',
      'premium-dog',
      'premium-cow',
    ]);
    expect(new Set(PREMIUM_CATALOG.map((item) => item.id)).size).toBe(4);
  });
});
```

- [ ] **Step 2: 运行测试并确认当前失败**

Run:

```powershell
npm test -- tests/domain/hud-presenter.test.ts tests/domain/premium-catalog.test.ts
```

Expected: FAIL，缺少新字段与精品目录。

- [ ] **Step 3: 建立精品目录**

Create `game/assets/scripts/domain/premium-catalog.ts`:

```ts
export interface PremiumPrize {
  id: string;
  name: string;
  colorHex: string;
}

export const PREMIUM_CATALOG: readonly PremiumPrize[] = [
  { id: 'premium-rabbit', name: '软萌兔', colorHex: '#F4A6B8' },
  { id: 'premium-cat', name: '奶油猫', colorHex: '#8DC9C1' },
  { id: 'premium-dog', name: '元气犬', colorHex: '#F3CC73' },
  { id: 'premium-cow', name: '花花牛', colorHex: '#AAB7E2' },
];
```

- [ ] **Step 4: 扩充 `PrototypeHudView`**

在 `hud-presenter.ts` 中保留旧字段兼容现有逻辑，并新增：

```ts
export interface PrototypeHudView {
  coinText: string;
  dollText: string;
  ordinaryText: string;
  premiumText: string;
  feeText: string;
  instructionText: string;
  canExchange: boolean;
  exchangeText: string;
  coinButtonText: string;
  showCoinButton: boolean;
  coinButtonEnabled: boolean;
  showControls: boolean;
  controlsEnabled: boolean;
}
```

使用以下文案规则：

```ts
const instructionText = waiting
  ? '请先投币'
  : ready ? '移动摇杆，选择落点' : '正在完成本局动作';
```

- [ ] **Step 5: 运行目标测试**

Run:

```powershell
npm test -- tests/domain/hud-presenter.test.ts tests/domain/premium-catalog.test.ts
```

Expected: 全部 PASS。

---

### Task 3: 支持投币后退出与延后整批补充

**Files:**
- Modify: `game/assets/scripts/domain/prototype-store.ts`
- Modify: `game/assets/scripts/domain/grab-session.ts`
- Modify: `game/assets/scripts/prototype/doll-target.ts`
- Modify: `game/assets/scripts/prototype/prototype-coordinator.ts`
- Modify: `tests/domain/prototype-store.test.ts`
- Modify: `tests/domain/grab-session.test.ts`
- Create: `tests/prototype/deferred-refill-contract.test.ts`

**Interfaces:**
- Produces: `PrototypeStore.abandonAttempt()`
- Produces: `GrabSession.abandon()`
- Produces: `PrototypeRoundResult`
- Produces: `PrototypeCoordinator.abandonAttempt()`、`needsDollRefill()`、`refillDollsAfterResult()`

- [ ] **Step 1: 写投币后退出测试**

在 `tests/domain/prototype-store.test.ts` 增加：

```ts
it('投币后退出保留扣费但不推进隐藏周期', () => {
  const store = new PrototypeStore({
    coins: 30,
    cost: 3,
    strongMaxAttempts: 5,
    random: () => 0.8,
  });

  store.startAttempt();
  store.abandonAttempt();

  expect(store.snapshot()).toMatchObject({ coins: 27, attemptState: 'waiting' });
  expect(store.exportPlayerState()).toMatchObject({ progress: 0 });
});
```

- [ ] **Step 2: 运行测试并确认当前失败**

Run: `npm test -- tests/domain/prototype-store.test.ts`

Expected: FAIL，`abandonAttempt` 尚不存在。

- [ ] **Step 3: 实现 `abandonAttempt`**

在 `PrototypeStore` 中增加：

```ts
abandonAttempt(): void {
  if (!this.attemptOpen || this.dropExecuted) {
    throw new Error('attempt cannot be abandoned');
  }
  // 费用在投币时已经扣除；退出只关闭本局，不推进隐藏周期。
  this.attemptOpen = false;
  this.currentStrong = false;
}
```

- [ ] **Step 4: 增加投币后退出的会话转换**

在 `tests/domain/grab-session.test.ts` 先增加测试，确认 `moving -> idle` 可通过专用方法完成，其他阶段调用会被拒绝。随后在 `GrabSession` 中增加：

```ts
abandon(): void {
  if (this.current !== 'moving') {
    throw new Error(`cannot abandon from: ${this.current}`);
  }
  this.current = 'idle';
}
```

- [ ] **Step 5: 扩充本局结果数据**

在 `doll-target.ts` 增加：

```ts
@property
displayColor = '#F4A6B8';
```

在 `prototype-coordinator.ts` 导出：

```ts
export interface PrototypeRoundResult {
  won: boolean;
  dollId: string | null;
  dollColor: string | null;
  needsRefill: boolean;
}
```

将回调改为：

```ts
onResult: ((result: PrototypeRoundResult) => void) | null = null;
```

生成与重新摆放娃娃时同步设置 `DollTarget.displayColor`。本局结算后先生成 `PrototypeRoundResult`，不再从 `grab()` 末尾直接调用 `refreshDollsIfEmpty()`。

- [ ] **Step 6: 增加协调器公开方法**

在 `PrototypeCoordinator` 中增加：

```ts
abandonAttempt(): void {
  if (this.session.state !== 'moving') return;
  this.store.abandonAttempt();
  this.persistPlayerState();
  this.session.abandon();
  if (this.controller) this.controller.movementEnabled = false;
  void this.rig?.park(true);
  this.onChanged?.();
}

needsDollRefill(): boolean {
  if (!this.dollsRoot) return false;
  const targets = this.dollsRoot.children
    .filter((node) => node.getComponent(DollTarget));
  return shouldRefreshDollBatch(targets.map((node) => node.activeInHierarchy));
}

refillDollsAfterResult(): boolean {
  if (!this.needsDollRefill()) return false;
  this.refreshDolls();
  this.onChanged?.();
  return true;
}
```

- [ ] **Step 7: 添加结构检查**

Create `tests/prototype/deferred-refill-contract.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import coordinatorSource from '../../game/assets/scripts/prototype/prototype-coordinator.ts?raw';

describe('deferred doll refill contract', () => {
  it('由结果层关闭动作调用公开补充入口', () => {
    expect(coordinatorSource).toContain('refillDollsAfterResult(): boolean');
    expect(coordinatorSource).toContain('needsDollRefill(): boolean');
  });

  it('本局结果产生后不立即执行旧补充方法', () => {
    const grabBody = coordinatorSource.slice(
      coordinatorSource.indexOf('async grab()'),
      coordinatorSource.indexOf('refreshDolls(): void'),
    );
    expect(grabBody).not.toContain('refreshDollsIfEmpty()');
  });
});
```

- [ ] **Step 8: 运行相关测试**

Run:

```powershell
npm test -- tests/domain/prototype-store.test.ts tests/domain/grab-session.test.ts
```

Expected: 全部 PASS。

---

### Task 4: 建立竖屏布局与主题常量

**Files:**
- Create: `game/assets/scripts/domain/portrait-layout.ts`
- Create: `game/assets/scripts/ui/ui-theme.ts`
- Test: `tests/domain/portrait-layout.test.ts`

**Interfaces:**
- Produces: `resolvePortraitLayout(visibleHeight, safeTop, safeBottom)`
- Produces: `UI_COLORS`、`UI_SIZES`

- [ ] **Step 1: 写长屏与短屏测试**

Create `tests/domain/portrait-layout.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { resolvePortraitLayout } from '../../game/assets/scripts/domain/portrait-layout';

describe('portrait layout', () => {
  it.each([1136, 1280, 1560])('高度 %s 保持控制台尺寸稳定', (visibleHeight) => {
    const layout = resolvePortraitLayout(visibleHeight, 32, 24);
    expect(layout.consoleHeight).toBe(300);
    expect(layout.machineWindowHeight).toBeGreaterThan(420);
    expect(layout.topHudY).toBeLessThanOrEqual(visibleHeight / 2 - 32);
    expect(layout.consoleBottomY).toBeGreaterThanOrEqual(-visibleHeight / 2 + 24);
  });

  it('拒绝小于竖屏最低高度的输入', () => {
    expect(() => resolvePortraitLayout(900, 0, 0)).toThrow(
      'visible height must be >= 1136',
    );
  });
});
```

- [ ] **Step 2: 运行测试并确认当前失败**

Run: `npm test -- tests/domain/portrait-layout.test.ts`

Expected: FAIL，布局模块尚不存在。

- [ ] **Step 3: 实现尺寸换算**

Create `game/assets/scripts/domain/portrait-layout.ts`:

```ts
export interface PortraitLayout {
  topHudY: number;
  consoleBottomY: number;
  consoleCenterY: number;
  consoleHeight: number;
  machineWindowBottomY: number;
  machineWindowTopY: number;
  machineWindowHeight: number;
}

export function resolvePortraitLayout(
  visibleHeight: number,
  safeTop: number,
  safeBottom: number,
): PortraitLayout {
  if (visibleHeight < 1136) {
    throw new Error('visible height must be >= 1136');
  }
  const halfHeight = visibleHeight / 2;
  const consoleHeight = 300;
  const consoleBottomY = -halfHeight + Math.max(0, safeBottom);
  const consoleCenterY = consoleBottomY + consoleHeight / 2;
  const topHudY = halfHeight - Math.max(0, safeTop) - 54;
  const machineWindowBottomY = consoleBottomY + consoleHeight + 18;
  const machineWindowTopY = topHudY - 72;
  return {
    topHudY,
    consoleBottomY,
    consoleCenterY,
    consoleHeight,
    machineWindowBottomY,
    machineWindowTopY,
    machineWindowHeight: machineWindowTopY - machineWindowBottomY,
  };
}
```

- [ ] **Step 4: 建立 Cocos 主题常量**

Create `game/assets/scripts/ui/ui-theme.ts`:

```ts
import { Color } from 'cc';

export const UI_COLORS = {
  aqua: new Color().fromHEX('#15B8BE'),
  coral: new Color().fromHEX('#EF607D'),
  gold: new Color().fromHEX('#FFC83D'),
  violet: new Color().fromHEX('#7764B2'),
  ink: new Color().fromHEX('#18242E'),
  paper: new Color().fromHEX('#F8FBFC'),
} as const;

export const UI_SIZES = {
  designWidth: 720,
  designHeight: 1280,
  consoleHeight: 300,
  joystickDiameter: 188,
  dropButtonDiameter: 192,
  utilityButtonSize: 88,
  outlineWidth: 8,
} as const;
```

- [ ] **Step 5: 运行布局测试**

Run: `npm test -- tests/domain/portrait-layout.test.ts`

Expected: 全部 PASS。

---

### Task 5: 创建轻量启动场景

**Files:**
- Create: `game/assets/scripts/ui/boot-screen.ts`
- Create through Cocos Editor: `game/assets/scenes/boot.scene`
- Create: `tests/prototype/boot-scene-contract.test.ts`

**Interfaces:**
- Produces: `BootScreen.retry()`
- Consumes: Cocos `director.preloadScene('prototype')`

- [ ] **Step 1: 创建启动脚本**

Create `game/assets/scripts/ui/boot-screen.ts`:

```ts
import { _decorator, Component, director, Label, Node } from 'cc';

const { ccclass, property } = _decorator;

@ccclass('BootScreen')
export class BootScreen extends Component {
  @property(Label)
  progressLabel: Label | null = null;

  @property(Node)
  retryButton: Node | null = null;

  @property([Node])
  marqueeLights: Node[] = [];

  start(): void {
    this.loadMainScene();
  }

  retry(): void {
    this.loadMainScene();
  }

  private loadMainScene(): void {
    if (this.retryButton) this.retryButton.active = false;
    director.preloadScene(
      'prototype',
      (completed, total) => this.renderProgress(total > 0 ? completed / total : 0),
      (error) => {
        if (error) {
          if (this.progressLabel) this.progressLabel.string = '加载未完成';
          if (this.retryButton) this.retryButton.active = true;
          return;
        }
        this.renderProgress(1);
        director.loadScene('prototype');
      },
    );
  }

  private renderProgress(progress: number): void {
    const normalized = Math.max(0, Math.min(1, progress));
    const litCount = Math.ceil(normalized * this.marqueeLights.length);
    this.marqueeLights.forEach((light, index) => {
      light.active = index < litCount;
    });
    if (this.progressLabel) {
      this.progressLabel.string = `${Math.round(normalized * 100)}%`;
    }
  }
}
```

- [ ] **Step 2: 在 Cocos 创建启动场景节点**

创建以下层级：

```text
Boot
└─ Canvas
   └─ SafeArea
      ├─ MachineBackdrop
      ├─ Marquee
      │  ├─ BrandLabel
      │  └─ Lights
      ├─ ProgressLabel
      └─ RetryButton
```

要求：

- `BrandLabel` 显示“星愿抓抓屋”。
- `RetryButton` 初始隐藏，点击绑定 `BootScreen.retry()`。
- `BootScreen` 绑定 `ProgressLabel`、`RetryButton` 和灯节点数组。
- 启动场景背景不加载三维机台模型。
- 构建场景顺序将 `boot.scene` 设为第一场景，并包含 `prototype.scene`。

- [ ] **Step 3: 添加启动场景结构检查**

Create `tests/prototype/boot-scene-contract.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import bootScene from '../../game/assets/scenes/boot.scene?raw';
import bootSource from '../../game/assets/scripts/ui/boot-screen.ts?raw';

describe('boot scene contract', () => {
  it('包含品牌、进度和重试节点', () => {
    expect(bootScene).toContain('BrandLabel');
    expect(bootScene).toContain('ProgressLabel');
    expect(bootScene).toContain('RetryButton');
  });

  it('预载主场景并提供重试方法', () => {
    expect(bootSource).toContain("director.preloadScene(");
    expect(bootSource).toContain("'prototype'");
    expect(bootSource).toContain('retry(): void');
  });
});
```

- [ ] **Step 4: 运行启动场景检查**

Run: `npm test -- tests/prototype/boot-scene-contract.test.ts`

Expected: 2 项全部 PASS。

---

### Task 6: 实现首页、操作台与主界面总控

**Files:**
- Modify: `game/assets/scripts/domain/camera-framing.ts`
- Modify: `tests/domain/camera-framing.test.ts`
- Modify: `game/assets/scripts/prototype/camera-switcher.ts`
- Create: `game/assets/scripts/ui/home-panel.ts`
- Create: `game/assets/scripts/ui/game-console.ts`
- Create: `game/assets/scripts/ui/game-ui-root.ts`
- Modify: `game/assets/scripts/prototype/prototype-hud.ts`

**Interfaces:**
- Consumes: `PrototypeHudView`、`MainUiFlowState`、`PrototypeCoordinator`
- Produces: `CameraSwitcher.setMode(mode)`、`HomePanel.render(view)`、`GameConsole.render(view)`、`GameUiRoot`

- [ ] **Step 1: 增加首页与游戏相机模式测试**

在 `tests/domain/camera-framing.test.ts` 增加：

```ts
it('首页构图比游戏构图保留更多机台外边距', () => {
  expect(getMachineCameraMargin('home')).toBe(1.16);
  expect(getMachineCameraMargin('play')).toBe(1.08);
});
```

在 `camera-framing.ts` 增加：

```ts
export type MachineCameraMode = 'home' | 'play';

export function getMachineCameraMargin(mode: MachineCameraMode): number {
  return mode === 'home' ? 1.16 : 1.08;
}
```

Run: `npm test -- tests/domain/camera-framing.test.ts`

Expected: 新增测试 PASS，原有边界测试保持通过。

- [ ] **Step 2: 扩充相机切换组件**

在 `CameraSwitcher` 中增加 `currentMode: MachineCameraMode = 'home'` 和：

```ts
setMode(mode: MachineCameraMode): void {
  if (this.currentMode === mode) return;
  this.currentMode = mode;
  this.frameMachine(true);
}
```

`frameMachine(animate = false)` 使用 `getMachineCameraMargin(this.currentMode)` 计算位置。`animate` 为真时使用 `tween` 在 `0.35` 秒内移动当前启用相机；窗口尺寸变化时直接更新，不播放动画。相机仍保持 `16` 度轻微俯视。

- [ ] **Step 3: 创建首页组件**

`HomePanel` 的公开接口固定为：

```ts
export interface HomePanelActions {
  onInsertCoin: () => void;
  onOpenCollection: () => void;
}

@ccclass('HomePanel')
export class HomePanel extends Component {
  @property(Label) coinLabel: Label | null = null;
  @property(Label) ordinaryLabel: Label | null = null;
  @property(Label) feeLabel: Label | null = null;
  @property(Label) coinButtonLabel: Label | null = null;
  @property(Button) coinButton: Button | null = null;
  actions: HomePanelActions | null = null;

  render(view: PrototypeHudView): void {
    if (this.coinLabel) this.coinLabel.string = view.coinText;
    if (this.ordinaryLabel) this.ordinaryLabel.string = view.ordinaryText;
    if (this.feeLabel) this.feeLabel.string = view.feeText;
    if (this.coinButtonLabel) this.coinButtonLabel.string = view.coinButtonText;
    if (this.coinButton) this.coinButton.interactable = view.coinButtonEnabled;
  }

  insertCoin(): void { this.actions?.onInsertCoin(); }
  openCollection(): void { this.actions?.onOpenCollection(); }
}
```

- [ ] **Step 4: 创建操作台组件**

`GameConsole` 的公开接口固定为：

```ts
export interface GameConsoleActions {
  onDrop: () => void;
  onToggleCamera: () => void;
  onRequestExit: () => void;
}

@ccclass('GameConsole')
export class GameConsole extends Component {
  @property(Node) joystickNode: Node | null = null;
  @property(Button) dropButton: Button | null = null;
  @property(Button) cameraButton: Button | null = null;
  @property(Button) backButton: Button | null = null;
  @property(Label) instructionLabel: Label | null = null;
  actions: GameConsoleActions | null = null;

  render(view: PrototypeHudView): void {
    if (this.instructionLabel) this.instructionLabel.string = view.instructionText;
    if (this.joystickNode) this.joystickNode.active = view.showControls;
    if (this.dropButton) this.dropButton.interactable = view.controlsEnabled;
    if (this.cameraButton) this.cameraButton.interactable = view.controlsEnabled;
    if (this.backButton) this.backButton.interactable = view.controlsEnabled;
  }

  drop(): void { this.actions?.onDrop(); }
  toggleCamera(): void { this.actions?.onToggleCamera(); }
  requestExit(): void { this.actions?.onRequestExit(); }
}
```

- [ ] **Step 5: 创建主界面总控第一阶段**

`GameUiRoot` 先完成首页与操作台：

```ts
@ccclass('GameUiRoot')
export class GameUiRoot extends Component {
  @property(PrototypeCoordinator) coordinator: PrototypeCoordinator | null = null;
  @property(CameraSwitcher) cameraSwitcher: CameraSwitcher | null = null;
  @property(HomePanel) homePanel: HomePanel | null = null;
  @property(GameConsole) gameConsole: GameConsole | null = null;

  private flow = createInitialMainUiFlow();

  start(): void {
    view.setDesignResolutionSize(720, 1280, ResolutionPolicy.FIXED_WIDTH);
    if (!this.coordinator || !this.homePanel || !this.gameConsole) return;
    this.homePanel.actions = {
      onInsertCoin: () => this.insertCoin(),
      onOpenCollection: () => this.dispatch({ type: 'OPEN_COLLECTION' }),
    };
    this.gameConsole.actions = {
      onDrop: () => this.drop(),
      onToggleCamera: () => this.cameraSwitcher?.toggle(),
      onRequestExit: () => this.dispatch({ type: 'REQUEST_EXIT' }),
    };
    this.coordinator.onChanged = () => this.refresh();
    this.refresh();
  }

  private insertCoin(): void {
    if (!this.coordinator?.insertCoin()) return;
    this.cameraSwitcher?.setMode('play');
    this.dispatch({ type: 'COIN_ACCEPTED' });
  }

  private drop(): void {
    this.dispatch({ type: 'DROP_STARTED' });
    void this.coordinator?.grab();
  }

  private dispatch(action: MainUiAction): void {
    this.flow = reduceMainUiFlow(this.flow, action);
    this.refresh();
  }

  private refresh(): void {
    if (!this.coordinator) return;
    const viewState = presentPrototypeHud(this.coordinator.store.snapshot());
    if (this.homePanel) {
      this.homePanel.node.active = this.flow.phase === 'home' && this.flow.layer === 'none';
      this.homePanel.render(viewState);
    }
    if (this.gameConsole) {
      this.gameConsole.node.active = this.flow.phase !== 'home';
      this.gameConsole.render(viewState);
    }
  }
}
```

为 `GameUiRoot` 补齐本任务所需的 import。后续任务只扩充覆盖层逻辑，不改变这些公开方法名称。

- [ ] **Step 6: 缩减旧 HUD 职责**

暂时保留 `PrototypeHud` 类和原有场景引用，但让它不再创建正式界面节点。完成新场景绑定后再移除旧组件，避免 Cocos 在迁移中丢失脚本引用。

- [ ] **Step 7: 运行领域测试和 Cocos 类型检查**

Run:

```powershell
npm test -- tests/domain/hud-presenter.test.ts tests/domain/main-ui-flow.test.ts
npm test -- tests/domain/camera-framing.test.ts
npx tsc -p game/tsconfig.json --noEmit
```

Expected: 两条命令退出码均为 `0`。

---

### Task 7: 实现结果、退出确认与整批补充

**Files:**
- Create: `game/assets/scripts/ui/result-overlay.ts`
- Create: `game/assets/scripts/ui/confirm-overlay.ts`
- Create: `game/assets/scripts/ui/refill-overlay.ts`
- Modify: `game/assets/scripts/ui/game-ui-root.ts`

**Interfaces:**
- Consumes: `PrototypeRoundResult`
- Produces: `ResultOverlay.show(result, canExchange)`、`ConfirmOverlay`、`RefillOverlay.play(onReveal)`

- [ ] **Step 1: 创建结果层**

结果层公开接口：

```ts
export interface ResultOverlayActions {
  onClose: () => void;
  onOpenCollection: () => void;
}

@ccclass('ResultOverlay')
export class ResultOverlay extends Component {
  @property(Label) titleLabel: Label | null = null;
  @property(Label) detailLabel: Label | null = null;
  @property(Sprite) dollImage: Sprite | null = null;
  @property(Node) exchangeButton: Node | null = null;
  actions: ResultOverlayActions | null = null;

  show(result: PrototypeRoundResult, canExchange: boolean): void {
    this.node.active = true;
    if (this.titleLabel) this.titleLabel.string = result.won ? '获得普通娃娃' : '这次没有获得';
    if (this.detailLabel) this.detailLabel.string = result.won ? '普通娃娃 +1' : '再试一次';
    if (this.exchangeButton) this.exchangeButton.active = canExchange;
    if (this.dollImage) {
      this.dollImage.node.active = result.won;
      if (result.dollColor) this.dollImage.color = new Color().fromHEX(result.dollColor);
    }
  }

  close(): void { this.actions?.onClose(); }
  openCollection(): void { this.actions?.onOpenCollection(); }
}
```

- [ ] **Step 2: 创建通用确认层**

`ConfirmOverlay` 支持两种内容：

```ts
export type ConfirmKind = 'exit-round' | 'exchange-prize';

show(kind: ConfirmKind, message: string, onConfirm: () => void): void;
hide(): void;
confirm(): void;
cancel(): void;
```

退出文案固定为：“本局已经投币，离开后费用不会返还”。兑换文案由精品名称和动态兑换数量组成。

- [ ] **Step 3: 创建整批补充层**

`RefillOverlay` 使用单段 Promise 动画：

```ts
async play(onReveal: () => void): Promise<void> {
  this.node.active = true;
  await this.tweenOpacity(0, 255, 0.22);
  onReveal();
  await this.tweenOpacity(255, 0, 0.42);
  this.node.active = false;
}
```

`tweenOpacity` 使用 `UIOpacity` 与 `tween`，并用中文注释说明 Promise 保证补充顺序。

- [ ] **Step 4: 接入本局结果**

在 `GameUiRoot.start()` 中绑定：

```ts
this.coordinator.onResult = (result) => {
  this.lastResult = result;
  this.dispatch({
    type: 'ROUND_SETTLED',
    outcome: result.won ? 'won' : 'missed',
    needsRefill: result.needsRefill,
  });
  this.resultOverlay?.show(
    result,
    this.coordinator!.store.snapshot().ordinaryDolls
      >= this.coordinator!.store.snapshot().exchangeCost,
  );
};
```

关闭结果层时：

```ts
private async closeResult(): Promise<void> {
  this.dispatch({ type: 'CLOSE_RESULT' });
  if (this.flow.layer !== 'refilling') {
    this.cameraSwitcher?.setMode('home');
    return;
  }
  await this.refillOverlay?.play(() => {
    this.coordinator?.refillDollsAfterResult();
  });
  this.dispatch({ type: 'REFILL_FINISHED' });
  this.cameraSwitcher?.setMode('home');
}
```

- [ ] **Step 5: 接入退出确认**

确认离开时先调用 `coordinator.abandonAttempt()`，再派发 `CONFIRM_EXIT`，最后调用 `cameraSwitcher.setMode('home')`。取消时只派发 `CANCEL_EXIT`，本局继续保持可操作。

- [ ] **Step 6: 运行相关测试与类型检查**

Run:

```powershell
npm test -- tests/domain/main-ui-flow.test.ts tests/prototype/deferred-refill-contract.test.ts
npx tsc -p game/tsconfig.json --noEmit
```

Expected: 全部通过。

---

### Task 8: 实现收藏与混合兑换

**Files:**
- Create: `game/assets/scripts/ui/collection-overlay.ts`
- Modify: `game/assets/scripts/ui/game-ui-root.ts`
- Modify: `game/assets/scripts/ui/confirm-overlay.ts`

**Interfaces:**
- Consumes: `PREMIUM_CATALOG`、`PrototypeSnapshot.exchangeCost`
- Produces: `CollectionOverlay.render(snapshot)`、`selectPrize(id)`

- [ ] **Step 1: 创建收藏页组件**

公开接口固定为：

```ts
export interface CollectionOverlayActions {
  onClose: () => void;
  onRequestExchange: (premiumId: string) => void;
}

@ccclass('CollectionOverlay')
export class CollectionOverlay extends Component {
  @property(Label) ordinaryCountLabel: Label | null = null;
  @property(Label) requirementLabel: Label | null = null;
  @property([Node]) prizeNodes: Node[] = [];
  actions: CollectionOverlayActions | null = null;

  render(snapshot: PrototypeSnapshot): void {
    if (this.ordinaryCountLabel) {
      this.ordinaryCountLabel.string = `普通娃娃 ${snapshot.ordinaryDolls}`;
    }
    if (this.requirementLabel) {
      this.requirementLabel.string = `每件精品需要 ${snapshot.exchangeCost} 只`;
    }
    const enabled = snapshot.ordinaryDolls >= snapshot.exchangeCost;
    this.prizeNodes.forEach((node) => {
      const button = node.getComponent(Button);
      if (button) button.interactable = enabled;
    });
  }

  selectPrize(index: number): void {
    const prize = PREMIUM_CATALOG[index];
    if (prize) this.actions?.onRequestExchange(prize.id);
  }

  close(): void { this.actions?.onClose(); }
}
```

- [ ] **Step 2: 在主界面总控中接入收藏页**

- `OPEN_COLLECTION` 后显示 `CollectionOverlay` 并调用 `render(snapshot)`。
- `CLOSE_COLLECTION` 后返回首页。
- 结果层的“去兑换”先关闭结果层，再打开收藏页；若需要整批补充，则补充完成后再打开收藏页。
- 选择精品时先显示 `ConfirmOverlay`。
- 确认后调用 `coordinator.exchangePremium(premiumId)`，刷新数量并保持收藏页打开。
- 数量不足时不调用协调器。

- [ ] **Step 3: 固定兑换确认文案**

```ts
const message = `使用 ${snapshot.exchangeCost} 只普通娃娃兑换${prize.name}`;
```

确认成功后的页内提示固定为：“兑换完成”。

- [ ] **Step 4: 运行目录、数据仓库与类型检查**

Run:

```powershell
npm test -- tests/domain/premium-catalog.test.ts tests/domain/prototype-store.test.ts
npx tsc -p game/tsconfig.json --noEmit
```

Expected: 全部通过。

---

### Task 9: 制作 UI 资源并完成主场景节点绑定

**Files:**
- Create: `game/assets/ui/textures/marquee-backplate.png`
- Create: `game/assets/ui/textures/console-panel.png`
- Create: `game/assets/ui/icons/coin.png`
- Create: `game/assets/ui/icons/collection.png`
- Create: `game/assets/ui/icons/camera.png`
- Create: `game/assets/ui/icons/ordinary-doll.png`
- Create: `game/assets/ui/fonts/SmileySans-Oblique.ttf`
- Create: `game/assets/ui/fonts/OFL.txt`
- Modify through Cocos Editor: `game/assets/scenes/prototype.scene`
- Create: `tests/prototype/game-ui-scene-contract.test.ts`

**Interfaces:**
- Consumes: Tasks 4、6、7、8 的组件
- Produces: 完整主场景 UI 节点与资源引用

- [ ] **Step 1: 生成不含文字的机台式图片资源**

资源保持透明背景、硬边框、纯色块和短投影。文字全部由 Cocos Label 渲染，避免图片中文字不准确。

使用图片生成工具分别生成六张独立图片，不生成包含多件资源的整图。统一要求如下：

```text
Transparent background, polished 2D mobile arcade game UI asset,
inspired by the physical control panel of a cute claw machine.
Use solid teal #15B8BE, coral #EF607D, yellow #FFC83D,
violet #7764B2 and dark outline #18242E.
Thick clean outline, short hard shadow, front view, no text,
no letters, no gradient, no floating card, no extra decoration.
```

在统一要求末尾分别追加资源名称和形状说明，并将结果裁成下表尺寸。

图片要求：

```text
marquee-backplate.png  1024 x 320  紫色灯牌、深墨轮廓、明黄灯泡
console-panel.png      1024 x 384  深墨控制台、青色与珊瑚红灯带
coin.png                256 x 256  明黄硬币、深墨轮廓
collection.png          256 x 256  奖品陈列柜、紫色与明黄
camera.png              256 x 256  青色机台镜头按钮
ordinary-doll.png       512 x 512  软萌普通娃娃轮廓，可由 Sprite 颜色着色
```

每张图完成后检查透明边缘、轮廓宽度和缩小到按钮尺寸后的可辨认度。

- [ ] **Step 2: 加入项目字体资源**

从得意黑官方项目 `https://github.com/atelier-anchor/smiley-sans` 获取 `SmileySans-Oblique.ttf` 与对应 `OFL.txt`。网络访问需要授权时先请求用户允许，不改变 Node 环境，也不安装运行时依赖。

将字体导入 Cocos 后绑定到品牌灯牌、按钮、提示和计数器。品牌标题使用较大字号，正文和数字使用较小字号与更高字重；所有文字的字距设为 `0`。

- [ ] **Step 3: 在主场景建立节点层级**

将 `Canvas` 下节点整理为：

```text
Canvas
└─ SafeArea
   ├─ TopHud
   ├─ HomePanel
   │  ├─ Marquee
   │  ├─ CoinCounter
   │  ├─ CollectionButton
   │  └─ HomeConsole
   │     ├─ FeeTicket
   │     └─ CoinButton
   ├─ GameConsole
   │  ├─ BackButton
   │  ├─ CameraButton
   │  ├─ InstructionSign
   │  ├─ Joystick
   │  └─ DropButton
   ├─ ResultOverlay
   ├─ CollectionOverlay
   │  └─ PrizeShelf
   │     ├─ PremiumRabbit
   │     ├─ PremiumCat
   │     ├─ PremiumDog
   │     └─ PremiumCow
   ├─ ConfirmOverlay
   └─ RefillOverlay
```

首页不增加顶部导航。结果层与收藏页使用完整独立层级，不把页面放进另一张装饰卡片。

- [ ] **Step 4: 绑定组件与按钮**

- `HomePanel` 绑定计数器、费用和投币按钮。
- `GameConsole` 复用现有 `VirtualJoystick`、`CameraSwitcher` 与下爪按钮。
- `ResultOverlay` 绑定娃娃图片、标题、详情、关闭和兑换入口。
- `CollectionOverlay` 按 `PREMIUM_CATALOG` 顺序绑定四个精品节点。
- `ConfirmOverlay` 位于其他普通覆盖层上方。
- `RefillOverlay` 初始隐藏并拥有 `UIOpacity`。
- `GameUiRoot` 绑定协调器、相机切换器和所有页面组件。
- 确认新界面工作后，从 `Canvas` 移除旧 `PrototypeHud` 组件和不再使用的旧节点。

- [ ] **Step 5: 增加主场景结构检查**

Create `tests/prototype/game-ui-scene-contract.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import sceneSource from '../../game/assets/scenes/prototype.scene?raw';

describe('game UI scene contract', () => {
  it.each([
    'SafeArea',
    'HomePanel',
    'GameConsole',
    'ResultOverlay',
    'CollectionOverlay',
    'ConfirmOverlay',
    'RefillOverlay',
  ])('包含 %s 节点', (name) => {
    expect(sceneSource).toContain(`\"_name\": \"${name}\"`);
  });

  it('不再保留旧力度显示节点', () => {
    expect(sceneSource).not.toContain('\"_name\": \"ChargeBar\"');
  });
});
```

- [ ] **Step 6: 运行场景结构检查和类型检查**

Run:

```powershell
npm test -- tests/prototype/game-ui-scene-contract.test.ts
npx tsc -p game/tsconfig.json --noEmit
```

Expected: 全部通过。

---

### Task 10: 完整回归与用户视觉验收

**Files:**
- Modify when required: Tasks 1-9 touched files only
- Update: `docs/superpowers/plans/2026-08-31-claw-game-ui.md`

**Interfaces:**
- Consumes: 全部前置任务
- Produces: 可供用户在 Cocos 中直接查看的首版完整 UI

- [ ] **Step 1: 运行全部自动测试**

Run:

```powershell
npm test
```

Expected: 所有测试文件与测试项全部 PASS。

- [ ] **Step 2: 运行两套 TypeScript 检查**

Run:

```powershell
npx tsc -p tsconfig.logic.json --noEmit
npx tsc -p game/tsconfig.json --noEmit
```

Expected: 两条命令退出码均为 `0`，没有类型错误。

- [ ] **Step 3: 检查文件引用完整性**

Run:

```powershell
rg -n "missing|undefined|ChargeBar|PrototypeHud" game/assets/scenes game/assets/scripts/ui game/assets/scripts/prototype
```

Expected:

- 新场景和 UI 脚本中没有无效引用说明。
- `ChargeBar` 不再出现在主场景。
- `PrototypeHud` 仅可作为已停用的迁移文件存在，不再绑定主场景。

- [ ] **Step 4: 由用户在 Cocos 检查竖屏画面**

用户检查以下内容：

- 加载页先出现，灯牌按进度点亮。
- 首页完整显示机台、游戏币、收藏、费用和投币按钮。
- 未投币时不出现摇杆和下爪按钮。
- 投币后相机靠近，操作台出现，按钮不遮挡机台出口。
- 下爪期间所有重复操作暂时不可用。
- 娃娃稳定后才出现结果层。
- 最后一只娃娃结算后，关闭结果层才补充新的一批。
- 收藏页像奖品陈列柜，四个精品可以查看与选择。
- 普通娃娃数量不足时不能兑换，数量足够时可确认兑换。
- 短屏与长屏没有文字、按钮或机台画面互相遮挡。
- 侧面视角下玻璃仍保持透明。

- [ ] **Step 5: 根据用户截图做一次集中调整**

只调整以下视觉参数，不改变已验证的玩法规则：

- 相机首页位置与游戏位置
- 三维机台在竖屏内的大小和上下留白
- 控制台高度、摇杆与下爪按钮尺寸
- 字号、边框、投影和颜色明度
- 覆盖层进入位置与动画时长

调整后重新执行 Step 1 与 Step 2，并记录最终测试数量与类型检查结果。

---

## 完成条件

- `boot.scene` 与 `prototype.scene` 均可正常使用。
- 主场景只载入一台三维机台。
- 五个首版页面或覆盖层均可正常进入和退出。
- 竖屏操作区稳定，三维机台完整可见。
- 动态费用、混合兑换与整批补充规则正确。
- UI 不展示力度和隐藏周期信息。
- 自动测试和两套 TypeScript 检查全部通过。
- 用户完成 Cocos 画面检查并确认首版视觉方向。
