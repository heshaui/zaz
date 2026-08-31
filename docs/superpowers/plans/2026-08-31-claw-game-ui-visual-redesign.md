# 星愿抓抓屋主界面视觉改版实施计划

> **For agentic workers:** 按任务顺序在当前工作区内完成；本项目明确不进行版本提交。

**Goal:** 让 Cocos 首页与投币后的操作界面贴近已确认视觉稿，同时保留现有三维机台、玩法状态和动态数据显示。

**Architecture:** 领域层提供纯布局、镜头和可见性规则，Cocos 组件只负责节点绘制、事件绑定与状态映射。`ui-drawing.ts` 统一提供深色机身、灯牌、信息条、提示牌和实体操作台绘制，`HomePanel` 与 `GameConsole` 组合这些视觉单元，`GameUiRoot` 继续作为唯一界面总控。

**Tech Stack:** Cocos Creator 3.x、TypeScript、Vitest

**Spec:** `docs/superpowers/specs/2026-08-31-claw-game-ui-design.md`

## Global Constraints

- 设计分辨率固定为 `720 x 1280`，竖屏优先。
- 不改变投币、移动、下爪、结算、整批补充和兑换规则。
- 不显示力度、隐藏目标或周期信息。
- 不调整本机 Node 环境。
- 较难理解的逻辑使用中文注释。
- 不进行版本提交。

---

### Task 1: 固化视觉布局和界面可见性

**Files:**
- Modify: `tests/domain/portrait-layout.test.ts`
- Modify: `tests/domain/camera-framing.test.ts`
- Create: `tests/domain/game-ui-visibility.test.ts`
- Modify: `game/assets/scripts/domain/portrait-layout.ts`
- Modify: `game/assets/scripts/domain/camera-framing.ts`
- Create: `game/assets/scripts/domain/game-ui-visibility.ts`

**Interfaces:**
- Produces: `resolvePortraitLayout()` 的稳定区域数据
- Produces: `getMachineCameraProfile(mode)`
- Produces: `resolveGameUiVisibility(flow)`

- [ ] 先写首页、游戏页区域比例和可见性用例。
- [ ] 单独运行新增用例并确认旧实现无法满足。
- [ ] 增加最小领域实现并复跑相关用例。

### Task 2: 建立统一街机机身绘制能力

**Files:**
- Modify: `game/assets/scripts/ui/ui-theme.ts`
- Modify: `game/assets/scripts/ui/ui-drawing.ts`
- Modify: `tests/domain/ui-theme.test.ts`

**Interfaces:**
- Produces: `drawMachineShell()`
- Produces: `drawMarqueeSign()`
- Produces: `drawTopStatusBar()`
- Produces: `drawInstructionSign()`
- Produces: 深色版 `drawConsoleDeck()`

- [ ] 先增加关键尺寸和色彩角色用例。
- [ ] 单独运行用例并确认新增约束尚未满足。
- [ ] 用硬边框、短投影和灯带完成共用绘制函数。
- [ ] 复跑主题与布局用例。

### Task 3: 重做首页和游戏操作台

**Files:**
- Modify: `game/assets/scripts/ui/home-panel.ts`
- Modify: `game/assets/scripts/ui/game-console.ts`
- Modify: `game/assets/scripts/ui/game-ui-root.ts`

**Interfaces:**
- Consumes: `PrototypeHudView`
- Consumes: `resolveGameUiVisibility(flow)`
- Preserves: `HomePanelActions`、`GameConsoleActions`

- [ ] 首页改为紫色灯牌、内嵌双计数器、三维窗口外框和底部投币台。
- [ ] 游戏页顶部只保留返回、余额、普通娃娃数量和视角入口。
- [ ] 黄色提示牌位于三维窗口上沿，底部改为深色实体操作台。
- [ ] 未投币时只显示费用与投币按钮，投币后才显示摇杆和下爪按钮。
- [ ] 保留原事件接口，避免改动玩法层。

### Task 4: 拉开首页与游戏镜头差异

**Files:**
- Modify: `game/assets/scripts/domain/camera-framing.ts`
- Modify: `game/assets/scripts/prototype/camera-switcher.ts`
- Modify: `tests/domain/camera-framing.test.ts`

**Interfaces:**
- `home`: 三分之四展示、完整机台、较宽边距
- `play`: 正面轻微俯视、三维窗口占比更高

- [ ] 用测试定义两种模式的边距、俯视角和水平角。
- [ ] 让 `CameraSwitcher.setMode()` 同时切换构图参数与默认视角。
- [ ] 保留侧面视角按钮，并确保返回首页时恢复展示镜头。

### Task 5: 完整校验与画面核对

**Files:**
- Modify only when required: Tasks 1-4 touched files

- [ ] 运行 `npm test`。
- [ ] 运行 `npx tsc -p tsconfig.logic.json --noEmit`。
- [ ] 运行 `npx tsc -p game/tsconfig.json --noEmit`。
- [ ] 在 `http://localhost:7456/` 核对首页、投币后界面和弹层关闭流程。
- [ ] 只按实际画面微调位置、字号和尺寸，不改变玩法规则。

## 完成条件

- 首页和游戏页都呈现一体式深色机身结构。
- 三维机台是首屏主体，首页完整展示，游戏页稍微俯视。
- 未投币与已投币控件严格按流程切换。
- 顶部信息没有重复余额。
- 结果层出现前后仍能正常操作和关闭。
- 自动测试与两套 TypeScript 检查通过。
