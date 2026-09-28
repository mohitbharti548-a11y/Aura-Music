// scripts/generate-png-icons.ts - Pure Node.js PNG icon generator with glowing Aura soundwave
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

function generateAuraPNG(width: number, height: number): Buffer {
  // Signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.writeUInt8(8, 8); // 8-bit depth
  ihdr.writeUInt8(6, 9); // RGBA color type
  ihdr.writeUInt8(0, 10); // compression
  ihdr.writeUInt8(0, 11); // filter
  ihdr.writeUInt8(0, 12); // interlace

  const ihdrChunk = makeChunk('IHDR', ihdr);

  // Raw scanlines with filter byte 0
  const rowSize = 1 + width * 4;
  const rawData = Buffer.alloc(height * rowSize);

  const cx = width / 2;
  const cy = height / 2;
  const radius = width * 0.44;

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0; // Filter None

    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4;
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist <= radius) {
        // Rounded app icon with dark obsidian background
        const gradX = x / width;
        const gradY = y / height;

        // Base dark gradient #0b0b14 -> #171026
        let r = Math.round(11 + gradY * 18);
        let g = Math.round(11 + gradX * 6);
        let b = Math.round(20 + gradY * 26);

        // Center soundwave ring & glowing aura
        const ringDist = Math.abs(dist - radius * 0.58);
        if (ringDist < width * 0.04) {
          // Violet ring
          const ringAlpha = 1 - ringDist / (width * 0.04);
          r = Math.round(r * (1 - ringAlpha) + 147 * ringAlpha);
          g = Math.round(g * (1 - ringAlpha) + 51 * ringAlpha);
          b = Math.round(b * (1 - ringAlpha) + 234 * ringAlpha);
        }

        // Center horizontal wave bars
        const inCenterY = Math.abs(y - cy) < height * 0.18;
        if (inCenterY && Math.abs(dx) < width * 0.28) {
          const wave = Math.sin((dx / (width * 0.28)) * Math.PI * 2.5) * (height * 0.12);
          const waveDist = Math.abs(dy - wave);
          if (waveDist < width * 0.035) {
            const waveAlpha = 1 - waveDist / (width * 0.035);
            r = Math.round(r * (1 - waveAlpha) + 216 * waveAlpha);
            g = Math.round(g * (1 - waveAlpha) + 180 * waveAlpha);
            b = Math.round(b * (1 - waveAlpha) + 254 * waveAlpha);
          }
        }

        rawData[pxOffset] = r;
        rawData[pxOffset + 1] = g;
        rawData[pxOffset + 2] = b;
        rawData[pxOffset + 3] = 255;
      } else {
        // Transparent outside circular radius
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
console.log('✓ Created public/icons/icon-192.png');

const png512 = generateAuraPNG(512, 512);
fs.writeFileSync(path.join(outDir, 'icon-512.png'), png512);
console.log('✓ Created public/icons/icon-512.png');

fs.writeFileSync(path.join(outDir, 'maskable-512.png'), png512);
console.log('✓ Created public/icons/maskable-512.png');
