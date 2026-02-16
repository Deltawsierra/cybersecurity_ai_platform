import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
} from "recharts";
import {
  AlertTriangle, CheckCircle2, Circle, ArrowRight, Shield,
  Server, Database, Cloud, Monitor, Lock, ChevronRight,
  Crosshair, FileText, Skull, Globe, Crown,
} from "lucide-react";
import { AnimatedBeam } from "@/components/magicui/animated-beam";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const severityColor: Record<string, string> = {
  critical: "#ff4757",
  high: "#ff6b6b",
  exploited: "#c0392b",
  medium: "#ffa502",
  low: "#2ed573",
  in_progress: "#70a1ff",
  active: "#00d2d3",
};

function SeverityBadge({ severity, label }: { severity: string; label?: string }) {
  return (
    <Badge
      className="text-[10px] px-1.5 py-0 font-semibold uppercase no-default-hover-elevate no-default-active-elevate"
      style={{ backgroundColor: severityColor[severity] || "#70a1ff", color: "#fff" }}
      data-testid={`badge-severity-${severity}`}
    >
      {label || severity}
    </Badge>
  );
}

const nodeIconMap: Record<string, typeof Monitor> = {
  client: Monitor,
  server: Server,
  database: Database,
  cloud: Cloud,
};

const nodeColorMap: Record<string, string> = {
  client: "#70a1ff",
  server: "#ff6b6b",
  database: "#ffa502",
  cloud: "#2ed573",
};

interface AttackPathGraphProps {
  nodes: any[];
  edges: any[];
}

