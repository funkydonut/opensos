import type { Map as MapboxMap } from "mapbox-gl";

const PIN_SIZE = 96; // internal canvas px; rendered at pixelRatio:2 → crisp on HiDPI

/**
 * Draws a teardrop-shaped map pin on `ctx`.
 *
 * Geometry: a circular head plus two straight edges tangent to the head
 * that meet at a sharp tip. Using tangent points (instead of beziers
 * eyeballed from outside the circle) guarantees a clean, symmetric shape
 * with no kinks where the head joins the tail.
 */
function drawPin(
  ctx: CanvasRenderingContext2D,
  fillColor: string,
  emoji: string,
  size: number,
  dimmed: boolean,
): void {
  const cx = size / 2;
  const headR = size * 0.31;
  const headCy = size * 0.34;
  const tipY = size * 0.94;

  // Angle (from positive x-axis, measured downward in canvas coords) at which
  // a straight line from the tip is tangent to the head circle.
  const d = tipY - headCy;
  const sinT = headR / d;
  const cosT = Math.sqrt(1 - sinT * sinT);
  const theta = Math.asin(sinT);

  const rightTanX = cx + headR * cosT;
  const rightTanY = headCy + headR * sinT;

  // Drop shadow
  ctx.shadowColor = "rgba(0,0,0,0.40)";
  ctx.shadowBlur = size * 0.10;
  ctx.shadowOffsetY = size * 0.05;
  ctx.shadowOffsetX = 0;

  ctx.beginPath();
  ctx.moveTo(cx, tipY);
  ctx.lineTo(rightTanX, rightTanY);
  // Arc anticlockwise from right tangent through the TOP of the head circle
  // to the left tangent (canvas y grows downward, so anticlockwise sweeps up).
  ctx.arc(cx, headCy, headR, theta, Math.PI - theta, true);
  ctx.lineTo(cx, tipY);
  ctx.closePath();

  const alpha = dimmed ? 0.45 : 1.0;
  ctx.globalAlpha = alpha;
  ctx.fillStyle = fillColor;
  ctx.fill();

  ctx.shadowColor = "transparent";
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = size * 0.07;
  ctx.stroke();

  ctx.font = `${Math.round(size * 0.30)}px sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(emoji, cx, headCy);

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
