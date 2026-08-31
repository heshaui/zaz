# Claw Machine Art Quality Sample Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a polished original claw-machine model with a visible prize chute and one premium rabbit plush sample, then connect the stable model nodes to the complete successful-delivery animation.

**Architecture:** Blender remains the single source of truth for geometry, materials, preview lighting, node names, `.blend`, preview PNG, and GLB export. Cocos keeps only runtime movement and settlement logic: `MachineConfig` owns coordinates, `ClawRig` owns mechanical animation, and `PrototypeCoordinator` sequences grab outcomes. This iteration reserves a physical coin-slot area but deliberately excludes the coin-in UI flow, additional animal variants, and weak-claw rigid-body tumbling.

**Tech Stack:** Blender 4.x Python API, glTF/GLB, Cocos Creator 3.x, TypeScript, Vitest

---

### Task 1: Lock the model contract with automated inspection

**Files:**
- Create: `tools/blender/inspect-prototype-assets.py`
- Create: `tests/prototype/blender-model-contract.test.ts`

- [ ] **Step 1: Write a failing contract test**

The test runs the inspector against the generated GLB and checks stable nodes `MachineRoot`, `ClawCarriage`, `ClawHub`, `ClawCable`, `ClawArm_0..2`, `PrizeChuteTarget`, `PrizeChuteEntry`, `Dolls`, and `DollRabbit`. It also checks that the inspector reports a positive triangle count and a bounded file size.

- [ ] **Step 2: Run the focused test and verify failure**

Run: `C:\nvm\v22.20.0\node.exe node_modules\vitest\vitest.mjs run tests/prototype/blender-model-contract.test.ts --reporter=dot`

Expected: FAIL because the inspector and new chute nodes do not exist yet.

- [ ] **Step 3: Implement the read-only GLB inspector**

Use Blender's import API in a small Python entry point. Print one compact JSON record containing node names, object count, triangle count, and file size; avoid dumping the full scene.

- [ ] **Step 4: Keep the test failing only on the missing model nodes**

Run the focused test again. Expected: the inspector executes successfully and assertions fail for `PrizeChuteTarget` or `PrizeChuteEntry`.

### Task 2: Refactor reusable Blender construction helpers

**Files:**
- Modify: `tools/blender/generate-prototype-assets.py`

- [ ] **Step 1: Add focused helpers**

Add helpers for cylinders, rounded capsules, curves, emissive materials, material noise, and mirrored decorative parts. Complex geometry generation receives concise Chinese comments explaining coordinate conventions and export constraints.

- [ ] **Step 2: Keep output names and paths stable**

Preserve `art/blender/claw-prototype.blend`, `art/renders/claw-prototype.png`, and `game/assets/models/prototype/claw-prototype.glb` so the existing Cocos prefab UUID remains usable after reimport.

### Task 3: Rebuild the cabinet and true prize chute

**Files:**
- Modify: `tools/blender/generate-prototype-assets.py`

- [ ] **Step 1: Replace the plain box silhouette**

Build a layered lower cabinet, rounded front pillars, inset control console, top marquee, trim, backboard, limited emissive light strips, and distinct painted-metal, plastic, glass, rubber, and dark-cavity materials.

- [ ] **Step 2: Model a real front-left chute**

Create a recessed opening with an outer frame, top lip, dark internal cavity, sloped ramp, receiving floor, and stable empty nodes named `PrizeChuteTarget` and `PrizeChuteEntry`. Leave actual volume in the deck and avoid representing the chute as a flat decal.

- [ ] **Step 3: Reserve the coin area**

Add a coin-slot plate and indicator on the console without adding any 3D joystick or grab button that would duplicate the later HUD controls.

### Task 4: Raise and refine the claw mechanism

**Files:**
- Modify: `tools/blender/generate-prototype-assets.py`

- [ ] **Step 1: Raise the idle hub**

Shorten the idle cable so `ClawHub` sits clearly below the rail and above every plush ear, while retaining enough drop travel to reach the plush heads.

- [ ] **Step 2: Improve the mechanism silhouette**

Add a carriage cover, cable spool, hub collar, three curved or segmented claw fingers, and contrasting rubber tips while preserving the existing animation pivots `ClawArm_0..2`.

### Task 5: Build the original rabbit plush sample

**Files:**
- Modify: `tools/blender/generate-prototype-assets.py`

- [ ] **Step 1: Replace the generic sphere doll**

Create a large rounded head, compressed pear-shaped torso, long slightly asymmetrical ears, short arms, broad feet, small tail, muzzle, and cheek pieces. Keep `DollRabbit` as the template root used by Cocos.

- [ ] **Step 2: Add plush-specific material language**

Use high roughness, subtle procedural color breakup and bump, separate inner-ear and paw materials, raised embroidered eyes/nose/mouth, and a restrained geometric seam around the head and torso. Ensure exported materials remain glTF-compatible.

- [ ] **Step 3: Keep only the rabbit as the displayed quality sample**

