from pathlib import Path
import argparse
import json
import sys

import bpy


ROOT = Path(__file__).resolve().parents[2]
MACHINE_IDS = {"moon-rabbit", "strawberry-cat"}


def parse_machine_id():
    script_args = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    parser = argparse.ArgumentParser()
    parser.add_argument("--machine", choices=sorted(MACHINE_IDS), required=True)
    return parser.parse_args(script_args).machine


def reset_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)


def mesh_descendant_count(root):
    count = 1 if root.type == "MESH" else 0
    for child in root.children:
        count += mesh_descendant_count(child)
    return count


def main():
    machine_id = parse_machine_id()
    glb_path = ROOT / "game" / "assets" / "models" / "machines" / f"{machine_id}.glb"
    if not glb_path.exists():
        raise FileNotFoundError(f"GLB not found: {glb_path}")

    reset_scene()
    bpy.ops.import_scene.gltf(filepath=str(glb_path))

    triangle_count = 0
    for obj in bpy.context.scene.objects:
        if obj.type != "MESH":
            continue
        # 按导入后的实际网格统计三角面，避免生成脚本中的修改器估算与 GLB 成品不一致。
        obj.data.calc_loop_triangles()
        triangle_count += len(obj.data.loop_triangles)

    dolls_root = bpy.data.objects.get("Dolls")
    doll_part_counts = {}
    if dolls_root:
        # 只统计四个运行时模板下的网格，预览用娃娃不参与游戏资源验收。
        for child in dolls_root.children:
            if child.name in {"DollRabbit", "DollCat", "DollDog", "DollCow"}:
                doll_part_counts[child.name] = mesh_descendant_count(child)

    summary = {
        "names": sorted(obj.name for obj in bpy.context.scene.objects),
        "objectCount": len(bpy.context.scene.objects),
        "triangleCount": triangle_count,
        "fileSize": glb_path.stat().st_size,
        "dollPartCounts": doll_part_counts,
    }
    print(f"ASSET_CONTRACT={json.dumps(summary, ensure_ascii=True, separators=(',', ':'))}")


if __name__ == "__main__":
    main()
