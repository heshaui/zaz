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
const TOP_HUD_INSET = 72;

export function resolvePortraitLayout(
  visibleHeight: number,
  safeTop: number,
  safeBottom: number,
): PortraitLayout {
  const effectiveHeight = Number.isFinite(visibleHeight) && visibleHeight > 0
    ? visibleHeight
    : DEFAULT_VISIBLE_HEIGHT;
  const availableInsetHeight = Math.max(0, effectiveHeight - CONSOLE_HEIGHT);
  const requestedBottomInset = Number.isFinite(safeBottom) ? Math.max(0, safeBottom) : 0;
  const bottomInset = Math.min(requestedBottomInset, availableInsetHeight);
  const remainingTopInset = availableInsetHeight - bottomInset;
  const requestedTopInset = Number.isFinite(safeTop) ? Math.max(0, safeTop) : 0;
  const topInset = Math.min(requestedTopInset, remainingTopInset);
  const machineWindowTopY = effectiveHeight / 2 - topInset;
  const consoleBottomY = -effectiveHeight / 2 + bottomInset;
  const machineWindowBottomY = consoleBottomY + CONSOLE_HEIGHT;

  return {
    topHudY: machineWindowTopY - TOP_HUD_INSET,
    consoleBottomY,
    consoleCenterY: consoleBottomY + CONSOLE_HEIGHT / 2,
    consoleHeight: CONSOLE_HEIGHT,
    machineWindowBottomY,
    machineWindowTopY,
    machineWindowHeight: machineWindowTopY - machineWindowBottomY,
  };
}
