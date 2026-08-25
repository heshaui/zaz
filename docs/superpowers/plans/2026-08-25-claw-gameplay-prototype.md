# 虚拟抓娃娃玩法样机 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在微信小游戏真机环境中完成一台可连续游玩的 3D 娃娃机，并用本地数据跑通抓取、强爪周期、普通娃娃入包、10 个兑换精品娃娃的闭环。

**Architecture:** Cocos Creator 负责场景、输入和动画，纯 TypeScript 领域模块负责周期、钱包、背包和状态机，Blender Python 脚本负责可重复生成首批低模资产。样机不连接后端，但所有领域接口按后续服务端接管的边界设计，避免第二阶段重写客户端表现层。

**Tech Stack:** Cocos Creator 3.8 LTS、TypeScript、Vitest、Blender 4.2.1 LTS、Blender Python、glTF/GLB、微信开发者工具

**执行约束:** 不创建 Git 仓库，不执行 `git add`、`git commit` 或其他 Git 写操作。复杂状态机、坐标换算和 Blender 几何生成代码必须使用中文注释。

---

## 范围边界

本计划只实现阶段一玩法样机，不实现微信登录、正式后端、广告、任务、运营后台和远程配置。样机验收后，再分别为核心后端、运营功能和微信上线编写独立计划。

## 目录结构

```text
zaz/
├─ art/
│  ├─ blender/
│  │  └─ claw-prototype.blend
│  └─ renders/
│     └─ claw-prototype.png
├─ docs/superpowers/
│  ├─ specs/2026-08-25-virtual-claw-mini-game-design.md
│  └─ plans/2026-08-25-claw-gameplay-prototype.md
├─ game/
│  ├─ assets/
│  │  ├─ models/prototype/claw-prototype.glb
│  │  ├─ scenes/prototype.scene
│  │  └─ scripts/
│  │     ├─ domain/
│  │     │  ├─ grab-rules.ts
│  │     │  ├─ grab-session.ts
│  │     │  └─ prototype-store.ts
│  │     └─ prototype/
│  │        ├─ camera-switcher.ts
│  │        ├─ claw-controller.ts
│  │        ├─ claw-rig.ts
│  │        ├─ doll-target.ts
│  │        ├─ machine-config.ts
│  │        ├─ prototype-coordinator.ts
│  │        ├─ prototype-hud.ts
│  │        └─ virtual-joystick.ts
│  ├─ project.json
│  └─ tsconfig.json
├─ tests/domain/
│  ├─ grab-rules.test.ts
│  ├─ grab-session.test.ts
│  └─ prototype-store.test.ts
├─ tools/blender/
│  └─ generate-prototype-assets.py
├─ package.json
├─ tsconfig.logic.json
└─ vitest.config.ts
```

## Task 1: 准备 Cocos 与 TypeScript 测试环境

**Files:**
- Create through Cocos Dashboard: `game/project.json`
- Create through Cocos Dashboard: `game/assets/`
- Create: `package.json`
- Create: `tsconfig.logic.json`
- Create: `vitest.config.ts`

- [ ] **Step 1: 准备 Node.js 20 环境**

Run:

```powershell
nvm install 20.19.1
nvm use 20.19.1
node --version
npm --version
```

Expected: `node --version` 输出 `v20.19.1`，`npm --version` 正常输出版本号。

- [ ] **Step 2: 安装并创建 Cocos Creator 项目**

在已安装的 Cocos Dashboard 2.2.1 中安装最新的 Cocos Creator 3.8 LTS 补丁版本。使用“3D Empty”模板在 `D:\playAi\zaz\game` 创建项目，项目名使用 `virtual-claw-game`。

Expected: `game/project.json`、`game/assets` 和 `game/settings` 存在，Cocos Creator 可以打开项目且控制台没有红色错误。

- [ ] **Step 3: 创建根目录测试配置**

Create `package.json`:

```json
{
  "name": "virtual-claw-game",
  "private": true,
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "devDependencies": {
    "typescript": "^5.7.3",
    "vitest": "^3.2.4"
  }
}
```

Create `tsconfig.logic.json`:

```json
{
  "compilerOptions": {
    "target": "ES2021",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "skipLibCheck": true,
    "types": ["vitest/globals"]
  },
  "include": ["game/assets/scripts/domain/**/*.ts", "tests/**/*.ts", "vitest.config.ts"]
}
```

Create `vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    coverage: { reporter: ['text'] },
  },
});
```

- [ ] **Step 4: 安装依赖并验证空测试集**

Run:

```powershell
npm install
npm test -- --passWithNoTests
```

Expected: 命令退出码为 `0`，输出说明没有发现测试或测试集为空。

## Task 2: 用测试定义强爪周期规则

**Files:**
- Create: `game/assets/scripts/domain/grab-rules.ts`
- Test: `tests/domain/grab-rules.test.ts`

- [ ] **Step 1: 先写失败测试**

