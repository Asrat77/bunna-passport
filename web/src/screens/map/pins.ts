import { phCheck, phCoffeeFill } from "@/ui/icons";

/** The pin images the café layer draws, keyed by MapLibre image id. */
export const PIN_STAMPED = "bunna-pin-stamped";
export const PIN_OPEN = "bunna-pin-open";
/** Cluster images are made on demand, one per count label: `bunna-cluster-12`. */
export const CLUSTER_PREFIX = "bunna-cluster-";

export type PinColours = {
  /** The Mocha red every café wears. */
  mocha: string;
  /** The cup on the red disc. */
  onMocha: string;
  /** The ring round a pin and the cluster pill's face. */
  raised: string;
  ink: string;
  border: string;
  /** The "been here" tick's disc; its mark is the map's surface. */
  badge: string;
  surface: string;
  shadow: string;
};

const PIN = 30;
const DISC = 11;

/**
 * A café: a small Mocha disc with a white cup, ringed in paper so it lifts off
 * the map without a heavy shadow. Once you've been, a dark tick sits on its
 * shoulder, the same "been here" the passport shows. Drawn on a canvas at the
 * screen's density so it stays crisp.
 */
export function drawPin(colours: PinColours, stamped: boolean, ratio: number): ImageData {
  const context = canvas(PIN, PIN, ratio);
  const c = PIN / 2;

  context.shadowColor = colours.shadow;
  context.shadowBlur = 3;
  context.shadowOffsetY = 1;
  disc(context, c, c, DISC + 2, colours.raised);
  context.shadowColor = "transparent";
  disc(context, c, c, DISC, colours.mocha);
  glyph(context, phCoffeeFill, c, c, 12, colours.onMocha);

  if (stamped) {
    const bx = c + 8;
    const by = c - 8;
    disc(context, bx, by, 6, colours.raised);
    disc(context, bx, by, 4.75, colours.badge);
    glyph(context, phCheck, bx, by, 7, colours.surface);
  }
  return context.getImageData(0, 0, PIN * ratio, PIN * ratio);
}

/**
 * Many cafés at once: a paper pill with the cup and how many, "☕ 24", so it
 * reads as "24 cafés here" rather than a bare number. Tap it to zoom in.
 */
export function drawCluster(colours: PinColours, label: string, ratio: number): ImageData {
  const font = "600 13px Geist, system-ui, sans-serif";
  const measure = canvas(1, 1, 1);
  measure.font = font;
  const height = 28;
  const icon = 14;
  const textWidth = Math.ceil(measure.measureText(label).width);
  const width = 10 + icon + 4 + textWidth + 11;
  const pad = 4;

  const context = canvas(width + pad * 2, height + pad * 2, ratio);
  context.translate(pad, pad);
  const pill = new Path2D();
  pill.roundRect(0.5, 0.5, width - 1, height - 1, height / 2);
  context.shadowColor = colours.shadow;
  context.shadowBlur = 4;
  context.shadowOffsetY = 1;
  context.fillStyle = colours.raised;
  context.fill(pill);
  context.shadowColor = "transparent";
  context.lineWidth = 1;
  context.strokeStyle = colours.border;
  context.stroke(pill);

  glyph(context, phCoffeeFill, 10 + icon / 2, height / 2, icon, colours.mocha);
  context.font = font;
  context.fillStyle = colours.ink;
  context.textBaseline = "middle";
  context.fillText(label, 10 + icon + 4, height / 2 + 0.5);
  return context.getImageData(0, 0, (width + pad * 2) * ratio, (height + pad * 2) * ratio);
}

function canvas(width: number, height: number, ratio: number) {
  const element = document.createElement("canvas");
  element.width = Math.ceil(width * ratio);
  element.height = Math.ceil(height * ratio);
  const context = element.getContext("2d")!;
  context.scale(ratio, ratio);
  return context;
}

function disc(context: CanvasRenderingContext2D, x: number, y: number, radius: number, colour: string) {
  context.beginPath();
  context.arc(x, y, radius, 0, Math.PI * 2);
  context.fillStyle = colour;
  context.fill();
}

// Phosphor icons are drawn on a 256-unit grid.
function glyph(context: CanvasRenderingContext2D, path: string, x: number, y: number, size: number, colour: string) {
  context.save();
  context.translate(x - size / 2, y - size / 2);
  context.scale(size / 256, size / 256);
  context.fillStyle = colour;
  context.fill(new Path2D(path));
  context.restore();
}
