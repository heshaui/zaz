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