Create `tests/domain/grab-rules.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { advanceCycle, getChargeStage } from '../../game/assets/scripts/domain/grab-rules';

describe('advanceCycle', () => {
  it('在第 N 次下爪触发强爪并归零', () => {
    expect(advanceCycle(14, 15)).toEqual({ isStrong: true, nextProgress: 0 });
  });

  it('普通下爪只推进当前机台进度', () => {
    expect(advanceCycle(3, 15)).toEqual({ isStrong: false, nextProgress: 4 });
  });

  it('周期降低到当前进度以下时下一次直接触发强爪', () => {
    expect(advanceCycle(14, 10)).toEqual({ isStrong: true, nextProgress: 0 });
  });

  it('拒绝无效周期', () => {
    expect(() => advanceCycle(0, 0)).toThrow('cycle must be >= 1');
  });
});

describe('getChargeStage', () => {
  it.each([
    [0, 15, 'low'],
    [6, 15, 'medium'],
    [12, 15, 'high'],
  ] as const)('progress=%s cycle=%s 返回 %s', (progress, cycle, expected) => {
    expect(getChargeStage(progress, cycle)).toBe(expected);
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run:

```powershell
npm test -- tests/domain/grab-rules.test.ts
```

Expected: FAIL，原因是 `grab-rules.ts` 尚不存在。

- [ ] **Step 3: 实现最小规则模块**

Create `game/assets/scripts/domain/grab-rules.ts`:

```ts
export type ChargeStage = 'low' | 'medium' | 'high';

export interface CycleAdvance {
  isStrong: boolean;
  nextProgress: number;
}

export function advanceCycle(progress: number, cycle: number): CycleAdvance {
  if (!Number.isInteger(cycle) || cycle < 1) {
    throw new Error('cycle must be >= 1');
  }
  if (!Number.isInteger(progress) || progress < 0) {
    throw new Error('progress must be >= 0');
  }

  // 周期被后台调低后，旧进度可能大于新周期，因此使用 >= 判断。
  const isStrong = progress + 1 >= cycle;
  return { isStrong, nextProgress: isStrong ? 0 : progress + 1 };
}

export function getChargeStage(progress: number, cycle: number): ChargeStage {
  if (cycle < 1) {
    throw new Error('cycle must be >= 1');
  }
  const ratio = Math.max(0, progress) / cycle;
  if (ratio >= 0.8) return 'high';
  if (ratio >= 0.4) return 'medium';
  return 'low';
}
```

- [ ] **Step 4: 运行规则测试**

Run:

```powershell
npm test -- tests/domain/grab-rules.test.ts
```

Expected: 7 个测试全部 PASS。

## Task 3: 用测试定义抓取动画状态机

**Files:**
- Create: `game/assets/scripts/domain/grab-session.ts`
- Test: `tests/domain/grab-session.test.ts`

- [ ] **Step 1: 写状态转换测试**

Create `tests/domain/grab-session.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { GrabSession } from '../../game/assets/scripts/domain/grab-session';

