import { useCallback, useEffect, useMemo, useRef } from "react";
import { cn } from "@/lib/utils";

interface IconCloudProps {
  icons?: React.ReactNode[];
  className?: string;
}

export function IconCloud({ icons = [], className }: IconCloudProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const iconRefsRef = useRef<(HTMLDivElement | null)[]>([]);
  const rotationRef = useRef({ x: 0, y: 0 });
  const animationRef = useRef<number>(0);
  const mouseRef = useRef({ x: 0, y: 0, active: false });
  const tRef = useRef(0);

  const positions = useMemo(() => {
    const count = icons.length;
    const pts: Array<{ x: number; y: number; z: number }> = [];
    const goldenRatio = (1 + Math.sqrt(5)) / 2;
    for (let i = 0; i < count; i++) {
      const theta = Math.acos(1 - (2 * (i + 0.5)) / count);
      const phi = (2 * Math.PI * i) / goldenRatio;
      pts.push({
        x: Math.sin(theta) * Math.cos(phi),
        y: Math.sin(theta) * Math.sin(phi),
        z: Math.cos(theta),
      });
    }
    return pts;
  }, [icons.length]);

  const updateIconPositions = useCallback(() => {
    const rot = rotationRef.current;
    const cosX = Math.cos(rot.x);
    const sinX = Math.sin(rot.x);
    const cosY = Math.cos(rot.y);
    const sinY = Math.sin(rot.y);
    const radius = 90;

    for (let i = 0; i < positions.length; i++) {
      const el = iconRefsRef.current[i];
      if (!el) continue;
      const pos = positions[i];

      const y1 = pos.y * cosX - pos.z * sinX;
      const z1 = pos.y * sinX + pos.z * cosX;
      const x1 = pos.x * cosY + z1 * sinY;
      const z2 = -pos.x * sinY + z1 * cosY;

      const scale = 1 / (2 - z2);
      const projX = x1 * scale;
      const projY = y1 * scale;

      const opacity = 0.3 + (z2 + 1) * 0.35;
      const iconScale = 0.5 + (z2 + 1) * 0.3;

      el.style.opacity = String(opacity);
      el.style.transform = `translate(-50%, -50%) translate(${projX * radius}px, ${projY * radius}px) scale(${iconScale})`;
      el.style.zIndex = String(Math.round((z2 + 1) * 50));
    }
  }, [positions]);

  useEffect(() => {
    const animate = () => {
      tRef.current += 0.003;
      if (!mouseRef.current.active) {
        rotationRef.current = { x: tRef.current * 0.5, y: tRef.current };
      }
      updateIconPositions();
      animationRef.current = requestAnimationFrame(animate);
    };
    animationRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationRef.current);
  }, [updateIconPositions]);

  const setIconRef = useCallback((el: HTMLDivElement | null, index: number) => {
    iconRefsRef.current[index] = el;
  }, []);

  return (
    <div
      ref={containerRef}
      className={cn("relative flex items-center justify-center", className)}
      style={{ width: "100%", height: "100%", minHeight: 200 }}
      onMouseMove={(e) => {
        const rect = containerRef.current?.getBoundingClientRect();
        if (rect) {
          mouseRef.current.active = true;
          const nx = (e.clientX - rect.left - rect.width / 2) / rect.width;
          const ny = (e.clientY - rect.top - rect.height / 2) / rect.height;
          rotationRef.current = {
            x: rotationRef.current.x + ny * 0.02,
            y: rotationRef.current.y + nx * 0.02,
          };
        }
      }}
      onMouseLeave={() => {
        mouseRef.current.active = false;
      }}
      data-testid="icon-cloud"
    >
      {icons.map((icon, i) => (
        <div
          key={i}
          ref={(el) => setIconRef(el, i)}
          className="absolute flex items-center justify-center"
          style={{ left: "50%", top: "50%", willChange: "transform, opacity" }}
          data-testid={`cloud-icon-${i}`}
        >
          {icon}
        </div>
      ))}
    </div>
  );
}
