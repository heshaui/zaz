import {
  _decorator,
  Component,
  ImageAsset,
  Layers,
  Material,
  Mesh,
  MeshRenderer,
  primitives,
  resources,
  Texture2D,
  utils,
} from 'cc';
import {
  isUsableEquirectangularPanorama,
  panoramaHorizontalOffsetToYawDegrees,
} from '../domain/panorama-background';

const { ccclass } = _decorator;
const PANORAMA_RESOURCE_PATH = 'backgrounds/arcade-panorama';
const PANORAMA_RADIUS = 45;
const PANORAMA_HORIZONTAL_OFFSET = 0.2;

@ccclass('ArcadePanorama')
export class ArcadePanorama extends Component {
  private material: Material | null = null;
  private texture: Texture2D | null = null;
  private mesh: Mesh | null = null;

  start(): void {
    this.node.layer = Layers.Enum.DEFAULT;
    resources.load(PANORAMA_RESOURCE_PATH, ImageAsset, (error, imageAsset) => {
      if (error || !imageAsset || !this.node.isValid) return;
      if (!isUsableEquirectangularPanorama(imageAsset.width, imageAsset.height)) return;
      this.buildPanorama(imageAsset);
    });
  }

  onDestroy(): void {
    this.material?.destroy();
    this.texture?.destroy();
    this.mesh?.destroy();
    this.material = null;
    this.texture = null;
    this.mesh = null;
  }

  private buildPanorama(imageAsset: ImageAsset): void {
    const renderer = this.node.getComponent(MeshRenderer) ?? this.node.addComponent(MeshRenderer);
    this.mesh = utils.MeshUtils.createMesh(primitives.sphere(PANORAMA_RADIUS));
    renderer.mesh = this.mesh;

    this.texture = new Texture2D('ArcadePanoramaTexture');
    this.texture.image = imageAsset;
    this.texture.setWrapMode(
      Texture2D.WrapMode.CLAMP_TO_EDGE,
      Texture2D.WrapMode.CLAMP_TO_EDGE,
    );

    this.material = new Material('ArcadePanoramaMaterial');
    this.material.initialize({
      effectName: 'builtin-unlit',
      defines: { USE_TEXTURE: true },
    });
    this.material.setProperty('mainTexture', this.texture);
    renderer.setMaterial(this.material, 0);

    // 将球体 X 轴翻转后，默认背面剔除会改为显示球体内侧，所有机台相机都处在环境内部。
    this.node.setScale(-1, 1, 1);
    this.node.setRotationFromEuler(
      0,
      panoramaHorizontalOffsetToYawDegrees(PANORAMA_HORIZONTAL_OFFSET),
      0,
    );
  }
}
