import { useEffect, useRef } from "react";

interface WaveformVisualizerProps {
  isActive: boolean;
  className?: string;
}

export function WaveformVisualizer({ isActive, className = "" }: WaveformVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const barsRef = useRef<number[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Get computed color from CSS variable
    const computedStyle = getComputedStyle(document.documentElement);
    const primaryHSL = computedStyle.getPropertyValue('--primary').trim();
    const primaryColor = `hsl(${primaryHSL})`;
    const primaryColorFaded = `hsl(${primaryHSL} / 0.6)`;

    const barCount = 40;
    const barWidth = 3;
    const barGap = 2;
    const minHeight = 4;
    const maxHeight = 60;

    // Initialize bars with random heights
    if (barsRef.current.length === 0) {
      barsRef.current = Array(barCount).fill(0).map(() => minHeight);
    }

    const draw = () => {
      const width = canvas.width;
      const height = canvas.height;

      // Clear canvas
      ctx.clearRect(0, 0, width, height);

      // Update bar heights if active
      if (isActive) {
        barsRef.current = barsRef.current.map((currentHeight, i) => {
          // Create smooth wave effect with varying frequencies
          const targetHeight = 
            minHeight + 
            Math.sin(Date.now() * 0.003 + i * 0.5) * (maxHeight - minHeight) * 0.3 +
            Math.sin(Date.now() * 0.005 + i * 0.3) * (maxHeight - minHeight) * 0.4 +
            Math.random() * (maxHeight - minHeight) * 0.3;
          
          // Smooth transition
          return currentHeight + (targetHeight - currentHeight) * 0.2;
        });
      } else {
        // Smoothly return to minimum height
        barsRef.current = barsRef.current.map(h => 
          h + (minHeight - h) * 0.1
        );
      }

      // Draw bars
      const totalWidth = barCount * (barWidth + barGap) - barGap;
      const startX = (width - totalWidth) / 2;

      barsRef.current.forEach((barHeight, i) => {
        const x = startX + i * (barWidth + barGap);
        const y = (height - barHeight) / 2;

        // Create gradient
        const gradient = ctx.createLinearGradient(x, y, x, y + barHeight);
        gradient.addColorStop(0, primaryColor);
        gradient.addColorStop(1, primaryColorFaded);

        ctx.fillStyle = gradient;
        ctx.fillRect(x, y, barWidth, barHeight);
      });

      animationRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isActive]);

  return (
    <canvas
      ref={canvasRef}
      width={300}
      height={80}
      className={className}
      data-testid="canvas-waveform"
    />
  );
}
