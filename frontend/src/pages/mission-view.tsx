import { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, CartesianGrid,
} from "recharts";
import { Target, TrendingDown, DollarSign, Clock, AlertTriangle, Activity } from "lucide-react";

const missions = ["Payment Clearing", "Online Banking", "Flight Ops", "GNSS Systems", "Classified Enclave"];
const riskCategories = ["External Attack Surface", "Identity & Access", "Data Exfiltration", "GNSS/Jamming", "OT/ICS", "3rd-Party/SaaS"];

const riskMatrix: number[][] = [
  [3, 5, 7, 8, 9],
  [4, 6, 5, 7, 8],
  [2, 4, 6, 5, 9],
  [1, 2, 8, 9, 7],
  [2, 3, 7, 6, 8],
  [5, 7, 4, 3, 6],
];

const missionStats = [
  { label: "Missions Monitored", value: 5, icon: Target, color: "#8b5cf6" },
  { label: "Critical Risks", value: 4, icon: AlertTriangle, color: "#ff4757" },
  { label: "Risk Reduction", value: "23%", icon: TrendingDown, color: "#2ed573" },
  { label: "Avg Response Time", value: "4.2h", icon: Clock, color: "#22d3ee" },
];

const attackDebtTrend = [
  { month: "Jul", opened: 18, closed: 12, debt: 42 },
  { month: "Aug", opened: 15, closed: 20, debt: 37 },
  { month: "Sep", opened: 22, closed: 18, debt: 41 },
  { month: "Oct", opened: 12, closed: 24, debt: 29 },
  { month: "Nov", opened: 10, closed: 22, debt: 17 },
  { month: "Dec", opened: 8, closed: 19, debt: 6 },
];

const roiMetrics = [
  { label: "Exploitable Paths", value: "6", trend: "-45%", improving: true },
  { label: "Critical Dwell Time", value: "3.2 days", trend: "-62%", improving: true },
  { label: "Retest Pass Rate", value: "94%", trend: "+12%", improving: true },
  { label: "Mission Hours Recovered", value: "1,240h", trend: "+38%", improving: true },
];

const financialImpact = [
  { label: "Estimated Annual Risk", value: "$2.4M", color: "#ff4757" },
  { label: "Risk Mitigated by Athena", value: "$1.8M", color: "#2ed573" },
  { label: "Residual Risk", value: "$600K", color: "#ffa502" },
  { label: "ROI Multiplier", value: "3.2x", color: "#8b5cf6" },
];

