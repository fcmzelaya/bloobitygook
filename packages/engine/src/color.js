// Small HSL->hex helper shared by both apps for randomizing spawned ball
// colors. Kept as hex (not hsl(...) strings) so it round-trips cleanly
// through both SVG `fill` and an <input type="color"> in the editor.
export function hslToHex(h, s, l) {
  s /= 100;
  l /= 100;
  const k = (n) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const toHex = (x) => Math.round(255 * x).toString(16).padStart(2, "0");
  return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`;
}

export function randomBallColor() {
  return hslToHex(Math.round(Math.random() * 360), 55, 60);
}
