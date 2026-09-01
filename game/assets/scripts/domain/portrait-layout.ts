export interface PortraitLayout {
  topHudY: number;
  consoleBottomY: number;
  consoleCenterY: number;
  consoleHeight: number;
  machineWindowBottomY: number;
  machineWindowTopY: number;
  machineWindowHeight: number;
}

const DEFAULT_VISIBLE_HEIGHT = 1280;
const CONSOLE_HEIGHT = 300;
const HOME_CONSOLE_HEIGHT = 250;
const TOP_HUD_INSET = 72;

export interface SafeAreaInsets {
  top: number;
  bottom: number;
}

export interface CoverSize {
  width: number;
  height: number;
}

export interface GameUtilityControlLayout {
  back: { x: number; y: number };
  camera: { x: number; y: number };
  settings: { x: number; y: number };
}

export function resolveGameUtilityControlLayout(
  topHudY: number,
  consoleCenterY: number,
): GameUtilityControlLayout {
  const safeTopHudY = Number.isFinite(topHudY) ? topHudY : 0;
  const safeConsoleCenterY = Number.isFinite(consoleCenterY) ? consoleCenterY : 0;
  const topRowY = safeTopHudY - safeConsoleCenterY;
  return {
    back: { x: -292, y: topRowY },
    settings: { x: 300, y: topRowY },
    camera: { x: 300, y: topRowY - 96 },
  };
}

export function resolveFullscreenOverlaySize(
  viewportWidth: number,
  viewportHeight: number,
): CoverSize {
  return {
    width: Number.isFinite(viewportWidth) && viewportWidth > 0 ? viewportWidth : 720,
    height: Number.isFinite(viewportHeight) && viewportHeight > 0
      ? viewportHeight
      : DEFAULT_VISIBLE_HEIGHT,
  };
}

export function resolveCoverSize(
  viewportWidth: number,
  viewportHeight: number,
  imageAspectRatio: number,
): CoverSize {
  const width = Number.isFinite(viewportWidth) && viewportWidth > 0 ? viewportWidth : 720;
  const height = Number.isFinite(viewportHeight) && viewportHeight > 0
    ? viewportHeight
    : DEFAULT_VISIBLE_HEIGHT;
  const aspectRatio = Number.isFinite(imageAspectRatio) && imageAspectRatio > 0
    ? imageAspectRatio
    : 9 / 16;

  if (width / height > aspectRatio) {
    return { width, height: width / aspectRatio };
  }
  return { width: height * aspectRatio, height };
}

export function resolveSafeAreaInsets(
  visibleHeight: number,
  safeArea: { y: number; height: number },
): SafeAreaInsets {
  const effectiveHeight = Number.isFinite(visibleHeight) && visibleHeight > 0
    ? visibleHeight
    : DEFAULT_VISIBLE_HEIGHT;
  const safeY = Number.isFinite(safeArea.y) ? Math.max(0, safeArea.y) : 0;
  const safeHeight = Number.isFinite(safeArea.height) ? Math.max(0, safeArea.height) : effectiveHeight;
  const bottom = Math.min(safeY, effectiveHeight);
  const top = Math.min(Math.max(0, effectiveHeight - safeY - safeHeight), effectiveHeight - bottom);
  return { top, bottom };
}

export function resolvePortraitLayout(
  visibleHeight: number,
  safeTop: number,
  safeBottom: number,
  mode: 'game' | 'home' = 'game',
): PortraitLayout {
  const consoleHeight = mode === 'home' ? HOME_CONSOLE_HEIGHT : CONSOLE_HEIGHT;
  const effectiveHeight = Number.isFinite(visibleHeight) && visibleHeight > 0
    ? visibleHeight
    : DEFAULT_VISIBLE_HEIGHT;
  const availableInsetHeight = Math.max(0, effectiveHeight - consoleHeight);
  const requestedBottomInset = Number.isFinite(safeBottom) ? Math.max(0, safeBottom) : 0;
  const bottomInset = Math.min(requestedBottomInset, availableInsetHeight);
  const remainingTopInset = availableInsetHeight - bottomInset;
  const requestedTopInset = Number.isFinite(safeTop) ? Math.max(0, safeTop) : 0;
  const topInset = Math.min(requestedTopInset, remainingTopInset);
  const machineWindowTopY = effectiveHeight / 2 - topInset;
  const consoleBottomY = -effectiveHeight / 2 + bottomInset;
  const machineWindowBottomY = consoleBottomY + consoleHeight;

  return {
    topHudY: machineWindowTopY - TOP_HUD_INSET,
    consoleBottomY,
    consoleCenterY: consoleBottomY + consoleHeight / 2,
    consoleHeight,
    machineWindowBottomY,
    machineWindowTopY,
    machineWindowHeight: machineWindowTopY - machineWindowBottomY,
  };
}
