import { cn } from "@/lib/utils";

interface OrbitingCirclesProps {
  className?: string;
  children?: React.ReactNode;
  reverse?: boolean;
  duration?: number;
  radius?: number;
  path?: boolean;
  iconSize?: number;
}

export function OrbitingCircles({
  className,
  children,
  reverse = false,
  duration = 20,
  radius = 160,
  path = true,
  iconSize = 30,
}: OrbitingCirclesProps) {
  const childArray = Array.isArray(children) ? children : children ? [children] : [];

  return (
    <>
      {path && (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="pointer-events-none absolute inset-0 size-full"
        >
          <circle
            className="stroke-muted-foreground/20 stroke-1"
            cx="50%"
            cy="50%"
            r={radius}
            fill="none"
          />
        </svg>
      )}
      {childArray.map((child, index) => {
        return (
          <div
            key={index}
            className={cn(
              "absolute left-1/2 top-1/2 flex items-center justify-center rounded-full",
              className
            )}
            style={{
              width: iconSize,
              height: iconSize,
              marginLeft: -iconSize / 2,
              marginTop: -iconSize / 2,
              animation: `orbit ${duration}s linear infinite${reverse ? " reverse" : ""}`,
              animationDelay: `${-(duration / childArray.length) * index}s`,
              ["--orbit-radius" as string]: `${radius}px`,
            }}
            data-testid={`orbit-item-${index}`}
          >
            {child}
          </div>
        );
      })}
    </>
  );
}
