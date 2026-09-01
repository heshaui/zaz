import { ImageAsset, Node, resources, Sprite, SpriteFrame, Texture2D, UITransform } from 'cc';

export type UiImageCleanup = () => void;

export function attachResourceImage(
  node: Node,
  resourcePath: string,
  width: number,
  height: number,
  onLoaded?: (loaded: boolean) => void,
): UiImageCleanup {
  const transform = node.getComponent(UITransform) ?? node.addComponent(UITransform);
  transform.setContentSize(width, height);
  const sprite = node.getComponent(Sprite) ?? node.addComponent(Sprite);
  sprite.sizeMode = Sprite.SizeMode.CUSTOM;

  let cancelled = false;
  let texture: Texture2D | null = null;
  let frame: SpriteFrame | null = null;

  resources.load(resourcePath, ImageAsset, (error, imageAsset) => {
    // 界面可能在异步载入完成前已经销毁或切换内容，必须先核对生命周期再写入节点。
    if (cancelled || !node.isValid) return;
    if (error || !imageAsset) {
      onLoaded?.(false);
      return;
    }

    texture = new Texture2D(`${node.name}Texture`);
    texture.image = imageAsset;
    texture.setWrapMode(Texture2D.WrapMode.CLAMP_TO_EDGE, Texture2D.WrapMode.CLAMP_TO_EDGE);
    frame = new SpriteFrame(`${node.name}Frame`);
    frame.texture = texture;
    sprite.spriteFrame = frame;
    onLoaded?.(true);
  });

  return () => {
    cancelled = true;
    if (frame && sprite.isValid && sprite.spriteFrame === frame) sprite.spriteFrame = null;
    frame?.destroy();
    texture?.destroy();
    frame = null;
    texture = null;
  };
}
