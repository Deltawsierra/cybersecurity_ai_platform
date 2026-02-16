import { useMemo } from "react";
import { useTheme } from "next-themes";

const HORIZONTAL_TRAILS = 8;
const VERTICAL_TRAILS = 6;
const PARTICLE_COUNT = 50;

export function AnimatedBackground() {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const horizontalTrails = useMemo(() => {
    return Array.from({ length: HORIZONTAL_TRAILS }, (_, i) => ({
      id: i,
      y: 8 + (i * 84 / HORIZONTAL_TRAILS) + Math.random() * 8,
      duration: 3 + Math.random() * 4,
      delay: Math.random() * 6,
      width: 15 + Math.random() * 25,
      color: i % 3 === 0 ? "cyan" : i % 3 === 1 ? "magenta" : "cyan",
      opacity: 0.15 + Math.random() * 0.25,
    }));
  }, []);

  const verticalTrails = useMemo(() => {
    return Array.from({ length: VERTICAL_TRAILS }, (_, i) => ({
      id: i,
      x: 5 + (i * 90 / VERTICAL_TRAILS) + Math.random() * 10,
      duration: 4 + Math.random() * 5,
      delay: Math.random() * 8,
      height: 10 + Math.random() * 20,
      color: i % 2 === 0 ? "magenta" : "cyan",
      opacity: 0.1 + Math.random() * 0.2,
    }));
  }, []);

  const gridNodes = useMemo(() => {
    const nodes: { x: number; y: number; size: number; delay: number }[] = [];
    for (let i = 0; i < 25; i++) {
      nodes.push({
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: 1 + Math.random() * 2,
        delay: Math.random() * 5,
      });
    }
    return nodes;
  }, []);

  const particles = useMemo(() => {
    return Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
      id: i,
      cx: Math.random() * 100,
      cy: Math.random() * 100,
      r: Math.random() * 1.2 + 0.3,
      delay: Math.random() * 20,
      color: i % 4 === 0 ? "rgba(255, 0, 180, 0.25)" : "rgba(0, 230, 255, 0.3)",
    }));
  }, []);

  if (!isDark) {
    return (
      <div className="fixed inset-0 z-0 pointer-events-none" data-testid="animated-background">
        <svg width="100%" height="100%" className="w-full h-full">
          {particles.slice(0, 20).map((p) => (
            <circle
              key={`p-${p.id}`}
              cx={`${p.cx}%`}
              cy={`${p.cy}%`}
              r={p.r}
              fill="rgba(100, 130, 200, 0.15)"
              className="animate-drift"
              style={{ animationDelay: `${p.delay}s` }}
            />
          ))}
        </svg>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-0 pointer-events-none" data-testid="animated-background">
      <svg width="100%" height="100%" className="w-full h-full" style={{ filter: "blur(0.3px)" }}>
        <defs>
          <linearGradient id="trailCyan" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(0, 230, 255, 0)" />
            <stop offset="30%" stopColor="rgba(0, 230, 255, 0.6)" />
            <stop offset="70%" stopColor="rgba(0, 230, 255, 0.6)" />
            <stop offset="100%" stopColor="rgba(0, 230, 255, 0)" />
          </linearGradient>
          <linearGradient id="trailMagenta" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(255, 0, 180, 0)" />
            <stop offset="30%" stopColor="rgba(255, 0, 180, 0.5)" />
            <stop offset="70%" stopColor="rgba(255, 0, 180, 0.5)" />
            <stop offset="100%" stopColor="rgba(255, 0, 180, 0)" />
          </linearGradient>
          <linearGradient id="trailCyanV" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="rgba(0, 230, 255, 0)" />
            <stop offset="30%" stopColor="rgba(0, 230, 255, 0.5)" />
            <stop offset="70%" stopColor="rgba(0, 230, 255, 0.5)" />
            <stop offset="100%" stopColor="rgba(0, 230, 255, 0)" />
          </linearGradient>
          <linearGradient id="trailMagentaV" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="rgba(255, 0, 180, 0)" />
            <stop offset="30%" stopColor="rgba(255, 0, 180, 0.4)" />
            <stop offset="70%" stopColor="rgba(255, 0, 180, 0.4)" />
            <stop offset="100%" stopColor="rgba(255, 0, 180, 0)" />
          </linearGradient>
          <filter id="neonBlur">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="softGlow">
            <feGaussianBlur stdDeviation="3" />
          </filter>
        </defs>

        {horizontalTrails.map((trail) => (
          <g key={`ht-${trail.id}`}>
            <rect
              x="-40%"
              y={`${trail.y}%`}
              width={`${trail.width}%`}
              height="2"
              fill={trail.color === "cyan" ? "url(#trailCyan)" : "url(#trailMagenta)"}
              opacity={trail.opacity}
              filter="url(#neonBlur)"
            >
              <animateTransform
                attributeName="transform"
                type="translate"
                from="-200 0"
                to="2200 0"
                dur={`${trail.duration}s`}
                begin={`${trail.delay}s`}
                repeatCount="indefinite"
              />
            </rect>
          </g>
        ))}

        {verticalTrails.map((trail) => (
          <g key={`vt-${trail.id}`}>
            <rect
              x={`${trail.x}%`}
              y="-30%"
              width="2"
              height={`${trail.height}%`}
              fill={trail.color === "cyan" ? "url(#trailCyanV)" : "url(#trailMagentaV)"}
              opacity={trail.opacity}
              filter="url(#neonBlur)"
            >
              <animateTransform
                attributeName="transform"
                type="translate"
                from="0 -300"
                to="0 1500"
                dur={`${trail.duration}s`}
                begin={`${trail.delay}s`}
                repeatCount="indefinite"
              />
            </rect>
          </g>
        ))}

        {gridNodes.map((node, i) => (
          <circle
            key={`node-${i}`}
            cx={`${node.x}%`}
            cy={`${node.y}%`}
            r={node.size}
            fill={i % 2 === 0 ? "rgba(0, 230, 255, 0.4)" : "rgba(255, 0, 180, 0.3)"}
            filter="url(#neonBlur)"
            className="animate-pulse-glow"
            style={{ animationDelay: `${node.delay}s` }}
          />
        ))}

        {particles.map((p) => (
          <circle
            key={`particle-${p.id}`}
            cx={`${p.cx}%`}
            cy={`${p.cy}%`}
            r={p.r}
            fill={p.color}
            className="animate-drift"
            style={{ animationDelay: `${p.delay}s` }}
          />
        ))}
      </svg>
    </div>
  );
}
