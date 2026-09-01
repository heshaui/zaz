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

export function ensureUiNode(parent: Node, name: string): Node {
  let node = parent.getChildByName(name);
  if (!node) {
    node = new Node(name);
    node.setParent(parent);
  }
  // 运行时创建的节点默认不在 UI_2D 层；必须继承父层级才能正确参与按钮命中。
  node.layer = parent.layer;
  return node;
}

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

export function drawBeveledPanel(
  node: Node,
  width: number,
  height: number,
  fill: Color,
  outline: Color,
  accent: Color,
  radius = 8,
): void {
  sizeNode(node, width, height);
  const graphics = node.getComponent(Graphics) ?? node.addComponent(Graphics);
  const corner = Math.min(8, radius);
  graphics.clear();

  // 阴影、主体、内沿与高光分层绘制，模拟电玩城机台的注塑外壳。
  graphics.fillColor = color(UI_COLORS.ink, 150);
  graphics.roundRect(-width / 2 + 5, -height / 2 - 10, width - 10, height, corner);
  graphics.fill();
  graphics.fillColor = outline;
  graphics.roundRect(-width / 2, -height / 2, width, height, corner);
  graphics.fill();
  graphics.fillColor = fill;
  graphics.roundRect(-width / 2 + 7, -height / 2 + 7, width - 14, height - 14, Math.max(2, corner - 2));
  graphics.fill();
  graphics.strokeColor = accent;
  graphics.lineWidth = 4;
  graphics.moveTo(-width / 2 + 18, height / 2 - 14);
  graphics.lineTo(width / 2 - 18, height / 2 - 14);
  graphics.stroke();
  graphics.strokeColor = color(UI_COLORS.paper, 125);
  graphics.lineWidth = 3;
  graphics.moveTo(-width / 2 + 18, height / 2 - 22);
  graphics.lineTo(width / 2 - 18, height / 2 - 22);
  graphics.stroke();
}

export function drawAngledMarquee(
  node: Node,
  width: number,
  height: number,
  fill: Color,
  outline: Color,
): void {
  sizeNode(node, width, height);
  const graphics = node.getComponent(Graphics) ?? node.addComponent(Graphics);
  const inset = 18;
  const drawShape = (offsetX: number, offsetY: number): void => {
    graphics.moveTo(-width / 2 + inset + offsetX, height / 2 + offsetY);
    graphics.lineTo(width / 2 - inset + offsetX, height / 2 + offsetY);
    graphics.lineTo(width / 2 + offsetX, height / 2 - inset + offsetY);
    graphics.lineTo(width / 2 - 18 + offsetX, -height / 2 + offsetY);
    graphics.lineTo(-width / 2 + 18 + offsetX, -height / 2 + offsetY);
    graphics.lineTo(-width / 2 + offsetX, height / 2 - inset + offsetY);
    graphics.close();
  };

  graphics.clear();
  graphics.fillColor = color(UI_COLORS.ink, 165);
  drawShape(0, -9);
  graphics.fill();
  graphics.fillColor = outline;
  drawShape(0, 0);
  graphics.fill();
  graphics.fillColor = fill;
  drawShape(0, -6);
  graphics.fill();
  graphics.strokeColor = color('#9DDDEB');
  graphics.lineWidth = 5;
  graphics.moveTo(-width / 2 + 38, height / 2 - 16);
  graphics.lineTo(width / 2 - 38, height / 2 - 16);
  graphics.stroke();
}

export function drawAssetBadge(
  node: Node,
  width: number,
  height: number,
  icon: 'coin' | 'doll',
): void {
  sizeNode(node, width, height);
  const graphics = node.getComponent(Graphics) ?? node.addComponent(Graphics);
  graphics.clear();
  graphics.fillColor = color(UI_COLORS.ink, 145);
  graphics.rect(-width / 2 + 5, -height / 2 - 7, width - 5, height);
  graphics.fill();
  graphics.fillColor = color(UI_COLORS.ink);
  graphics.rect(-width / 2, -height / 2, width, height);
  graphics.fill();
  graphics.fillColor = color(UI_COLORS.paper);
  graphics.rect(-width / 2 + 6, -height / 2 + 6, width - 12, height - 12);
  graphics.fill();

  const iconX = -width / 2 + 32;
  graphics.fillColor = color(UI_COLORS.gold);
  if (icon === 'coin') {
    graphics.circle(iconX, 0, 11);
  } else {
    drawStarPath(graphics, iconX, 0, 14, 6);
  }
  graphics.fill();
}

