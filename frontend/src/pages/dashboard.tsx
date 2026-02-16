import CountUp from "react-countup";
import { useState, useEffect, useRef } from "react";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, AreaChart, Area,
} from "recharts";
import {
  ScanSearch, ShieldAlert, Activity, TrendingUp,
  AlertCircle, ArrowRight, Network, CheckCircle2,
  Clock, Radio, BrainCircuit, Shield, Lock,
  AlertTriangle, Database, Server, Cloud,
  Monitor, Wifi, Key, Eye, Fingerprint,
} from "lucide-react";
import { DottedMapComponent } from "@/components/magicui/dotted-map";
import { OrbitingCircles } from "@/components/magicui/orbiting-circles";
import { IconCloud } from "@/components/magicui/icon-cloud";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";

const severityColor: Record<string, string> = {
  critical: "#ff4757",
  high: "#ff6b6b",
  medium: "#ffa502",
  low: "#2ed573",
  exploited: "#ff4757",
  info: "#70a1ff",
};

const sparklineMap: Record<string, number[]> = {
  "Total Scans": [12, 15, 14, 18, 16, 20, 22, 24],
  "Threats Detected": [8, 10, 12, 15, 14, 18, 20, 22],
  "Active Monitors": [5, 6, 5, 7, 8, 7, 8, 8],
  "Detection Rate": [92, 93, 95, 94, 96, 97, 97, 98],
};

const sparklineColors: Record<string, string> = {
  "Total Scans": "#22d3ee",
  "Threats Detected": "#ec4899",
  "Active Monitors": "#34d399",
  "Detection Rate": "#8b5cf6",
};

const mapMarkers = [
  { lat: 40.7128, lng: -74.006, size: 0.6, color: "#ff4757", label: "NYC" },
  { lat: 51.5074, lng: -0.1278, size: 0.5, color: "#ffa502", label: "London" },
  { lat: 35.6762, lng: 139.6503, size: 0.4, color: "#2ed573", label: "Tokyo" },
  { lat: 55.7558, lng: 37.6173, size: 0.7, color: "#ff4757", label: "Moscow" },
  { lat: 39.9042, lng: 116.4074, size: 0.5, color: "#ffa502", label: "Beijing" },
  { lat: -33.8688, lng: 151.2093, size: 0.3, color: "#2ed573", label: "Sydney" },
];

const securityIcons = [
  <div key="shield" className="flex items-center justify-center h-8 w-8 rounded-full bg-primary/20"><Shield className="h-4 w-4 text-primary" /></div>,
  <div key="lock" className="flex items-center justify-center h-8 w-8 rounded-full bg-green-500/20"><Lock className="h-4 w-4 text-green-500" /></div>,
  <div key="database" className="flex items-center justify-center h-8 w-8 rounded-full bg-blue-500/20"><Database className="h-4 w-4 text-blue-500" /></div>,
  <div key="server" className="flex items-center justify-center h-8 w-8 rounded-full bg-purple-500/20"><Server className="h-4 w-4 text-purple-500" /></div>,
  <div key="cloud" className="flex items-center justify-center h-8 w-8 rounded-full bg-cyan-500/20"><Cloud className="h-4 w-4 text-cyan-500" /></div>,
  <div key="monitor" className="flex items-center justify-center h-8 w-8 rounded-full bg-orange-500/20"><Monitor className="h-4 w-4 text-orange-500" /></div>,
  <div key="wifi" className="flex items-center justify-center h-8 w-8 rounded-full bg-teal-500/20"><Wifi className="h-4 w-4 text-teal-500" /></div>,
  <div key="key" className="flex items-center justify-center h-8 w-8 rounded-full bg-yellow-500/20"><Key className="h-4 w-4 text-yellow-500" /></div>,
  <div key="eye" className="flex items-center justify-center h-8 w-8 rounded-full bg-pink-500/20"><Eye className="h-4 w-4 text-pink-500" /></div>,
  <div key="fingerprint" className="flex items-center justify-center h-8 w-8 rounded-full bg-indigo-500/20"><Fingerprint className="h-4 w-4 text-indigo-500" /></div>,
];

