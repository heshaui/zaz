from pathlib import Path
import math

import bpy
from mathutils import Vector


ROOT = Path(__file__).resolve().parents[2]
MACHINE_OUTPUTS = (
    {
        "id": "moon-rabbit",
        "theme": "moon",
        "species": "rabbit",
        "blend": ROOT / "art" / "blender" / "moon-rabbit.blend",
        "render": ROOT / "art" / "renders" / "moon-rabbit.png",
        "glb": ROOT / "game" / "assets" / "models" / "machines" / "moon-rabbit.glb",
    },
    {
        "id": "strawberry-cat",
        "theme": "cat",
        "species": "cat",
        "blend": ROOT / "art" / "blender" / "strawberry-cat.blend",
        "render": ROOT / "art" / "renders" / "strawberry-cat.png",
        "glb": ROOT / "game" / "assets" / "models" / "machines" / "strawberry-cat.glb",
    },
)


def reset_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    # 先清理失去对象引用的几何数据，再清理材质，避免反复生成时旧材质仍被孤立网格占用。
    for datablocks in (bpy.data.meshes, bpy.data.curves, bpy.data.cameras, bpy.data.lights, bpy.data.materials):
        for datablock in list(datablocks):
            if datablock.users == 0:
                datablocks.remove(datablock)
    for image in list(bpy.data.images):
        if image.name.startswith("FabricNormal") and image.users == 0:
            bpy.data.images.remove(image)


def create_empty(name, location=(0.0, 0.0, 0.0), parent=None):
    obj = bpy.data.objects.new(name, None)
    bpy.context.collection.objects.link(obj)
    obj.parent = parent
    obj.location = location
    return obj


def set_socket(node, names, value):
    for name in names:
        socket = node.inputs.get(name)
        if socket is not None:
            socket.default_value = value
            return


def create_material(
    name,
    color,
    metallic=0.0,
    roughness=0.55,
    alpha=1.0,
    emission=None,
    emission_strength=0.0,
    transmission=0.0,
):
    material = bpy.data.materials.new(name)
    material.diffuse_color = (*color, alpha)
    material.use_nodes = True
    principled = material.node_tree.nodes.get("Principled BSDF")
    set_socket(principled, ("Base Color",), (*color, 1.0))
    set_socket(principled, ("Metallic",), metallic)
    set_socket(principled, ("Roughness",), roughness)
    set_socket(principled, ("Alpha",), alpha)
    set_socket(principled, ("Transmission Weight", "Transmission"), transmission)
    if emission is not None:
        set_socket(principled, ("Emission Color", "Emission"), (*emission, 1.0))
        set_socket(principled, ("Emission Strength",), emission_strength)
    if alpha < 1.0:
        if hasattr(material, "surface_render_method"):
            material.surface_render_method = "BLENDED"
        elif hasattr(material, "blend_method"):
            material.blend_method = "BLEND"
        material.use_transparency_overlap = False
    return material


def create_fabric_normal_image(size=128):
    image = bpy.data.images.new("FabricNormal", width=size, height=size, alpha=True)
    pixels = []
    for y in range(size):
        for x in range(size):
            # 两组交错细线模拟短绒布纤维，法线幅度很小，近景有织物感但不会产生粗糙砂面。
            nx = math.sin((x + y * 0.17) * 1.85) * 0.12
            ny = math.sin((y - x * 0.13) * 1.72) * 0.12
            nz = math.sqrt(max(0.001, 1.0 - nx * nx - ny * ny))
            pixels.extend((0.5 + nx * 0.5, 0.5 + ny * 0.5, 0.5 + nz * 0.5, 1.0))
    image.pixels.foreach_set(pixels)
    image.colorspace_settings.name = "Non-Color"
    image.pack()
    return image


def apply_fabric_normal(material, image, strength=0.28):
    nodes = material.node_tree.nodes
    links = material.node_tree.links
    principled = nodes.get("Principled BSDF")
    texture_coordinates = nodes.new("ShaderNodeTexCoord")
    texture_coordinates.name = "FabricTextureCoordinates"
    texture = nodes.new("ShaderNodeTexImage")
    texture.name = "FabricNormalTexture"
    texture.image = image
    texture.interpolation = "Linear"
    normal_map = nodes.new("ShaderNodeNormalMap")
    normal_map.name = "FabricNormalMap"
    normal_map.inputs["Strength"].default_value = strength
    # UV 连接让织物法线沿球体表面展开；未连接时整件娃娃只会采样同一个像素。
    links.new(texture_coordinates.outputs["UV"], texture.inputs["Vector"])
    links.new(texture.outputs["Color"], normal_map.inputs["Color"])
    links.new(normal_map.outputs["Normal"], principled.inputs["Normal"])


def add_cube(name, location, dimensions, material, parent=None, bevel=0.04, rotation=(0.0, 0.0, 0.0)):
    bpy.ops.mesh.primitive_cube_add(location=(0.0, 0.0, 0.0))
    obj = bpy.context.object
    obj.name = name
    obj.parent = parent
    obj.location = location
    obj.rotation_euler = rotation
    obj.dimensions = dimensions
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(material)
    if bevel > 0:
        modifier = obj.modifiers.new(name="RoundedEdges", type="BEVEL")
        modifier.width = bevel
        modifier.segments = 3
    return obj


def add_sphere(name, location, scale, material, parent=None, rotation=(0.0, 0.0, 0.0), segments=24):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments, ring_count=max(12, segments // 2), location=(0.0, 0.0, 0.0))
    obj = bpy.context.object
    obj.name = name
    obj.parent = parent
    obj.location = location
    obj.rotation_euler = rotation
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(material)
    for polygon in obj.data.polygons:
        polygon.use_smooth = True
    return obj


def add_cylinder(name, location, radius, depth, material, parent=None, rotation=(0.0, 0.0, 0.0), vertices=24, bevel=0.025):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=(0.0, 0.0, 0.0))
    obj = bpy.context.object
    obj.name = name
    obj.parent = parent
    obj.location = location
    obj.rotation_euler = rotation
    obj.data.materials.append(material)
    if bevel > 0:
        modifier = obj.modifiers.new(name="RoundedRim", type="BEVEL")
        modifier.width = bevel
        modifier.segments = 2
    for polygon in obj.data.polygons:
        polygon.use_smooth = True
    return obj


def add_cone(name, location, radius, depth, material, parent=None, rotation=(0.0, 0.0, 0.0), vertices=16):
    bpy.ops.mesh.primitive_cone_add(vertices=vertices, radius1=radius, radius2=0.0, depth=depth, location=(0.0, 0.0, 0.0))
    obj = bpy.context.object
    obj.name = name
    obj.parent = parent
    obj.location = location
    obj.rotation_euler = rotation
    obj.data.materials.append(material)
    bevel = obj.modifiers.new(name="SoftCone", type="BEVEL")
    bevel.width = min(radius, depth) * 0.12
    bevel.segments = 3
    for polygon in obj.data.polygons:
        polygon.use_smooth = True
    return obj


