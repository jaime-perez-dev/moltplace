import { NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../convex/_generated/api";
import zlib from "node:zlib";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

// 16-color palette matching the Express backend
const COLOR_PALETTE: [number, number, number][] = [
  [255, 255, 255], // 0: White
  [228, 228, 228], // 1: Light Gray
  [136, 136, 136], // 2: Dark Gray
  [34, 34, 34],    // 3: Black
  [255, 167, 209], // 4: Pink
  [229, 0, 0],     // 5: Red
  [229, 149, 0],   // 6: Orange
  [160, 106, 66],  // 7: Brown
  [229, 217, 0],   // 8: Yellow
  [148, 224, 68],  // 9: Light Green
  [2, 190, 1],     // 10: Green
  [0, 211, 221],   // 11: Cyan
  [0, 131, 199],   // 12: Teal
  [0, 0, 234],     // 13: Blue
  [207, 110, 228], // 14: Magenta
  [130, 0, 128],   // 15: Purple
];

// Hex color to nearest palette index
function hexToIndex(hex: string): number {
  const h = hex.replace("#", "");
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  let best = 0;
  let bestDist = Infinity;
  for (let i = 0; i < COLOR_PALETTE.length; i++) {
    const [pr, pg, pb] = COLOR_PALETTE[i];
    const d = (r - pr) ** 2 + (g - pg) ** 2 + (b - pb) ** 2;
    if (d < bestDist) {
      bestDist = d;
      best = i;
    }
  }
  return best;
}

// Minimal PNG encoder (no external deps)
function createPNG(width: number, height: number, rgbaData: Uint8Array): Buffer {
  // PNG signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type: RGB (no alpha to save space)
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  // Build raw image data with filter bytes (filter = 0 = None for each row)
  const rawRows = Buffer.alloc(height * (1 + width * 3));
  for (let y = 0; y < height; y++) {
    const rowOffset = y * (1 + width * 3);
    rawRows[rowOffset] = 0; // filter byte
    for (let x = 0; x < width; x++) {
      const srcIdx = (y * width + x) * 4;
      const dstIdx = rowOffset + 1 + x * 3;
      rawRows[dstIdx] = rgbaData[srcIdx];     // R
      rawRows[dstIdx + 1] = rgbaData[srcIdx + 1]; // G
      rawRows[dstIdx + 2] = rgbaData[srcIdx + 2]; // B
    }
  }

  const compressed = zlib.deflateSync(rawRows, { level: 6 });

  // Build chunks
  const chunks: Buffer[] = [signature];
  chunks.push(makeChunk("IHDR", ihdr));
  chunks.push(makeChunk("IDAT", compressed));
  chunks.push(makeChunk("IEND", Buffer.alloc(0)));

  return Buffer.concat(chunks);
}

function makeChunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crcInput = Buffer.concat([typeBuf, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(crcInput) >>> 0, 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

// CRC32 for PNG chunks
function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return c ^ 0xffffffff;
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c;
  }
  return table;
})();

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const scaleParam = parseInt(searchParams.get("scale") || "1", 10);
    const scale = Math.min(Math.max(scaleParam || 1, 1), 4);

    const [pixels, dimensions] = await Promise.all([
      convex.query(api.canvas.getCanvas, {}),
      convex.query(api.canvas.getDimensions, {}),
    ]);

    const width = dimensions.width;
    const height = dimensions.height;
    const outW = width * scale;
    const outH = height * scale;

    // Build RGBA buffer (white background)
    const rgba = new Uint8Array(outW * outH * 4);
    // Fill with white
    for (let i = 0; i < rgba.length; i += 4) {
      rgba[i] = 255;
      rgba[i + 1] = 255;
      rgba[i + 2] = 255;
      rgba[i + 3] = 255;
    }

    // Paint pixels
    for (const p of pixels) {
      let colorIdx: number;
      if (typeof p.color === "number") {
        colorIdx = Math.max(0, Math.min(15, p.color));
      } else {
        colorIdx = hexToIndex(p.color);
      }
      const [r, g, b] = COLOR_PALETTE[colorIdx] ?? COLOR_PALETTE[0];

      for (let sy = 0; sy < scale; sy++) {
        for (let sx = 0; sx < scale; sx++) {
          const px = p.x * scale + sx;
          const py = p.y * scale + sy;
          const idx = (py * outW + px) * 4;
          rgba[idx] = r;
          rgba[idx + 1] = g;
          rgba[idx + 2] = b;
          rgba[idx + 3] = 255;
        }
      }
    }

    const pngBuffer = createPNG(outW, outH, rgba);

    return new NextResponse(new Uint8Array(pngBuffer), {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Content-Disposition": 'inline; filename="moltplace-canvas.png"',
        "Cache-Control": "public, max-age=10",
      },
    });
  } catch (error) {
    console.error("Canvas PNG error:", error);
    return NextResponse.json({ error: "Failed to generate PNG" }, { status: 500 });
  }
}