export function drawMachineShowcaseFrame(
  node: Node,
  width: number,
  height: number,
  leftAccent: Color,
  rightAccent: Color,
): void {
  sizeNode(node, width, height);
  const graphics = node.getComponent(Graphics) ?? node.addComponent(Graphics);
  const left = -width / 2;
  const right = width / 2;
  const top = height / 2;
  const bottom = -height / 2;
  graphics.clear();

  graphics.strokeColor = color(UI_COLORS.ink, 220);
  graphics.lineWidth = 8;
  graphics.moveTo(left, top);
  graphics.lineTo(right, top);
  graphics.stroke();
  graphics.strokeColor = leftAccent;
  graphics.lineWidth = 9;
  graphics.moveTo(left, top - 10);
  graphics.lineTo(left, bottom);
  graphics.lineTo(0, bottom);
  graphics.stroke();
  graphics.strokeColor = rightAccent;
  graphics.moveTo(right, top - 10);
  graphics.lineTo(right, bottom);
  graphics.lineTo(0, bottom);
  graphics.stroke();
}

export function drawMachineNameTicket(node: Node, width: number, height: number): void {
  sizeNode(node, width, height);
  const graphics = node.getComponent(Graphics) ?? node.addComponent(Graphics);
  graphics.clear();
  graphics.fillColor = color(UI_COLORS.ink, 150);
  graphics.moveTo(-width / 2 + 5, height / 2 - 5);
  graphics.lineTo(width / 2, height / 2 - 5);
  graphics.lineTo(width / 2 - 7, -height / 2 - 7);
  graphics.lineTo(-width / 2 + 12, -height / 2 - 7);
  graphics.close();
  graphics.fill();
  graphics.fillColor = color(UI_COLORS.ink);
  graphics.moveTo(-width / 2, height / 2);
  graphics.lineTo(width / 2 - 8, height / 2);
  graphics.lineTo(width / 2, -height / 2);
  graphics.lineTo(-width / 2 + 8, -height / 2);
  graphics.close();
  graphics.fill();
  graphics.fillColor = color(UI_COLORS.gold);
  graphics.moveTo(-width / 2 + 6, height / 2 - 6);
  graphics.lineTo(width / 2 - 13, height / 2 - 6);
  graphics.lineTo(width / 2 - 7, -height / 2 + 6);
  graphics.lineTo(-width / 2 + 13, -height / 2 + 6);
  graphics.close();
  graphics.fill();
}

export function drawChevronButton(node: Node, direction: -1 | 1): void {
  sizeNode(node, 58, 72);
  const graphics = node.getComponent(Graphics) ?? node.addComponent(Graphics);
  graphics.clear();
  graphics.fillColor = color(UI_COLORS.ink, 210);
  graphics.roundRect(-29, -36, 58, 72, 6);
  graphics.fill();
  graphics.strokeColor = color(UI_COLORS.paper);
  graphics.lineWidth = 7;
  graphics.moveTo(direction * -8, 18);
  graphics.lineTo(direction * 10, 0);
  graphics.lineTo(direction * -8, -18);
  graphics.stroke();
}

function drawStarPath(
  graphics: Graphics,
  centerX: number,
  centerY: number,
  outerRadius: number,
  innerRadius: number,
): void {
  for (let point = 0; point < 10; point += 1) {
    const radius = point % 2 === 0 ? outerRadius : innerRadius;
    const angle = -Math.PI / 2 + point * Math.PI / 5;
    const x = centerX + Math.cos(angle) * radius;
    const y = centerY + Math.sin(angle) * radius;
    if (point === 0) graphics.moveTo(x, y);
    else graphics.lineTo(x, y);
  }
  graphics.close();
}

export function drawLedDisplay(node: Node, width: number, height: number, accent: Color): void {
  sizeNode(node, width, height);
  const graphics = node.getComponent(Graphics) ?? node.addComponent(Graphics);
  graphics.clear();
  graphics.fillColor = color(UI_COLORS.ink, 205);
  graphics.roundRect(-width / 2 + 4, -height / 2 - 6, width - 8, height, 6);
  graphics.fill();
  graphics.fillColor = color('#07141C', 248);
  graphics.roundRect(-width / 2, -height / 2, width, height, 6);
  graphics.fill();
  graphics.strokeColor = accent;
  graphics.lineWidth = 5;
  graphics.roundRect(-width / 2 + 3, -height / 2 + 3, width - 6, height - 6, 5);
  graphics.stroke();
  graphics.strokeColor = color(UI_COLORS.paper, 50);
  graphics.lineWidth = 2;
  graphics.moveTo(-width / 2 + 14, height / 2 - 12);
  graphics.lineTo(width / 2 - 14, height / 2 - 12);
  graphics.stroke();
}