def add_torus(name, location, major_radius, minor_radius, material, parent=None, rotation=(0.0, 0.0, 0.0), major_segments=32):
    bpy.ops.mesh.primitive_torus_add(major_radius=major_radius, minor_radius=minor_radius, major_segments=major_segments, minor_segments=8, location=(0.0, 0.0, 0.0))
    obj = bpy.context.object
    obj.name = name
    obj.parent = parent
    obj.location = location
    obj.rotation_euler = rotation
    obj.data.materials.append(material)
    for polygon in obj.data.polygons:
        polygon.use_smooth = True
    return obj


def add_curve(name, points, bevel_depth, material, parent=None, cyclic=False):
    curve = bpy.data.curves.new(name=f"{name}Curve", type="CURVE")
    curve.dimensions = "3D"
    curve.resolution_u = 2
    curve.bevel_depth = bevel_depth
    curve.bevel_resolution = 3
    spline = curve.splines.new("BEZIER")
    spline.bezier_points.add(len(points) - 1)
    for point, coordinate in zip(spline.bezier_points, points):
        point.co = coordinate
        point.handle_left_type = "AUTO"
        point.handle_right_type = "AUTO"
    spline.use_cyclic_u = cyclic
    obj = bpy.data.objects.new(name, curve)
    bpy.context.collection.objects.link(obj)
    obj.parent = parent
    obj.data.materials.append(material)
    return obj


