import {
  _decorator,
  Camera,
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
  getPortraitBackdropDimensions,
  getPortraitBackdropUvs,
} from '../domain/panorama-background';

const { ccclass } = _decorator;
const BACKGROUND_RESOURCE_PATH = 'backgrounds/arcade-portrait-v2';
const BACKGROUND_DISTANCE = 100;

@ccclass('ArcadePortraitBackground')
export class ArcadePortraitBackground extends Component {
  private cameras: Camera[] = [];
  private readonly backdropNodes = new Map<Camera, Node>();
  private imageAspectRatio = 9 / 16;
  private material: Material | null = null;
  private texture: Texture2D | null = null;
  private mesh: Mesh | null = null;

  setCameras(front: Camera | null, side: Camera | null): void {
    this.cameras = [front, side].filter((camera): camera is Camera => camera !== null);
    if (this.material && this.mesh) {
      this.ensureBackdropNodes();
      this.layoutBackdrops();
    }
  }

  start(): void {
    view.on('canvas-resize', this.layoutBackdrops, this);
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
    this.material = null;
    this.texture = null;
    this.mesh = null;
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
