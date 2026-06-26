#!/usr/bin/env node
// Generates the PWA / Apple-touch PNG icons from the same ANWB "jacket" motif
// as favicon.svg. No external dependencies — rasterised by hand and encoded
// with the built-in zlib. Re-run with `node scripts/generate-icons.js` after
// changing the design. Output PNGs live in the repo root.

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// ─── Colours (ANWB palette, matching favicon.svg) ──────────────────────────
const NAVY = [0, 58, 113];     // #003a71
const YELLOW = [255, 204, 0];  // #ffcc00
const LAPEL = [0, 37, 81];     // #002551 (darker fold)

// ─── Geometry in the favicon's 32×32 coordinate space ──────────────────────
// Must stay in sync with favicon.svg. The jacket is one yellow silhouette
// (shoulders + sleeves + body + V-neck), with dark navy details (folded
// collar, centre zipper + pull, and cuffs) layered on top.
const jacket = [
  [16, 9], [19.4, 6.2], [21.2, 8.8], [26.8, 11.8], [27.8, 17.2], [23.8, 18.4],
  [21.2, 13.8], [22, 26.6], [16, 27.2], [10, 26.6], [10.8, 13.8], [8.2, 18.4],
  [4.2, 17.2], [5.2, 11.8], [10.8, 8.8], [12.6, 6.2],
];
const collarLeft = [[12.6, 6.2], [16, 9], [14.2, 9.4]];
const collarRight = [[19.4, 6.2], [16, 9], [17.8, 9.4]];
const zipper = [[15.5, 9], [16.5, 9], [16.5, 24.5], [15.5, 24.5]];
const zipperPull = [[14.9, 9], [17.1, 9], [17.1, 10.8], [14.9, 10.8]];
const cuffLeft = [[4.2, 17.2], [8.2, 18.4], [8.7, 17.0], [4.7, 15.8]];
const cuffRight = [[27.8, 17.2], [23.8, 18.4], [23.3, 17.0], [27.3, 15.8]];
const navyDetails = [collarLeft, collarRight, zipper, zipperPull, cuffLeft, cuffRight];

function pointInPoly(x, y, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0], yi = poly[i][1], xj = poly[j][0], yj = poly[j][1];
    if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) inside = !inside;
  }
  return inside;
}

// Render an icon. `square` = full-bleed navy (Apple / maskable); otherwise the
// corners are rounded with transparency. `glyphScale` shrinks the jacket into
// the maskable safe zone.
function render(size, { square, glyphScale = 1 }) {
  const SS = 4; // supersampling for anti-aliasing
  const data = Buffer.alloc(size * size * 4);
  const r = (7 / 32) * size;              // corner radius for rounded icons
  const scale = (size * glyphScale) / 32; // glyph mapping
  const off = (size - size * glyphScale) / 2;

  const insideBg = (px, py) => {
    if (square) return true;
    if (px >= r && px <= size - r) return py >= 0 && py <= size;
    if (py >= r && py <= size - r) return px >= 0 && px <= size;
    const cx = px < r ? r : size - r;
    const cy = py < r ? r : size - r;
    return (px - cx) ** 2 + (py - cy) ** 2 <= r * r;
  };

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let R = 0, G = 0, B = 0, A = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const px = x + (sx + 0.5) / SS;
          const py = y + (sy + 0.5) / SS;
          let c = null;
          if (insideBg(px, py)) c = NAVY;
          const gx = (px - off) / scale, gy = (py - off) / scale;
          if (pointInPoly(gx, gy, jacket)) c = YELLOW;
          for (const d of navyDetails) { if (pointInPoly(gx, gy, d)) { c = LAPEL; break; } }
          if (c) { R += c[0]; G += c[1]; B += c[2]; A += 255; }
        }
      }
      const n = SS * SS;
      const i = (y * size + x) * 4;
      data[i] = Math.round(R / n);
      data[i + 1] = Math.round(G / n);
      data[i + 2] = Math.round(B / n);
      data[i + 3] = Math.round(A / n);
    }
  }
  return data;
}

// ─── Minimal PNG encoder (RGBA, 8-bit) ─────────────────────────────────────
const CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td), 0);
  return Buffer.concat([len, td, crc]);
}
function encodePNG(size, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0; // filter: none
    rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

// ─── Emit the icon set ─────────────────────────────────────────────────────
const root = path.join(__dirname, '..');
const targets = [
  ['icon-192.png', 192, { square: false }],
  ['icon-512.png', 512, { square: false }],
  ['icon-512-maskable.png', 512, { square: true, glyphScale: 0.62 }],
  ['apple-touch-icon.png', 180, { square: true }],
];
for (const [name, size, opts] of targets) {
  const png = encodePNG(size, render(size, opts));
  fs.writeFileSync(path.join(root, name), png);
  console.log(`wrote ${name} (${size}×${size}, ${png.length} bytes)`);
}
