export interface PortraitLayout {
  topHudY: number;
  consoleBottomY: number;
  consoleCenterY: number;
  consoleHeight: number;
  machineWindowBottomY: number;
  machineWindowTopY: number;
  machineWindowHeight: number;
}

const MINIMUM_EFFECTIVE_HEIGHT = 1136;
const CONSOLE_HEIGHT = 300;
const MINIMUM_MACHINE_WINDOW_HEIGHT = 420;
const TOP_HUD_INSET = 72;

export function resolvePortraitLayout(
  visibleHeight: number,
  safeTop: number,
  safeBottom: number,
): PortraitLayout {
  const effectiveHeight = Math.max(MINIMUM_EFFECTIVE_HEIGHT, visibleHeight);
  const topInset = Math.max(0, safeTop);
  const bottomInset = Math.max(0, safeBottom);
  const machineWindowTopY = effectiveHeight / 2 - topInset;
  const requestedConsoleBottomY = -effectiveHeight / 2 + bottomInset;
  const maximumConsoleBottomY = machineWindowTopY
    - CONSOLE_HEIGHT
    - MINIMUM_MACHINE_WINDOW_HEIGHT;
  const consoleBottomY = Math.min(requestedConsoleBottomY, maximumConsoleBottomY);
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
