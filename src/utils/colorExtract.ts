/**
 * Extract dominant colors from an image for background gradient
 */
export async function extractColors(
  imageUrl: string
): Promise<{ primary: string; secondary: string; accent: string }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 50;
        canvas.height = 50;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve({ primary: '#1a1a2e', secondary: '#16213e', accent: '#0f3460' });
          return;
        }
        ctx.drawImage(img, 0, 0, 50, 50);
        const data = ctx.getImageData(0, 0, 50, 50).data;

        // Sample pixels and bucket into color groups
        const colorBuckets: Record<string, { r: number; g: number; b: number; count: number }> = {};

        for (let i = 0; i < data.length; i += 4) {
          const r = Math.round(data[i] / 32) * 32;
          const g = Math.round(data[i + 1] / 32) * 32;
          const b = Math.round(data[i + 2] / 32) * 32;
          const key = `${r},${g},${b}`;
          if (!colorBuckets[key]) {
            colorBuckets[key] = { r, g, b, count: 0 };
          }
          colorBuckets[key].count++;
        }

        const sorted = Object.values(colorBuckets).sort((a, b) => b.count - a.count);

        const toHex = (r: number, g: number, b: number) =>
          `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;

        // Darken colors for background
        const darken = (r: number, g: number, b: number, factor = 0.55) => ({
          r: Math.round(r * factor),
          g: Math.round(g * factor),
          b: Math.round(b * factor),
        });

        const c1 = sorted[0] || { r: 26, g: 26, b: 46 };
        const c2 = sorted[Math.min(3, sorted.length - 1)] || { r: 22, g: 33, b: 62 };
        const c3 = sorted[Math.min(6, sorted.length - 1)] || { r: 15, g: 52, b: 96 };

        const d1 = darken(c1.r, c1.g, c1.b);
        const d2 = darken(c2.r, c2.g, c2.b);
        const d3 = darken(c3.r, c3.g, c3.b);

        resolve({
          primary: toHex(d1.r, d1.g, d1.b),
          secondary: toHex(d2.r, d2.g, d2.b),
          accent: toHex(d3.r, d3.g, d3.b),
        });
      } catch {
        resolve({ primary: '#1a1a2e', secondary: '#16213e', accent: '#0f3460' });
      }
    };
    img.onerror = () => {
      resolve({ primary: '#1a1a2e', secondary: '#16213e', accent: '#0f3460' });
    };
    img.src = imageUrl;
  });
}
