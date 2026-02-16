import { useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  ResponsiveContainer,
} from "recharts";
import {
  Satellite, Shield, AlertTriangle,
  CheckCircle2, XCircle,
} from "lucide-react";
import { Globe } from "@/components/magicui/globe";

const gnssThreats = [
  { id: "G-001", type: "GPS Jamming", lat: 34.05, lon: 44.4, strength: "High", constellation: "GPS", location: "Eastern Mediterranean", time: "12 min ago", status: "active" },
  { id: "G-002", type: "GLONASS Spoofing", lat: 55.75, lon: 37.62, strength: "Critical", constellation: "GLONASS", location: "Moscow Region", time: "3 min ago", status: "active" },
  { id: "G-003", type: "Multi-GNSS Jamming", lat: 32.0, lon: 34.87, strength: "Medium", constellation: "GPS/Galileo", location: "Tel Aviv Area", time: "1 hour ago", status: "monitoring" },
  { id: "G-004", type: "GPS Spoofing", lat: 25.28, lon: 55.3, strength: "High", constellation: "GPS", location: "Persian Gulf", time: "45 min ago", status: "active" },
  { id: "G-005", type: "BeiDou Interference", lat: 39.9, lon: 116.4, strength: "Low", constellation: "BeiDou", location: "Beijing Region", time: "2 hours ago", status: "resolved" },
  { id: "G-006", type: "GNSS Blanking", lat: 59.33, lon: 18.07, strength: "Medium", constellation: "Galileo", location: "Baltic Sea", time: "30 min ago", status: "active" },
];

const gnssAssets = [
  { id: "A-001", name: "Boeing 737-800 (N12345)", type: "Aircraft", integrityScore: 92, raim: true, antiSpoof: true, backup: "INS + DME", exposure: "Low", constellation: "GPS/GLONASS" },
  { id: "A-002", name: "Airbus A320 (D-ABCD)", type: "Aircraft", integrityScore: 78, raim: true, antiSpoof: false, backup: "INS", exposure: "Medium", constellation: "GPS/Galileo" },
  { id: "A-003", name: "Ground Station Alpha", type: "Ground", integrityScore: 95, raim: true, antiSpoof: true, backup: "Multi-GNSS + Atomic Clock", exposure: "Low", constellation: "GPS/GLONASS/Galileo/BeiDou" },
  { id: "A-004", name: "Maritime Vessel MV-Orion", type: "Maritime", integrityScore: 64, raim: false, antiSpoof: false, backup: "Radar", exposure: "High", constellation: "GPS" },
  { id: "A-005", name: "Logistics Fleet Hub", type: "Ground", integrityScore: 85, raim: true, antiSpoof: true, backup: "Terrestrial Backup", exposure: "Low", constellation: "GPS/Galileo" },
];

const droneInventory = [
  { id: "UAS-001", name: "Recon Falcon MK4", type: "Fixed-Wing", firmware: "v3.2.1", firmwareAge: "2 months", cves: 0, telemetry: "RF + LTE", hardening: 92, status: "operational" },
  { id: "UAS-002", name: "Package Drone R13", type: "Multirotor", firmware: "v2.8.4", firmwareAge: "8 months", cves: 3, telemetry: "RF", hardening: 58, status: "maintenance" },
  { id: "UAS-003", name: "Survey Eagle Pro", type: "Fixed-Wing", firmware: "v4.0.0", firmwareAge: "1 month", cves: 0, telemetry: "SAT + LTE", hardening: 95, status: "operational" },
  { id: "UAS-004", name: "Tactical Hornet X2", type: "Multirotor", firmware: "v3.0.2", firmwareAge: "11 months", cves: 5, telemetry: "RF", hardening: 42, status: "grounded" },
  { id: "UAS-005", name: "Cargo Lifter C1", type: "VTOL", firmware: "v2.9.8", firmwareAge: "4 months", cves: 1, telemetry: "SAT + RF", hardening: 78, status: "operational" },
];

const droneAttackSurface = [
  { category: "Debug Ports", risk: 72 },
  { category: "Telemetry Encryption", risk: 45 },
  { category: "Firmware Integrity", risk: 60 },
  { category: "GNSS Dependency", risk: 85 },
  { category: "Controller Auth", risk: 38 },
  { category: "Supply Chain", risk: 55 },
];

const strengthColor: Record<string, string> = {
  Critical: "#ff4757",
  High: "#ff6b6b",
  Medium: "#ffa502",
  Low: "#2ed573",
};

const globeConfig = {
  dark: 1,
  diffuse: 0.4,
  mapSamples: 16000,
  mapBrightness: 1.2,
  baseColor: [0.15, 0.15, 0.4],
  markerColor: [1, 0.3, 0.1],
  glowColor: [0.1, 0.1, 0.3],
};