const liveThreatFeedData = [
  { id: "TF-001", type: "Intrusion Attempt", source: "192.168.1.45", severity: "critical", time: "Just now" },
  { id: "TF-002", type: "Port Scan Detected", source: "10.0.0.112", severity: "medium", time: "30s ago" },
  { id: "TF-003", type: "Brute Force Attack", source: "172.16.0.88", severity: "high", time: "1 min ago" },
  { id: "TF-004", type: "Malware Signature", source: "192.168.2.201", severity: "critical", time: "2 min ago" },
  { id: "TF-005", type: "DNS Tunneling", source: "10.0.1.55", severity: "high", time: "3 min ago" },
  { id: "TF-006", type: "Data Exfiltration", source: "172.16.1.99", severity: "critical", time: "5 min ago" },
];

const threatTrendData = [
  { month: "Jan", critical: 4, high: 8, medium: 12, low: 20 },
  { month: "Feb", critical: 3, high: 10, medium: 15, low: 18 },
  { month: "Mar", critical: 6, high: 12, medium: 10, low: 22 },
  { month: "Apr", critical: 5, high: 9, medium: 14, low: 25 },
  { month: "May", critical: 8, high: 14, medium: 11, low: 19 },
  { month: "Jun", critical: 7, high: 11, medium: 16, low: 21 },
];

function useCustomInView() {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  
  return { ref, inView };
}

function SeverityBadge({ severity }: { severity: string }) {
  return (
    <Badge
      className="text-[10px] px-1.5 py-0 font-semibold uppercase no-default-hover-elevate no-default-active-elevate"
      style={{ backgroundColor: severityColor[severity] || "#70a1ff", color: "#fff" }}
      data-testid={`badge-severity-${severity}`}
    >
      {severity}
    </Badge>
  );
}

function RadialProgressRing({ value, max, label, color, size = 80 }: {
  value: number; max: number; label: string; color: string; size?: number;
}) {
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (value / max) * circumference;
  const dashoffset = circumference - progress;

  return (
    <div className="flex flex-col items-center gap-1" data-testid={`radial-${label.toLowerCase().replace(/\s+/g, "-")}`}>
      <svg width={size} height={size} className="transform -rotate-90">
        <defs>
          <filter id={`glow-${label.replace(/\s+/g, "")}`}>
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="hsl(var(--muted))" strokeWidth="6" />
        <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke={color} strokeWidth="6"
          strokeDasharray={circumference} strokeDashoffset={dashoffset}
          strokeLinecap="round" className="transition-all duration-1000 ease-out"
          filter={`url(#glow-${label.replace(/\s+/g, "")})`} />
      </svg>
      <span className="text-lg font-bold mt-[-52px]">{value}%</span>
      <span className="text-[10px] text-muted-foreground mt-5">{label}</span>
    </div>
  );
}

