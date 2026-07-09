import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface CircularWaveformProps {
  isActive: boolean;
  statusText?: string;
  className?: string;
  color?: "primary" | "accent" | "success";
}

export function CircularWaveform({ isActive, statusText, className, color = "primary" }: CircularWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const barCount = 24;
    const baseRadius = 45;
    const maxBarLength = 20;
    
    // Get computed color based on color prop
    const colorVariableMap = {
      primary: '--primary',
      accent: '--accent',
      success: '--success',
    };
    
    const colorVariable = colorVariableMap[color] || '--primary';
    const selectedColor = getComputedStyle(document.documentElement)
      .getPropertyValue(colorVariable)
      .trim();
    
    const colorHSL = selectedColor.split(' ').map(v => parseFloat(v));
    const hue = colorHSL[0] || 0;
    const saturation = colorHSL[1] || 50;
    const lightness = colorHSL[2] || 50;

    let phase = 0;

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (let i = 0; i < barCount; i++) {
        const angle = (i / barCount) * Math.PI * 2;
        
        // Calculate bar length with wave effect
        let barLength = 0;
        if (isActive) {
          const wave = Math.sin(phase + i * 0.3) * 0.5 + 0.5;
          barLength = wave * maxBarLength;
        } else {
          barLength = 3; // Small static bars when not active
        }

        const startX = centerX + Math.cos(angle) * baseRadius;
        const startY = centerY + Math.sin(angle) * baseRadius;
        const endX = centerX + Math.cos(angle) * (baseRadius + barLength);
        const endY = centerY + Math.sin(angle) * (baseRadius + barLength);

        // Calculate opacity based on bar length
        const opacity = isActive ? 0.6 + (barLength / maxBarLength) * 0.4 : 0.3;

        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.strokeStyle = `hsla(${hue}, ${saturation}%, ${lightness}%, ${opacity})`;
        ctx.lineWidth = 3;
        ctx.lineCap = "round";
        ctx.stroke();
      }

      if (isActive) {
        phase += 0.1;
      }

      animationRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isActive, color]);

  return (
    <div className={cn("flex flex-col items-center gap-2", className)}>
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={200}
          height={200}
          className="block"
        />
        {statusText && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-xs font-medium text-white/90 bg-black/40 px-3 py-1 rounded-full backdrop-blur-sm">
              {statusText}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
