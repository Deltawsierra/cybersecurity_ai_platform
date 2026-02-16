import { useEffect, useRef, useState, useCallback } from "react";
import createGlobe from "cobe";
import { cn } from "@/lib/utils";

interface GlobeProps {
  className?: string;
  config?: Record<string, any>;
  markers?: Array<{ location: [number, number]; size: number }>;
}

const DEFAULT_CONFIG = {
  width: 800,
  height: 800,
  onRender: () => {},
  devicePixelRatio: 2,
  phi: 0,
  theta: 0.3,
  dark: 1,
  diffuse: 0.4,
  mapSamples: 16000,
  mapBrightness: 1.2,
  baseColor: [0.3, 0.3, 0.6] as [number, number, number],
  markerColor: [1, 0.5, 0.2] as [number, number, number],
  glowColor: [0.1, 0.1, 0.3] as [number, number, number],
  markers: [] as Array<{ location: [number, number]; size: number }>,
  scale: 1,
};

export function Globe({ className, config = {}, markers = [] }: GlobeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointerInteracting = useRef<number | null>(null);
  const pointerInteractionMovement = useRef(0);
  const phiRef = useRef(0);
  const globeRef = useRef<ReturnType<typeof createGlobe> | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const timer = requestAnimationFrame(() => {
      if (containerRef.current && containerRef.current.offsetWidth > 0) {
        setReady(true);
      } else {
        const interval = setInterval(() => {
          if (containerRef.current && containerRef.current.offsetWidth > 0) {
            setReady(true);
            clearInterval(interval);
          }
        }, 100);
        return () => clearInterval(interval);
      }
    });
    return () => cancelAnimationFrame(timer);
  }, []);

  useEffect(() => {
    if (!ready || !canvasRef.current || !containerRef.current) return;

    const containerWidth = containerRef.current.offsetWidth;
    if (containerWidth === 0) return;

    const canvas = canvasRef.current;
    const gl = canvas.getContext("webgl", { alpha: true });
    if (!gl) {
      console.warn("WebGL not available for globe");
      return;
    }

    let destroyed = false;

    const initGlobe = () => {
      if (destroyed || !canvasRef.current || !containerRef.current) return;
      try {
        const globe = createGlobe(canvasRef.current, {
          ...DEFAULT_CONFIG,
          ...config,
          width: containerWidth * 2,
          height: containerWidth * 2,
          markers: markers.length > 0 ? markers : (config.markers || []),
          onRender: (state: Record<string, any>) => {
            if (!pointerInteracting.current) {
              phiRef.current += 0.005;
            }
            state.phi = phiRef.current + pointerInteractionMovement.current;
            if (containerRef.current) {
              const w = containerRef.current.offsetWidth;
              state.width = w * 2;
              state.height = w * 2;
            }
          },
        });

        globeRef.current = globe;

        if (canvasRef.current) {
          canvasRef.current.style.opacity = "1";
        }
      } catch (e) {
        console.warn("Globe initialization deferred:", e);
      }
    };

    const timer = setTimeout(initGlobe, 100);

    return () => {
      destroyed = true;
      clearTimeout(timer);
      if (globeRef.current) {
        globeRef.current.destroy();
        globeRef.current = null;
      }
    };
  }, [ready, config, markers]);

  return (
    <div
      ref={containerRef}
      className={cn("relative aspect-square w-full max-w-[600px] mx-auto", className)}
    >
      {ready && (
        <canvas
          ref={canvasRef}
          width={containerRef.current?.offsetWidth ? containerRef.current.offsetWidth * 2 : 800}
          height={containerRef.current?.offsetWidth ? containerRef.current.offsetWidth * 2 : 800}
          className="size-full opacity-0 transition-opacity duration-500"
          style={{ cursor: "grab" }}
          onPointerDown={(e) => {
            pointerInteracting.current = e.clientX - pointerInteractionMovement.current;
            if (canvasRef.current) canvasRef.current.style.cursor = "grabbing";
          }}
          onPointerUp={() => {
            pointerInteracting.current = null;
            if (canvasRef.current) canvasRef.current.style.cursor = "grab";
          }}
          onPointerOut={() => {
            pointerInteracting.current = null;
            if (canvasRef.current) canvasRef.current.style.cursor = "grab";
          }}
          onMouseMove={(e) => {
            if (pointerInteracting.current !== null) {
              const delta = e.clientX - pointerInteracting.current;
              pointerInteractionMovement.current = delta / 200;
            }
          }}
          onTouchMove={(e) => {
            if (pointerInteracting.current !== null && e.touches[0]) {
              const delta = e.touches[0].clientX - pointerInteracting.current;
              pointerInteractionMovement.current = delta / 100;
            }
          }}
          data-testid="canvas-globe"
        />
      )}
    </div>
  );
}
