// scripts/generate-png-icons.ts - Pure Node.js PNG icon generator for Aura with disconnected 'A' and surrounding sound themes
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

function createCRC32Table(): Uint32Array {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c;
  }
  return table;
}

const crcTable = createCRC32Table();

function crc32(buf: Buffer): number {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function makeChunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);

  const typeBuf = Buffer.from(type, 'ascii');
  const body = Buffer.concat([typeBuf, data]);

  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(body), 0);

  return Buffer.concat([len, body, crcBuf]);
}

// Distance from point (px, py) to line segment (x1, y1) -> (x2, y2)
function distToSegment(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
  const l2 = (x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1);
  if (l2 === 0) return Math.sqrt((px - x1) * (px - x1) + (py - y1) * (py - y1));
  let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
  t = Math.max(0, Math.min(1, t));
  const projX = x1 + t * (x2 - x1);
  const projY = y1 + t * (y2 - y1);
  return Math.sqrt((px - projX) * (px - projX) + (py - projY) * (py - projY));
}

function generateAuraPNG(width: number, height: number): Buffer {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.writeUInt8(8, 8); // 8-bit depth
  ihdr.writeUInt8(6, 9); // RGBA
  ihdr.writeUInt8(0, 10);
  ihdr.writeUInt8(0, 11);
  ihdr.writeUInt8(0, 12);

  const ihdrChunk = makeChunk('IHDR', ihdr);

  const rowSize = 1 + width * 4;
  const rawData = Buffer.alloc(height * rowSize);

  const cx = width / 2;
  const cy = height / 2;
  const cornerRadius = width * 0.22;

  // Geometry scaled to width/height:
  // Left leg: (0.29, 0.74) to (0.50, 0.23)
  const lx1 = width * 0.29, ly1 = height * 0.74;
  const lx2 = width * 0.50, ly2 = height * 0.23;

  // Right leg: (0.50, 0.23) to (0.71, 0.74)
  const rx1 = width * 0.50, ry1 = height * 0.23;
  const rx2 = width * 0.71, ry2 = height * 0.74;

  // Floating disconnected crossbar: (0.42, 0.56) to (0.58, 0.56)
  const bx1 = width * 0.42, by1 = height * 0.56;
  const bx2 = width * 0.58, by2 = height * 0.56;

  const legThickness = width * 0.066;
  const barThickness = width * 0.048;

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0;

    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4;

      // Check rounded rectangle bounds
      const dx = Math.abs(x - cx) - (width / 2 - cornerRadius);
      const dy = Math.abs(y - cy) - (height / 2 - cornerRadius);
      const outsideCorner = dx > 0 && dy > 0 && (dx * dx + dy * dy > cornerRadius * cornerRadius);
      const isInside = x >= 0 && x < width && y >= 0 && y < height && !outsideCorner;

      if (isInside) {
        const nx = x / width;
        const ny = y / height;

        // Rich vibrant ambient gradient (no dull/dark gray tones)
        let r = Math.round(26 + (1 - ny) * 18 + nx * 10);
        let g = Math.round(14 + (1 - ny) * 12 + nx * 20);
        let b = Math.round(48 + ny * 35 + nx * 25);
        let a = 255;

        // 1. Ambient Harmonic Sound Orbit / Radiance
        const centerDist = Math.sqrt((x - cx) * (x - cx) + (y - cy) * (y - cy));
        const orbitRadius = width * 0.36;
        const orbitDist = Math.abs(centerDist - orbitRadius);
        if (orbitDist < width * 0.02) {
          const orbitAlpha = (1 - orbitDist / (width * 0.02)) * 0.45;
          r = Math.round(r * (1 - orbitAlpha) + 168 * orbitAlpha);
          g = Math.round(g * (1 - orbitAlpha) + 85 * orbitAlpha);
          b = Math.round(b * (1 - orbitAlpha) + 247 * orbitAlpha);
        }

        // 2. Surrounding Sound Waves / Lateral Harmonic Arcs
        const leftArcDist = Math.abs(Math.sqrt((x - width * 0.22) ** 2 + (y - height * 0.45) ** 2) - width * 0.18);
        if (leftArcDist < width * 0.018 && x < width * 0.38) {
          const arcAlpha = (1 - leftArcDist / (width * 0.018)) * 0.65;
          r = Math.round(r * (1 - arcAlpha) + 56 * arcAlpha);
          g = Math.round(g * (1 - arcAlpha) + 189 * arcAlpha);
          b = Math.round(b * (1 - arcAlpha) + 248 * arcAlpha);
        }

        const rightArcDist = Math.abs(Math.sqrt((x - width * 0.78) ** 2 + (y - height * 0.45) ** 2) - width * 0.18);
        if (rightArcDist < width * 0.018 && x > width * 0.62) {
          const arcAlpha = (1 - rightArcDist / (width * 0.018)) * 0.65;
          r = Math.round(r * (1 - arcAlpha) + 244 * arcAlpha);
          g = Math.round(g * (1 - arcAlpha) + 114 * arcAlpha);
          b = Math.round(b * (1 - arcAlpha) + 182 * arcAlpha);
        }

        // 3. Left Leg of "A"
        const dLeft = distToSegment(x, y, lx1, ly1, lx2, ly2);
        if (dLeft <= legThickness / 2) {
          const legT = (y - ly2) / (ly1 - ly2);
          // Vivid cyan -> indigo -> purple gradient along leg
          const legR = Math.round(56 + legT * 120);
          const legG = Math.round(189 - legT * 60);
          const legB = Math.round(248 - legT * 20);
          const edgeAlpha = Math.min(1, (legThickness / 2 - dLeft) * 1.5 + 0.5);
          r = Math.round(r * (1 - edgeAlpha) + legR * edgeAlpha);
          g = Math.round(g * (1 - edgeAlpha) + legG * edgeAlpha);
          b = Math.round(b * (1 - edgeAlpha) + legB * edgeAlpha);
        }

        // 4. Right Leg of "A"
        const dRight = distToSegment(x, y, rx1, ry1, rx2, ry2);
        if (dRight <= legThickness / 2) {
          const legT = (y - ry1) / (ry2 - ry1);
          // Vivid indigo -> purple -> pink gradient along right leg
          const legR = Math.round(130 + legT * 114);
          const legG = Math.round(140 - legT * 26);
          const legB = Math.round(250 - legT * 68);
          const edgeAlpha = Math.min(1, (legThickness / 2 - dRight) * 1.5 + 0.5);
          r = Math.round(r * (1 - edgeAlpha) + legR * edgeAlpha);
          g = Math.round(g * (1 - edgeAlpha) + legG * edgeAlpha);
          b = Math.round(b * (1 - edgeAlpha) + legB * edgeAlpha);
        }

        // 5. Floating / Disconnected Crossbar of "A"
        const dBar = distToSegment(x, y, bx1, by1, bx2, by2);
        if (dBar <= barThickness / 2) {
          const barT = (x - bx1) / (bx2 - bx1);
          // Luminous white-pink-cyan core for the floating bar
          const barR = Math.round(240 + Math.sin(barT * Math.PI) * 15);
          const barG = Math.round(210 + Math.sin(barT * Math.PI) * 45);
          const barB = Math.round(255);
          const edgeAlpha = Math.min(1, (barThickness / 2 - dBar) * 2);
          r = Math.round(r * (1 - edgeAlpha) + barR * edgeAlpha);
          g = Math.round(g * (1 - edgeAlpha) + barG * edgeAlpha);
          b = Math.round(b * (1 - edgeAlpha) + barB * edgeAlpha);
        }

        rawData[pxOffset] = r;
        rawData[pxOffset + 1] = g;
        rawData[pxOffset + 2] = b;
        rawData[pxOffset + 3] = a;
      } else {
        rawData[pxOffset] = 0;
        rawData[pxOffset + 1] = 0;
        rawData[pxOffset + 2] = 0;
        rawData[pxOffset + 3] = 0;
      }
    }
  }

  const compressedData = zlib.deflateSync(rawData);
  const idatChunk = makeChunk('IDAT', compressedData);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

const outDir = path.join(process.cwd(), 'public', 'icons');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const png192 = generateAuraPNG(192, 192);
fs.writeFileSync(path.join(outDir, 'icon-192.png'), png192);
console.log('✓ Successfully generated public/icons/icon-192.png');

const png512 = generateAuraPNG(512, 512);
fs.writeFileSync(path.join(outDir, 'icon-512.png'), png512);
console.log('✓ Successfully generated public/icons/icon-512.png');

fs.writeFileSync(path.join(outDir, 'maskable-512.png'), png512);
console.log('✓ Successfully generated public/icons/maskable-512.png');
