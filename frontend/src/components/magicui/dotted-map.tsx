import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface Marker {
  lat: number;
  lng: number;
  size?: number;
  color?: string;
  label?: string;
}

interface DottedMapComponentProps {
  className?: string;
  dotColor?: string;
  markerColor?: string;
  dotRadius?: number;
  markers?: Marker[];
  backgroundColor?: string;
  dark?: boolean;
}

export function DottedMapComponent({
  className,
  dotColor,
  markerColor = "#ff6900",
  dotRadius = 0.3,
  markers = [],
  dark = true,
}: DottedMapComponentProps) {
  const svgRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadMap = async () => {
      try {
        const DottedMapModule = await import("dotted-map");
        const DottedMap = DottedMapModule.default;
        const map = new DottedMap({ height: 60, grid: "diagonal" });

        markers.forEach((m) => {
          map.addPin({
            lat: m.lat,
            lng: m.lng,
            svgOptions: {
              color: m.color || markerColor,
              radius: (m.size || 0.5) * 1.2,
            },
          });
        });

        const svgString = map.getSVG({
          radius: dotRadius,
          color: dotColor || (dark ? "rgba(140,160,200,0.4)" : "rgba(80,100,140,0.3)"),
          shape: "circle",
          backgroundColor: "transparent",
        });

        if (svgRef.current) {
          svgRef.current.innerHTML = svgString;
          const svgEl = svgRef.current.querySelector("svg");
          if (svgEl) {
            svgEl.style.width = "100%";
            svgEl.style.height = "100%";
          }
        }
      } catch (e) {
        console.error("Failed to load dotted-map:", e);
      }
    };
    loadMap();
  }, [markers, dotColor, markerColor, dotRadius, dark]);

  return (
    <div
      ref={svgRef}
      className={cn("w-full h-full", className)}
      data-testid="dotted-map"
    />
  );
}