function StatCard({
  title, value, suffix, change, icon: Icon, gradient, delay,
}: {
  title: string;
  value: number;
  suffix?: string;
  change?: string;
  icon: typeof ScanSearch;
  gradient: string;
  delay: number;
}) {
  const { ref, inView } = useCustomInView();
  const sparkData = (sparklineMap[title] || []).map((v, i) => ({ i, v }));
  const accentColor = sparklineColors[title] || "#8b5cf6";

  return (
    <div
      ref={ref}
      className="glass-card glow-border rounded-md overflow-visible animate-fade-in-up"
      style={{ animationDelay: `${delay}ms` }}
      data-testid={`stat-${title.toLowerCase().replace(/\s+/g, "-")}`}
    >
      <div className="p-4">
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="text-xs text-muted-foreground font-medium">{title}</span>
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="flex items-end gap-2">
          <span className="text-2xl font-bold tabular-nums">
            {inView ? <CountUp end={value} duration={1.8} /> : 0}
            {suffix}
          </span>
          {change && (
            <Badge
              variant="secondary"
              className="text-[10px] px-1.5 py-0 mb-1 no-default-hover-elevate no-default-active-elevate"
            >
              {change}
            </Badge>
          )}
        </div>
        {sparkData.length > 0 && (
          <div style={{ minHeight: "32px" }} className="mt-2">
            <ResponsiveContainer width="100%" height={32}>
              <AreaChart data={sparkData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id={`sparkGrad-${title.replace(/\s+/g, "")}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={accentColor} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={accentColor} stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="v"
                  stroke={accentColor}
                  strokeWidth={1.5}
                  fill={`url(#sparkGrad-${title.replace(/\s+/g, "")})`}
                  dot={false}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
      <div className={`h-[2px] w-full ${gradient} dark:shadow-[0_0_8px_rgba(0,230,255,0.3)]`} />
    </div>
  );
}

function HeroSection() {
  return (
    <div className="relative overflow-hidden rounded-md mx-4 mt-4 mb-6 dark:border dark:border-primary/20" data-testid="hero-section">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-background to-chart-2/10 dark:from-[rgba(0,230,255,0.12)] dark:via-[rgba(2,8,25,0.95)] dark:to-[rgba(255,0,180,0.06)]" />
      <div className="absolute inset-0 opacity-20 pointer-events-none" data-testid="hero-dotted-map">
        <DottedMapComponent
          markers={mapMarkers}
          dark={true}
          dotRadius={0.3}
          className="w-full h-full"
        />
      </div>
      <div className="absolute inset-0">
        {Array.from({ length: 30 }).map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full animate-pulse-glow"
            style={{
              width: `${Math.random() * 4 + 2}px`,
              height: `${Math.random() * 4 + 2}px`,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              backgroundColor: i % 3 === 0 ? "rgba(255, 0, 180, 0.3)" : "rgba(0, 230, 255, 0.35)",
              animationDelay: `${Math.random() * 4}s`,
              animationDuration: `${Math.random() * 3 + 2}s`,
              boxShadow: i % 3 === 0 ? "0 0 6px rgba(255, 0, 180, 0.4)" : "0 0 6px rgba(0, 230, 255, 0.4)",
            }}
          />
        ))}
        <svg className="absolute inset-0 w-full h-full opacity-[0.06] dark:opacity-[0.12]" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="neural" x="0" y="0" width="60" height="60" patternUnits="userSpaceOnUse">
              <circle cx="30" cy="30" r="1.5" fill="currentColor" className="text-primary" />
              <line x1="30" y1="30" x2="60" y2="0" stroke="currentColor" strokeWidth="0.5" className="text-primary" />
              <line x1="30" y1="30" x2="0" y2="60" stroke="currentColor" strokeWidth="0.5" className="text-primary" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#neural)" />
        </svg>
      </div>
      <div className="absolute bottom-0 left-0 right-0 h-[1px] dark:bg-gradient-to-r dark:from-transparent dark:via-[rgba(0,230,255,0.5)] dark:to-transparent" />
      <div className="relative z-10 px-6 py-10 md:py-14">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-2 dark:neon-text" data-testid="text-hero-title">
          Welcome to <span className="text-primary">Athena AI</span>
        </h1>
        <p className="text-sm text-muted-foreground max-w-lg" data-testid="text-hero-subtitle">
          Your central intelligence hub for threat detection and security analytics.
        </p>
      </div>
    </div>
  );
}

function SystemHealthCard() {
  return (
    <Card className="animate-fade-in-up" style={{ animationDelay: "400ms" }} data-testid="card-system-health">
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-3">
        <CardTitle className="text-sm font-semibold">System Health</CardTitle>
        <Activity className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center justify-around gap-4 flex-wrap flex-1">
            <RadialProgressRing value={98} max={100} label="Uptime" color="hsl(145, 70%, 45%)" />
            <RadialProgressRing value={76} max={100} label="CPU Usage" color="hsl(235, 85%, 58%)" />
            <RadialProgressRing value={84} max={100} label="Memory" color="hsl(280, 75%, 60%)" />
            <RadialProgressRing value={45} max={100} label="Network" color="hsl(25, 90%, 55%)" />
          </div>
          <div className="relative flex items-center justify-center" style={{ width: 120, height: 120 }} data-testid="system-health-orbits">
            <Shield className="h-5 w-5 text-primary" />
            <OrbitingCircles radius={50} duration={15} iconSize={24} path={true}>
              <Shield className="h-3.5 w-3.5 text-green-500" />
              <Lock className="h-3.5 w-3.5 text-blue-500" />
              <Activity className="h-3.5 w-3.5 text-purple-500" />
              <AlertTriangle className="h-3.5 w-3.5 text-orange-500" />
            </OrbitingCircles>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function LiveThreatFeed() {
  return (
    <Card className="animate-fade-in-up" style={{ animationDelay: "450ms" }} data-testid="card-live-threat-feed">
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-3">
        <CardTitle className="text-sm font-semibold">Live Threat Feed</CardTitle>
        <Radio className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent className="space-y-2">
        {liveThreatFeedData.map((item) => (
          <div
            key={item.id}
            className="flex items-center gap-3 py-1.5 border-b last:border-0"
            data-testid={`threat-feed-row-${item.id}`}
          >
            <div
              className="h-2 w-2 rounded-full flex-shrink-0 animate-pulse-glow"
              style={{ backgroundColor: severityColor[item.severity] || "#70a1ff" }}
            />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">{item.type}</p>
              <p className="text-[10px] font-mono text-muted-foreground">{item.source}</p>
            </div>
            <span className="text-[10px] text-muted-foreground whitespace-nowrap">{item.time}</span>
            <SeverityBadge severity={item.severity} />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function RecentPentestsCard({ pentests }: { pentests: any[] }) {
  return (
    <Card className="animate-fade-in-up" style={{ animationDelay: "200ms" }} data-testid="card-recent-pentests">
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-3">
        <CardTitle className="text-sm font-semibold">Recent Pentests</CardTitle>
        <ShieldAlert className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent className="space-y-2">
        {pentests.length > 0 ? (
          pentests.map((pt: any) => (
            <div
              key={pt.id}
              className="flex items-center justify-between gap-2 py-1.5 border-b last:border-0"
              data-testid={`pentest-row-${pt.id}`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <SeverityBadge severity={pt.severity} />
                <span className="text-xs font-semibold truncate">{pt.protocol}</span>
                <ArrowRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                <span className="text-xs text-muted-foreground truncate">{pt.target}</span>
              </div>
              <span className="text-[10px] text-muted-foreground whitespace-nowrap">{pt.time}</span>
            </div>
          ))
        ) : (
          <div className="text-xs text-muted-foreground text-center py-4">No recent pentests</div>
        )}
        <Button variant="default" size="sm" className="w-full mt-2 text-xs" data-testid="button-view-reports">
          View Reports
        </Button>
      </CardContent>
    </Card>
  );
}

function ThreatDetectionsCard({ threats }: { threats: any[] }) {
  const [page, setPage] = useState(0);
  const pageSize = 2;
  const totalPages = Math.ceil(threats.length / pageSize);
  const visibleDetections = threats.slice(page * pageSize, (page + 1) * pageSize);

  return (
    <Card className="animate-fade-in-up" style={{ animationDelay: "300ms" }} data-testid="card-threat-detections">
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-3">
        <CardTitle className="text-sm font-semibold">Threat Detections</CardTitle>
        <AlertCircle className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent className="space-y-2">
        {visibleDetections.length > 0 ? (
          visibleDetections.map((td: any) => (
            <div
              key={td.id}
              className="flex items-center justify-between gap-2 py-1.5 border-b last:border-0"
              data-testid={`threat-row-${td.id}`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" style={{ color: severityColor[td.severity] }} />
                <span className="text-xs font-mono truncate">{td.id}</span>
              </div>
              <SeverityBadge severity={td.severity} />
            </div>
          ))
        ) : (
          <div className="text-xs text-muted-foreground text-center py-4">No threat detections</div>
        )}
        {totalPages > 1 && (
          <div className="flex justify-center gap-1.5 pt-2" data-testid="threat-pagination">
            {Array.from({ length: totalPages }).map((_, i) => (
              <button
                key={i}
                onClick={() => setPage(i)}
                className={`h-2 w-2 rounded-full cursor-pointer transition-colors ${
                  i === page ? "bg-primary" : "bg-muted-foreground/30"
                }`}
                data-testid={`threat-page-${i}`}
                aria-label={`Page ${i + 1}`}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AttackPathsMiniCard({ pathNodes, pathEdges }: { pathNodes: any[]; pathEdges: any[] }) {
  const nodeMap = Object.fromEntries(pathNodes.map((n: any) => [n.id, n]));
  const scale = 0.55;
  const offsetX = 10;
  const offsetY = -20;

  return (
    <Card className="animate-fade-in-up" style={{ animationDelay: "400ms" }} data-testid="card-attack-paths">
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-3">
        <CardTitle className="text-sm font-semibold">Attack Paths</CardTitle>
        <Network className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {pathNodes.length > 0 ? (<>
        <svg viewBox="0 0 250 300" className="w-full h-48">
          {pathEdges.map((edge: any, i: number) => {
            const from = nodeMap[edge.from];
            const to = nodeMap[edge.to];
            if (!from || !to) return null;
            return (
              <line
                key={i}
                x1={from.x * scale + offsetX}
                y1={from.y * scale + offsetY}
                x2={to.x * scale + offsetX}
                y2={to.y * scale + offsetY}
                stroke={edge.status === "compromised" ? "#ff4757" : "#ffa502"}
                strokeWidth="1.5"
                strokeDasharray={edge.status === "scanning" ? "4 3" : "none"}
                opacity="0.7"
              />
            );
          })}
          {pathNodes.map((node: any) => {
            const cx = node.x * scale + offsetX;
            const cy = node.y * scale + offsetY;
            const colorMap: Record<string, string> = {
              client: "#70a1ff",
              server: "#ff6b6b",
              database: "#ffa502",
              cloud: "#2ed573",
            };
            return (
              <g key={node.id}>
                <circle
                  cx={cx}
                  cy={cy}
                  r="12"
                  fill={colorMap[node.type] || "#70a1ff"}
                  opacity="0.2"
                />
                <circle
                  cx={cx}
                  cy={cy}
                  r="6"
                  fill={colorMap[node.type] || "#70a1ff"}
                />
                <text
                  x={cx}
                  y={cy + 20}
                  textAnchor="middle"
                  className="fill-muted-foreground"
                  fontSize="7"
                >
                  {node.label}
                </text>
              </g>
            );
          })}
        </svg>
        <div className="flex items-center justify-between gap-2 mt-2 text-[10px] text-muted-foreground">
          <div className="flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3 text-primary" />
            <span>11,242 Deep Checks</span>
          </div>
          <div className="flex items-center gap-1">
            <ShieldAlert className="h-3 w-3" style={{ color: "#ff4757" }} />
            <span>5 Max Priv Escalations</span>
          </div>
        </div>
        </>) : (
          <div className="text-xs text-muted-foreground text-center py-4">No attack path data</div>
        )}
      </CardContent>
    </Card>
  );
}

function ThreatBreakdownChart({ breakdown }: { breakdown: any[] }) {
  return (
    <Card className="animate-fade-in-up" style={{ animationDelay: "500ms" }} data-testid="card-threat-breakdown">
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-3">
        <CardTitle className="text-sm font-semibold">Threat Breakdown</CardTitle>
      </CardHeader>
      <CardContent>
        {breakdown.length > 0 ? (
        <div className="flex items-center gap-4">
          <div style={{ minHeight: "160px", width: "50%" }}>
            <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie
                data={breakdown}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={65}
                paddingAngle={3}
                dataKey="value"
                stroke="none"
              >
                {breakdown.map((entry: any, i: number) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Pie>
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
            </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-col gap-2">
            {breakdown.map((item: any) => (
              <div key={item.name} className="flex items-center gap-2 text-xs">
                <div className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.fill }} />
                <span className="text-muted-foreground">{item.name}</span>
                <span className="font-semibold ml-auto">{item.value}%</span>
              </div>
            ))}
          </div>
        </div>
        ) : (
          <div className="text-xs text-muted-foreground text-center py-4">No threat breakdown data</div>
        )}
      </CardContent>
    </Card>
  );
}

function ThreatTrendChart() {
  return (
    <Card className="animate-fade-in-up" style={{ animationDelay: "550ms" }} data-testid="card-threat-trend">
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-3">
        <CardTitle className="text-sm font-semibold">Threat Trends</CardTitle>
        <TrendingUp className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div style={{ minHeight: "220px" }}>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={threatTrendData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="gradCritical" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ff4757" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#ff4757" stopOpacity={0.05} />
                </linearGradient>
                <linearGradient id="gradHigh" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ff6b6b" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#ff6b6b" stopOpacity={0.05} />
                </linearGradient>
                <linearGradient id="gradMedium" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ffa502" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#ffa502" stopOpacity={0.05} />
                </linearGradient>
                <linearGradient id="gradLow" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2ed573" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#2ed573" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="month"
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
              <Area type="monotone" dataKey="low" stackId="1" stroke="#2ed573" fill="url(#gradLow)" strokeWidth={1.5} />
              <Area type="monotone" dataKey="medium" stackId="1" stroke="#ffa502" fill="url(#gradMedium)" strokeWidth={1.5} />
              <Area type="monotone" dataKey="high" stackId="1" stroke="#ff6b6b" fill="url(#gradHigh)" strokeWidth={1.5} />
              <Area type="monotone" dataKey="critical" stackId="1" stroke="#ff4757" fill="url(#gradCritical)" strokeWidth={1.5} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

function RecentActivityCard({ activity }: { activity: any[] }) {
  return (
    <Card className="animate-fade-in-up" style={{ animationDelay: "600ms" }} data-testid="card-recent-activity">
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-3">
        <CardTitle className="text-sm font-semibold">Recent Activity</CardTitle>
        <Clock className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent className="space-y-3">
        {activity.length > 0 ? (
          activity.map((item: any) => (
            <div
              key={item.id}
              className="flex items-start gap-3"
              data-testid={`activity-row-${item.id}`}
            >
              <div
                className="mt-1 h-2 w-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: severityColor[item.severity] || "#70a1ff" }}
              />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{item.event}</p>
                <p className="text-[10px] text-muted-foreground">{item.time}</p>
              </div>
              <SeverityBadge severity={item.severity} />
            </div>
          ))
        ) : (
          <div className="text-xs text-muted-foreground text-center py-4">No recent activity</div>
        )}
      </CardContent>
    </Card>
  );
}

const copilotSuggestions = [
  "Show GNSS-related findings in the last 90 days",
  "Draft a change ticket for Nginx header misconfig",
  "Summarize critical vulnerabilities for the board",
  "Compare this month's risk posture vs last month",
  "List all unpatched systems in Flight Ops",
  "Generate compliance evidence for NIST 800-53 CA-8",
];

function CopilotPanel() {
  const [query, setQuery] = useState("");

  return (
    <Card className="dark:border-primary/20 dark:shadow-[0_0_15px_rgba(0,230,255,0.06)]" data-testid="card-copilot">
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2 dark:neon-text">
          <BrainCircuit className="h-4 w-4 text-primary" />
          Athena Copilot
        </CardTitle>
        <Badge variant="secondary" className="text-[10px] no-default-hover-elevate no-default-active-elevate">
          <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse inline-block mr-1" />
          Online
        </Badge>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2 mb-3">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask Athena about your security posture..."
            className="flex-1 px-3 py-2 text-xs rounded-md border border-border bg-background dark:border-primary/20 dark:focus:border-primary/50 dark:focus:shadow-[0_0_10px_rgba(0,230,255,0.15)] transition-all"
            data-testid="input-copilot"
          />
          <Button size="sm" className="text-xs" data-testid="button-copilot-send">
            Ask
          </Button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {copilotSuggestions.map((suggestion, i) => (
            <Badge
              key={i}
              variant="outline"
              className="text-[9px] cursor-pointer py-0.5"
              onClick={() => setQuery(suggestion)}
              data-testid={`copilot-suggestion-${i}`}
            >
              {suggestion}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function TopKeywordsChart({ keywords }: { keywords: any[] }) {
  return (
    <Card className="animate-fade-in-up" style={{ animationDelay: "700ms" }} data-testid="card-top-keywords">
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-3">
        <CardTitle className="text-sm font-semibold">Top Keywords</CardTitle>
      </CardHeader>
      <CardContent>
        {keywords.length > 0 ? (
        <div style={{ minHeight: "220px" }}>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={keywords} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
            <XAxis
              dataKey="keyword"
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
            <Bar
              dataKey="count"
              fill="hsl(var(--chart-1))"
              radius={[4, 4, 0, 0]}
              maxBarSize={32}
            />
            </BarChart>
          </ResponsiveContainer>
        </div>
        ) : (
          <div className="text-xs text-muted-foreground text-center py-4">No keyword data</div>
        )}
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  useEffect(() => { document.title = "Dashboard | Athena AI"; }, []);

  const { data: dashData, isLoading } = useQuery<any>({
    queryKey: ["/api/dashboard/summary"],
    queryFn: async () => {
      try {
        const res = await fetch("/api/dashboard/summary", { credentials: "include" });
        if (!res.ok) return null;
        return await res.json();
      } catch { return null; }
    },
    retry: false,
  });

  const stats = dashData?.stats || { totalScans: 0, threatsDetected: 0, activeMonitors: 0, detectionRate: 0 };
  const pentests = dashData?.recent_pentests || [];
  const threats = dashData?.threat_detections || [];
  const activity = dashData?.recent_activity || [];
  const breakdown = dashData?.threat_breakdown || [];
  const keywords = dashData?.top_keywords || [];
  const pathNodes = dashData?.attack_path_nodes || [];
  const pathEdges = dashData?.attack_path_edges || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-muted-foreground text-sm animate-pulse">Loading dashboard data...</div>
      </div>
    );
  }

  return (
    <div className="pb-8" data-testid="page-dashboard">
      <HeroSection />

      <div className="px-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Total Scans"
          value={stats.totalScans}
          change="+28"
          icon={ScanSearch}
          gradient="bg-gradient-to-r from-cyan-400 to-cyan-600"
          delay={0}
        />
        <StatCard
          title="Threats Detected"
          value={stats.threatsDetected}
          change="+22"
          icon={ShieldAlert}
          gradient="bg-gradient-to-r from-pink-500 to-rose-500"
          delay={100}
        />
        <StatCard
          title="Active Monitors"
          value={stats.activeMonitors}
          icon={Activity}
          gradient="bg-gradient-to-r from-emerald-400 to-green-500"
          delay={200}
        />
        <StatCard
          title="Detection Rate"
          value={stats.detectionRate}
          suffix="%"
          change="+2%"
          icon={TrendingUp}
          gradient="bg-gradient-to-r from-violet-500 to-purple-600"
          delay={300}
        />
      </div>

      <div className="px-4 grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <SystemHealthCard />
        <LiveThreatFeed />
      </div>

      <div className="px-4 grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <RecentPentestsCard pentests={pentests} />
        <ThreatDetectionsCard threats={threats} />
        <AttackPathsMiniCard pathNodes={pathNodes} pathEdges={pathEdges} />
      </div>

      <div className="px-4 grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <ThreatBreakdownChart breakdown={breakdown} />
        <ThreatTrendChart />
      </div>

      <div className="px-4 grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <RecentActivityCard activity={activity} />
        <TopKeywordsChart keywords={keywords} />
      </div>

      <div className="px-4 grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <CopilotPanel />
        <Card className="animate-fade-in-up" style={{ animationDelay: "750ms" }} data-testid="card-security-tech">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-3">
            <CardTitle className="text-sm font-semibold">Security Tech Stack</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div style={{ height: 240 }}>
              <IconCloud icons={securityIcons} />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
