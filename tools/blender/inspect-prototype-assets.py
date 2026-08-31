from pathlib import Path
import json

import bpy


ROOT = Path(__file__).resolve().parents[2]
GLB_PATH = ROOT / "game" / "assets" / "models" / "prototype" / "claw-prototype.glb"


def reset_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)


def main():
    if not GLB_PATH.exists():
        raise FileNotFoundError(f"GLB not found: {GLB_PATH}")

    reset_scene()
    bpy.ops.import_scene.gltf(filepath=str(GLB_PATH))

    triangle_count = 0
    for obj in bpy.context.scene.objects:
        if obj.type != "MESH":
            continue
        # 按导入后的实际网格统计三角面，避免生成脚本中的修改器估算与 GLB 成品不一致。
        obj.data.calc_loop_triangles()
        triangle_count += len(obj.data.loop_triangles)

    summary = {
        "names": sorted(obj.name for obj in bpy.context.scene.objects),
        "objectCount": len(bpy.context.scene.objects),
        "triangleCount": triangle_count,
        "fileSize": GLB_PATH.stat().st_size,
    }
    print(f"ASSET_CONTRACT={json.dumps(summary, ensure_ascii=True, separators=(',', ':'))}")


if __name__ == "__main__":
    main()
