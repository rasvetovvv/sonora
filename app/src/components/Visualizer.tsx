import { useEffect, useRef } from "react";

/**
 * Canvas frequency-bar visualizer driven by a WebAudio AnalyserNode.
 * Falls back to a gentle idle animation when no analyser / not playing.
 */
export function Visualizer({
  analyser,
  playing,
}: {
  analyser: React.MutableRefObject<AnalyserNode | null>;
  playing: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let raf = 0;
    let t = 0;

    const draw = () => {
      const w = (canvas.width = canvas.offsetWidth * devicePixelRatio);
      const h = (canvas.height = canvas.offsetHeight * devicePixelRatio);
      ctx.clearRect(0, 0, w, h);

      const bars = 48;
      const gap = 3 * devicePixelRatio;
      const bw = (w - gap * (bars - 1)) / bars;
      // Canvas may be 0-sized during initial layout; skip until it has real size.
      if (bw <= 0 || h <= 0) {
        raf = requestAnimationFrame(draw);
        return;
      }

      const node = analyser.current;
      let values: number[];

      if (node && playing) {
        const data = new Uint8Array(node.frequencyBinCount);
        node.getByteFrequencyData(data);
        values = Array.from({ length: bars }, (_, i) => {
          const idx = Math.floor((i / bars) * data.length);
          return data[idx] / 255;
        });
      } else {
        // Idle sine shimmer.
        t += 0.04;
        values = Array.from({ length: bars }, (_, i) =>
          playing ? 0.3 : 0.12 + 0.1 * Math.abs(Math.sin(t + i * 0.35)),
        );
      }

      for (let i = 0; i < bars; i++) {
        const v = values[i];
        const bh = Math.max(2 * devicePixelRatio, v * h);
        const x = i * (bw + gap);
        const y = (h - bh) / 2;
        const grad = ctx.createLinearGradient(0, y, 0, y + bh);
        grad.addColorStop(0, "#a855f7");
        grad.addColorStop(1, "#22d3ee");
        ctx.fillStyle = grad;
        const r = Math.max(0, Math.min(bw / 2, bh / 2));
        ctx.beginPath();
        ctx.roundRect(x, y, bw, bh, r);
        ctx.fill();
      }
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, [analyser, playing]);

  return <canvas ref={canvasRef} className="h-full w-full" />;
}
