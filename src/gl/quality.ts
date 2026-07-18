/**
 * One quality decision, made once at load: phones (any orientation) and
 * small windows get the simplified world. Scenes are built once and never
 * rebuilt on resize, so the tier is intentionally sticky for the session.
 */
const smallScreen = Math.min(screen.width, screen.height) < 700;
const smallViewport = window.innerWidth < 820;

export const LOW_POWER = smallScreen || smallViewport;

/** multiplier for scatter/instance counts (meadow tufts, etc.) */
export const DENSITY = LOW_POWER ? 0.45 : 1;

/** multiplier for point-grid / mesh-grid resolution per axis
 *  (0.6 per axis ≈ 64% fewer vertices) */
export const GRID = LOW_POWER ? 0.6 : 1;

/** shadow map edge in texels */
export const SHADOW_MAP = LOW_POWER ? 1024 : 2048;

/** device-pixel-ratio ceiling — phones ship 3x screens the eye can't
 *  tell from 1.4x on a moving scene, but the GPU surely can */
export const DPR_CAP = LOW_POWER ? 1.4 : 1.75;