function MissionRiskHeatmap() {
  const getColor = (score: number) => {
    if (score <= 3) return "#2ed573";
    if (score <= 6) return "#ffa502";
    if (score <= 8) return "#ff6b6b";
    return "#ff4757";
  };

  const getTextColor = (score: number) => score <= 3 ? "#000" : "#fff";

  return (
    <Card data-testid="card-mission-heatmap">
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Target className="h-4 w-4 text-primary" />
          Mission Risk Heatmap
        </CardTitle>
        <Badge variant="secondary" className="text-[10px] no-default-hover-elevate no-default-active-elevate">LIVE</Badge>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-[10px]" data-testid="table-risk-matrix">
            <thead>
              <tr>
                <th className="text-left p-2 text-muted-foreground font-medium">Risk Category</th>
                {missions.map((m, i) => (
                  <th key={i} className="p-2 text-center text-muted-foreground font-medium whitespace-nowrap">{m}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {riskCategories.map((cat, ri) => (
                <tr key={ri}>
                  <td className="p-2 font-medium whitespace-nowrap">{cat}</td>
                  {riskMatrix[ri].map((score, ci) => (
                    <td key={ci} className="p-1 text-center">
                      <div
                        className="mx-auto h-8 w-10 rounded-md flex items-center justify-center text-xs font-bold transition-all"
                        style={{ backgroundColor: getColor(score), color: getTextColor(score) }}
                        data-testid={`risk-cell-${ri}-${ci}`}
                      >
                        {score}
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center gap-3 mt-4 justify-end flex-wrap">
          <span className="text-[9px] text-muted-foreground">Risk Scale:</span>
          {[{l:"Low",c:"#2ed573"},{l:"Medium",c:"#ffa502"},{l:"High",c:"#ff6b6b"},{l:"Critical",c:"#ff4757"}].map(s => (
            <div key={s.l} className="flex items-center gap-1">
              <div className="h-3 w-3 rounded-sm" style={{ backgroundColor: s.c }} />
              <span className="text-[9px] text-muted-foreground">{s.l}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function AttackDebtPanel() {
  return (
    <Card data-testid="card-attack-debt">
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-primary" />
          Attack Debt & ROI
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          {roiMetrics.map((m, i) => (
            <div key={i} className="p-2 rounded-md border border-border" data-testid={`roi-metric-${i}`}>
              <span className="text-[9px] text-muted-foreground block">{m.label}</span>
              <div className="flex items-end gap-1.5 mt-1">
                <span className="text-sm font-bold">{m.value}</span>
                <span className="text-[9px] font-medium" style={{ color: "#2ed573" }}>{m.trend}</span>
              </div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <span className="text-[10px] text-muted-foreground mb-2 block">Findings: Opened vs Closed</span>
            <div className="h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={attackDebtTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))", color: "hsl(var(--card-foreground))" }} itemStyle={{ color: "hsl(var(--card-foreground))" }} labelStyle={{ color: "hsl(var(--card-foreground))" }} />
                  <Bar dataKey="opened" fill="#ff6b6b" name="Opened" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="closed" fill="#2ed573" name="Closed" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div>
            <span className="text-[10px] text-muted-foreground mb-2 block">Attack Debt Trend</span>
            <div className="h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={attackDebtTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))", color: "hsl(var(--card-foreground))" }} itemStyle={{ color: "hsl(var(--card-foreground))" }} labelStyle={{ color: "hsl(var(--card-foreground))" }} />
                  <defs>
                    <linearGradient id="debtGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#ff4757" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#ff4757" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area type="monotone" dataKey="debt" stroke="#ff4757" fill="url(#debtGrad)" name="Attack Debt" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function FinancialImpactCard() {
  return (
    <Card className="animate-fade-in-up" style={{ animationDelay: "300ms" }} data-testid="card-financial-impact">
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          Dollars at Risk
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {financialImpact.map((item, i) => (
          <div key={i} className="p-3 rounded-md border border-border" data-testid={`financial-metric-${i}`}>
            <span className="text-[10px] text-muted-foreground block">{item.label}</span>
            <span className="text-lg font-bold mt-1 block" style={{ color: item.color }}>{item.value}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export default function MissionView() {
  useEffect(() => { document.title = "Mission View | Athena AI"; }, []);

  return (
    <div className="pb-8" data-testid="page-mission-view">
      <div className="px-4 pt-4 mb-4">
        <h1 className="text-xl font-bold tracking-tight dark:neon-text" data-testid="text-page-title">
          Mission Command View
        </h1>
        <p className="text-xs text-muted-foreground mt-1">
          Executive risk overview across business missions, attack debt tracking, and ROI analysis.
        </p>
      </div>

      <div className="px-4 space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {missionStats.map((stat, i) => {
            const Icon = stat.icon;
            return (
              <Card key={i} className="animate-fade-in-up" style={{ animationDelay: `${i * 80}ms` }} data-testid={`stat-mission-${i}`}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className="h-4 w-4" style={{ color: stat.color }} />
                    <span className="text-[10px] text-muted-foreground">{stat.label}</span>
                  </div>
                  <span className="text-xl font-bold">{stat.value}</span>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <MissionRiskHeatmap />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <AttackDebtPanel />
          </div>
          <FinancialImpactCard />
        </div>
      </div>
    </div>
  );
}
