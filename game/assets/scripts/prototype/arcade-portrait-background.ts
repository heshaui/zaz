import {
  _decorator,
  Camera,
  Color,
  Component,
  ImageAsset,
  Layers,
  Material,
  Mesh,
  MeshRenderer,
  Node,
  primitives,
  resources,
  Texture2D,
  utils,
  view,
} from 'cc';
import {
  createContactShadowGeometry,
  getPortraitBackdropDimensions,
  getPortraitBackdropUvs,
} from '../domain/panorama-background';

const { ccclass } = _decorator;
const BACKGROUND_RESOURCE_PATH = 'backgrounds/arcade-portrait-v2';
const BACKGROUND_DISTANCE = 100;
const CONTACT_SHADOW_NODE_NAME = 'MachineContactShadow';
const CONTACT_SHADOW_SEGMENTS = 48;

@ccclass('ArcadePortraitBackground')
export class ArcadePortraitBackground extends Component {
  private cameras: Camera[] = [];
  private readonly backdropNodes = new Map<Camera, Node>();
  private imageAspectRatio = 9 / 16;
  private material: Material | null = null;
  private texture: Texture2D | null = null;
  private mesh: Mesh | null = null;
  private machineRoot: Node | null = null;
  private contactShadowNode: Node | null = null;
  private contactShadowMaterial: Material | null = null;
  private contactShadowMesh: Mesh | null = null;

  setCameras(front: Camera | null, side: Camera | null): void {
    this.cameras = [front, side].filter((camera): camera is Camera => camera !== null);
    if (this.material && this.mesh) {
      this.ensureBackdropNodes();
      this.layoutBackdrops();
    }
  }

  setMachineRoot(machineRoot: Node | null): void {
    if (this.machineRoot === machineRoot) return;
    this.contactShadowNode?.destroy();
    this.contactShadowNode = null;
    this.machineRoot = machineRoot;
    this.ensureContactShadow();
  }

  start(): void {
    view.on('canvas-resize', this.layoutBackdrops, this);
    this.buildContactShadowResources();
    this.ensureContactShadow();
    resources.load(BACKGROUND_RESOURCE_PATH, ImageAsset, (error, imageAsset) => {
      if (error || !imageAsset || !this.node.isValid) return;
      this.buildSharedResources(imageAsset);
      this.ensureBackdropNodes();
      this.layoutBackdrops();
    });
  }

  onDestroy(): void {
    view.off('canvas-resize', this.layoutBackdrops, this);
    this.backdropNodes.forEach((node) => {
      if (node.isValid) node.destroy();
    });
    this.backdropNodes.clear();
    this.material?.destroy();
    this.texture?.destroy();
    this.mesh?.destroy();
    this.contactShadowNode?.destroy();
    this.contactShadowMaterial?.destroy();
    this.contactShadowMesh?.destroy();
    this.material = null;
    this.texture = null;
    this.mesh = null;
    this.machineRoot = null;
    this.contactShadowNode = null;
    this.contactShadowMaterial = null;
    this.contactShadowMesh = null;
  }

  private buildSharedResources(imageAsset: ImageAsset): void {
    this.imageAspectRatio = imageAsset.width / imageAsset.height;
    const geometry = primitives.quad();
    geometry.uvs = getPortraitBackdropUvs();
    this.mesh = utils.MeshUtils.createMesh(geometry);

    this.texture = new Texture2D('ArcadePortraitBackgroundTexture');
    this.texture.image = imageAsset;
    this.texture.setWrapMode(
      Texture2D.WrapMode.CLAMP_TO_EDGE,
      Texture2D.WrapMode.CLAMP_TO_EDGE,
    );

    this.material = new Material('ArcadePortraitBackgroundMaterial');
    this.material.initialize({
      effectName: 'builtin-unlit',
      defines: { USE_TEXTURE: true },
    });
    this.material.setProperty('mainTexture', this.texture);
    this.material.setProperty('mainColor', new Color(216, 216, 216, 255));
  }

  private buildContactShadowResources(): void {
    if (this.contactShadowMaterial || this.contactShadowMesh) return;
    this.contactShadowMesh = utils.MeshUtils.createMesh(
      createContactShadowGeometry(CONTACT_SHADOW_SEGMENTS),
    );
    this.contactShadowMaterial = new Material('MachineContactShadowMaterial');
    this.contactShadowMaterial.initialize({
      effectName: 'builtin-unlit',
      technique: 1,
      defines: { USE_VERTEX_COLOR: true },
    });
    this.contactShadowMaterial.setProperty('mainColor', new Color(12, 18, 22, 112));
  }

  private ensureContactShadow(): void {
    if (
      !this.machineRoot
      || !this.machineRoot.isValid
      || !this.contactShadowMaterial
      || !this.contactShadowMesh
      || this.contactShadowNode?.isValid
    ) return;

    const shadow = new Node(CONTACT_SHADOW_NODE_NAME);
    shadow.layer = Layers.Enum.DEFAULT;
    shadow.setParent(this.machineRoot);
    shadow.setPosition(0, 0.02, 0.15);
    shadow.setScale(2.45, 1, 1.85);
    const renderer = shadow.addComponent(MeshRenderer);
    renderer.mesh = this.contactShadowMesh;
    renderer.setMaterial(this.contactShadowMaterial, 0);
    this.contactShadowNode = shadow;
  }

  private ensureBackdropNodes(): void {
    if (!this.material || !this.mesh) return;
    this.cameras.forEach((camera) => {
      if (this.backdropNodes.has(camera)) return;
      const backdrop = new Node(`PortraitBackground-${camera.node.name}`);
      backdrop.layer = Layers.Enum.DEFAULT;
      backdrop.setParent(camera.node);
      backdrop.setPosition(0, 0, -BACKGROUND_DISTANCE);
      const renderer = backdrop.addComponent(MeshRenderer);
      renderer.mesh = this.mesh;
      renderer.setMaterial(this.material, 0);
      this.backdropNodes.set(camera, backdrop);
    });
  }

  private layoutBackdrops(): void {
    const visibleSize = view.getVisibleSize();
    if (visibleSize.width <= 0 || visibleSize.height <= 0) return;
    const viewportAspectRatio = visibleSize.width / visibleSize.height;

    // 平面保持图片比例并覆盖相机视口，超出的左右或上下边缘交给视口自然裁切。
    this.backdropNodes.forEach((backdrop, camera) => {
      const dimensions = getPortraitBackdropDimensions({
        distance: BACKGROUND_DISTANCE,
        imageAspectRatio: this.imageAspectRatio,
        verticalFovDegrees: camera.fov,
        viewportAspectRatio,
      });
      backdrop.setScale(dimensions.width, dimensions.height, 1);
    });
  }
}