describe('GrabSession', () => {
  it('按完整抓取顺序流转', () => {
    const session = new GrabSession();
    session.startMoving();
    session.startDropping();
    session.startGrabbing();
    session.startLifting();
    session.startReturning();
    session.settle();
    expect(session.state).toBe('settled');
  });

  it('拒绝重复下爪', () => {
    const session = new GrabSession();
    session.startMoving();
    session.startDropping();
    expect(() => session.startDropping()).toThrow('invalid transition');
  });

  it('重置后允许开始下一局', () => {
    const session = new GrabSession();
    session.startMoving();
    session.startDropping();
    session.startGrabbing();
    session.startLifting();
    session.startReturning();
    session.settle();
    session.reset();
    expect(session.state).toBe('idle');
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npm test -- tests/domain/grab-session.test.ts`

Expected: FAIL，原因是 `GrabSession` 尚未定义。

- [ ] **Step 3: 实现显式状态机**

Create `game/assets/scripts/domain/grab-session.ts`:

```ts
export type GrabState =
  | 'idle'
  | 'moving'
  | 'dropping'
  | 'grabbing'
  | 'lifting'
  | 'returning'
  | 'settled';

const NEXT: Record<GrabState, GrabState[]> = {
  idle: ['moving'],
  moving: ['dropping'],
  dropping: ['grabbing'],
  grabbing: ['lifting'],
  lifting: ['returning'],
  returning: ['settled'],
  settled: ['idle'],
};

export class GrabSession {
  private current: GrabState = 'idle';

  get state(): GrabState {
    return this.current;
  }

  startMoving(): void { this.transition('moving'); }
  startDropping(): void { this.transition('dropping'); }
  startGrabbing(): void { this.transition('grabbing'); }
  startLifting(): void { this.transition('lifting'); }
  startReturning(): void { this.transition('returning'); }
  settle(): void { this.transition('settled'); }
  reset(): void { this.transition('idle'); }

  private transition(next: GrabState): void {
    // 所有入口都经过同一张状态表，防止重复点击导致动画并发执行。
    if (!NEXT[this.current].includes(next)) {
      throw new Error(`invalid transition: ${this.current} -> ${next}`);
    }
    this.current = next;
  }
}
```

- [ ] **Step 4: 运行状态机测试**

Run: `npm test -- tests/domain/grab-session.test.ts`

Expected: 3 个测试全部 PASS。

## Task 4: 用测试实现样机钱包、背包和兑换

**Files:**
- Create: `game/assets/scripts/domain/prototype-store.ts`
- Test: `tests/domain/prototype-store.test.ts`

- [ ] **Step 1: 写经济闭环测试**

Create `tests/domain/prototype-store.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { PrototypeStore } from '../../game/assets/scripts/domain/prototype-store';

describe('PrototypeStore', () => {
  it('开始一局扣除统一价格', () => {
    const store = new PrototypeStore({ coins: 30, cost: 3, cycle: 5 });
    expect(store.startAttempt()).toEqual({ coins: 27 });
    expect(store.snapshot().progress).toBe(0);
  });

  it('余额不足时保持所有数据不变', () => {
    const store = new PrototypeStore({ coins: 2, cost: 3, cycle: 5 });
    expect(() => store.startAttempt()).toThrow('insufficient coins');
    expect(store.snapshot()).toMatchObject({ coins: 2, progress: 0 });
  });

  it('强爪成功后增加一个普通娃娃', () => {
    const store = new PrototypeStore({ coins: 30, cost: 3, cycle: 1 });
    store.startAttempt();
    const drop = store.executeDrop();
    store.settleAttempt(drop.isStrong, true);
    expect(store.snapshot().ordinaryDolls).toBe(1);
  });

  it('强爪操作失误不会发娃娃但周期已重置', () => {
    const store = new PrototypeStore({ coins: 30, cost: 3, cycle: 1 });
    store.startAttempt();
    const drop = store.executeDrop();
    store.settleAttempt(drop.isStrong, false);
    expect(store.snapshot()).toMatchObject({ ordinaryDolls: 0, progress: 0 });
  });

  it('消耗 10 个普通娃娃兑换指定精品娃娃', () => {
    const store = new PrototypeStore({ coins: 300, cost: 3, cycle: 1 });
    for (let i = 0; i < 10; i += 1) {
      store.startAttempt();
      const drop = store.executeDrop();
      store.settleAttempt(drop.isStrong, true);
    }
    store.exchange('premium-star', 10);
    expect(store.snapshot()).toMatchObject({ ordinaryDolls: 0, premiumDolls: ['premium-star'] });
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npm test -- tests/domain/prototype-store.test.ts`

Expected: FAIL，原因是 `PrototypeStore` 尚未定义。

- [ ] **Step 3: 实现本地样机数据仓库**

Create `game/assets/scripts/domain/prototype-store.ts`:

```ts
import { advanceCycle, getChargeStage, type ChargeStage } from './grab-rules';

interface PrototypeStoreOptions {
  coins: number;
  cost: number;
  cycle: number;
}

export interface PrototypeSnapshot {
  coins: number;
  progress: number;
  chargeStage: ChargeStage;
  ordinaryDolls: number;
  premiumDolls: string[];
}

export class PrototypeStore {
  private coins: number;
  private progress = 0;
  private ordinaryDolls = 0;
  private readonly premiumDolls = new Set<string>();
  private attemptOpen = false;
  private dropExecuted = false;

  constructor(private readonly options: PrototypeStoreOptions) {
    this.coins = options.coins;
  }

  startAttempt(): { coins: number } {
    if (this.attemptOpen) {
      throw new Error('attempt already open');
    }
    if (this.coins < this.options.cost) {
      throw new Error('insufficient coins');
    }
    this.coins -= this.options.cost;
    this.attemptOpen = true;
    this.dropExecuted = false;
    return { coins: this.coins };
  }

  executeDrop(): { isStrong: boolean } {
    if (!this.attemptOpen || this.dropExecuted) {
      throw new Error('drop is not allowed');
    }
    // 创建抓取局只扣币；真正执行下爪时才推进周期并消耗强爪机会。
    const result = advanceCycle(this.progress, this.options.cycle);
    this.progress = result.nextProgress;
    this.dropExecuted = true;
    return { isStrong: result.isStrong };
  }

  settleAttempt(isStrong: boolean, aimedCorrectly: boolean): void {
    if (!this.attemptOpen || !this.dropExecuted) {
      throw new Error('attempt is not ready to settle');
    }
    if (isStrong && aimedCorrectly) {
      this.ordinaryDolls += 1;
    }
    this.attemptOpen = false;
    this.dropExecuted = false;
  }

  exchange(premiumId: string, requiredCount: number): void {
    if (this.ordinaryDolls < requiredCount) {
      throw new Error('insufficient ordinary dolls');
    }
    this.ordinaryDolls -= requiredCount;
    this.premiumDolls.add(premiumId);
  }

  snapshot(): PrototypeSnapshot {
    return {
      coins: this.coins,
      progress: this.progress,
      chargeStage: getChargeStage(this.progress, this.options.cycle),
      ordinaryDolls: this.ordinaryDolls,
      premiumDolls: [...this.premiumDolls],
    };
  }
}
```

- [ ] **Step 4: 运行全部领域测试**

Run: `npm test`

Expected: 15 个测试全部 PASS。

## Task 5: 使用 Blender 自动生成样机资产

**Files:**
- Create: `tools/blender/generate-prototype-assets.py`
- Create by script: `art/blender/claw-prototype.blend`
- Create by script: `art/renders/claw-prototype.png`
- Create by script: `game/assets/models/prototype/claw-prototype.glb`

- [ ] **Step 1: 创建可重复执行的资产生成脚本**

Create `tools/blender/generate-prototype-assets.py`:

```python
from pathlib import Path
import math
import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
BLEND_PATH = ROOT / "art" / "blender" / "claw-prototype.blend"
RENDER_PATH = ROOT / "art" / "renders" / "claw-prototype.png"
GLB_PATH = ROOT / "game" / "assets" / "models" / "prototype" / "claw-prototype.glb"


def reset_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)


def material(name, color, metallic=0.0, roughness=0.6):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*color, 1.0)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (*color, 1.0)
    bsdf.inputs["Metallic"].default_value = metallic
    bsdf.inputs["Roughness"].default_value = roughness
    return mat


def cube(name, location, scale, mat, parent=None):
    bpy.ops.mesh.primitive_cube_add(location=location)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(mat)
    obj.parent = parent
    return obj


def sphere(name, location, scale, mat, parent=None):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=16, ring_count=8, location=location)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(mat)
    obj.parent = parent
    return obj


def create_machine():
    # 机台按可运动部件拆分，Cocos 可直接控制横梁、滑车和三只爪臂。
    body = material("MachineBody", (0.08, 0.55, 0.62), metallic=0.05, roughness=0.35)
    trim = material("MachineTrim", (0.95, 0.28, 0.36), roughness=0.4)
    metal = material("ClawMetal", (0.55, 0.58, 0.62), metallic=0.8, roughness=0.25)

    root = bpy.data.objects.new("MachineRoot", None)
    bpy.context.collection.objects.link(root)
    cube("Base", (0, 0, 0.55), (2.2, 1.65, 0.55), body, root)
    cube("Top", (0, 0, 4.6), (2.2, 1.65, 0.25), trim, root)
    for x in (-2.0, 2.0):
        for y in (-1.45, 1.45):
            cube(f"Post_{x}_{y}", (x, y, 2.7), (0.15, 0.15, 1.75), body, root)

    rail = cube("RailX", (0, 0, 4.15), (1.8, 0.09, 0.09), metal, root)
    carriage = cube("ClawCarriage", (0, 0, 4.0), (0.22, 0.22, 0.18), trim, rail)
    cube("ClawCable", (0, 0, 3.25), (0.035, 0.035, 0.75), metal, carriage)
    hub = sphere("ClawHub", (0, 0, 2.45), (0.18, 0.18, 0.14), metal, carriage)

    for index, angle in enumerate((0, 120, 240)):
        arm = cube(f"ClawArm_{index}", (0, 0, 2.05), (0.055, 0.055, 0.42), metal, hub)
        arm.rotation_euler = (math.radians(22), 0, math.radians(angle))
    return root


def create_doll(name, position, body_color, ear_mode):
    # 普通娃娃共享身体比例，通过耳朵轮廓和配色建立可扩展的系列感。
    mat = material(f"{name}BodyMat", body_color, roughness=0.9)
    dark = material(f"{name}FaceMat", (0.04, 0.04, 0.05), roughness=0.8)
    root = bpy.data.objects.new(name, None)
    bpy.context.collection.objects.link(root)
    x, y, z = position
    sphere(f"{name}_Body", (x, y, z + 0.35), (0.36, 0.3, 0.44), mat, root)
    sphere(f"{name}_Head", (x, y, z + 0.92), (0.32, 0.29, 0.3), mat, root)
    sphere(f"{name}_EyeL", (x - 0.11, y - 0.275, z + 0.96), (0.035, 0.02, 0.05), dark, root)
    sphere(f"{name}_EyeR", (x + 0.11, y - 0.275, z + 0.96), (0.035, 0.02, 0.05), dark, root)
    ear_scale = (0.11, 0.09, 0.2) if ear_mode == "long" else (0.16, 0.1, 0.13)
    sphere(f"{name}_EarL", (x - 0.2, y, z + 1.2), ear_scale, mat, root)
    sphere(f"{name}_EarR", (x + 0.2, y, z + 1.2), ear_scale, mat, root)
    return root


def look_at(obj, target):
    direction = Vector(target) - obj.location
    obj.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()


def setup_render():
    bpy.ops.object.light_add(type="AREA", location=(3.5, -4.0, 6.5))
    key = bpy.context.object
    key.data.energy = 1100
    key.data.shape = "DISK"
    key.data.size = 5.0
    bpy.ops.object.camera_add(location=(8.5, -10.5, 7.2))
    camera = bpy.context.object
    look_at(camera, (0, 0, 2.25))
    bpy.context.scene.camera = camera
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE_NEXT"
    scene.render.resolution_x = 960
    scene.render.resolution_y = 960
    scene.render.resolution_percentage = 100
    scene.render.filepath = str(RENDER_PATH)
    scene.world.color = (0.035, 0.04, 0.055)


def main():
    for path in (BLEND_PATH.parent, RENDER_PATH.parent, GLB_PATH.parent):
        path.mkdir(parents=True, exist_ok=True)
    reset_scene()
    create_machine()
    create_doll("DollRabbit", (-0.8, 0.0, 1.05), (0.95, 0.55, 0.7), "long")
    create_doll("DollBear", (0.0, 0.2, 1.05), (0.6, 0.38, 0.2), "round")
    create_doll("DollMint", (0.75, 0.05, 1.05), (0.3, 0.82, 0.65), "round")
    create_doll("DollBlue", (0.2, 0.85, 1.05), (0.25, 0.55, 0.95), "long")
    create_doll("PremiumStar", (-0.35, 0.75, 1.05), (0.98, 0.78, 0.2), "long")
    setup_render()
    bpy.ops.wm.save_as_mainfile(filepath=str(BLEND_PATH))
    bpy.ops.render.render(write_still=True)
    bpy.ops.export_scene.gltf(filepath=str(GLB_PATH), export_format="GLB", export_apply=True)


if __name__ == "__main__":
    main()
```

- [ ] **Step 2: 执行 Blender 脚本**

Run:

```powershell
& 'D:\软件\Blender\blender.exe' --background --factory-startup --python 'D:\playAi\zaz\tools\blender\generate-prototype-assets.py'
```

Expected: 输出包含 `Saved` 和 glTF 导出完成信息，退出码为 `0`。

- [ ] **Step 3: 验证产物**

Run:

```powershell
Get-Item 'art\blender\claw-prototype.blend','art\renders\claw-prototype.png','game\assets\models\prototype\claw-prototype.glb' | Select-Object FullName,Length
```

Expected: 三个文件均存在且 `Length` 大于 `0`。打开 PNG 检查机台、五只娃娃、材质和镜头构图均可见。

## Task 6: 建立 Cocos 场景和机台边界

**Files:**
- Create through Cocos Editor: `game/assets/scenes/prototype.scene`
- Create: `game/assets/scripts/prototype/machine-config.ts`

- [ ] **Step 1: 创建机台配置组件**

Create `game/assets/scripts/prototype/machine-config.ts`:

```ts
import { _decorator, Component, Vec3 } from 'cc';

const { ccclass, property } = _decorator;

@ccclass('MachineConfig')
export class MachineConfig extends Component {
  @property(Vec3)
  readonly minPosition = new Vec3(-1.55, 3.85, -1.05);

  @property(Vec3)
  readonly maxPosition = new Vec3(1.55, 3.85, 1.05);

  @property
  readonly moveSpeed = 1.8;

  @property
  readonly aimRadius = 0.42;
}
```

- [ ] **Step 2: 在编辑器中创建固定节点层级**

在 `prototype.scene` 中创建并保持以下名称：

```text
PrototypeRoot
├─ Machine
│  ├─ RailX
│  │  └─ ClawCarriage
│  │     ├─ ClawCable
│  │     └─ ClawHub
│  │        ├─ ClawArm_0
│  │        ├─ ClawArm_1
│  │        └─ ClawArm_2
│  └─ Dolls
├─ Cameras
│  ├─ FrontCamera
│  └─ SideCamera
└─ Canvas
   ├─ Joystick
   ├─ GrabButton
   ├─ CameraButton
   ├─ CoinLabel
   ├─ ChargeBar
   ├─ DollCountLabel
   ├─ ResultPanel
   └─ ExchangePanel
```

将 GLB 实例放到 `Machine` 下，在 `Dolls` 下放置至少 12 个娃娃实例，4 种普通娃娃造型都要出现。给娃娃添加简化球形或胶囊碰撞体和刚体；机台底板及墙体使用静态盒碰撞体。

- [ ] **Step 3: 验证场景导入**

Expected: 场景运行后机台和娃娃正常显示；控制台没有丢失材质、脚本或节点引用错误；静止 30 秒没有娃娃持续抖动或穿过底板。

## Task 7: 实现摇杆、爪子移动和镜头切换

**Files:**
- Create: `game/assets/scripts/prototype/virtual-joystick.ts`
- Create: `game/assets/scripts/prototype/claw-controller.ts`
- Create: `game/assets/scripts/prototype/camera-switcher.ts`

- [ ] **Step 1: 实现摇杆输出**

Create `game/assets/scripts/prototype/virtual-joystick.ts`:

```ts
import { _decorator, Component, EventTouch, Node, UITransform, Vec2, Vec3 } from 'cc';

const { ccclass, property } = _decorator;

@ccclass('VirtualJoystick')
export class VirtualJoystick extends Component {
  @property(Node) knob: Node | null = null;
  @property radius = 70;
  readonly value = new Vec2();

  onEnable(): void {
    this.node.on(Node.EventType.TOUCH_MOVE, this.onMove, this);
    this.node.on(Node.EventType.TOUCH_END, this.reset, this);
    this.node.on(Node.EventType.TOUCH_CANCEL, this.reset, this);
  }

  onDisable(): void {
    this.node.off(Node.EventType.TOUCH_MOVE, this.onMove, this);
    this.node.off(Node.EventType.TOUCH_END, this.reset, this);
    this.node.off(Node.EventType.TOUCH_CANCEL, this.reset, this);
  }

  private onMove(event: EventTouch): void {
    const transform = this.node.getComponent(UITransform);
    if (!transform || !this.knob) return;
    const local = transform.convertToNodeSpaceAR(new Vec3(event.getUILocation().x, event.getUILocation().y));
    const direction = new Vec2(local.x, local.y);
    if (direction.length() > this.radius) direction.normalize().multiplyScalar(this.radius);
    this.knob.setPosition(direction.x, direction.y);
    this.value.set(direction.x / this.radius, direction.y / this.radius);
  }

  private reset(): void {
    this.value.set(0, 0);
    this.knob?.setPosition(0, 0);
  }
}
```

- [ ] **Step 2: 实现边界内移动**

Create `game/assets/scripts/prototype/claw-controller.ts`:

```ts
import { _decorator, Component, Node, Vec3 } from 'cc';
import { MachineConfig } from './machine-config';
import { VirtualJoystick } from './virtual-joystick';

const { ccclass, property } = _decorator;

@ccclass('ClawController')
export class ClawController extends Component {
  @property(VirtualJoystick) joystick: VirtualJoystick | null = null;
  @property(MachineConfig) config: MachineConfig | null = null;
  @property(Node) carriage: Node | null = null;
  movementEnabled = true;

  update(deltaTime: number): void {
    if (!this.movementEnabled || !this.joystick || !this.config || !this.carriage) return;
    const current = this.carriage.position;
    const next = new Vec3(
      current.x + this.joystick.value.x * this.config.moveSpeed * deltaTime,
      current.y,
      current.z - this.joystick.value.y * this.config.moveSpeed * deltaTime,
    );
    // 同时限制两个水平轴，避免滑车穿出玻璃柜体。
    next.x = Math.min(this.config.maxPosition.x, Math.max(this.config.minPosition.x, next.x));
    next.z = Math.min(this.config.maxPosition.z, Math.max(this.config.minPosition.z, next.z));
    this.carriage.setPosition(next);
  }
}
```

- [ ] **Step 3: 实现双镜头切换**

Create `game/assets/scripts/prototype/camera-switcher.ts`:

```ts
import { _decorator, Camera, Component } from 'cc';

const { ccclass, property } = _decorator;

@ccclass('CameraSwitcher')
export class CameraSwitcher extends Component {
  @property(Camera) front: Camera | null = null;
  @property(Camera) side: Camera | null = null;
  private showingFront = true;

  start(): void { this.apply(); }

  toggle(): void {
    this.showingFront = !this.showingFront;
    this.apply();
  }

  private apply(): void {
    if (this.front) this.front.enabled = this.showingFront;
    if (this.side) this.side.enabled = !this.showingFront;
  }
}
```

- [ ] **Step 4: 在编辑器绑定并手动验证**

Expected: 摇杆可以连续控制 X/Z 两轴；滑车不会穿出边界；镜头按钮在正面和侧面间切换；松开摇杆后滑车立即停止。

## Task 8: 实现强爪与弱爪表现

**Files:**
- Create: `game/assets/scripts/prototype/doll-target.ts`
- Create: `game/assets/scripts/prototype/claw-rig.ts`
- Create: `game/assets/scripts/prototype/prototype-coordinator.ts`

- [ ] **Step 1: 标记可抓娃娃**

Create `game/assets/scripts/prototype/doll-target.ts`:

```ts
import { _decorator, Component } from 'cc';

const { ccclass, property } = _decorator;

@ccclass('DollTarget')
export class DollTarget extends Component {
  @property dollId = 'ordinary-rabbit';
}
```

- [ ] **Step 2: 实现爪子分段动画接口**

Create `game/assets/scripts/prototype/claw-rig.ts`:

```ts
import { _decorator, Component, Node, tween, Vec3 } from 'cc';

const { ccclass, property } = _decorator;

@ccclass('ClawRig')
export class ClawRig extends Component {
  @property(Node) hub: Node | null = null;
  @property([Node]) arms: Node[] = [];
  @property dropDistance = 2.0;
  private home = new Vec3();

  start(): void {
    if (this.hub) this.home.set(this.hub.position);
  }

  async drop(): Promise<void> {
    if (!this.hub) return;
    await this.moveHub(new Vec3(this.home.x, this.home.y - this.dropDistance, this.home.z), 0.65);
  }

  close(strong: boolean): void {
    const angle = strong ? 28 : 12;
    this.arms.forEach((arm, index) => {
      const sign = index === 1 ? -1 : 1;
      arm.setRotationFromEuler(angle * sign, 0, arm.eulerAngles.z);
    });
  }

  attach(target: Node): void {
    if (this.hub) target.setParent(this.hub, true);
  }

  release(target: Node, parent: Node): void {
    target.setParent(parent, true);
  }

  async liftHalf(): Promise<void> {
    if (!this.hub) return;
    const midpoint = new Vec3();
    Vec3.lerp(midpoint, this.hub.position, this.home, 0.5);
    await this.moveHub(midpoint, 0.35);
  }

  async liftHome(): Promise<void> {
    await this.moveHub(this.home, 0.75);
  }

  open(): void {
    this.arms.forEach((arm) => arm.setRotationFromEuler(0, 0, arm.eulerAngles.z));
  }

  private moveHub(target: Vec3, duration: number): Promise<void> {
    return new Promise((resolve) => {
      // Promise 包装 tween，使协调器可以严格按状态顺序等待每段动画完成。
      tween(this.hub!).to(duration, { position: target }).call(resolve).start();
    });
  }
}
```

- [ ] **Step 3: 串联状态机、周期和目标判定**

Create `game/assets/scripts/prototype/prototype-coordinator.ts`:

```ts
import { _decorator, Component, Node, Vec3 } from 'cc';
import { GrabSession } from '../domain/grab-session';
import { PrototypeStore } from '../domain/prototype-store';
import { ClawController } from './claw-controller';
import { ClawRig } from './claw-rig';
import { DollTarget } from './doll-target';
import { MachineConfig } from './machine-config';

const { ccclass, property } = _decorator;

@ccclass('PrototypeCoordinator')
export class PrototypeCoordinator extends Component {
  @property(ClawController) controller: ClawController | null = null;
  @property(ClawRig) rig: ClawRig | null = null;
  @property(MachineConfig) config: MachineConfig | null = null;
  @property(Node) carriage: Node | null = null;
  @property(Node) dollsRoot: Node | null = null;

  readonly store = new PrototypeStore({ coins: 300, cost: 3, cycle: 5 });
  readonly session = new GrabSession();
  onChanged: (() => void) | null = null;
  onResult: ((won: boolean) => void) | null = null;

  start(): void {
    this.session.startMoving();
    this.onChanged?.();
  }

  async grab(): Promise<void> {
    if (this.session.state !== 'moving' || !this.rig || !this.carriage || !this.config) return;
    this.store.startAttempt();
    const drop = this.store.executeDrop();
    this.controller!.movementEnabled = false;
    this.session.startDropping();
    await this.rig.drop();
    this.session.startGrabbing();
    const target = this.findNearestTarget();
    const targetParent = target?.node.parent ?? null;
    const aimedCorrectly = target !== null;
    if (target) this.rig.attach(target.node);
    this.rig.close(drop.isStrong);
    this.session.startLifting();
    await this.rig.liftHalf();
    if (!drop.isStrong && target && targetParent) {
      // 弱爪在半空松开，让娃娃自然落回娃娃堆。
      this.rig.release(target.node, targetParent);
    }
    await this.rig.liftHome();
    this.session.startReturning();
    this.store.settleAttempt(drop.isStrong, aimedCorrectly);
    const won = drop.isStrong && aimedCorrectly;
    if (won && target) {
      // 样机用隐藏实例表示娃娃进入背包；完整版本再播放移动到出口的动画。
      target.node.active = false;
    } else if (target && targetParent && target.node.parent !== targetParent) {
      this.rig.release(target.node, targetParent);
    }
    this.rig.open();
    this.session.settle();
    this.onResult?.(won);
    this.session.reset();
    this.session.startMoving();
    this.controller!.movementEnabled = true;
    this.onChanged?.();
  }

  exchangePremium(): void {
    this.store.exchange('premium-star', 10);
    this.onChanged?.();
  }

  private findNearestTarget(): DollTarget | null {
    if (!this.dollsRoot || !this.carriage || !this.config) return null;
    const claw = this.carriage.worldPosition;
    let nearest: DollTarget | null = null;
    let nearestDistance = Number.POSITIVE_INFINITY;
    for (const child of this.dollsRoot.children) {
      const target = child.getComponent(DollTarget);
      if (!target) continue;
      // 样机只比较水平距离；后端阶段会改为标准化坐标和配置抓取区域。
      const dx = child.worldPosition.x - claw.x;
      const dz = child.worldPosition.z - claw.z;
      const distance = Math.sqrt(dx * dx + dz * dz);
      if (distance < nearestDistance) {
        nearest = target;
        nearestDistance = distance;
      }
    }
    return nearestDistance <= this.config.aimRadius ? nearest : null;
  }
}
```

- [ ] **Step 4: 加快样机周期并验证两种动画**

样机固定 `cycle: 5`，便于测试。连续执行五次：前四次必须夹起目标后在半空松开，第五次落点正确时目标必须保持到顶部并进入背包；第五次落点错误时必须失败且下一次重新进入弱爪周期。

Expected: 操作期间下爪按钮重复点击无效，动画严格按下降、闭合、上升、回位、结算顺序执行。

## Task 9: 完成本地 HUD、背包和兑换闭环

**Files:**
- Create: `game/assets/scripts/prototype/prototype-hud.ts`
- Modify through Cocos Editor: `game/assets/scenes/prototype.scene`

- [ ] **Step 1: 实现 HUD 数据刷新**

Create `game/assets/scripts/prototype/prototype-hud.ts`:

```ts
import { _decorator, Button, Component, Label, ProgressBar } from 'cc';
import { PrototypeCoordinator } from './prototype-coordinator';

const { ccclass, property } = _decorator;

@ccclass('PrototypeHud')
export class PrototypeHud extends Component {
  @property(PrototypeCoordinator) coordinator: PrototypeCoordinator | null = null;
  @property(Label) coinLabel: Label | null = null;
  @property(Label) dollCountLabel: Label | null = null;
  @property(Label) resultLabel: Label | null = null;
  @property(ProgressBar) chargeBar: ProgressBar | null = null;
  @property(Button) exchangeButton: Button | null = null;

  start(): void {
    if (!this.coordinator) return;
    this.coordinator.onChanged = () => this.refresh();
    this.coordinator.onResult = (won) => {
      if (this.resultLabel) this.resultLabel.string = won ? '抓取成功' : '再试一次';
    };
    this.refresh();
  }

  refresh(): void {
    if (!this.coordinator) return;
    const state = this.coordinator.store.snapshot();
    if (this.coinLabel) this.coinLabel.string = `游戏币 ${state.coins}`;
    if (this.dollCountLabel) this.dollCountLabel.string = `普通娃娃 ${state.ordinaryDolls}/10`;
    if (this.chargeBar) {
      this.chargeBar.progress = state.chargeStage === 'high' ? 0.9 : state.chargeStage === 'medium' ? 0.6 : 0.25;
    }
    if (this.exchangeButton) this.exchangeButton.interactable = state.ordinaryDolls >= 10;
  }

  exchange(): void {
    try {
      this.coordinator?.exchangePremium();
      if (this.resultLabel) this.resultLabel.string = '已获得精品娃娃';
    } catch {
      if (this.resultLabel) this.resultLabel.string = '普通娃娃数量不足';
    }
  }
}
```

- [ ] **Step 2: 绑定按钮与显示组件**

在编辑器中完成以下绑定：

- `GrabButton` 点击调用 `PrototypeCoordinator.grab()`。
- `CameraButton` 点击调用 `CameraSwitcher.toggle()`。
- 兑换按钮点击调用 `PrototypeHud.exchange()`。
- `CoinLabel`、`DollCountLabel`、`ChargeBar` 和 `ResultLabel` 绑定到 `PrototypeHud`。
- 为快速验收保留 `cycle: 5`，并将初始游戏币设为 `300`。

- [ ] **Step 3: 验证完整本地闭环**

连续获得 10 只普通娃娃并点击兑换。

Expected: 普通娃娃从 `10/10` 变为 `0/10`，界面提示获得 `premium-star`，兑换按钮重新禁用；重复点击不会得到第二只精品娃娃或出现负库存。

## Task 10: 性能、构建与验收

**Files:**
- Modify through Cocos Editor: `game/assets/scenes/prototype.scene`
- Generated build: `game/build/wechatgame/`

- [ ] **Step 1: 运行自动化回归测试**

Run:

```powershell
npm test
```

Expected: 15 个领域测试全部 PASS，无未处理异常。

- [ ] **Step 2: 检查模型资源规模**

在 Blender 统计中确认单只娃娃约 1500 至 4000 个三角面；机台、五只娃娃和场景装饰的总量保持在样机目标内。将同系列娃娃材质合并，贴图不超过 1024，玻璃不使用多层透明叠加。

Expected: 运行场景时 Draw Call、三角面数量和纹理内存没有随时间持续增长。

- [ ] **Step 3: 构建微信小游戏**

在 Cocos Creator 构建面板选择“微信小游戏”，目标目录设为 `game/build/wechatgame`，关闭调试模式并执行构建。

Expected: 构建成功，微信开发者工具可以导入输出目录，启动后没有缺失脚本、模型或材质。

- [ ] **Step 4: 执行真机验收清单**

- 摇杆移动没有明显延迟，松手立即停止。
- 正面和侧面镜头均能判断落点，不遮挡关键按钮。
- 普通爪与强爪表现有明显差异。
- 第五次强爪操作失误后，第六次恢复弱爪。
- 连续抓取 30 局没有卡死、重复结算或娃娃穿出机台。
- 10 个普通娃娃可以直接兑换精品娃娃。
- 中低端安卓设备交互期间保持可接受帧率，无持续内存上涨。
- 切后台再回来时，样机不会同时启动两段抓取动画。

- [ ] **Step 5: 记录样机验收结果**

在本计划末尾追加实际 Cocos Creator 版本、测试设备、平均帧率、峰值内存、发现的问题和是否允许进入阶段二。只记录真实测量值，不填写估算值。

## 阶段一完成条件

- 自动化测试全部通过。
- Blender 脚本可从空场景重复生成相同结构的样机资产。
- Cocos 编辑器、微信开发者工具和至少一台中低端安卓真机均完成验证。
- 抓取、强爪周期、入包、10 个兑换精品娃娃形成完整本地闭环。
- 没有阻断进入后端阶段的模型结构、性能或交互问题。
