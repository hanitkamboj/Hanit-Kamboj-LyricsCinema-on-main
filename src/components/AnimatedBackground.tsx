import React, { useEffect, useRef } from 'react';

interface Colors {
  primary: string;
  secondary: string;
  accent: string;
}

interface Props {
  artworkUrl: string | null;
  colors: Colors;
  isRendering?: boolean;
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return [r, g, b];
}

const AnimatedBackground: React.FC<Props> = ({ artworkUrl, colors, isRendering = false }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const timeRef = useRef<number>(0);
  const lastTsRef = useRef<number>(0);

  // Load artwork image
  useEffect(() => {
    if (!artworkUrl) {
      imgRef.current = null;
      return;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => { imgRef.current = img; };
    img.onerror = () => { imgRef.current = null; };
    img.src = artworkUrl;
  }, [artworkUrl]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    // Resize canvas to actual pixel dimensions
    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      ctx.scale(dpr, dpr);
    };

    resize();
    const ro = new ResizeObserver(() => resize());
    ro.observe(canvas);

    // Blob config — Apple Music style wandering color blobs
    const blobs = Array.from({ length: 6 }, (_, i) => ({
      x: 0.1 + Math.random() * 0.8,
      y: 0.1 + Math.random() * 0.8,
      vx: (Math.random() - 0.5) * 0.00005,
      vy: (Math.random() - 0.5) * 0.00005,
      phase: (i / 6) * Math.PI * 2,
      phaseSpeed: 0.0002 + Math.random() * 0.0003,
      radius: 0.3 + Math.random() * 0.35,
      alpha: 0.18 + Math.random() * 0.22,
    }));

    const draw = (ts: number) => {
      const dt = Math.min(ts - lastTsRef.current, 50); // cap dt
      lastTsRef.current = ts;
      timeRef.current += dt;
      const t = timeRef.current;

      const W = canvas.offsetWidth;
      const H = canvas.offsetHeight;
      if (W === 0 || H === 0) {
        animRef.current = requestAnimationFrame(draw);
        return;
      }

      // ─ Base fill ─────────────────────────────────────────────────
      ctx.fillStyle = colors.primary;
      ctx.fillRect(0, 0, W, H);

      // ─ Artwork base layer (slow drift, very dim) ─────────────────
      if (imgRef.current) {
        const img = imgRef.current;
        ctx.save();
        ctx.globalAlpha = 0.22;

        const slowX = Math.sin(t * 0.00010) * W * 0.03;
        const slowY = Math.cos(t * 0.00008) * H * 0.03;

        const scale = Math.max(W, H) / Math.min(img.naturalWidth, img.naturalHeight) * 1.25;
        const iw = img.naturalWidth * scale;
        const ih = img.naturalHeight * scale;
        const ix = (W - iw) / 2 + slowX;
        const iy = (H - ih) / 2 + slowY;

        ctx.filter = 'blur(40px) saturate(1.5)';
        ctx.drawImage(img, ix, iy, iw, ih);
        ctx.filter = 'none';
        ctx.restore();
      }

      // ─ Drifting color blobs from artwork ─────────────────────────
      if (imgRef.current) {
        const img = imgRef.current;
        blobs.forEach((blob) => {
          blob.x += blob.vx * dt;
          blob.y += blob.vy * dt;
          blob.phase += blob.phaseSpeed * dt;

          // Bounce
          if (blob.x < -0.05) blob.vx = Math.abs(blob.vx);
          if (blob.x > 1.05) blob.vx = -Math.abs(blob.vx);
          if (blob.y < -0.05) blob.vy = Math.abs(blob.vy);
          if (blob.y > 1.05) blob.vy = -Math.abs(blob.vy);

          // Sinusoidal drift overlay
          const drift = 0.05;
          const cx = (blob.x + Math.sin(blob.phase) * drift) * W;
          const cy = (blob.y + Math.cos(blob.phase * 0.7) * drift) * H;
          const r = blob.radius * Math.max(W, H);

          ctx.save();
          ctx.beginPath();
          ctx.arc(cx, cy, r, 0, Math.PI * 2);
          ctx.clip();

          // Draw artwork section inside the blob
          const scale = (r * 2.2) / Math.min(img.naturalWidth, img.naturalHeight);
          const iw = img.naturalWidth * scale;
          const ih = img.naturalHeight * scale;
          ctx.globalAlpha = blob.alpha;
          ctx.filter = 'blur(12px) saturate(1.6)';
          ctx.drawImage(img, cx - iw / 2, cy - ih / 2, iw, ih);
          ctx.filter = 'none';

          // Radial fade at edges
          const fadeGrad = ctx.createRadialGradient(cx, cy, r * 0.4, cx, cy, r);
          fadeGrad.addColorStop(0, 'rgba(0,0,0,0)');
          fadeGrad.addColorStop(1, 'rgba(0,0,0,0.85)');
          ctx.globalAlpha = 1;
          ctx.fillStyle = fadeGrad;
          ctx.fillRect(cx - r - 2, cy - r - 2, (r + 2) * 2, (r + 2) * 2);

          ctx.restore();
        });
      }

      // ─ Color overlay gradient ─────────────────────────────────────
      const [pr, pg, pb] = hexToRgb(colors.primary);
      const [sr, sg, sb] = hexToRgb(colors.secondary);
      const [ar, ag, ab] = hexToRgb(colors.accent);

      // Animated angle
      const angle = (t * 0.00008) % (Math.PI * 2);
      const gx1 = W * 0.5 + Math.cos(angle) * W * 0.4;
      const gy1 = H * 0.5 + Math.sin(angle) * H * 0.4;
      const gx2 = W * 0.5 - Math.cos(angle) * W * 0.4;
      const gy2 = H * 0.5 - Math.sin(angle) * H * 0.4;

      const colorGrad = ctx.createLinearGradient(gx1, gy1, gx2, gy2);
      colorGrad.addColorStop(0, `rgba(${pr},${pg},${pb},0.72)`);
      colorGrad.addColorStop(0.45, `rgba(${sr},${sg},${sb},0.52)`);
      colorGrad.addColorStop(1, `rgba(${ar},${ag},${ab},0.72)`);
      ctx.fillStyle = colorGrad;
      ctx.fillRect(0, 0, W, H);

      // ─ Vignette ──────────────────────────────────────────────────
      const vig = ctx.createRadialGradient(
        W / 2, H / 2, 0,
        W / 2, H / 2, Math.max(W, H) * 0.75
      );
      vig.addColorStop(0, 'rgba(0,0,0,0)');
      vig.addColorStop(0.6, 'rgba(0,0,0,0.1)');
      vig.addColorStop(1, 'rgba(0,0,0,0.72)');
      ctx.fillStyle = vig;
      ctx.fillRect(0, 0, W, H);

      if (!isRendering) {
        animRef.current = requestAnimationFrame(draw);
      }
    };

    animRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animRef.current);
      ro.disconnect();
    };
  }, [artworkUrl, colors, isRendering]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        display: 'block',
      }}
    />
  );
};

export default AnimatedBackground;
