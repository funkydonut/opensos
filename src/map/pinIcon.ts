import type { Map as MapboxMap } from "mapbox-gl";

const PIN_SIZE = 80; // internal canvas px; rendered at pixelRatio:2 → crisp on HiDPI

/**
 * Draws a teardrop-shaped map pin on `ctx`.
 *
 * Layout (all in canvas units):
 *   - circular head centred at (cx, headCy)
 *   - two bezier curves taper to a sharp tip at (cx, tipY)
 *   - icon emoji centred inside the head circle
 */
function drawPin(
  ctx: CanvasRenderingContext2D,
  fillColor: string,
  emoji: string,
  size: number,
  dimmed: boolean,
): void {
  const cx = size / 2;
  const headR = size * 0.30;       // radius of the circular head
  const headCy = size * 0.34;      // vertical centre of the head
  const tipY = size * 0.91;        // tip of the pin
  const shoulderX = headR * 0.92;  // how wide the "shoulders" are before the taper

  // Drop shadow
  ctx.shadowColor = "rgba(0,0,0,0.40)";
  ctx.shadowBlur = size * 0.10;
  ctx.shadowOffsetY = size * 0.05;
  ctx.shadowOffsetX = 0;

  // ── Pin silhouette ──────────────────────────────────────────────────────────
  ctx.beginPath();
  // Start at the bottom-left of the head circle (angle 135° = top-left quadrant)
  const startAngle = Math.PI * 0.72;
  const endAngle = Math.PI * 0.28;
  ctx.arc(cx, headCy, headR, startAngle, endAngle); // clockwise arc across the top
  // Right shoulder → tip
  ctx.quadraticCurveTo(cx + shoulderX, headCy + headR * 1.55, cx, tipY);
  // Tip → left shoulder (closing)
  ctx.quadraticCurveTo(cx - shoulderX, headCy + headR * 1.55, cx, headCy + headR * Math.sin(startAngle) + headCy);
  ctx.closePath();

  const alpha = dimmed ? 0.45 : 1.0;
  ctx.globalAlpha = alpha;
  ctx.fillStyle = fillColor;
  ctx.fill();

  // ── White border ────────────────────────────────────────────────────────────
  ctx.shadowColor = "transparent";
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = size * 0.072;
  ctx.stroke();

  // ── Emoji icon ──────────────────────────────────────────────────────────────
  ctx.font = `${Math.round(size * 0.28)}px sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  // Slight nudge upward so the emoji sits visually centred in the circle head
  ctx.fillText(emoji, cx, headCy + size * 0.012);

  ctx.globalAlpha = 1.0;
}

function makePinImageData(
  fillColor: string,
  emoji: string,
  dimmed: boolean,
): { width: number; height: number; data: Uint8ClampedArray } {
  const canvas = document.createElement("canvas");
  canvas.width = PIN_SIZE;
  canvas.height = PIN_SIZE;
  const ctx = canvas.getContext("2d")!;
  drawPin(ctx, fillColor, emoji, PIN_SIZE, dimmed);
  return ctx.getImageData(0, 0, PIN_SIZE, PIN_SIZE);
}

/**
 * Registers the four pin images that `pinsLayer.ts` references by name.
 * Must be called after `map.on("load")` fires and before `addPinsLayers`.
 */
export function registerPinImages(map: MapboxMap): void {
  const specs: Array<[name: string, color: string, emoji: string, dimmed: boolean]> = [
    ["pin-need",      "#ef4444", "🆘", false],
    ["pin-offer",     "#22c55e", "✋", false],
    ["pin-need-dim",  "#ef4444", "🆘", true],
    ["pin-offer-dim", "#22c55e", "✋", true],
  ];

  for (const [name, color, emoji, dimmed] of specs) {
    if (!map.hasImage(name)) {
      map.addImage(name, makePinImageData(color, emoji, dimmed), { pixelRatio: 2 });
    }
  }
}
