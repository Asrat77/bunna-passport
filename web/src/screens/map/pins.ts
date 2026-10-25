import { mdiCoffee } from "@mdi/js";

/** The pin images the café layer draws, keyed by MapLibre image id. */
export const PIN_STAMPED = "bunna-pin-stamped";
export const PIN_OPEN = "bunna-pin-open";

const WIDTH = 34;
const HEIGHT = 44;

export type PinColours = {
  primary: string;
  onPrimary: string;
  raised: string;
  muted: string;
  faint: string;
  shadow: string;
};

/**
 * A cup in a seal-shaped drop: filled in the primary colour once stamped,
 * paper with a dashed rim until then, echoing the passport's "not yet" seal.
 * Drawn on a canvas at the screen's density so it stays crisp.
 */
export function drawPin(colours: PinColours, stamped: boolean, ratio: number): ImageData {
  const canvas = document.createElement("canvas");
  canvas.width = WIDTH * ratio;
  canvas.height = HEIGHT * ratio;
  const context = canvas.getContext("2d")!;
  context.scale(ratio, ratio);

  const cx = WIDTH / 2;
  const cy = 16;
  const radius = 13;
  const drop = new Path2D();
  drop.arc(cx, cy, radius, Math.PI * 0.78, Math.PI * 2.22);
  drop.lineTo(cx, HEIGHT - 3);
  drop.closePath();

  context.shadowColor = colours.shadow;
  context.shadowBlur = 5;
  context.shadowOffsetY = 2;
  context.fillStyle = stamped ? colours.primary : colours.raised;
  context.fill(drop);
  context.shadowColor = "transparent";

  context.lineWidth = 2;
  context.strokeStyle = stamped ? colours.raised : colours.faint;
  if (!stamped) context.setLineDash([3, 2.5]);
  context.stroke(drop);
  context.setLineDash([]);

  // mdi icons are drawn on a 24-unit grid.
  const size = 15;
  context.save();
  context.translate(cx - size / 2, cy - size / 2);
  context.scale(size / 24, size / 24);
  context.fillStyle = stamped ? colours.onPrimary : colours.muted;
  context.fill(new Path2D(mdiCoffee));
  context.restore();

  return context.getImageData(0, 0, canvas.width, canvas.height);
}