def add_star(name, location, scale, material, parent=None, depth=0.06):
    vertices = []
    for y in (-depth, depth):
        for index in range(10):
            radius = 1.0 if index % 2 == 0 else 0.46
            angle = math.radians(90.0 + index * 36.0)
            vertices.append((math.cos(angle) * radius, y, math.sin(angle) * radius))
    faces = [tuple(range(9, -1, -1)), tuple(range(10, 20))]
    for index in range(10):
        following = (index + 1) % 10
        faces.append((index, following, following + 10, index + 10))
    mesh = bpy.data.meshes.new(f"{name}Mesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    obj.parent = parent
    obj.location = location
    obj.scale = scale
    obj.data.materials.append(material)
    bevel = obj.modifiers.new(name="SoftStar", type="BEVEL")
    bevel.width = 0.06
    bevel.segments = 3
    return obj


def create_palette(theme):
    cat_theme = theme == "cat"
    navy = (0.09, 0.035, 0.055) if cat_theme else (0.025, 0.065, 0.10)
    teal = (0.025, 0.66, 0.64) if cat_theme else (0.025, 0.62, 0.64)
    mint = (0.44, 0.92, 0.79) if cat_theme else (0.40, 0.92, 0.78)
    coral = (0.94, 0.29, 0.34) if cat_theme else (1.0, 0.27, 0.38)
    pink = (1.0, 0.66, 0.72) if cat_theme else (1.0, 0.55, 0.67)
    purple = (0.42, 0.16, 0.31) if cat_theme else (0.44, 0.30, 0.74)
    return {
        "navy": create_material("DeepNavy", navy, metallic=0.2, roughness=0.28),
        "teal": create_material("CabinetTeal", teal, metallic=0.12, roughness=0.32),
        "mint": create_material("CabinetMint", mint, roughness=0.4),
        "coral": create_material("CabinetCoral", coral, roughness=0.34),
        "pink": create_material("CabinetPink", pink, roughness=0.42),
        "cream": create_material("WarmCream", (0.96, 0.94, 0.84), roughness=0.52),
        "yellow": create_material("AccentYellow", (1.0, 0.72, 0.10), roughness=0.38),
        "purple": create_material("AccentPurple", purple, roughness=0.4),
        "metal": create_material("ClawMetal", (0.55, 0.63, 0.69), metallic=0.9, roughness=0.18),
        "dark_metal": create_material("DarkMetal", (0.08, 0.12, 0.16), metallic=0.7, roughness=0.25),
        "rubber": create_material("ClawRubber", (0.045, 0.055, 0.065), roughness=0.78),
        "cavity": create_material("PrizeCavity", (0.012, 0.022, 0.032), roughness=0.88),
        "glass": create_material("CabinetGlass", (0.52, 0.90, 0.98), roughness=0.12, alpha=0.08, transmission=0.0),
        "chute_glass": create_material("PrizeFlapGlass", (0.46, 0.88, 0.94), roughness=0.16, alpha=0.30, transmission=0.0),
        "guard_glass": create_material("PrizeGuardGlass", (0.50, 0.90, 0.96), roughness=0.14, alpha=0.20, transmission=0.0),
        "light": create_material("WarmLight", (1.0, 0.91, 0.62), roughness=0.3, emission=(1.0, 0.72, 0.28), emission_strength=3.0),
        "cyan_light": create_material("CyanLight", (0.12, 0.88, 0.95), roughness=0.28, emission=(0.05, 0.72, 0.85), emission_strength=2.5),
    }


def create_prize_chute(machine, palette):
    chute = create_empty("PrizeChute", parent=machine)
    x = -1.22
    y = -1.56
    add_cube("ChuteCavityBack", (x, -0.70, 0.65), (1.22, 0.10, 0.78), palette["cavity"], chute, 0.03)
    add_cube("ChuteCavityLeft", (x - 0.61, -1.12, 0.65), (0.08, 0.92, 0.78), palette["cavity"], chute, 0.025)
    add_cube("ChuteCavityRight", (x + 0.61, -1.12, 0.65), (0.08, 0.92, 0.78), palette["cavity"], chute, 0.025)
    add_cube("ChuteRamp", (x, -1.02, 0.57), (1.16, 1.0, 0.09), palette["navy"], chute, 0.025, rotation=(math.radians(-14), 0.0, 0.0))
    add_cube("ChuteFrameTop", (x, y - 0.07, 1.04), (1.52, 0.22, 0.18), palette["cream"], chute, 0.08)
    add_cube("ChuteFrameBottom", (x, y - 0.07, 0.25), (1.52, 0.22, 0.18), palette["cream"], chute, 0.08)
    add_cube("ChuteFrameLeft", (x - 0.68, y - 0.07, 0.65), (0.18, 0.22, 0.76), palette["cream"], chute, 0.07)
    add_cube("ChuteFrameRight", (x + 0.68, y - 0.07, 0.65), (0.18, 0.22, 0.76), palette["cream"], chute, 0.07)
    add_cube("ChuteInnerLip", (x, y - 0.18, 0.94), (1.26, 0.12, 0.10), palette["coral"], chute, 0.04)

    # 挡板以自身上沿为枢轴，后续只需旋转 Pivot 就能表现娃娃从内侧将它顶开。
    flap_pivot = create_empty("PrizeChuteFlapPivot", (x, y - 0.19, 0.94), chute)
    add_cube("PrizeChuteFlap", (0.0, 0.0, -0.31), (1.18, 0.045, 0.58), palette["chute_glass"], flap_pivot, 0.055)
    add_cylinder("ChuteFlapHingeL", (-0.43, 0.0, 0.0), 0.052, 0.20, palette["metal"], flap_pivot, rotation=(0.0, math.radians(90), 0.0), vertices=20, bevel=0.012)
    add_cylinder("ChuteFlapHingeR", (0.43, 0.0, 0.0), 0.052, 0.20, palette["metal"], flap_pivot, rotation=(0.0, math.radians(90), 0.0), vertices=20, bevel=0.012)

    # 横向挡板贴住出货孔的机舱内沿，右侧挡板向玩家方向延伸；左侧直接复用机身玻璃。
    guard = create_empty("PrizeChuteGuardRoot", parent=chute)
    guard_z = 1.69
    add_cube("PrizeChuteGuardFront", (x, -0.48, guard_z), (1.18, 0.035, 0.76), palette["guard_glass"], guard, 0.025)
    add_cube("PrizeChuteGuardRight", (x + 0.59, -0.94, guard_z), (0.035, 0.92, 0.76), palette["guard_glass"], guard, 0.025)
    add_cube("PrizeChuteGuardFrontTop", (x, -0.48, 2.08), (1.22, 0.055, 0.045), palette["mint"], guard, 0.018)
    add_cube("PrizeChuteGuardRightTop", (x + 0.59, -0.94, 2.08), (0.055, 0.92, 0.045), palette["mint"], guard, 0.018)
    create_empty("PrizeChuteTarget", (x, -0.92, 3.78), machine)
    create_empty("PrizeChuteEntry", (x, -1.05, 1.10), machine)


def create_lower_cabinet(machine, palette):
    # 前板拆成多个实体，为左下出货口留出真实空间，而不是在整块外壳上贴一个深色平面。
    add_cube("BasePlinth", (0.0, 0.0, 0.13), (4.55, 3.42, 0.26), palette["navy"], machine, 0.10)
    add_cube("BaseSideL", (-2.12, 0.0, 0.66), (0.28, 3.18, 0.92), palette["teal"], machine, 0.10)
    add_cube("BaseSideR", (2.12, 0.0, 0.66), (0.28, 3.18, 0.92), palette["teal"], machine, 0.10)
    add_cube("BaseBack", (0.0, 1.48, 0.66), (4.0, 0.24, 0.92), palette["teal"], machine, 0.08)
    add_cube("BaseFrontLeft", (-2.00, -1.55, 0.66), (0.28, 0.22, 0.92), palette["teal"], machine, 0.08)
    add_cube("BaseFrontRight", (0.78, -1.55, 0.66), (2.62, 0.22, 0.92), palette["teal"], machine, 0.08)
    add_cube("BaseInnerFloor", (0.0, 0.0, 0.25), (3.95, 2.95, 0.12), palette["navy"], machine, 0.05)
    create_prize_chute(machine, palette)

    # 控制台只保留投币面板和状态灯，摇杆与按钮由后续界面在投币后显示。
    console = add_cube("ControlConsole", (0.78, -1.72, 1.09), (2.45, 0.58, 0.32), palette["cream"], machine, 0.11, rotation=(math.radians(8), 0.0, 0.0))
    add_cube("ConsoleInset", (0.42, -0.30, 0.01), (1.36, 0.16, 0.08), palette["navy"], console, 0.04)
    add_cube("CoinPlate", (0.88, -0.31, -0.02), (0.42, 0.17, 0.20), palette["dark_metal"], console, 0.04)
    add_cube("CoinSlot", (0.88, -0.405, 0.005), (0.18, 0.035, 0.035), palette["yellow"], console, 0.012)
    add_cylinder("CoinIndicator", (1.08, -0.407, 0.005), 0.055, 0.035, palette["cyan_light"], console, rotation=(math.radians(90), 0.0, 0.0), vertices=20, bevel=0.01)


def create_play_deck(machine, palette):
    # 底板围绕出货孔分片搭建，孔洞中心与 PrizeChuteEntry 对齐。
    add_cube("DeckRear", (0.0, 0.42, 1.27), (4.02, 1.85, 0.16), palette["cream"], machine, 0.05)
    add_cube("DeckFrontRight", (0.58, -1.02, 1.27), (2.86, 0.98, 0.16), palette["cream"], machine, 0.05)
    add_cube("DeckFrontLeft", (-1.92, -1.02, 1.27), (0.48, 0.98, 0.16), palette["cream"], machine, 0.05)
    add_cube("DeckHoleBack", (-1.22, -0.48, 1.28), (1.18, 0.12, 0.20), palette["coral"], machine, 0.035)
    add_cube("DeckHoleLeft", (-1.84, -1.02, 1.28), (0.12, 0.96, 0.20), palette["coral"], machine, 0.035)
    add_cube("DeckHoleRight", (-0.60, -1.02, 1.28), (0.12, 0.96, 0.20), palette["coral"], machine, 0.035)
    add_cube("DeckTrimFront", (0.62, -1.50, 1.32), (2.86, 0.10, 0.24), palette["pink"], machine, 0.04)
    add_cube("DeckTrimBack", (0.0, 1.44, 1.32), (4.10, 0.10, 0.24), palette["teal"], machine, 0.04)


def create_backboard(machine, palette, theme):
    board = create_empty("ThemeBackboard", parent=machine)
    add_cube("BackboardPanel", (0.0, 1.50, 3.04), (3.86, 0.12, 3.25), palette["navy"], board, 0.06)
    add_cube("BackboardInset", (0.0, 1.42, 3.04), (3.56, 0.06, 2.94), palette["purple"], board, 0.05)
    if theme == "cat":
        strawberry = create_empty("StrawberryBackboard", parent=board)
        add_sphere("StrawberryFruit", (-1.02, 1.33, 3.40), (0.62, 0.055, 0.72), palette["coral"], strawberry, segments=28)
        add_cone("StrawberryLeafL", (-1.28, 1.31, 4.04), 0.20, 0.42, palette["mint"], strawberry, rotation=(0.0, math.radians(-28), 0.0), vertices=16)
        add_cone("StrawberryLeafR", (-0.78, 1.31, 4.04), 0.20, 0.42, palette["mint"], strawberry, rotation=(0.0, math.radians(28), 0.0), vertices=16)
        for index, (x, z) in enumerate(((-1.24, 3.58), (-0.98, 3.73), (-0.76, 3.48), (-1.12, 3.22), (-0.84, 3.10))):
            add_sphere(f"StrawberrySeed_{index}", (x, 1.26, z), (0.045, 0.018, 0.07), palette["yellow"], strawberry, segments=12)

        yarn = create_empty("YarnBallBackboard", parent=board)
        add_sphere("YarnBall", (0.92, 1.33, 3.05), (0.72, 0.055, 0.72), palette["teal"], yarn, segments=28)
        add_curve("YarnThreadA", [(0.35, 1.25, 3.16), (0.70, 1.24, 3.48), (1.30, 1.24, 3.34), (1.48, 1.25, 2.92)], 0.025, palette["cream"], yarn)
        add_curve("YarnThreadB", [(0.50, 1.24, 2.72), (0.82, 1.23, 3.02), (1.18, 1.23, 2.68), (1.55, 1.24, 2.86)], 0.025, palette["pink"], yarn)
        add_curve("YarnLooseEnd", [(1.38, 1.25, 2.60), (1.62, 1.23, 2.34), (1.30, 1.24, 2.16), (0.78, 1.25, 2.28)], 0.032, palette["cyan_light"], yarn)
        return

    # 原创图案只使用星星、圆弧和云朵轮廓，避免复刻参考图中的角色与文字。
    add_cylinder("BackdropMoon", (-1.12, 1.365, 3.55), 0.68, 0.07, palette["yellow"], board, rotation=(math.radians(90), 0.0, 0.0), vertices=40, bevel=0.03)
    add_cylinder("BackdropMoonCut", (-0.88, 1.32, 3.75), 0.60, 0.075, palette["purple"], board, rotation=(math.radians(90), 0.0, 0.0), vertices=40, bevel=0.03)
    add_star("BackdropStarA", (0.72, 1.32, 3.58), (0.38, 0.38, 0.38), palette["mint"], board)
    add_star("BackdropStarB", (1.33, 1.32, 2.68), (0.22, 0.22, 0.22), palette["pink"], board)
    add_cylinder("BackdropBubbleA", (0.42, 1.34, 2.38), 0.34, 0.07, palette["teal"], board, rotation=(math.radians(90), 0.0, 0.0), vertices=32, bevel=0.03)
    add_cylinder("BackdropBubbleB", (0.90, 1.34, 2.24), 0.24, 0.07, palette["mint"], board, rotation=(math.radians(90), 0.0, 0.0), vertices=32, bevel=0.03)
    add_curve("BackdropOrbit", [(-1.55, 1.30, 2.22), (-0.55, 1.27, 2.05), (0.25, 1.28, 2.18), (1.62, 1.30, 2.02)], 0.035, palette["cyan_light"], board)


def create_claw(machine, palette):
    rail_x = add_cube("RailX", (0.0, 0.0, 4.58), (3.60, 0.18, 0.18), palette["metal"], machine, 0.035)
    rail_z = add_cube("RailZ", (0.0, 0.0, -0.10), (0.18, 2.34, 0.18), palette["metal"], rail_x, 0.035)
    carriage = create_empty("ClawCarriage", (0.35, 0.08, -0.12), rail_z)
    add_cube("CarriageShell", (0.0, 0.0, 0.0), (0.54, 0.54, 0.34), palette["coral"], carriage, 0.10)
    add_cube("CarriageBand", (0.0, -0.22, -0.01), (0.38, 0.08, 0.20), palette["cream"], carriage, 0.035)
    add_cylinder("CableSpool", (0.0, 0.0, -0.18), 0.18, 0.28, palette["dark_metal"], carriage, rotation=(math.radians(90), 0.0, 0.0), vertices=24)
    add_cube("ClawCable", (0.0, 0.0, -0.28), (0.045, 0.045, 0.35), palette["dark_metal"], carriage, 0.0)
    hub = add_sphere("ClawHub", (0.0, 0.0, -0.48), (0.24, 0.24, 0.19), palette["metal"], carriage, segments=24)
    add_torus("HubCollar", (0.0, 0.0, 0.02), 0.19, 0.035, palette["coral"], hub)

    for index, angle in enumerate((0.0, 120.0, 240.0)):
        pivot = create_empty(f"ClawArm_{index}", (0.0, 0.0, -0.03), hub)
        pivot.rotation_euler = (0.0, 0.0, math.radians(angle))
        # 每根爪臂由两段圆润金属杆和防滑爪尖构成，枢轴名称保持给 Cocos 动画使用。
        add_curve("ArmMesh", [(0.0, 0.0, 0.0), (0.18, 0.0, -0.28), (0.28, 0.0, -0.61), (0.19, 0.0, -0.78)], 0.042, palette["metal"], pivot)
        add_sphere("ArmJoint", (0.26, 0.0, -0.58), (0.075, 0.065, 0.075), palette["dark_metal"], pivot, segments=16)
        add_sphere("ArmTip", (0.17, 0.0, -0.81), (0.075, 0.065, 0.10), palette["rubber"], pivot, rotation=(0.0, math.radians(-22), 0.0), segments=16)


def create_upper_cabinet(machine, palette, theme):
    create_backboard(machine, palette, theme)
    post_z = 3.08
    for x, side in ((-2.05, "L"), (2.05, "R")):
        for y, depth in ((-1.48, "F"), (1.48, "B")):
            add_cube(f"Post_{side}_{depth}_Core", (x, y, post_z), (0.28, 0.28, 3.60), palette["cream"], machine, 0.07)
            add_cube(f"Post_{side}_{depth}_Trim", (x, y - 0.035, post_z), (0.13, 0.31, 3.38), palette["teal" if side == "L" else "coral"], machine, 0.045)

    # 游戏正面保持开放，避免低透明度玻璃在小程序渲染端变成遮挡内部的大色块。
    add_cube("GlassLeft", (-2.035, 0.0, 3.06), (0.025, 2.70, 3.30), palette["glass"], machine, 0.0)
    add_cube("GlassRight", (2.035, 0.0, 3.06), (0.025, 2.70, 3.30), palette["glass"], machine, 0.0)
    add_cube("TopLowerTrim", (0.0, 0.0, 4.91), (4.48, 3.40, 0.22), palette["navy"], machine, 0.08)
    add_cube("TopCanopy", (0.0, 0.0, 5.17), (4.66, 3.56, 0.48), palette["coral"], machine, 0.14)
    add_cube("TopAccent", (0.0, -1.74, 5.14), (4.05, 0.14, 0.28), palette["pink"], machine, 0.07)
    add_cube("MarqueeShell", (0.0, -1.88, 5.42), (2.65, 0.22, 0.62), palette["cream"], machine, 0.14)
    add_cube("MarqueeInset", (0.0, -2.01, 5.42), (2.30, 0.05, 0.38), palette["purple"], machine, 0.10)
    if theme == "cat":
        ears = create_empty("CatEarCanopy", parent=machine)
        add_cone("CatEarCanopyL", (-1.42, -0.02, 5.70), 0.43, 0.78, palette["coral"], ears, rotation=(0.0, math.radians(-8), 0.0), vertices=24)
        add_cone("CatEarCanopyR", (1.42, -0.02, 5.70), 0.43, 0.78, palette["coral"], ears, rotation=(0.0, math.radians(8), 0.0), vertices=24)
        add_cone("CatEarInnerL", (-1.42, -0.19, 5.69), 0.24, 0.49, palette["pink"], ears, rotation=(0.0, math.radians(-8), 0.0), vertices=20)
        add_cone("CatEarInnerR", (1.42, -0.19, 5.69), 0.24, 0.49, palette["pink"], ears, rotation=(0.0, math.radians(8), 0.0), vertices=20)

        paw = create_empty("CatPawSign", parent=machine)
        add_sphere("CatPawPad", (0.0, -2.06, 5.35), (0.25, 0.035, 0.20), palette["pink"], paw, segments=20)
        for index, x in enumerate((-0.28, -0.095, 0.095, 0.28)):
            add_sphere(f"CatPawToe_{index}", (x, -2.06, 5.58), (0.09, 0.03, 0.10), palette["coral"], paw, segments=16)
    else:
        add_star("MarqueeStar", (0.0, -2.055, 5.42), (0.23, 0.23, 0.23), palette["yellow"], machine, depth=0.035)
    add_cube("InteriorLightL", (-1.43, -0.05, 4.84), (0.78, 0.10, 0.08), palette["light"], machine, 0.03)
    add_cube("InteriorLightR", (1.43, -0.05, 4.84), (0.78, 0.10, 0.08), palette["light"], machine, 0.03)
    add_cube("FrontLightStrip", (0.0, -1.61, 4.88), (3.76, 0.06, 0.06), palette["cyan_light"], machine, 0.02)
    create_claw(machine, palette)


def create_machine(parent, palette, theme):
    machine = create_empty("MachineRoot", parent=parent)
    create_lower_cabinet(machine, palette)
    create_play_deck(machine, palette)
    create_upper_cabinet(machine, palette, theme)
    return machine


def create_rabbit_materials(prefix, body_color, inner_color, paw_color, fabric_image):
    materials = {
        "body": create_material(f"{prefix}Body", body_color, roughness=0.97),
        "inner": create_material(f"{prefix}InnerEar", inner_color, roughness=0.95),
        "paw": create_material(f"{prefix}Paw", paw_color, roughness=0.96),
        "thread": create_material(f"{prefix}Thread", (0.055, 0.045, 0.065), roughness=0.80),
        "nose": create_material(f"{prefix}Nose", (0.58, 0.12, 0.20), roughness=0.84),
        "cheek": create_material(f"{prefix}Cheek", (1.0, 0.42, 0.52), roughness=0.88),
        "seam": create_material(f"{prefix}Seam", tuple(max(0.02, value * 0.68) for value in body_color), roughness=0.92),
    }
    apply_fabric_normal(materials["body"], fabric_image, 0.42)
    apply_fabric_normal(materials["inner"], fabric_image, 0.34)
    apply_fabric_normal(materials["paw"], fabric_image, 0.30)
    return materials


def create_rabbit(name, location, materials, parent, rotation=(0.0, 0.0, 0.0), scale=1.0):
    root = create_empty(name, location, parent)
    root.rotation_euler = rotation
    root.scale = (scale, scale, scale)
    # 头身与四肢采用轻微压扁和左右差异，模拟填充棉受挤压后的松软轮廓。
    add_sphere("Body", (0.0, 0.02, 0.47), (0.42, 0.35, 0.46), materials["body"], root, rotation=(math.radians(2), 0.0, math.radians(-2)), segments=24)
    add_sphere("BellyPatch", (0.0, -0.32, 0.47), (0.26, 0.050, 0.27), materials["paw"], root, segments=20)
    add_sphere("Head", (-0.01, -0.02, 1.03), (0.48, 0.41, 0.39), materials["body"], root, rotation=(math.radians(2), math.radians(-3), math.radians(-2)), segments=28)
    add_sphere("MuzzleL", (-0.105, -0.385, 0.96), (0.17, 0.065, 0.13), materials["paw"], root, segments=20)
    add_sphere("MuzzleR", (0.105, -0.385, 0.96), (0.17, 0.065, 0.13), materials["paw"], root, segments=20)
    add_sphere("EarL", (-0.20, 0.0, 1.53), (0.16, 0.13, 0.38), materials["body"], root, rotation=(0.0, math.radians(-7), math.radians(7)), segments=24)
    add_sphere("EarR", (0.22, 0.015, 1.50), (0.15, 0.125, 0.36), materials["body"], root, rotation=(0.0, math.radians(8), math.radians(-10)), segments=24)
    add_sphere("EarInnerL", (-0.20, -0.112, 1.53), (0.085, 0.022, 0.27), materials["inner"], root, rotation=(0.0, math.radians(-7), math.radians(7)), segments=20)
    add_sphere("EarInnerR", (0.22, -0.102, 1.50), (0.078, 0.022, 0.25), materials["inner"], root, rotation=(0.0, math.radians(8), math.radians(-10)), segments=20)
    add_sphere("ArmL", (-0.38, -0.01, 0.54), (0.17, 0.14, 0.29), materials["body"], root, rotation=(math.radians(4), math.radians(-18), math.radians(-20)), segments=20)
    add_sphere("ArmR", (0.38, -0.015, 0.51), (0.16, 0.14, 0.28), materials["body"], root, rotation=(math.radians(-3), math.radians(16), math.radians(22)), segments=20)
    add_sphere("FootL", (-0.23, -0.13, 0.13), (0.25, 0.31, 0.15), materials["body"], root, rotation=(0.0, math.radians(-3), math.radians(-5)), segments=22)
    add_sphere("FootR", (0.23, -0.13, 0.125), (0.24, 0.30, 0.145), materials["body"], root, rotation=(0.0, math.radians(3), math.radians(5)), segments=22)
    add_sphere("PawL", (-0.23, -0.39, 0.13), (0.13, 0.035, 0.075), materials["paw"], root, rotation=(0.0, 0.0, math.radians(-4)), segments=18)
    add_sphere("PawR", (0.23, -0.39, 0.13), (0.13, 0.035, 0.075), materials["paw"], root, rotation=(0.0, 0.0, math.radians(4)), segments=18)
    add_sphere("Tail", (0.0, 0.34, 0.44), (0.19, 0.18, 0.19), materials["paw"], root, segments=20)
    add_sphere("EyeL", (-0.17, -0.392, 1.09), (0.052, 0.025, 0.075), materials["thread"], root, rotation=(math.radians(5), 0.0, math.radians(-5)), segments=16)
    add_sphere("EyeR", (0.17, -0.392, 1.09), (0.052, 0.025, 0.075), materials["thread"], root, rotation=(math.radians(5), 0.0, math.radians(5)), segments=16)
    add_sphere("EyeGlintL", (-0.153, -0.418, 1.116), (0.014, 0.008, 0.019), materials["paw"], root, segments=12)
    add_sphere("EyeGlintR", (0.187, -0.418, 1.116), (0.014, 0.008, 0.019), materials["paw"], root, segments=12)
    add_sphere("Nose", (0.0, -0.466, 0.99), (0.065, 0.028, 0.048), materials["nose"], root, segments=16)
    add_sphere("CheekL", (-0.26, -0.404, 0.94), (0.075, 0.018, 0.044), materials["cheek"], root, segments=16)
    add_sphere("CheekR", (0.26, -0.404, 0.94), (0.075, 0.018, 0.044), materials["cheek"], root, segments=16)
    add_curve("Mouth", [(0.0, -0.472, 0.96), (-0.06, -0.474, 0.91), (-0.13, -0.448, 0.925)], 0.012, materials["thread"], root)
    add_curve("MouthR", [(0.0, -0.472, 0.96), (0.06, -0.474, 0.91), (0.13, -0.448, 0.925)], 0.012, materials["thread"], root)
    add_curve("HeadSeam", [(-0.38, -0.29, 0.91), (-0.28, -0.37, 0.78), (0.0, -0.40, 0.72), (0.28, -0.37, 0.78), (0.38, -0.29, 0.91)], 0.009, materials["seam"], root)
    add_curve("BellySeam", [(-0.23, -0.343, 0.65), (0.0, -0.365, 0.76), (0.23, -0.343, 0.65)], 0.009, materials["seam"], root)
    add_curve("ArmCreaseL", [(-0.30, -0.27, 0.69), (-0.34, -0.30, 0.58), (-0.32, -0.28, 0.47)], 0.008, materials["seam"], root)
    add_curve("ArmCreaseR", [(0.30, -0.27, 0.67), (0.34, -0.30, 0.56), (0.32, -0.28, 0.45)], 0.008, materials["seam"], root)
    return root


def create_cat(name, location, materials, parent, rotation=(0.0, 0.0, 0.0), scale=1.0):
    root = create_empty(name, location, parent)
    root.rotation_euler = rotation
    root.scale = (scale, scale, scale)
    # 猫咪保留圆润头身，三角耳、细长尾和额头纹形成远看也清晰的物种轮廓。
    add_sphere("Body", (0.0, 0.02, 0.47), (0.43, 0.35, 0.46), materials["body"], root, rotation=(math.radians(3), 0.0, math.radians(-3)), segments=22)
    add_sphere("BellyPatch", (0.0, -0.32, 0.46), (0.25, 0.05, 0.26), materials["paw"], root, segments=18)
    add_sphere("Head", (0.0, -0.02, 1.02), (0.48, 0.40, 0.39), materials["body"], root, rotation=(math.radians(2), math.radians(2), 0.0), segments=24)
    add_cone("EarL", (-0.24, -0.01, 1.41), 0.20, 0.43, materials["body"], root, rotation=(0.0, math.radians(-10), math.radians(8)), vertices=3)
    add_cone("EarR", (0.24, -0.01, 1.41), 0.20, 0.43, materials["body"], root, rotation=(0.0, math.radians(10), math.radians(-8)), vertices=3)
    add_cone("EarInnerL", (-0.24, -0.105, 1.40), 0.11, 0.27, materials["inner"], root, rotation=(0.0, math.radians(-10), math.radians(8)), vertices=3)
    add_cone("EarInnerR", (0.24, -0.105, 1.40), 0.11, 0.27, materials["inner"], root, rotation=(0.0, math.radians(10), math.radians(-8)), vertices=3)
    add_sphere("MuzzleL", (-0.09, -0.39, 0.96), (0.15, 0.06, 0.12), materials["paw"], root, segments=18)
    add_sphere("MuzzleR", (0.09, -0.39, 0.96), (0.15, 0.06, 0.12), materials["paw"], root, segments=18)
    add_sphere("ArmL", (-0.36, -0.02, 0.53), (0.16, 0.14, 0.28), materials["body"], root, rotation=(0.0, math.radians(-18), math.radians(-18)), segments=18)
    add_sphere("ArmR", (0.36, -0.02, 0.51), (0.16, 0.14, 0.28), materials["body"], root, rotation=(0.0, math.radians(18), math.radians(18)), segments=18)
    add_sphere("FootL", (-0.22, -0.13, 0.13), (0.23, 0.29, 0.145), materials["body"], root, segments=20)
    add_sphere("FootR", (0.22, -0.13, 0.13), (0.23, 0.29, 0.145), materials["body"], root, segments=20)
    add_sphere("PawL", (-0.22, -0.385, 0.13), (0.12, 0.032, 0.07), materials["paw"], root, segments=16)
    add_sphere("PawR", (0.22, -0.385, 0.13), (0.12, 0.032, 0.07), materials["paw"], root, segments=16)
    add_curve("Tail", [(0.0, 0.31, 0.39), (0.34, 0.38, 0.33), (0.55, 0.29, 0.55), (0.46, 0.20, 0.72)], 0.055, materials["body"], root)
    add_sphere("EyeL", (-0.17, -0.392, 1.08), (0.052, 0.024, 0.07), materials["thread"], root, segments=14)
    add_sphere("EyeR", (0.17, -0.392, 1.08), (0.052, 0.024, 0.07), materials["thread"], root, segments=14)
    add_sphere("Nose", (0.0, -0.464, 0.99), (0.055, 0.025, 0.042), materials["nose"], root, segments=14)
    add_curve("Mouth", [(0.0, -0.47, 0.96), (-0.05, -0.47, 0.91), (-0.11, -0.45, 0.92)], 0.011, materials["thread"], root)
    add_curve("MouthR", [(0.0, -0.47, 0.96), (0.05, -0.47, 0.91), (0.11, -0.45, 0.92)], 0.011, materials["thread"], root)
    add_curve("ForeheadStripeL", [(-0.15, -0.37, 1.27), (-0.10, -0.405, 1.20), (-0.07, -0.42, 1.15)], 0.012, materials["seam"], root)
    add_curve("ForeheadStripeR", [(0.15, -0.37, 1.27), (0.10, -0.405, 1.20), (0.07, -0.42, 1.15)], 0.012, materials["seam"], root)
    return root


def create_dog(name, location, materials, parent, rotation=(0.0, 0.0, 0.0), scale=1.0):
    root = create_empty(name, location, parent)
    root.rotation_euler = rotation
    root.scale = (scale, scale, scale)
    # 下垂耳、宽口鼻和短尾让小狗与猫兔在俯视角下也能快速区分。
    add_sphere("Body", (0.0, 0.02, 0.47), (0.44, 0.36, 0.47), materials["body"], root, rotation=(math.radians(-2), 0.0, math.radians(2)), segments=22)
    add_sphere("BellyPatch", (0.0, -0.33, 0.46), (0.27, 0.05, 0.27), materials["paw"], root, segments=18)
    add_sphere("Head", (0.0, -0.01, 1.02), (0.49, 0.41, 0.40), materials["body"], root, segments=24)
    add_sphere("EarL", (-0.39, 0.0, 1.09), (0.19, 0.14, 0.34), materials["inner"], root, rotation=(math.radians(2), math.radians(-24), math.radians(-18)), segments=20)
    add_sphere("EarR", (0.39, 0.0, 1.09), (0.19, 0.14, 0.34), materials["inner"], root, rotation=(math.radians(-2), math.radians(24), math.radians(18)), segments=20)
    add_sphere("Muzzle", (0.0, -0.40, 0.96), (0.28, 0.085, 0.19), materials["paw"], root, segments=20)
    add_sphere("EyePatch", (-0.17, -0.385, 1.10), (0.15, 0.022, 0.16), materials["inner"], root, rotation=(math.radians(5), 0.0, math.radians(-12)), segments=18)
    add_sphere("ArmL", (-0.37, -0.01, 0.52), (0.17, 0.14, 0.29), materials["body"], root, rotation=(0.0, math.radians(-18), math.radians(-20)), segments=18)
    add_sphere("ArmR", (0.37, -0.01, 0.52), (0.17, 0.14, 0.29), materials["body"], root, rotation=(0.0, math.radians(18), math.radians(20)), segments=18)
    add_sphere("FootL", (-0.23, -0.13, 0.13), (0.24, 0.30, 0.15), materials["body"], root, segments=20)
    add_sphere("FootR", (0.23, -0.13, 0.13), (0.24, 0.30, 0.15), materials["body"], root, segments=20)
    add_sphere("PawL", (-0.23, -0.39, 0.13), (0.13, 0.034, 0.075), materials["paw"], root, segments=16)
    add_sphere("PawR", (0.23, -0.39, 0.13), (0.13, 0.034, 0.075), materials["paw"], root, segments=16)
    add_sphere("Tail", (0.0, 0.36, 0.42), (0.12, 0.11, 0.19), materials["inner"], root, rotation=(math.radians(-22), 0.0, 0.0), segments=16)
    add_sphere("EyeL", (-0.17, -0.414, 1.10), (0.055, 0.023, 0.072), materials["thread"], root, segments=14)
    add_sphere("EyeR", (0.17, -0.414, 1.10), (0.055, 0.023, 0.072), materials["thread"], root, segments=14)
    add_sphere("Nose", (0.0, -0.488, 1.00), (0.078, 0.032, 0.055), materials["thread"], root, segments=14)
    add_curve("Mouth", [(0.0, -0.486, 0.96), (-0.06, -0.472, 0.91), (-0.13, -0.445, 0.92)], 0.012, materials["thread"], root)
    add_curve("MouthR", [(0.0, -0.486, 0.96), (0.06, -0.472, 0.91), (0.13, -0.445, 0.92)], 0.012, materials["thread"], root)
    add_curve("HeadSeam", [(-0.35, -0.31, 0.88), (0.0, -0.41, 0.74), (0.35, -0.31, 0.88)], 0.009, materials["seam"], root)
    return root


def create_cow(name, location, materials, parent, rotation=(0.0, 0.0, 0.0), scale=1.0):
    root = create_empty(name, location, parent)
    root.rotation_euler = rotation
    root.scale = (scale, scale, scale)
    # 横向耳朵、小角、宽鼻和深色花纹共同构成小牛的稳定识别特征。
    add_sphere("Body", (0.0, 0.02, 0.47), (0.45, 0.36, 0.47), materials["body"], root, segments=22)
    add_sphere("BellyPatch", (0.0, -0.33, 0.46), (0.27, 0.05, 0.27), materials["paw"], root, segments=18)
    add_sphere("BodyMarkL", (-0.20, -0.355, 0.58), (0.14, 0.022, 0.18), materials["thread"], root, rotation=(0.0, 0.0, math.radians(-18)), segments=16)
    add_sphere("BodyMarkR", (0.20, -0.355, 0.35), (0.12, 0.022, 0.14), materials["thread"], root, rotation=(0.0, 0.0, math.radians(20)), segments=16)
    add_sphere("Head", (0.0, -0.01, 1.02), (0.48, 0.40, 0.39), materials["body"], root, segments=24)
    add_sphere("EarL", (-0.43, 0.0, 1.24), (0.28, 0.13, 0.13), materials["body"], root, rotation=(0.0, math.radians(-8), math.radians(-8)), segments=18)
    add_sphere("EarR", (0.43, 0.0, 1.24), (0.28, 0.13, 0.13), materials["body"], root, rotation=(0.0, math.radians(8), math.radians(8)), segments=18)
    add_sphere("EarInnerL", (-0.47, -0.105, 1.24), (0.16, 0.024, 0.07), materials["inner"], root, segments=14)
    add_sphere("EarInnerR", (0.47, -0.105, 1.24), (0.16, 0.024, 0.07), materials["inner"], root, segments=14)
    add_cone("HornL", (-0.24, 0.0, 1.40), 0.075, 0.22, materials["paw"], root, rotation=(0.0, math.radians(-18), math.radians(-6)), vertices=12)
    add_cone("HornR", (0.24, 0.0, 1.40), 0.075, 0.22, materials["paw"], root, rotation=(0.0, math.radians(18), math.radians(6)), vertices=12)
    add_sphere("Muzzle", (0.0, -0.405, 0.94), (0.30, 0.075, 0.18), materials["inner"], root, segments=20)
    add_sphere("HeadMark", (-0.17, -0.39, 1.13), (0.16, 0.022, 0.17), materials["thread"], root, rotation=(0.0, 0.0, math.radians(-12)), segments=16)
    add_sphere("ArmL", (-0.37, -0.01, 0.52), (0.17, 0.14, 0.29), materials["body"], root, rotation=(0.0, math.radians(-18), math.radians(-20)), segments=18)
    add_sphere("ArmR", (0.37, -0.01, 0.52), (0.17, 0.14, 0.29), materials["body"], root, rotation=(0.0, math.radians(18), math.radians(20)), segments=18)
    add_sphere("FootL", (-0.23, -0.13, 0.13), (0.24, 0.30, 0.15), materials["body"], root, segments=20)
    add_sphere("FootR", (0.23, -0.13, 0.13), (0.24, 0.30, 0.15), materials["body"], root, segments=20)
    add_sphere("HoofL", (-0.23, -0.39, 0.13), (0.14, 0.034, 0.08), materials["thread"], root, segments=16)
    add_sphere("HoofR", (0.23, -0.39, 0.13), (0.14, 0.034, 0.08), materials["thread"], root, segments=16)
    add_curve("Tail", [(0.0, 0.32, 0.46), (0.16, 0.38, 0.35), (0.24, 0.34, 0.22)], 0.035, materials["body"], root)
    add_sphere("TailTip", (0.25, 0.34, 0.19), (0.075, 0.065, 0.10), materials["thread"], root, segments=14)
    add_sphere("EyeL", (-0.17, -0.402, 1.10), (0.052, 0.023, 0.07), materials["thread"], root, segments=14)
    add_sphere("EyeR", (0.17, -0.402, 1.10), (0.052, 0.023, 0.07), materials["thread"], root, segments=14)
    add_sphere("NostrilL", (-0.09, -0.478, 0.96), (0.032, 0.014, 0.025), materials["thread"], root, segments=12)
    add_sphere("NostrilR", (0.09, -0.478, 0.96), (0.032, 0.014, 0.025), materials["thread"], root, segments=12)
    return root


def create_dolls(asset_root, fabric_image, species):
    dolls = create_empty("Dolls", parent=asset_root)
    if species == "rabbit":
        materials = create_rabbit_materials("RabbitPink", (0.94, 0.45, 0.64), (1.0, 0.68, 0.76), (0.98, 0.84, 0.78), fabric_image)
        create_rabbit("DollRabbit", (0.35, 0.62, 1.68), materials, dolls, rotation=(math.radians(78), math.radians(-8), math.radians(-12)), scale=0.72)
    elif species == "cat":
        materials = create_rabbit_materials("CatMint", (0.34, 0.82, 0.66), (0.62, 0.96, 0.82), (0.88, 0.95, 0.78), fabric_image)
        create_cat("DollCat", (-0.18, 0.54, 1.68), materials, dolls, rotation=(math.radians(82), math.radians(10), math.radians(18)), scale=0.70)
    else:
        raise ValueError(f"unsupported doll species: {species}")
    return dolls


def create_preview_dolls(fabric_image, species):
    preview = create_empty("PreviewOnly")
    creator = create_rabbit if species == "rabbit" else create_cat
    labels = ("Mint", "Blue", "Lilac", "Yellow", "Coral")
    colors = (
        ((0.34, 0.82, 0.66), (0.62, 0.96, 0.82), (0.88, 0.95, 0.78)),
        ((0.30, 0.65, 0.88), (0.58, 0.84, 1.0), (0.90, 0.92, 0.80)),
        ((0.64, 0.48, 0.84), (0.50, 0.38, 0.68), (0.96, 0.84, 0.82)),
        ((0.94, 0.69, 0.24), (1.0, 0.70, 0.72), (0.96, 0.90, 0.72)),
        ((0.94, 0.36, 0.38), (1.0, 0.60, 0.58), (0.98, 0.83, 0.73)),
    )
    variants = [
        (f"{species.title()}{label}", creator, body, inner, paw)
        for label, (body, inner, paw) in zip(labels, colors)
    ]
    # 展示摆位模拟娃娃自然落下后的侧躺、后仰与相互挤靠，不再整齐直立排队。
    placements = [
        {"location": (-0.42, 0.82, 1.68), "rotation": (0.0, 82.0, 14.0), "scale": 0.68},
        {"location": (1.72, 0.66, 1.67), "rotation": (0.0, -82.0, -12.0), "scale": 0.69},
        {"location": (1.46, -0.42, 1.48), "rotation": (-18.0, 12.0, 22.0), "scale": 0.67},
        {"location": (0.20, -0.58, 1.68), "rotation": (-82.0, 0.0, -20.0), "scale": 0.70},
        {"location": (1.62, -0.54, 1.68), "rotation": (12.0, -82.0, 28.0), "scale": 0.68},
    ]
    for (label, creator, body, inner, paw), placement in zip(variants, placements):
        mats = create_rabbit_materials(f"Preview{label}", body, inner, paw, fabric_image)
        rotation = tuple(math.radians(angle) for angle in placement["rotation"])
        creator(f"Preview{label}", placement["location"], mats, preview, rotation=rotation, scale=placement["scale"])
    return preview


def look_at(obj, target):
    direction = Vector(target) - obj.location
    obj.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()


def setup_render(palette, render_path):
    floor_material = create_material("PreviewFloor", (0.035, 0.055, 0.075), roughness=0.72)
    add_cube("PreviewFloor", (0.0, 0.0, -0.10), (11.0, 11.0, 0.14), floor_material, bevel=0.0)
    bpy.ops.object.light_add(type="AREA", location=(4.5, -5.6, 7.8))
    key = bpy.context.object
    key.name = "PreviewKey"
    key.data.energy = 980
    key.data.color = (1.0, 0.78, 0.62)
    key.data.shape = "DISK"
    key.data.size = 4.5
    look_at(key, (0.0, 0.0, 2.7))
    bpy.ops.object.light_add(type="AREA", location=(-4.0, -2.2, 5.4))
    fill = bpy.context.object
    fill.name = "PreviewFill"
    fill.data.energy = 720
    fill.data.color = (0.48, 0.78, 1.0)
    fill.data.size = 3.8
    look_at(fill, (0.0, 0.0, 2.6))
    bpy.ops.object.light_add(type="AREA", location=(0.0, 0.2, 4.62))
    interior = bpy.context.object
    interior.name = "InteriorGlow"
    interior.data.energy = 520
    interior.data.color = (1.0, 0.80, 0.58)
    interior.data.size = 2.8
    look_at(interior, (0.0, 0.0, 1.8))
    bpy.ops.object.camera_add(location=(7.7, -10.8, 6.6))
    camera = bpy.context.object
    camera.name = "PreviewCamera"
    camera.data.lens = 58
    look_at(camera, (0.0, -0.05, 2.70))
    bpy.context.scene.camera = camera
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 1080
    scene.render.resolution_y = 1080
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.filepath = str(render_path)
    scene.render.film_transparent = False
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.image_settings.color_depth = "8"
    scene.view_settings.look = "AgX - Medium High Contrast"
    scene.world.color = (0.014, 0.022, 0.040)


def descendants(root):
    result = [root]
    for child in root.children:
        result.extend(descendants(child))
    return result


def export_asset(asset_root, glb_path):
    bpy.ops.object.select_all(action="DESELECT")
    asset_objects = descendants(asset_root)
    for obj in asset_objects:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = asset_root
    bpy.ops.export_scene.gltf(filepath=str(glb_path), export_format="GLB", use_selection=True, export_apply=True, export_cameras=False, export_lights=False)
    triangle_count = 0
    for obj in asset_objects:
        if obj.type == "MESH":
            obj.data.calc_loop_triangles()
            triangle_count += len(obj.data.loop_triangles)
    print(f"ASSET_SUMMARY objects={len(asset_objects)} triangles={triangle_count}")


def build_scene(output):
    reset_scene()
    palette = create_palette(output["theme"])
    fabric_image = create_fabric_normal_image()
    asset_root = create_empty("PrototypeAsset")
    create_machine(asset_root, palette, output["theme"])
    create_dolls(asset_root, fabric_image, output["species"])
    create_preview_dolls(fabric_image, output["species"])
    setup_render(palette, output["render"])
    return asset_root


def main():
    for output in MACHINE_OUTPUTS:
        for path in (output["blend"].parent, output["render"].parent, output["glb"].parent):
            path.mkdir(parents=True, exist_ok=True)

        # 每台机在干净场景中独立生成，避免另一台机的娃娃模板和材质被带进 GLB。
        asset_root = build_scene(output)
        bpy.ops.wm.save_as_mainfile(filepath=str(output["blend"]))
        bpy.ops.render.render(write_still=True)
        export_asset(asset_root, output["glb"])
        print(f"OUTPUT_MACHINE={output['id']}")
        print(f"OUTPUT_BLEND={output['blend']}")
        print(f"OUTPUT_RENDER={output['render']}")
        print(f"OUTPUT_GLB={output['glb']}")


if __name__ == "__main__":
    main()