Remove the generic bear, cat, frog, and premium star from this art sample. Cocos can still create a full bed by cloning `DollRabbit`; later animal variants will be added after approval.

### Task 6: Produce a material-aware preview and export

**Files:**
- Modify: `tools/blender/generate-prototype-assets.py`
- Regenerate: `art/blender/claw-prototype.blend`
- Regenerate: `art/renders/claw-prototype.png`
- Regenerate: `game/assets/models/prototype/claw-prototype.glb`

- [ ] **Step 1: Switch preview rendering to Eevee**

Use a warm key light, cool fill, soft interior light, ambient world color, contact shadows, transparent glass settings, and a front three-quarter camera that clearly shows the rabbit, raised claw, console, and front-left chute.

- [ ] **Step 2: Generate all three artifacts**

Run Blender in background mode with `tools/blender/generate-prototype-assets.py` and expect one compact `ASSET_SUMMARY` line plus the three output paths.

- [ ] **Step 3: Inspect the rendered PNG**

Check that the model fills the frame, the chute is readable, glass does not obscure the plush, materials are not black, and no text or decoration copies the provided reference.

- [ ] **Step 4: Run the GLB contract test**

Run: `C:\nvm\v22.20.0\node.exe node_modules\vitest\vitest.mjs run tests/prototype/blender-model-contract.test.ts --reporter=dot`

Expected: PASS, with stable nodes present and the asset within the declared performance budget.

### Task 7: Define chute coordinates and rig transitions with TDD

**Files:**
- Modify: `game/assets/scripts/prototype/machine-config.ts`
- Modify: `game/assets/scripts/prototype/claw-rig.ts`
- Create: `tests/prototype/claw-delivery-contract.test.ts`

- [ ] **Step 1: Write the failing source contract**

Assert that `MachineConfig` exposes `prizeChutePosition`, and `ClawRig` exposes `moveToPrizeChute(position)`, `dropPrize(target, parent, landingPosition)`, and `returnTo(position)`.

- [ ] **Step 2: Run the focused test and verify failure**

Run: `C:\nvm\v22.20.0\node.exe node_modules\vitest\vitest.mjs run tests/prototype/claw-delivery-contract.test.ts --reporter=dot`

Expected: FAIL because the chute transition API does not exist.

- [ ] **Step 3: Implement the minimal animation API**

Keep hub vertical animation in `ClawRig`; move the carriage horizontally to the configured chute coordinate, animate the prize into the chute with a short fall and scale change, then return the carriage to its recorded play position. Explain transform-space conversions with Chinese comments.

- [ ] **Step 4: Run the focused test**

Expected: PASS.

### Task 8: Sequence successful delivery and delayed settlement

**Files:**
- Modify: `game/assets/scripts/prototype/prototype-coordinator.ts`
- Modify: `tests/prototype/claw-delivery-contract.test.ts`

- [ ] **Step 1: Add failing ordering assertions**

Check the success branch orders full lift, chute movement, claw opening, prize fall, settlement, and return before movement is re-enabled. Also retain the weak-claw half-lift release branch.

- [ ] **Step 2: Run the focused test and verify failure**

Expected: FAIL because a won target is currently hidden immediately after lift.

- [ ] **Step 3: Implement the coordinator sequence**

Capture the carriage play position before delivery. On success, lift fully, move to `prizeChutePosition`, open, animate the attached target into `PrizeChuteEntry`, settle only after the fall completes, return to the captured play position, and then restore controls. On failure, keep the current controlled drop-back behavior.

- [ ] **Step 4: Run the focused test**

Expected: PASS.

### Task 9: Full verification and Cocos handoff

**Files:**
- Verify: `art/renders/claw-prototype.png`
- Verify: `game/assets/models/prototype/claw-prototype.glb`
- Verify: `game/assets/scenes/prototype.scene`

- [ ] **Step 1: Run all tests**

Run: `C:\nvm\v22.20.0\node.exe node_modules\vitest\vitest.mjs run --reporter=dot`

Expected: all tests PASS.

- [ ] **Step 2: Run TypeScript checking**

Run: `C:\nvm\v22.20.0\node.exe node_modules\typescript\bin\tsc --noEmit -p tsconfig.logic.json`

Expected: exit code 0 with no diagnostics.

- [ ] **Step 3: Inspect generated asset metrics**

Run the Blender inspector and confirm all required node names, a sensible non-zero triangle count, and a GLB size suitable for a mini-game prototype.

- [ ] **Step 4: State the remaining manual check accurately**

Ask the user to let Cocos reimport the same GLB path and inspect the model in `assets/scenes/prototype`. Do not claim Cocos editor or WeChat-device validation unless it was actually performed.

## Explicitly Deferred

- The opening coin-in UI flow and dynamically configured coin price; only the physical coin-slot area is modeled now.
- Rabbit-derived cat, dog, and cow variants until the rabbit sample is approved.
- Weak-claw bounce, rolling, flipping, soft-body simulation, and rigid-body collision tuning.
- Final texture atlas compression and WeChat subpackage organization.

