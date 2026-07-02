import { useEffect, useState } from "react";
import {
  AreaChart, Area, ResponsiveContainer, XAxis, YAxis,
} from "recharts";
import {
  Zap, FileText, Shield, AlertTriangle, ChevronRight,
  Activity, Clock, ArrowRight, Lock, Loader, CheckCircle2, Upload,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { toText, toArray } from "@/lib/safe";

const severityColor: Record<string, string> = {
  critical: "#ff4757",
  high: "#ff6b6b",
  medium: "#ffa502",
  low: "#2ed573",
  exploited: "#ff4757",
  info: "#70a1ff",
};

function SeverityBadge({ severity }: { severity: string }) {
  const sev = toText(severity).toLowerCase() || "info";
  return (
    <Badge
      className="text-[10px] px-1.5 py-0 font-semibold uppercase no-default-hover-elevate no-default-active-elevate"
      style={{ backgroundColor: severityColor[sev] || "#70a1ff", color: "#fff" }}
      data-testid={`badge-severity-${sev}`}
    >
      {sev}
    </Badge>
  );
}

function getHeatmapColor(value: number): string {
  if (value <= 3) return "hsla(210, 80%, 55%, 0.7)";
  if (value <= 6) return "hsla(35, 90%, 55%, 0.75)";
  if (value <= 8) return "hsla(15, 85%, 50%, 0.8)";
  return "hsla(0, 75%, 50%, 0.85)";
}

const sparklineData = [
  { t: 0, v: 3 }, { t: 1, v: 5 }, { t: 2, v: 4 }, { t: 3, v: 7 },
  { t: 4, v: 6 }, { t: 5, v: 8 }, { t: 6, v: 5 }, { t: 7, v: 9 },
  { t: 8, v: 7 }, { t: 9, v: 6 }, { t: 10, v: 8 }, { t: 11, v: 10 },
];

const opDotColors = ["#2ed573", "#ffa502", "#ff4757", "#2ed573", "#ffa502"];

const statusColors: Record<string, string> = {
  Tracked: "#2ed573",
  "Operational Status": "#ffa502",
  "Export Routes": "#ff4757",
};

const timelineSteps = [
  { label: "Detection", description: "Anomalous activity detected on Port 388", time: "Dec 15, 14:32 UTC", status: "completed" },
  { label: "Triage", description: "Threat classified as High severity", time: "Dec 15, 14:45 UTC", status: "completed" },
  { label: "Investigation", description: "AI agents analyzing attack vectors", time: "Dec 15, 15:10 UTC", status: "active" },
  { label: "Containment", description: "Isolate compromised assets", time: "Pending", status: "pending" },
  { label: "Remediation", description: "Apply fixes and harden defenses", time: "Pending", status: "pending" },
];

const securityMetricsData = [
  { label: "Mean Time to Detect", value: "4.2 min", trend: "-12%", icon: Clock },
  { label: "Mean Time to Respond", value: "18 min", trend: "-8%", icon: Zap },
  { label: "Incidents Resolved", value: "47", trend: "+15%", icon: Shield },
  { label: "False Positive Rate", value: "3.2%", trend: "-22%", icon: AlertTriangle },
];

function TriageHeatmap({ triageHeatmapData }: { triageHeatmapData: number[][] }) {
  const xLabels = ["Low", "", "", "Med", "", "", "High"];
  const yLabels = ["High", "", "Med", "", "Low"];

  if (!triageHeatmapData.length) return null;

  return (
    <div
      className="glass-card glow-border rounded-md overflow-visible animate-fade-in-up"
      style={{ animationDelay: "0ms" }}
      data-testid="card-triage-heatmap"
    >
      <div className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Triage Priority Heatmap</h3>
        </div>
        <div className="flex gap-2">
          <div className="flex flex-col justify-between py-1 pr-1">
            {yLabels.map((label, i) => (
              <span key={i} className="text-[9px] text-muted-foreground text-right leading-none">
                {label}
              </span>
            ))}
          </div>
          <div className="flex-1">
            <div className="text-[9px] text-muted-foreground mb-1 text-center">Blast Radius</div>
            <div
              className="grid gap-[2px]"
              style={{ gridTemplateColumns: `repeat(7, 1fr)`, gridTemplateRows: `repeat(5, 1fr)` }}
              data-testid="heatmap-grid"
            >
              {triageHeatmapData.slice().reverse().map((row, ri) =>
                row.map((val, ci) => (
                  <div
                    key={`${ri}-${ci}`}
                    className="aspect-square rounded-sm transition-all duration-300"
                    style={{ backgroundColor: getHeatmapColor(val), minHeight: "20px" }}
                    title={`Value: ${val}`}
                    data-testid={`heatmap-cell-${ri}-${ci}`}
                  />
                ))
              )}
            </div>
            <div className="flex justify-between mt-1">
              {xLabels.map((label, i) => (
                <span key={i} className="text-[9px] text-muted-foreground">
                  {label}
                </span>
              ))}
            </div>
            <div className="text-[9px] text-muted-foreground mt-0.5 text-center">Attack Likelihood</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ThreatCasesPanel({ threatCases }: { threatCases: any[] }) {
  if (!threatCases.length) return null;

  return (
    <div
      className="glass-card glow-border rounded-md overflow-visible animate-fade-in-up"
      style={{ animationDelay: "100ms" }}
      data-testid="card-threat-cases"
    >
      <div className="p-4">
        <div className="flex items-center gap-2 mb-1">
          <Shield className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">AI-Assisted Investigations</h3>
        </div>
        <p className="text-[10px] text-muted-foreground mb-3">
          Advanced Agent Interplay : <span className="text-primary font-medium">7 Tasks Running</span>
        </p>
        <div className="space-y-3">
          {threatCases.map((tc, ti) => (
            <div
              key={toText(tc?.id) || ti}
              className="rounded-md p-3"
              style={{ background: "rgba(100, 130, 255, 0.05)", border: "1px solid rgba(100, 130, 255, 0.08)" }}
              data-testid={`threat-case-${toText(tc?.id) || ti}`}
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <div className="flex items-center gap-1.5 min-w-0">
                  <Zap className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                  <span className="text-xs font-semibold truncate">
                    Threat Case #{toText(tc?.id)} <span className="text-primary">{toText(tc?.name)}</span>
                  </span>
                </div>
                <SeverityBadge severity={toText(tc?.severity)} />
              </div>
              <p className="text-[11px] text-foreground/80 ml-5">{toText(tc?.description)}</p>
              <p className="text-[10px] text-muted-foreground ml-5 mt-0.5">{toText(tc?.detail)}</p>
            </div>
          ))}
        </div>
        <Button variant="default" size="sm" className="w-full mt-3 text-xs" data-testid="button-see-case-reports">
          <FileText className="h-3.5 w-3.5 mr-1.5" />
          See Case Reports
        </Button>
      </div>
    </div>
  );
}

function InvestigationDetailPanel({ investigationDetails }: { investigationDetails: any }) {
  if (!investigationDetails.caseId) return null;

  return (
    <div
      className="glass-card glow-border rounded-md overflow-visible animate-fade-in-up"
      style={{ animationDelay: "200ms" }}
      data-testid="card-investigation-detail"
    >
      <div className="p-4">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold">Threat Case #{investigationDetails.caseId}</h3>
          </div>
          <Badge
            variant="secondary"
            className="text-[10px] px-1.5 py-0 no-default-hover-elevate no-default-active-elevate"
            data-testid="badge-progress"
          >
            {toText(investigationDetails.progress)} / {toArray(investigationDetails.subCases).length}
          </Badge>
        </div>
        <p className="text-xs font-medium mb-0.5">{toText(investigationDetails.title)}</p>
        <p className="text-[10px] text-muted-foreground mb-3">{toText(investigationDetails.target)}</p>

        <div className="space-y-3">
          {toArray<any>(investigationDetails.subCases).map((sc: any, i: number) => (
            <div
              key={i}
              className="rounded-md p-3"
              style={{ background: "rgba(100, 130, 255, 0.05)", border: "1px solid rgba(100, 130, 255, 0.08)" }}
              data-testid={`subcase-${i}`}
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-xs font-semibold">{toText(sc?.title)}</span>
                <SeverityBadge severity={toText(sc?.severity)} />
              </div>
              <p className="text-[10px] text-muted-foreground">{toText(sc?.detail)}</p>
              {sc?.findings && (
                <p className="text-[10px] text-muted-foreground mt-1">
                  <Activity className="h-3 w-3 inline mr-1" />
                  {toText(sc.findings)}
                </p>
              )}
            </div>
          ))}
        </div>
        <Button variant="default" size="sm" className="w-full mt-3 text-xs" data-testid="button-see-case-reports-detail">
          <FileText className="h-3.5 w-3.5 mr-1.5" />
          See Case Reports
        </Button>
      </div>
    </div>
  );
}

function EvidenceAndOperations({ evidenceReview, securityOperations }: { evidenceReview: any; securityOperations: any[] }) {
  return (
    <div
      className="glass-card glow-border rounded-md overflow-visible animate-fade-in-up"
      style={{ animationDelay: "300ms" }}
      data-testid="card-evidence-operations"
    >
      <div className="p-4 space-y-4">
        {evidenceReview.exploitChains?.title && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Evidence Review</h3>
          </div>
          <div
            className="rounded-md p-3 mb-2"
            style={{ background: "rgba(100, 130, 255, 0.05)", border: "1px solid rgba(100, 130, 255, 0.08)" }}
            data-testid="evidence-exploit-chains"
          >
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="text-xs font-semibold">
                Exploit Chains : {toText(evidenceReview.exploitChains.title)}
              </span>
              <SeverityBadge severity={toText(evidenceReview.exploitChains.severity)} />
            </div>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {toArray(evidenceReview.exploitChains.cves).map((cve, i: number) => (
                <Badge
                  key={i}
                  variant="secondary"
                  className="text-[9px] px-1 py-0 no-default-hover-elevate no-default-active-elevate"
                >
                  {toText(cve)}
                </Badge>
              ))}
            </div>
          </div>
          {evidenceReview.credentials?.id && (
          <div
            className="rounded-md p-3"
            style={{ background: "rgba(100, 130, 255, 0.05)", border: "1px solid rgba(100, 130, 255, 0.08)" }}
            data-testid="evidence-credentials"
          >
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="text-xs font-semibold">{toText(evidenceReview.credentials.id)}</span>
              <SeverityBadge severity={toText(evidenceReview.credentials.severity)} />
            </div>
            <p className="text-[11px] text-foreground/80">{toText(evidenceReview.credentials.title)}</p>
            <p className="text-[10px] text-muted-foreground">{toText(evidenceReview.credentials.detail)}</p>
            <div className="flex items-center gap-1 mt-1">
              <Clock className="h-3 w-3 text-muted-foreground" />
              <span className="text-[9px] text-muted-foreground">{toText(evidenceReview.credentials.time)}</span>
            </div>
          </div>
          )}
        </div>
        )}

        <div>
          <div className="flex items-center gap-2 mb-2">
            <Activity className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Running Security Operations</h3>
            <Badge variant="secondary" className="text-[9px] px-1 py-0 no-default-hover-elevate no-default-active-elevate">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse-glow inline-block mr-1" />
              LIVE
            </Badge>
          </div>
          <div className="space-y-2 max-h-44 overflow-y-auto scrollbar-thin">
            {securityOperations.map((op: any, i: number) => (
              <div
                key={i}
                className="flex items-start gap-2"
                data-testid={`security-op-${i}`}
              >
                <div
                  className="mt-1.5 h-2 w-2 rounded-full flex-shrink-0 animate-pulse-glow"
                  style={{ backgroundColor: opDotColors[i % opDotColors.length] }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] leading-tight">{toText(op?.event)}</p>
                  <p className="text-[9px] text-muted-foreground">{toText(op?.time)}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 h-16" data-testid="sparkline-chart">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sparklineData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(235, 85%, 58%)" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="hsl(235, 85%, 58%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="t" hide />
                <YAxis hide />
                <Area
                  type="monotone"
                  dataKey="v"
                  stroke="hsl(235, 85%, 58%)"
                  strokeWidth={1.5}
                  fill="url(#sparkGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <Button variant="outline" size="sm" className="w-full mt-2 text-xs" data-testid="button-more-logs">
            More Operational Logs
            <ChevronRight className="h-3.5 w-3.5 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function RecommendationsPanel({ recommendations }: { recommendations: any }) {
  return (
    <div
      className="glass-card glow-border rounded-md overflow-visible animate-fade-in-up"
      style={{ animationDelay: "400ms" }}
      data-testid="card-recommendations"
    >
      <div className="p-4 space-y-4">
        {(recommendations.steps || []).length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Shield className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Key Remediation Steps</h3>
          </div>
          <div className="space-y-2">
            {toArray(recommendations.steps).map((step, i: number) => (
              <div key={i} className="flex items-start gap-2" data-testid={`remediation-step-${i}`}>
                <div className="flex items-center justify-center h-5 w-5 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex-shrink-0 mt-0.5">
                  {i + 1}
                </div>
                <p className="text-[11px] leading-relaxed">{toText(step)}</p>
              </div>
            ))}
          </div>
        </div>
        )}

        {(recommendations.operatorNotes || []).length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Operator Notes</h3>
          </div>
          <div className="space-y-2">
            {toArray<any>(recommendations.operatorNotes).map((note: any, i: number) => (
              <div
                key={i}
                className="rounded-md p-2.5"
                style={{ background: "rgba(100, 130, 255, 0.05)", border: "1px solid rgba(100, 130, 255, 0.08)" }}
                data-testid={`operator-note-${i}`}
              >
                <div className="flex items-center justify-between gap-2 mb-0.5">
                  <p className="text-[11px] leading-tight flex-1">{toText(note?.note)}</p>
                  <Badge
                    className="text-[9px] px-1.5 py-0 no-default-hover-elevate no-default-active-elevate whitespace-nowrap"
                    style={{ backgroundColor: statusColors[toText(note?.status)] || "#70a1ff", color: "#fff" }}
                  >
                    {toText(note?.status)}
                  </Badge>
                </div>
                <div className="flex items-center gap-1 mt-1">
                  <Clock className="h-2.5 w-2.5 text-muted-foreground" />
                  <span className="text-[9px] text-muted-foreground">{toText(note?.time)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
        )}

        <div className="flex flex-col gap-2 pt-1">
          <Button variant="default" size="sm" className="w-full text-xs" data-testid="button-generate-evidence">
            <FileText className="h-3.5 w-3.5 mr-1.5" />
            Generate Evidence Packages
          </Button>
          <Button variant="outline" size="sm" className="w-full text-xs" data-testid="button-execute-actions">
            <ArrowRight className="h-3.5 w-3.5 mr-1.5" />
            Execute Recommended Actions
          </Button>
        </div>
      </div>
    </div>
  );
}

function CaseTimeline() {
  return (
    <Card className="animate-fade-in-up" style={{ animationDelay: "100ms" }} data-testid="card-case-timeline">
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary" />
          Investigation Timeline
        </CardTitle>
        <Badge variant="secondary" className="text-[10px] no-default-hover-elevate no-default-active-elevate">IN PROGRESS</Badge>
      </CardHeader>
      <CardContent>
        <div className="space-y-0">
          {timelineSteps.map((step, i) => {
            const isCompleted = step.status === "completed";
            const isActive = step.status === "active";
            const isLast = i === timelineSteps.length - 1;
            return (
              <div key={i} className="flex gap-3" data-testid={`timeline-step-${i}`}>
                <div className="flex flex-col items-center">
                  <div className={`h-6 w-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                    isCompleted ? "bg-primary/20 border border-primary" :
                    isActive ? "bg-primary/10 border border-primary animate-pulse-glow" :
                    "border border-border"
                  }`}>
                    {isCompleted && <CheckCircle2 className="h-3.5 w-3.5 text-primary" />}
                    {isActive && <Loader className="h-3.5 w-3.5 text-primary animate-spin" />}
                  </div>
                  {!isLast && <div className={`w-[2px] h-8 ${isCompleted ? "bg-primary/40" : "bg-border"}`} />}
                </div>
                <div className="pb-6">
                  <span className={`text-xs font-semibold ${isCompleted || isActive ? "" : "text-muted-foreground"}`}>{step.label}</span>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{step.description}</p>
                  <p className="text-[9px] text-muted-foreground mt-0.5">{step.time}</p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function SecurityMetrics() {
  return (
    <Card className="animate-fade-in-up" style={{ animationDelay: "200ms" }} data-testid="card-security-metrics">
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          Security Metrics
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          {securityMetricsData.map((metric, i) => {
            const Icon = metric.icon;
            return (
              <div key={i} className="p-3 rounded-md border border-border" data-testid={`metric-${i}`}>
                <div className="flex items-center gap-2 mb-2">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-[10px] text-muted-foreground">{metric.label}</span>
                </div>
                <div className="flex items-end gap-2">
                  <span className="text-lg font-bold">{metric.value}</span>
                  <Badge variant="secondary" className="text-[9px] px-1 py-0 no-default-hover-elevate no-default-active-elevate" style={{ color: "#2ed573" }}>
                    {metric.trend}
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

export default function Investigations() {
  useEffect(() => { document.title = "AI-Assisted Investigations | Athena AI"; }, []);

  const { getAccessToken } = useAuth();

  const { data: investigationData, isLoading } = useQuery<any>({
    queryKey: ["/api/investigations/data"],
    queryFn: async () => {
      try {
        const res = await fetch("/api/investigations/data", { credentials: "include" });
        if (!res.ok) return null;
        return await res.json();
      } catch { return null; }
    },
    retry: false,
  });

  const triageHeatmapData = toArray<number[]>(investigationData?.triage_heatmap);
  const threatCases = toArray<any>(investigationData?.threat_cases);
  const investigationDetails = investigationData?.details || { caseId: 0, title: "", target: "", progress: 0, subCases: [] };
  const securityOperations = toArray<any>(investigationData?.security_operations);
  const recommendations = investigationData?.recommendations || { steps: [], operatorNotes: [] };
  const evidenceReview = investigationData?.evidence_review || { exploitChains: {}, credentials: {} };

  const [logText, setLogText] = useState("");
  const [logFile, setLogFile] = useState<File | null>(null);
  const [logAnalysis, setLogAnalysis] = useState<any>(null);
  const [logLoading, setLogLoading] = useState(false);
  const [logError, setLogError] = useState<string | null>(null);

  const analyzeLogText = async () => {
    if (!logText.trim()) return;
    setLogLoading(true);
    setLogError(null);
    try {
      const res = await apiRequest("POST", "/api/detection/defender/text/", { content: logText });
      const data = await res.json();
      setLogAnalysis(data);
    } catch (err: any) {
      setLogError(err.message || "Failed to analyze log text");
    } finally {
      setLogLoading(false);
    }
  };

  const analyzeLogFile = async () => {
    if (!logFile) return;
    setLogLoading(true);
    setLogError(null);
    try {
      const formData = new FormData();
      formData.append("uploaded_file", logFile);
      const headers: Record<string, string> = {};
      const token = getAccessToken();
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      const res = await fetch("/api/detection/defender/file/", {
        method: "POST",
        headers,
        body: formData,
        credentials: "include",
      });
      if (!res.ok) {
        const text = (await res.text()) || res.statusText;
        throw new Error(`${res.status}: ${text}`);
      }
      const data = await res.json();
      setLogAnalysis(data);
    } catch (err: any) {
      setLogError(err.message || "Failed to analyze log file");
    } finally {
      setLogLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64" data-testid="loading-investigations">
        <Loader className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-3 text-sm text-muted-foreground">Loading investigation data...</span>
      </div>
    );
  }

  return (
    <div className="pb-8" data-testid="page-investigations">
      <div className="px-4 pt-4 mb-2">
        <h1 className="text-xl font-bold tracking-tight dark:neon-text" data-testid="text-investigations-title">
          AI-Assisted <span className="text-primary">Investigations</span>
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Real-time threat analysis and autonomous investigation pipeline
        </p>
      </div>

      <div className="px-4">
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="mb-4" data-testid="tabs-investigations">
            <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
            <TabsTrigger value="evidence" data-testid="tab-evidence">Evidence</TabsTrigger>
            <TabsTrigger value="timeline" data-testid="tab-timeline">Timeline</TabsTrigger>
            <TabsTrigger value="log-analysis" data-testid="tab-log-analysis">Log Analysis</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <TriageHeatmap triageHeatmapData={triageHeatmapData} />
              <ThreatCasesPanel threatCases={threatCases} />
              <InvestigationDetailPanel investigationDetails={investigationDetails} />
            </div>
          </TabsContent>

          <TabsContent value="evidence">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <EvidenceAndOperations evidenceReview={evidenceReview} securityOperations={securityOperations} />
              <RecommendationsPanel recommendations={recommendations} />
            </div>
          </TabsContent>

          <TabsContent value="timeline">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <CaseTimeline />
              <SecurityMetrics />
            </div>
          </TabsContent>

          <TabsContent value="log-analysis">
            <div className="space-y-4">
              <Card className="glass-card glow-border overflow-visible">
                <CardHeader>
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    Log Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Paste Log Data</label>
                    <Textarea value={logText} onChange={(e) => setLogText(e.target.value)} rows={6} placeholder="Paste raw log text for analysis..." data-testid="textarea-log-input" />
                  </div>
                  <Button onClick={analyzeLogText} disabled={logLoading || !logText.trim()} data-testid="button-analyze-log">
                    {logLoading ? <Loader className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                    {logLoading ? "Analyzing..." : "Analyze Log"}
                  </Button>
                  <div className="border-t pt-4">
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Or Upload Log File</label>
                    <input type="file" onChange={(e) => setLogFile(e.target.files?.[0] || null)} className="text-xs text-muted-foreground" data-testid="input-log-file" />
                    <Button variant="outline" className="mt-2" onClick={analyzeLogFile} disabled={logLoading || !logFile} data-testid="button-upload-log">
                      <Upload className="h-4 w-4" />
                      Upload &amp; Analyze
                    </Button>
                  </div>
                  {logError && (
                    <div className="rounded-md p-3 text-xs text-red-400 border border-red-500/20" style={{ background: "rgba(255, 71, 87, 0.05)" }} data-testid="text-log-error">
                      <AlertTriangle className="h-3.5 w-3.5 inline mr-1.5" />
                      {logError}
                    </div>
                  )}
                  {logAnalysis && (
                    <Card className="glass-card overflow-visible mt-4">
                      <CardHeader><CardTitle className="text-sm">Analysis Results</CardTitle></CardHeader>
                      <CardContent>
                        <pre className="text-xs whitespace-pre-wrap font-mono text-muted-foreground" data-testid="text-log-results">{JSON.stringify(logAnalysis, null, 2)}</pre>
                      </CardContent>
                    </Card>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
