export type Stroke = { x: number; y: number; p?: number }[];

/**
 * A signature is meaningful when it has enough drawn length and covers a
 * reasonable area. Rejects empty pads, single taps and tiny scribbles.
 * Points are relative (0..1); width/height are the on-screen pad size in px.
 */
export function isMeaningfulSignature(strokes: Stroke[], width: number, height: number): boolean {
  const points = strokes.flat();
  if (points.length < 10) return false;
  let length = 0;
  for (const s of strokes) {
    for (let i = 1; i < s.length; i++) {
      length += Math.hypot((s[i].x - s[i - 1].x) * width, (s[i].y - s[i - 1].y) * height);
    }
  }
  const xs = points.map(p => p.x * width);
  const ys = points.map(p => p.y * height);
  const boxW = Math.max(...xs) - Math.min(...xs);
  const boxH = Math.max(...ys) - Math.min(...ys);
  return length >= 80 && boxW >= 40 && boxH >= 10;
}
