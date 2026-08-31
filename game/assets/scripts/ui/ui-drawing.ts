import {
  Color,
  Graphics,
  HorizontalTextAlignment,
  Label,
  Node,
  UITransform,
  VerticalTextAlignment,
} from 'cc';
import { UI_COLORS, UI_SIZES } from './ui-theme';

export type LabelWeightRole = 'display' | 'body' | 'data';

export function color(hex: string, alpha = 255): Color {
  const value = hex.replace('#', '');
  return new Color(
    Number.parseInt(value.slice(0, 2), 16),
    Number.parseInt(value.slice(2, 4), 16),
    Number.parseInt(value.slice(4, 6), 16),
    alpha,
  );
}

export function sizeNode(node: Node, width: number, height: number): UITransform {
  const transform = node.getComponent(UITransform) ?? node.addComponent(UITransform);
  transform.setContentSize(width, height);
  return transform;
}

export function drawHardwarePanel(
  node: Node,
  width: number,
  height: number,
  fill: Color,
  outline: Color,
  radius: number,
): void {
  sizeNode(node, width, height);
  const graphics = node.getComponent(Graphics) ?? node.addComponent(Graphics);
  graphics.clear();
  graphics.fillColor = fill;
  graphics.strokeColor = outline;
  graphics.lineWidth = UI_SIZES.outlineWidth;
  graphics.roundRect(-width / 2, -height / 2, width, height, Math.min(8, radius));
  graphics.fill();
  graphics.stroke();
}

export function drawPhysicalButton(node: Node, diameter: number, fill: Color, outline: Color): void {
  sizeNode(node, diameter, diameter);
  const graphics = node.getComponent(Graphics) ?? node.addComponent(Graphics);
  const radius = diameter / 2;
  graphics.clear();
  graphics.fillColor = color(UI_COLORS.ink, 135);
  graphics.circle(0, -8, radius);
  graphics.fill();
  graphics.fillColor = fill;
  graphics.strokeColor = outline;
  graphics.lineWidth = UI_SIZES.outlineWidth;
  graphics.circle(0, 0, radius - 4);
  graphics.fill();
  graphics.stroke();
  graphics.strokeColor = color(UI_COLORS.paper, 125);
  graphics.lineWidth = 4;
  graphics.arc(0, 0, radius - 15, 0.35, 2.75, false);
  graphics.stroke();
}

export function drawScrew(node: Node, radius: number): void {
  sizeNode(node, radius * 2, radius * 2);
  const graphics = node.getComponent(Graphics) ?? node.addComponent(Graphics);
  graphics.clear();
  graphics.fillColor = color(UI_COLORS.paper, 180);
  graphics.circle(0, 0, radius);
  graphics.fill();
  graphics.strokeColor = color(UI_COLORS.ink);
  graphics.lineWidth = 2;
  graphics.moveTo(-radius * 0.55, 0);
  graphics.lineTo(radius * 0.55, 0);
  graphics.stroke();
}

export function styleLabel(
  label: Label,
  fontSize: number,
  labelColor: Color,
  weightRole: LabelWeightRole,
): void {
  label.fontFamily = 'Microsoft YaHei';
  label.fontSize = fontSize;
  label.lineHeight = Math.round(fontSize * (weightRole === 'display' ? 1.12 : 1.25));
  label.color = labelColor;
  label.spacingX = 0;
  label.isBold = weightRole !== 'body';
  label.horizontalAlign = HorizontalTextAlignment.CENTER;
  label.verticalAlign = VerticalTextAlignment.CENTER;
  label.overflow = Label.Overflow.SHRINK;
}

export function ensureLabel(
  parent: Node,
  name: string,
  width: number,
  height: number,
  fontSize: number,
  labelColor = color(UI_COLORS.paper),
  role: LabelWeightRole = 'body',
): Label {
  let node = parent.getChildByName(name);
  if (!node) {
    node = new Node(name);
    node.layer = parent.layer;
    node.setParent(parent);
  }
  sizeNode(node, width, height);
  const label = node.getComponent(Label) ?? node.addComponent(Label);
  styleLabel(label, fontSize, labelColor, role);
  return label;
}