function AttackPathGraph({ nodes: attackPathNodes, edges: attackPathEdges }: AttackPathGraphProps) {
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  
  if (attackPathNodes.length === 0 || attackPathEdges.length === 0) {
    return (
      <Card
        className="glass-card glow-border rounded-md overflow-visible animate-fade-in-up col-span-1"
        data-testid="card-attack-paths-analyzed"
      >
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            Attack Paths Analyzed
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center min-h-[200px]">
            <p className="text-muted-foreground text-sm">No attack path data available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const nodeMap = Object.fromEntries(attackPathNodes.map((n) => [n.id, n]));
  const viewW = 450;
  const viewH = 420;
  const scaleX = 1.1;
  const scaleY = 0.7;
  const offX = 15;
  const offY = 20;

  const cx = (x: number) => x * scaleX + offX;
  const cy = (y: number) => y * scaleY + offY;

  return (
    <Card
      className="glass-card glow-border rounded-md overflow-visible animate-fade-in-up col-span-1"
      data-testid="card-attack-paths-analyzed"
    >
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Shield className="h-4 w-4 text-primary" />
          Attack Paths Analyzed
        </CardTitle>
        <Badge variant="secondary" className="text-[10px] no-default-hover-elevate no-default-active-elevate">
          LIVE
        </Badge>
      </CardHeader>
      <CardContent>
        <svg viewBox={`0 0 ${viewW} ${viewH}`} className="w-full h-auto" data-testid="svg-attack-graph">
          <defs>
            <linearGradient id="grad-compromised" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ff4757" stopOpacity="1" />
              <stop offset="100%" stopColor="#ff6b6b" stopOpacity="0.8" />
            </linearGradient>
            <linearGradient id="grad-scanning" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ffa502" stopOpacity="1" />
              <stop offset="100%" stopColor="#ffc048" stopOpacity="0.8" />
            </linearGradient>
            <filter id="glow-red" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feComposite in="blur" in2="SourceGraphic" operator="over" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="glow-scanning" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="glow-node">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="glow-dot" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {attackPathEdges.map((edge, i) => {
            const from = nodeMap[edge.from];
            const to = nodeMap[edge.to];
            if (!from || !to) return null;
            const isCompromised = edge.status === "compromised";
            const x1 = cx(from.x), y1 = cy(from.y), x2 = cx(to.x), y2 = cy(to.y);
            const midX = (x1 + x2) / 2;
            const midY = (y1 + y2) / 2;
            const dx = x2 - x1;
            const dy = y2 - y1;
            const curvatureOffset = 30;
            const qx = midX + (dy / Math.sqrt(dx * dx + dy * dy)) * curvatureOffset;
            const qy = midY - (dx / Math.sqrt(dx * dx + dy * dy)) * curvatureOffset;
            const pathD = `M ${x1},${y1} Q ${qx},${qy} ${x2},${y2}`;
            return (
              <path
                key={i}
                d={pathD}
                stroke={isCompromised ? "url(#grad-compromised)" : "url(#grad-scanning)"}
                strokeWidth="3"
                strokeDasharray={isCompromised ? "8 4" : "5 5"}
                opacity="0.9"
                fill="none"
                strokeLinecap="round"
                filter={isCompromised ? "url(#glow-red)" : "url(#glow-scanning)"}
              />
            );
          })}

          {attackPathEdges.map((edge, i) => {
            const from = nodeMap[edge.from];
            const to = nodeMap[edge.to];
            if (!from || !to) return null;
            const isCompromised = edge.status === "compromised";
            const x1 = cx(from.x), y1 = cy(from.y), x2 = cx(to.x), y2 = cy(to.y);
            const midX = (x1 + x2) / 2;
            const midY = (y1 + y2) / 2;
            const dx = x2 - x1;
            const dy = y2 - y1;
            const curvatureOffset = 30;
            const qx = midX + (dy / Math.sqrt(dx * dx + dy * dy)) * curvatureOffset;
            const qy = midY - (dx / Math.sqrt(dx * dx + dy * dy)) * curvatureOffset;
            const pathD = `M ${x1},${y1} Q ${qx},${qy} ${x2},${y2}`;
            return (
              <circle key={`dot-${i}`} r="4" fill={isCompromised ? "#ff4757" : "#ffa502"} opacity="1" filter="url(#glow-dot)">
                <animateMotion dur={isCompromised ? "2s" : "3s"} repeatCount="indefinite"
                  path={pathD} />
              </circle>
            );
          })}

          {attackPathNodes.map((node) => {
            const x = cx(node.x);
            const y = cy(node.y);
            const color = nodeColorMap[node.type] || "#70a1ff";
            const isCompromised = attackPathEdges.some(
              (e) => (e.from === node.id || e.to === node.id) && e.status === "compromised"
            );

            return (
              <g key={node.id} data-testid={`node-${node.id}`}
                onMouseEnter={() => setHoveredNode(node.id)}
                onMouseLeave={() => setHoveredNode(null)}
                style={{ cursor: "pointer" }}>
                {isCompromised && (
                  <circle
                    cx={x}
                    cy={y}
                    r="22"
                    fill={color}
                    opacity="0.15"
                    className="animate-pulse-glow"
                  />
                )}
                <circle
                  cx={x}
                  cy={y}
                  r="16"
                  fill={color}
                  opacity="0.25"
                  filter="url(#glow-node)"
                />
                <rect
                  x={x - 14}
                  y={y - 14}
                  width="28"
                  height="28"
                  rx="6"
                  fill={color}
                  opacity="0.9"
                />
                <NodeIcon type={node.type} x={x} y={y} />
                <text
                  x={x}
                  y={y + 28}
                  textAnchor="middle"
                  className="fill-muted-foreground"
                  fontSize="9"
                  fontWeight="500"
                >
                  {node.label}
                </text>
              </g>
            );
          })}
        </svg>

        {hoveredNode && (() => {
          const node = attackPathNodes.find(n => n.id === hoveredNode);
          if (!node) return null;
          const connectedEdges = attackPathEdges.filter(e => e.from === node.id || e.to === node.id);
          const compromisedCount = connectedEdges.filter(e => e.status === "compromised").length;
          return (
            <div className="mt-3 p-3 rounded-md border border-primary/20 bg-primary/5 animate-fade-in-up" data-testid={`node-detail-${node.id}`}>
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-xs font-bold">{node.label}</span>
                <Badge variant="secondary" className="text-[9px] no-default-hover-elevate no-default-active-elevate uppercase">{node.type}</Badge>
              </div>
              <div className="grid grid-cols-3 gap-2 text-[10px] text-muted-foreground mt-2">
                <div><span className="font-medium">Connections:</span> {connectedEdges.length}</div>
                <div><span className="font-medium text-destructive">Compromised:</span> {compromisedCount}</div>
                <div><span className="font-medium">Status:</span> {compromisedCount > 0 ? "At Risk" : "Monitoring"}</div>
              </div>
            </div>
          );
        })()}

        <div className="flex items-center justify-between gap-2 mt-2 text-[10px] text-muted-foreground flex-wrap">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <div className="h-0.5 w-4 bg-[#ff4757]" style={{ borderTop: "2px dashed #ff4757" }} />
              <span>Compromised</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="h-0.5 w-4 bg-[#ffa502]" style={{ borderTop: "2px dotted #ffa502" }} />
              <span>Scanning</span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3 text-primary" />
            <span>7 Nodes Mapped</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function NodeIcon({ type, x, y }: { type: string; x: number; y: number }) {
  const props = {
    x: x - 7,
    y: y - 7,
    width: 14,
    height: 14,
    className: "text-white",
    stroke: "white",
    strokeWidth: 1.5,
    fill: "none",
  };

  switch (type) {
    case "client":
      return (
        <foreignObject {...props}>
          <Monitor style={{ width: 14, height: 14, color: "white" }} />
        </foreignObject>
      );
    case "database":
      return (
        <foreignObject {...props}>
          <Database style={{ width: 14, height: 14, color: "white" }} />
        </foreignObject>
      );
    case "cloud":
      return (
        <foreignObject {...props}>
          <Cloud style={{ width: 14, height: 14, color: "white" }} />
        </foreignObject>
      );
    default:
      return (
        <foreignObject {...props}>
          <Server style={{ width: 14, height: 14, color: "white" }} />
        </foreignObject>
      );
  }
}

const attackChainNodes = [
  { label: "External Attacker", icon: Skull, color: "#ff4757" },
  { label: "Web Server", icon: Globe, color: "#ff6b6b" },
  { label: "App Server", icon: Server, color: "#ffa502" },
  { label: "Database", icon: Database, color: "#70a1ff" },
  { label: "Internal Net", icon: Cloud, color: "#9c40ff" },
  { label: "Crown Jewels", icon: Crown, color: "#2ed573" },
];

function AnimatedBeamDemo() {
  const containerRef = useRef<HTMLDivElement>(null);
  const nodeRefs = [
    useRef<HTMLDivElement>(null),
    useRef<HTMLDivElement>(null),
    useRef<HTMLDivElement>(null),
    useRef<HTMLDivElement>(null),
    useRef<HTMLDivElement>(null),
    useRef<HTMLDivElement>(null),
  ];

  return (
    <Card
      className="glass-card glow-border rounded-md overflow-visible animate-fade-in-up"
      style={{ animationDelay: "150ms" }}
      data-testid="card-animated-beam-demo"
    >
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Shield className="h-4 w-4 text-primary" />
          Attack Chain Flow
        </CardTitle>
        <Badge variant="secondary" className="text-[10px] no-default-hover-elevate no-default-active-elevate">
          ANIMATED
        </Badge>
      </CardHeader>
      <CardContent>
        <div
          ref={containerRef}
          className="relative flex flex-col items-center justify-between gap-8 py-6"
          style={{ minHeight: "300px" }}
          data-testid="animated-beam-container"
        >
          <div className="flex items-center justify-between gap-4 w-full flex-wrap">
            {attackChainNodes.slice(0, 3).map((node, i) => {
              const Icon = node.icon;
              return (
                <div
                  key={i}
                  ref={nodeRefs[i]}
                  className="flex flex-col items-center gap-1.5 z-10"
                  data-testid={`beam-node-${i}`}
                >
                  <div
                    className="h-10 w-10 rounded-full flex items-center justify-center border-2"
                    style={{ borderColor: node.color, backgroundColor: `${node.color}20` }}
                  >
                    <Icon className="h-4 w-4" style={{ color: node.color }} />
                  </div>
                  <span className="text-[9px] text-muted-foreground font-medium text-center max-w-[70px]">
                    {node.label}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between gap-4 w-full flex-wrap">
            {attackChainNodes.slice(3).map((node, i) => {
              const Icon = node.icon;
              const idx = i + 3;
              return (
                <div
                  key={idx}
                  ref={nodeRefs[idx]}
                  className="flex flex-col items-center gap-1.5 z-10"
                  data-testid={`beam-node-${idx}`}
                >
                  <div
                    className="h-10 w-10 rounded-full flex items-center justify-center border-2"
                    style={{ borderColor: node.color, backgroundColor: `${node.color}20` }}
                  >
                    <Icon className="h-4 w-4" style={{ color: node.color }} />
                  </div>
                  <span className="text-[9px] text-muted-foreground font-medium text-center max-w-[70px]">
                    {node.label}
                  </span>
                </div>
              );
            })}
          </div>

          <AnimatedBeam
            containerRef={containerRef}
            fromRef={nodeRefs[0]}
            toRef={nodeRefs[1]}
            curvature={-15}
            gradientStartColor="#ff4757"
            gradientStopColor="#9c40ff"
            duration={4}
            delay={0}
            pathColor="hsl(var(--border))"
            pathWidth={3}
            pathOpacity={0.3}
          />
          <AnimatedBeam
            containerRef={containerRef}
            fromRef={nodeRefs[1]}
            toRef={nodeRefs[2]}
            curvature={-15}
            gradientStartColor="#ff4757"
            gradientStopColor="#9c40ff"
            duration={4}
            delay={0.5}
            pathColor="hsl(var(--border))"
            pathWidth={3}
            pathOpacity={0.3}
          />
          <AnimatedBeam
            containerRef={containerRef}
            fromRef={nodeRefs[2]}
            toRef={nodeRefs[3]}
            curvature={75}
            gradientStartColor="#ff4757"
            gradientStopColor="#9c40ff"
            duration={4}
            delay={1}
            pathColor="hsl(var(--border))"
            pathWidth={3}
            pathOpacity={0.3}
          />
          <AnimatedBeam
            containerRef={containerRef}
            fromRef={nodeRefs[3]}
            toRef={nodeRefs[4]}
            curvature={15}
            gradientStartColor="#ff4757"
            gradientStopColor="#9c40ff"
            duration={4}
            delay={1.5}
            pathColor="hsl(var(--border))"
            pathWidth={3}
            pathOpacity={0.3}
          />
          <AnimatedBeam
            containerRef={containerRef}
            fromRef={nodeRefs[4]}
            toRef={nodeRefs[5]}
            curvature={15}
            gradientStartColor="#ff4757"
            gradientStopColor="#9c40ff"
            duration={4}
            delay={2}
            pathColor="hsl(var(--border))"
            pathWidth={3}
            pathOpacity={0.3}
          />
        </div>

        <div className="flex items-center justify-between gap-2 mt-2 text-[10px] text-muted-foreground flex-wrap">
          <div className="flex items-center gap-1">
            <div className="h-1.5 w-6 rounded-full" style={{ background: "linear-gradient(90deg, #ff4757, #9c40ff)" }} />
            <span>Active Exploitation Path</span>
          </div>
          <div className="flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3 text-primary" />
            <span>6 Nodes | 5 Connections</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface PentestProgressProps {
  progress: any[];
}

function PentestProgress({ progress: pentestProgress }: PentestProgressProps) {
  const statusBadge: Record<string, { label: string; severity: string }> = {
    in_progress: { label: "IN PROGRESS", severity: "in_progress" },
    active: { label: "ACTIVELY TESTING", severity: "active" },
  };

  return (
    <Card
      className="glass-card glow-border rounded-md overflow-visible animate-fade-in-up"
      style={{ animationDelay: "100ms" }}
      data-testid="card-pentest-progress"
    >
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Shield className="h-4 w-4 text-primary" />
          Penetration Test in Progress
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-3">
          {pentestProgress.map((item: any, i: number) => {
            const badge = statusBadge[item.status] || statusBadge.in_progress;
            const isActive = item.status === "active";
            return (
              <div
                key={i}
                className={`flex items-center gap-3 p-2 rounded-md ${isActive ? "bg-primary/10 border border-primary/20" : ""}`}
                data-testid={`pentest-step-${i}`}
              >
                <div className={`h-2.5 w-2.5 rounded-full flex-shrink-0 ${isActive ? "bg-[#00d2d3] animate-pulse-glow" : "bg-[#70a1ff]"}`} />
                <span className="text-xs flex-1">{item.step}</span>
                <SeverityBadge severity={badge.severity} label={badge.label} />
              </div>
            );
          })}
        </div>

        <div
          className="p-3 rounded-md border border-destructive/30 bg-destructive/10 mt-3"
          data-testid="alert-challenge-passed"
        >
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0" />
            <span className="text-xs font-bold text-destructive">CHALLENGE PASSED</span>
          </div>
          <p className="text-[10px] text-muted-foreground">
            Login bruteforce &gt; Privilege escalation
          </p>
        </div>

        <div className="space-y-2 mt-3">
          <div className="flex items-center gap-2 text-xs" data-testid="text-db-server-info">
            <Badge variant="secondary" className="text-[9px] no-default-hover-elevate no-default-active-elevate">DB SERVER</Badge>
            <span className="text-muted-foreground">escalation numerate attribution</span>
            <ArrowRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
          </div>
          <div className="flex items-center gap-2 text-xs" data-testid="text-rn-progress">
            <Badge variant="secondary" className="text-[9px] no-default-hover-elevate no-default-active-elevate">RN: PROGRESS</Badge>
            <span className="text-muted-foreground">Credential commission images</span>
          </div>
          <p className="text-[10px] text-muted-foreground mt-1 opacity-70">
            Revealed PASN is ancere componentul exposure no:139 btr, and...
          </p>
        </div>

        <div
          className="p-3 rounded-md border border-[#ffa502]/30 bg-[#ffa502]/10 mt-2"
          data-testid="alert-unauthorized-access"
        >
          <div className="flex items-center gap-2">
            <Lock className="h-3.5 w-3.5 text-[#ffa502] flex-shrink-0" />
            <span className="text-xs font-semibold text-[#ffa502]">Unauthorized Access Escalated</span>
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">Timestamp: 2024-12-15 14:32:07 UTC</p>
        </div>
      </CardContent>
    </Card>
  );
}

interface AttackPathModelingCardProps {
  modeling: any;
  graphAnalysis: any[];
}

function AttackPathModelingCard({ modeling: attackPathModeling, graphAnalysis }: AttackPathModelingCardProps) {
  const expColors: Record<string, string> = {
    exploited: "#ff4757",
    sourced: "#2ed573",
    compromised: "#ffa502",
    escalated: "#70a1ff",
  };

  return (
    <Card
      className="glass-card glow-border rounded-md overflow-visible animate-fade-in-up"
      style={{ animationDelay: "200ms" }}
      data-testid="card-attack-path-modeling"
    >
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Shield className="h-4 w-4 text-primary" />
          Attack Path Modeling
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-xs font-semibold mb-2 text-muted-foreground uppercase tracking-wide">Exploitation Experience</p>
          <div className="space-y-2">
            {Object.entries(attackPathModeling.exploitationExperience || {}).map(([key, value]: [string, any]) => (
              <div key={key} className="flex items-center gap-2 text-xs" data-testid={`exploit-${key}`}>
                <Circle
                  className="h-3 w-3 flex-shrink-0"
                  style={{ color: expColors[key] || "#70a1ff", fill: expColors[key] || "#70a1ff" }}
                />
                <span className="text-muted-foreground">{key}:</span>
                <span className="font-semibold">{value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-border pt-3">
          <p className="text-xs font-semibold mb-2 text-muted-foreground uppercase tracking-wide">Graph Analysis</p>
          <div className="space-y-2">
            {graphAnalysis.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-2 text-xs"
                data-testid={`cve-row-${item.id}`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <ChevronRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                  <span className="font-mono truncate">{item.id}</span>
                  <span className="text-muted-foreground">|</span>
                  <span className="text-muted-foreground uppercase">{item.severity}</span>
                </div>
                <SeverityBadge
                  severity={item.label === "CRITICAL" ? "critical" : item.label === "EXPLOITED" ? "exploited" : "high"}
                  label={item.label}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-border pt-3 space-y-2">
          <div className="flex items-center gap-2 text-xs" data-testid="check-cryptographic">
            <div className="h-3.5 w-3.5 rounded-sm border border-primary/50 bg-primary/20 flex items-center justify-center">
              <CheckCircle2 className="h-2.5 w-2.5 text-primary" />
            </div>
            <span className="text-muted-foreground">Cryptographic Data</span>
          </div>
          <div className="flex items-center gap-2 text-xs" data-testid="check-payload">
            <div className="h-3.5 w-3.5 rounded-sm border border-primary/50 bg-primary/20 flex items-center justify-center">
              <CheckCircle2 className="h-2.5 w-2.5 text-primary" />
            </div>
            <span className="text-muted-foreground">Payload transmitted: encrypted</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface ExploitationSequenceChartProps {
  sequence: any[];
}

function ExploitationSequenceChart({ sequence: exploitationSequence }: ExploitationSequenceChartProps) {
  return (
    <Card
      className="glass-card glow-border rounded-md overflow-visible animate-fade-in-up"
      style={{ animationDelay: "300ms" }}
      data-testid="card-exploitation-sequence"
    >
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Shield className="h-4 w-4 text-primary" />
          Exploitation Sequence
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={exploitationSequence} margin={{ top: 5, right: 5, left: -15, bottom: 5 }}>
            <XAxis
              dataKey="name"
              tick={{ fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              className="fill-muted-foreground"
            />
            <YAxis
              tick={{ fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              className="fill-muted-foreground"
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                color: "hsl(var(--card-foreground))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "6px",
                fontSize: "11px",
              }}
              itemStyle={{ color: "hsl(var(--card-foreground))" }}
              labelStyle={{ color: "hsl(var(--card-foreground))" }}
            />
            <Legend
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: "10px", paddingTop: "8px" }}
            />
            <Bar dataKey="test" name="Test" fill="hsl(var(--chart-1))" radius={[3, 3, 0, 0]} maxBarSize={24} />
            <Bar dataKey="autonomousAccess" name="Autonomous Access" fill="hsl(var(--chart-3))" radius={[3, 3, 0, 0]} maxBarSize={24} />
            <Bar dataKey="privilege" name="Privilege" fill="hsl(var(--chart-2))" radius={[3, 3, 0, 0]} maxBarSize={24} />
            <Bar dataKey="minimized" name="Minimized" fill="hsl(var(--chart-5))" radius={[3, 3, 0, 0]} maxBarSize={24} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

const radarData = [
  { category: "Injection", score: 85 },
  { category: "Auth Bypass", score: 72 },
  { category: "XSS", score: 65 },
  { category: "CSRF", score: 45 },
  { category: "RCE", score: 90 },
  { category: "Privilege Esc", score: 78 },
];

function VulnerabilityRadarChart() {
  return (
    <Card
      className="glass-card glow-border rounded-md overflow-visible animate-fade-in-up"
      style={{ animationDelay: "250ms" }}
      data-testid="card-vulnerability-radar"
    >
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Shield className="h-4 w-4 text-primary" />
          Vulnerability Coverage
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={280}>
          <RadarChart data={radarData}>
            <PolarGrid stroke="hsl(var(--border))" />
            <PolarAngleAxis dataKey="category" tick={{ fontSize: 10 }} className="fill-muted-foreground" />
            <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 9 }} className="fill-muted-foreground" />
            <Radar
              name="Score"
              dataKey="score"
              stroke="hsl(var(--chart-1))"
              fill="hsl(var(--chart-1))"
              fillOpacity={0.3}
            />
          </RadarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

const storyboardSteps = [
  { 
    phase: "Reconnaissance", 
    time: "T+0:00", 
    title: "External Surface Enumeration",
    description: "Athena AI identified exposed services via port scanning and DNS enumeration. Discovered web application on port 443 and SSH on port 22.",
    evidence: ["Nmap scan results", "DNS zone transfer output"],
    tactic: "TA0043",
    status: "completed"
  },
  { 
    phase: "Initial Access", 
    time: "T+0:12",
    title: "SQL Injection on Login Form",
    description: "Exploited blind SQL injection vulnerability in the authentication endpoint. Extracted database credentials and session tokens.",
    evidence: ["HTTP request/response capture", "SQLMap output log"],
    tactic: "TA0001",
    status: "completed"
  },
  { 
    phase: "Lateral Movement", 
    time: "T+0:34",
    title: "Credential Reuse on Internal Systems",
    description: "Reused extracted credentials to authenticate to internal file server via SMB. Gained access to shared drives containing sensitive configurations.",
    evidence: ["SMB session log", "File listing dump"],
    tactic: "TA0008",
    status: "completed"
  },
  { 
    phase: "Privilege Escalation", 
    time: "T+1:02",
    title: "Domain Admin via Kerberoasting",
    description: "Extracted service account TGS tickets and cracked weak service account password. Escalated to Domain Administrator privileges.",
    evidence: ["Kerberos ticket extraction", "Hashcat results"],
    tactic: "TA0004",
    status: "completed"
  },
  { 
    phase: "Objective", 
    time: "T+1:28",
    title: "Crown Jewel Access Achieved",
    description: "Accessed production database containing customer PII and financial records. Demonstrated full compromise path from external to crown jewels.",
    evidence: ["Database access proof", "Data sample (redacted)"],
    tactic: "TA0009",
    status: "active"
  },
];

function AttackStoryboard() {
  return (
    <Card data-testid="card-attack-storyboard">
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Crosshair className="h-4 w-4 text-primary" />
          Attack Kill Chain Storyboard
        </CardTitle>
        <Button size="sm" className="text-xs gap-1" data-testid="button-export-storyboard">
          <FileText className="h-3 w-3" />
          Export Narrative
        </Button>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto pb-2">
          <div className="flex items-start gap-0 min-w-max">
            {storyboardSteps.map((step, i) => {
              const isActive = step.status === "active";
              const isCompleted = step.status === "completed";
              return (
                <div key={i} className="flex items-start" data-testid={`storyboard-step-${i}`}>
                  <div className="flex flex-col items-center w-56">
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center border-2 mb-2 ${
                      isActive ? "border-primary bg-primary/10 animate-pulse" :
                      isCompleted ? "border-primary bg-primary/20" : "border-border"
                    }`}>
                      <span className="text-xs font-bold">{i + 1}</span>
                    </div>
                    
                    <div className={`p-3 rounded-md border w-full ${isActive ? "border-primary/40 bg-primary/5" : "border-border"}`}>
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <Badge variant="secondary" className="text-[8px] px-1 py-0 no-default-hover-elevate no-default-active-elevate">{step.phase}</Badge>
                        <span className="text-[9px] font-mono text-muted-foreground">{step.time}</span>
                      </div>
                      <h4 className="text-[11px] font-semibold mb-1">{step.title}</h4>
                      <p className="text-[9px] text-muted-foreground leading-relaxed mb-2">{step.description}</p>
                      <div className="space-y-1">
                        <span className="text-[8px] text-muted-foreground font-medium">Evidence:</span>
                        {step.evidence.map((e, ei) => (
                          <div key={ei} className="flex items-center gap-1 text-[9px]">
                            <FileText className="h-2.5 w-2.5 text-muted-foreground shrink-0" />
                            <span>{e}</span>
                          </div>
                        ))}
                      </div>
                      <div className="mt-2 pt-1 border-t border-border">
                        <span className="text-[8px] font-mono text-muted-foreground">MITRE: {step.tactic}</span>
                      </div>
                    </div>
                  </div>
                  
                  {i < storyboardSteps.length - 1 && (
                    <div className="flex items-center h-10 px-0">
                      <div className={`w-8 h-[2px] mt-0 ${isCompleted ? "bg-primary" : "bg-border"}`} />
                      <ChevronRight className={`h-3 w-3 -ml-1 ${isCompleted ? "text-primary" : "text-muted-foreground"}`} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

const whatIfControls = [
  { id: "waf", label: "Web Application Firewall", active: true, pathsBlocked: 3 },
  { id: "mfa", label: "Multi-Factor Authentication", active: true, pathsBlocked: 5 },
  { id: "segmentation", label: "Network Segmentation", active: true, pathsBlocked: 4 },
  { id: "patching", label: "Critical Patching (30-day)", active: false, pathsBlocked: 6 },
  { id: "edl", label: "Endpoint Detection & Logging", active: false, pathsBlocked: 2 },
  { id: "gnss-hardening", label: "GNSS Receiver Hardening", active: false, pathsBlocked: 1 },
];

function WhatIfSimulator() {
  const [controls, setControls] = useState(whatIfControls);
  
  const toggleControl = (id: string) => {
    setControls(prev => prev.map(c => c.id === id ? { ...c, active: !c.active } : c));
  };
  
  const activeControls = controls.filter(c => c.active);
  const totalPathsBlocked = activeControls.reduce((sum, c) => sum + c.pathsBlocked, 0);
  const totalPaths = 21;
  const remainingPaths = Math.max(0, totalPaths - totalPathsBlocked);
  const riskReduction = Math.round((totalPathsBlocked / totalPaths) * 100);
  
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card data-testid="card-whatif-controls">
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-3">
          <CardTitle className="text-sm font-semibold">Security Controls</CardTitle>
          <Badge variant="secondary" className="text-[10px] no-default-hover-elevate no-default-active-elevate">
            {activeControls.length}/{controls.length} Active
          </Badge>
        </CardHeader>
        <CardContent>
          <p className="text-[10px] text-muted-foreground mb-3">Toggle controls to see impact on attack paths</p>
          <div className="space-y-2">
            {controls.map((control) => (
              <div 
                key={control.id}
                onClick={() => toggleControl(control.id)}
                className={`flex items-center justify-between gap-2 p-2.5 rounded-md border cursor-pointer transition-colors ${
                  control.active ? "border-primary/40 bg-primary/5" : "border-border"
                }`}
                data-testid={`whatif-control-${control.id}`}
              >
                <div className="flex items-center gap-2">
                  <div className={`h-4 w-4 rounded-sm border flex items-center justify-center ${
                    control.active ? "bg-primary border-primary" : "border-border"
                  }`}>
                    {control.active && <CheckCircle2 className="h-3 w-3 text-white" />}
                  </div>
                  <span className="text-xs font-medium">{control.label}</span>
                </div>
                <Badge variant="secondary" className="text-[9px] px-1 py-0 no-default-hover-elevate no-default-active-elevate">
                  -{control.pathsBlocked} paths
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      
      <Card data-testid="card-whatif-impact">
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-3">
          <CardTitle className="text-sm font-semibold">Impact Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-around gap-4">
              <div className="text-center">
                <span className="text-3xl font-bold" style={{ color: remainingPaths <= 5 ? "#2ed573" : remainingPaths <= 12 ? "#ffa502" : "#ff4757" }}>
                  {remainingPaths}
                </span>
                <span className="text-[10px] text-muted-foreground block">Exploitable Paths</span>
              </div>
              <div className="text-center">
                <span className="text-3xl font-bold" style={{ color: "#2ed573" }}>{riskReduction}%</span>
                <span className="text-[10px] text-muted-foreground block">Risk Reduction</span>
              </div>
              <div className="text-center">
                <span className="text-3xl font-bold text-primary">{activeControls.length}</span>
                <span className="text-[10px] text-muted-foreground block">Active Controls</span>
              </div>
            </div>
            
            <div className="space-y-2">
              <div>
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-[10px] text-muted-foreground">Before Controls</span>
                  <span className="text-[10px] font-medium">{totalPaths} paths</span>
                </div>
                <div className="w-full h-3 bg-muted rounded-full">
                  <div className="h-full rounded-full bg-red-500" style={{ width: "100%" }} />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-[10px] text-muted-foreground">After Controls</span>
                  <span className="text-[10px] font-medium">{remainingPaths} paths</span>
                </div>
                <div className="w-full h-3 bg-muted rounded-full">
                  <div className="h-full rounded-full transition-all duration-500" style={{ 
                    width: `${(remainingPaths / totalPaths) * 100}%`,
                    backgroundColor: remainingPaths <= 5 ? "#2ed573" : remainingPaths <= 12 ? "#ffa502" : "#ff4757"
                  }} />
                </div>
              </div>
            </div>
            
            <div className="p-3 rounded-md border border-border mt-2">
              <span className="text-[10px] font-semibold block mb-2">Risk Delta Summary</span>
              <div className="grid grid-cols-2 gap-2 text-[10px]">
                <div>
                  <span className="text-muted-foreground">Paths Eliminated:</span>
                  <span className="font-bold ml-1" style={{ color: "#2ed573" }}>{totalPathsBlocked}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Residual Risk:</span>
                  <span className="font-bold ml-1" style={{ color: remainingPaths <= 5 ? "#2ed573" : "#ffa502" }}>{Math.round((remainingPaths / totalPaths) * 100)}%</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Est. Cost Savings:</span>
                  <span className="font-bold ml-1">${(totalPathsBlocked * 42000).toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Priority Fix:</span>
                  <span className="font-bold ml-1">{controls.find(c => !c.active && c.pathsBlocked === Math.max(...controls.filter(x => !x.active).map(x => x.pathsBlocked)))?.label || "None"}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function AttackPaths() {
  useEffect(() => { document.title = "Attack Path Analysis | Athena AI"; }, []);
  
  const { data: attackData, isLoading } = useQuery<any>({
    queryKey: ["/api/attack-paths/data"],
    queryFn: async () => {
      try {
        const res = await fetch("/api/attack-paths/data", { credentials: "include" });
        if (!res.ok) return null;
        return await res.json();
      } catch { return null; }
    },
    retry: false,
  });

  const attackPathNodes = attackData?.nodes || [];
  const attackPathEdges = attackData?.edges || [];
  const pentestProgress = attackData?.pentest_progress || [];
  const attackPathModeling = attackData?.modeling || { exploitationExperience: {} };
  const graphAnalysis = attackData?.graph_analysis || [];
  const exploitationSequence = attackData?.exploitation_sequence || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-muted-foreground text-sm animate-pulse">Loading attack path data...</div>
      </div>
    );
  }

  return (
    <div className="pb-8" data-testid="page-attack-paths">
      <div className="px-4 pt-4 mb-4">
        <h1 className="text-xl font-bold tracking-tight dark:neon-text" data-testid="text-page-title">
          Attack Path Analysis
        </h1>
        <p className="text-xs text-muted-foreground mt-1">
          Visualize attack vectors, exploitation chains, and lateral movement paths across the network.
        </p>
      </div>
      <div className="px-4">
        <Tabs defaultValue="topology" className="w-full">
          <TabsList className="mb-4" data-testid="tabs-attack-paths">
            <TabsTrigger value="topology" data-testid="tab-topology">Topology</TabsTrigger>
            <TabsTrigger value="analytics" data-testid="tab-analytics">Analytics</TabsTrigger>
            <TabsTrigger value="sequence" data-testid="tab-sequence">Sequence</TabsTrigger>
            <TabsTrigger value="storyboard" data-testid="tab-storyboard">Storyboard</TabsTrigger>
            <TabsTrigger value="whatif" data-testid="tab-whatif">What-If</TabsTrigger>
          </TabsList>
          <TabsContent value="topology">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <AttackPathGraph nodes={attackPathNodes} edges={attackPathEdges} />
              <AnimatedBeamDemo />
              <PentestProgress progress={pentestProgress} />
            </div>
          </TabsContent>
          <TabsContent value="analytics">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <AttackPathModelingCard modeling={attackPathModeling} graphAnalysis={graphAnalysis} />
              <VulnerabilityRadarChart />
            </div>
          </TabsContent>
          <TabsContent value="sequence">
            <ExploitationSequenceChart sequence={exploitationSequence} />
          </TabsContent>
          <TabsContent value="storyboard">
            <AttackStoryboard />
          </TabsContent>
          <TabsContent value="whatif">
            <WhatIfSimulator />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