function GNSSWorldMap() {
  const globeMarkers = useMemo(() =>
    gnssThreats.map(t => ({
      location: [t.lat, t.lon] as [number, number],
      size: t.strength === "Critical" ? 0.12 : t.strength === "High" ? 0.08 : t.strength === "Medium" ? 0.06 : 0.04,
    })),
    []
  );

  return (
    <Card className="animate-fade-in-up" data-testid="card-gnss-map">
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Satellite className="h-4 w-4 text-primary" />
          Global GNSS Threat Map
        </CardTitle>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-[10px] no-default-hover-elevate no-default-active-elevate">
            <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse inline-block mr-1" />
            {gnssThreats.filter(t => t.status === "active").length} Active
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="flex items-center justify-center" data-testid="globe-container">
            <Globe
              className="max-w-[400px]"
              config={globeConfig}
              markers={globeMarkers}
            />
          </div>
          <div className="max-h-[400px] overflow-y-auto space-y-1.5" data-testid="threat-list-scroll">
            <h3 className="text-xs font-semibold text-muted-foreground mb-2 sticky top-0 bg-card py-1 z-10">Active Threats</h3>
            {gnssThreats.map((threat) => (
              <div key={threat.id} className="flex items-center gap-3 p-2 rounded-md border border-border text-[10px] flex-wrap" data-testid={`gnss-threat-${threat.id}`}>
                <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: strengthColor[threat.strength] }} />
                <span className="font-mono font-medium w-12">{threat.id}</span>
                <span className="font-medium flex-1">{threat.type}</span>
                <Badge variant="secondary" className="text-[9px] px-1 py-0 no-default-hover-elevate no-default-active-elevate">{threat.constellation}</Badge>
                <span className="text-muted-foreground w-28">{threat.location}</span>
                <span className="text-muted-foreground">{threat.time}</span>
                <Badge
                  className="text-[9px] px-1 py-0 no-default-hover-elevate no-default-active-elevate"
                  style={{
                    backgroundColor: threat.status === "active" ? "#ff475720" : threat.status === "monitoring" ? "#ffa50220" : "#2ed57320",
                    color: threat.status === "active" ? "#ff4757" : threat.status === "monitoring" ? "#ffa502" : "#2ed573",
                  }}
                >
                  {threat.status}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function GNSSIntegrityScores() {
  return (
    <Card className="animate-fade-in-up" data-testid="card-gnss-integrity">
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Shield className="h-4 w-4 text-primary" />
          GNSS Integrity Scores
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {gnssAssets.map((asset) => {
            const scoreColor = asset.integrityScore >= 80 ? "#2ed573" : asset.integrityScore >= 60 ? "#ffa502" : "#ff4757";
            return (
              <div key={asset.id} className="p-3 rounded-md border border-border" data-testid={`gnss-asset-${asset.id}`}>
                <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-[10px] text-muted-foreground">{asset.id}</span>
                    <span className="text-xs font-semibold">{asset.name}</span>
                    <Badge variant="secondary" className="text-[9px] px-1 py-0 no-default-hover-elevate no-default-active-elevate">{asset.type}</Badge>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-sm font-bold" style={{ color: scoreColor }}>{asset.integrityScore}</span>
                    <span className="text-[9px] text-muted-foreground">/100</span>
                  </div>
                </div>
                <div className="w-full h-1.5 bg-muted rounded-full mb-2">
                  <div className="h-full rounded-full transition-all duration-500" style={{ width: `${asset.integrityScore}%`, backgroundColor: scoreColor }} />
                </div>
                <div className="flex items-center gap-4 text-[10px] text-muted-foreground flex-wrap">
                  <div className="flex items-center gap-1">
                    {asset.raim ? <CheckCircle2 className="h-3 w-3 text-green-500" /> : <XCircle className="h-3 w-3 text-red-500" />}
                    <span>RAIM</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {asset.antiSpoof ? <CheckCircle2 className="h-3 w-3 text-green-500" /> : <XCircle className="h-3 w-3 text-red-500" />}
                    <span>Anti-Spoof</span>
                  </div>
                  <span>Backup: {asset.backup}</span>
                  <span>Constellations: {asset.constellation}</span>
                  <Badge
                    className="text-[9px] px-1 py-0 no-default-hover-elevate no-default-active-elevate ml-auto"
                    style={{
                      backgroundColor: asset.exposure === "Low" ? "#2ed57320" : asset.exposure === "Medium" ? "#ffa50220" : "#ff475720",
                      color: asset.exposure === "Low" ? "#2ed573" : asset.exposure === "Medium" ? "#ffa502" : "#ff4757",
                    }}
                  >
                    {asset.exposure} Exposure
                  </Badge>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function DroneInventory() {
  const statusColors: Record<string, { bg: string; color: string }> = {
    operational: { bg: "#2ed57320", color: "#2ed573" },
    maintenance: { bg: "#ffa50220", color: "#ffa502" },
    grounded: { bg: "#ff475720", color: "#ff4757" },
  };

  return (
    <Card className="animate-fade-in-up" data-testid="card-drone-inventory">
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-primary" />
          UAS Fleet Inventory
        </CardTitle>
        <Badge variant="secondary" className="text-[10px] no-default-hover-elevate no-default-active-elevate">
          {droneInventory.length} Units
        </Badge>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {droneInventory.map((drone) => {
            const hardeningColor = drone.hardening >= 80 ? "#2ed573" : drone.hardening >= 60 ? "#ffa502" : "#ff4757";
            const sc = statusColors[drone.status] || statusColors.operational;
            return (
              <div key={drone.id} className="p-3 rounded-md border border-border" data-testid={`drone-${drone.id}`}>
                <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-[10px] text-muted-foreground">{drone.id}</span>
                    <span className="text-xs font-semibold">{drone.name}</span>
                    <Badge variant="secondary" className="text-[9px] px-1 py-0 no-default-hover-elevate no-default-active-elevate">{drone.type}</Badge>
                  </div>
                  <Badge
                    className="text-[9px] px-1 py-0 no-default-hover-elevate no-default-active-elevate"
                    style={{ backgroundColor: sc.bg, color: sc.color }}
                  >
                    {drone.status}
                  </Badge>
                </div>
                <div className="flex items-center gap-4 text-[10px] text-muted-foreground flex-wrap mb-2">
                  <span>FW: {drone.firmware}</span>
                  <span>Age: {drone.firmwareAge}</span>
                  <span style={{ color: drone.cves > 0 ? "#ff4757" : "#2ed573", fontWeight: 600 }}>
                    CVEs: {drone.cves}
                  </span>
                  <span>Telemetry: {drone.telemetry}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground w-16">Hardening</span>
                  <div className="flex-1 h-1.5 bg-muted rounded-full">
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${drone.hardening}%`, backgroundColor: hardeningColor }} />
                  </div>
                  <span className="text-[10px] font-semibold w-8 text-right" style={{ color: hardeningColor }}>{drone.hardening}</span>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function DroneAttackSurfaceRadar() {
  return (
    <Card className="animate-fade-in-up" style={{ animationDelay: "100ms" }} data-testid="card-drone-attack-surface">
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Shield className="h-4 w-4 text-primary" />
          Attack Surface
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={280}>
          <RadarChart data={droneAttackSurface}>
            <PolarGrid stroke="hsl(var(--border))" />
            <PolarAngleAxis dataKey="category" tick={{ fontSize: 10 }} className="fill-muted-foreground" />
            <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 9 }} className="fill-muted-foreground" />
            <Radar
              name="Risk"
              dataKey="risk"
              stroke="hsl(var(--chart-1))"
              fill="hsl(var(--chart-1))"
              fillOpacity={0.3}
            />
          </RadarChart>
        </ResponsiveContainer>
        <div className="mt-3 space-y-1">
          {droneAttackSurface.map((item) => {
            const riskColor = item.risk >= 70 ? "#ff4757" : item.risk >= 50 ? "#ffa502" : "#2ed573";
            return (
              <div key={item.category} className="flex items-center justify-between gap-2 text-[10px]" data-testid={`attack-surface-${item.category.toLowerCase().replace(/\s+/g, "-")}`}>
                <span className="text-muted-foreground">{item.category}</span>
                <span className="font-semibold" style={{ color: riskColor }}>{item.risk}%</span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

export default function GNSSDrone() {
  useEffect(() => { document.title = "GNSS & Drone Console | Athena AI"; }, []);

  return (
    <div className="pb-8" data-testid="page-gnss-drone">
      <div className="px-4 pt-4 mb-4">
        <h1 className="text-xl font-bold tracking-tight dark:neon-text" data-testid="text-page-title">
          GNSS & Drone Operations
        </h1>
        <p className="text-xs text-muted-foreground mt-1">
          Monitor GNSS threats, satellite integrity, and unmanned system security across your fleet.
        </p>
      </div>
      <div className="px-4">
        <Tabs defaultValue="threat-map" className="w-full">
          <TabsList className="mb-4" data-testid="tabs-gnss">
            <TabsTrigger value="threat-map" data-testid="tab-threat-map">Threat Map</TabsTrigger>
            <TabsTrigger value="integrity" data-testid="tab-integrity">GNSS Integrity</TabsTrigger>
            <TabsTrigger value="drone" data-testid="tab-drone">Drone Console</TabsTrigger>
          </TabsList>
          <TabsContent value="threat-map">
            <GNSSWorldMap />
          </TabsContent>
          <TabsContent value="integrity">
            <GNSSIntegrityScores />
          </TabsContent>
          <TabsContent value="drone">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2">
                <DroneInventory />
              </div>
              <DroneAttackSurfaceRadar />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