export function drawConsoleDeck(node: Node, width: number, height: number): void {
  sizeNode(node, width, height);
  const graphics = node.getComponent(Graphics) ?? node.addComponent(Graphics);
  graphics.clear();
  graphics.fillColor = color(UI_COLORS.ink, 180);
  graphics.roundRect(-width / 2 + 8, -height / 2 - 10, width - 16, height + 4, 8);
  graphics.fill();
  graphics.fillColor = color('#E8F4F3');
  graphics.roundRect(-width / 2, -height / 2, width, height, 8);
  graphics.fill();
  graphics.fillColor = color(UI_COLORS.aqua);
  graphics.roundRect(-width / 2, -height / 2, width, 74, 8);
  graphics.fill();
  graphics.fillColor = color('#D7E7E8');
  graphics.roundRect(-width / 2 + 18, -height / 2 + 84, width - 36, height - 108, 8);
  graphics.fill();
  graphics.strokeColor = color(UI_COLORS.paper, 210);
  graphics.lineWidth = 6;
  graphics.moveTo(-width / 2 + 22, height / 2 - 18);
  graphics.lineTo(width / 2 - 22, height / 2 - 18);
  graphics.stroke();
}

export function drawCommandButton(
  node: Node,
  width: number,
  height: number,
  fill: Color,
  outline: Color,
): void {
  sizeNode(node, width, height);
  const graphics = node.getComponent(Graphics) ?? node.addComponent(Graphics);
  graphics.clear();
  graphics.fillColor = color(UI_COLORS.ink, 145);
  graphics.roundRect(-width / 2 + 4, -height / 2 - 7, width - 8, height, 8);
  graphics.fill();
  graphics.fillColor = outline;
  graphics.roundRect(-width / 2, -height / 2, width, height, 8);
  graphics.fill();
  graphics.fillColor = fill;
  graphics.roundRect(-width / 2 + 5, -height / 2 + 5, width - 10, height - 10, 6);
  graphics.fill();
  graphics.strokeColor = color(UI_COLORS.paper, 120);
  graphics.lineWidth = 3;
  graphics.moveTo(-width / 2 + 16, height / 2 - 12);
  graphics.lineTo(width / 2 - 16, height / 2 - 12);
  graphics.stroke();
}

export function drawTicketPanel(node: Node, width: number, height: number): void {
  sizeNode(node, width, height);
  const graphics = node.getComponent(Graphics) ?? node.addComponent(Graphics);
  graphics.clear();
  graphics.fillColor = color(UI_COLORS.ink, 140);
  graphics.roundRect(-width / 2 + 7, -height / 2 - 10, width - 14, height, 8);
  graphics.fill();
  graphics.fillColor = color(UI_COLORS.aqua);
  graphics.roundRect(-width / 2, -height / 2, width, height, 8);
  graphics.fill();
  graphics.fillColor = color('#F4FBFA');
  graphics.roundRect(-width / 2 + 7, -height / 2 + 7, width - 14, height - 14, 6);
  graphics.fill();
  graphics.fillColor = color(UI_COLORS.coral);
  graphics.roundRect(-width / 2 + 7, height / 2 - 104, width - 14, 97, 6);
  graphics.fill();
  graphics.strokeColor = color(UI_COLORS.gold);
  graphics.lineWidth = 4;
  graphics.moveTo(-width / 2 + 36, height / 2 - 112);
  graphics.lineTo(width / 2 - 36, height / 2 - 112);
  graphics.stroke();
}

export function drawPhysicalButton(node: Node, diameter: number, fill: Color, outline: Color): void {
  sizeNode(node, diameter, diameter);
  const graphics = node.getComponent(Graphics) ?? node.addComponent(Graphics);
  const radius = diameter / 2;
  graphics.clear();
  graphics.fillColor = color(UI_COLORS.ink, 145);
  graphics.circle(0, -10, radius);
  graphics.fill();
  graphics.fillColor = outline;
  graphics.circle(0, 0, radius);
  graphics.fill();
  graphics.fillColor = color('#D7E7E8');
  graphics.circle(0, 0, radius - 8);
  graphics.fill();
  graphics.fillColor = fill;
  graphics.strokeColor = outline;
  graphics.lineWidth = 4;
  graphics.circle(0, 1, radius - 16);
  graphics.fill();
  graphics.stroke();
  graphics.strokeColor = color(UI_COLORS.paper, 125);
  graphics.lineWidth = 4;
  graphics.arc(0, 4, radius - 26, 0.35, 2.75, false);
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
  const node = ensureUiNode(parent, name);
  sizeNode(node, width, height);
  const label = node.getComponent(Label) ?? node.addComponent(Label);
  styleLabel(label, fontSize, labelColor, role);
  return label;
}
