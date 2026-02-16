import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  FileText, Download, CheckCircle2, XCircle, Clock, Shield,
  AlertTriangle, Building, Clipboard, Archive
} from "lucide-react";

const frameworks = ["NIST 800-53", "SOC 2", "ISO 27001", "PCI DSS", "NIST 800-115"];

const controls = [
  {
    id: "CA-8", name: "Penetration Testing",
    coverage: { "NIST 800-53": "automated", "SOC 2": "automated", "ISO 27001": "manual", "PCI DSS": "automated", "NIST 800-115": "automated" }
  },
  {
    id: "RA-5", name: "Vulnerability Monitoring",
    coverage: { "NIST 800-53": "automated", "SOC 2": "automated", "ISO 27001": "automated", "PCI DSS": "automated", "NIST 800-115": "automated" }
  },
  {
    id: "SI-2", name: "Flaw Remediation",
    coverage: { "NIST 800-53": "manual", "SOC 2": "automated", "ISO 27001": "not_covered", "PCI DSS": "manual", "NIST 800-115": "not_covered" }
  },
  {
    id: "CP-9", name: "System Backup",
    coverage: { "NIST 800-53": "not_covered", "SOC 2": "manual", "ISO 27001": "manual", "PCI DSS": "not_covered", "NIST 800-115": "not_covered" }
  },
  {
    id: "AC-2", name: "Account Management",
    coverage: { "NIST 800-53": "automated", "SOC 2": "automated", "ISO 27001": "automated", "PCI DSS": "automated", "NIST 800-115": "manual" }
  },
  {
    id: "AU-6", name: "Audit Record Review",
    coverage: { "NIST 800-53": "automated", "SOC 2": "manual", "ISO 27001": "automated", "PCI DSS": "manual", "NIST 800-115": "automated" }
  },
  {
    id: "IR-4", name: "Incident Handling",
    coverage: { "NIST 800-53": "manual", "SOC 2": "manual", "ISO 27001": "manual", "PCI DSS": "automated", "NIST 800-115": "manual" }
  },
  {
    id: "SC-7", name: "Boundary Protection",
    coverage: { "NIST 800-53": "automated", "SOC 2": "not_covered", "ISO 27001": "automated", "PCI DSS": "automated", "NIST 800-115": "automated" }
  },
];

const evidencePacks = [
  { id: "EP-001", name: "Q4 2024 Pentest Report Bundle", frameworks: ["NIST 800-53", "PCI DSS"], files: 12, size: "4.2 MB", status: "ready", date: "2024-12-15" },
  { id: "EP-002", name: "GNSS Integrity Assessment", frameworks: ["ISO 27001"], files: 8, size: "2.8 MB", status: "ready", date: "2024-12-14" },
  { id: "EP-003", name: "SOC 2 Type II Evidence", frameworks: ["SOC 2"], files: 24, size: "12.1 MB", status: "generating", date: "2024-12-13" },
  { id: "EP-004", name: "Annual Security Review", frameworks: ["NIST 800-53", "ISO 27001", "SOC 2"], files: 32, size: "18.4 MB", status: "ready", date: "2024-12-10" },
];

const evidenceItems = [
  { type: "Pentest Report", format: "PDF", included: true },
  { type: "GNSS Integrity Summary", format: "PDF", included: true },
  { type: "Attack Storyboard", format: "PDF", included: true },
  { type: "Scan Configuration", format: "YAML/JSON", included: true },
  { type: "Scanner Versions & Scope", format: "JSON", included: true },
  { type: "Findings with Status", format: "CSV", included: true },
  { type: "Retest Outcomes", format: "CSV", included: true },
  { type: "Compliance Mapping", format: "JSON", included: false },
];

const regulatoryForms = [
  {
    id: "RF-001", name: "DOE CIAC Incident Report", agency: "Department of Energy",
    status: "pre-populated", completeness: 85,
    fields: [
      { label: "Incident Date", value: "2024-12-15", filled: true },
      { label: "Incident Type", value: "GNSS Spoofing Suspected", filled: true },
      { label: "Affected Systems", value: "Flight Operations GNSS Receivers", filled: true },
      { label: "PII Exfiltration", value: "No evidence of PII exfiltration", filled: true },
      { label: "Impact Assessment", value: "Moderate - Navigation backup systems activated", filled: true },
      { label: "Remediation Status", value: "In Progress", filled: true },
      { label: "Reporting Official", value: "", filled: false },
      { label: "Contact Phone", value: "", filled: false },
    ]
  },
  {
    id: "RF-002", name: "TSA/FAA Security Incident", agency: "Transportation Security Admin",
    status: "draft", completeness: 40,
    fields: [
      { label: "Incident Category", value: "Cyber Security Event", filled: true },
      { label: "Airport/Facility", value: "Multiple Facilities", filled: true },
      { label: "Timeline", value: "2024-12-15 14:32 UTC - Ongoing", filled: true },
      { label: "Systems Affected", value: "", filled: false },
      { label: "Passenger Impact", value: "", filled: false },
      { label: "Law Enforcement Notified", value: "", filled: false },
    ]
  },
  {
    id: "RF-003", name: "Internal Bank Incident Form", agency: "Internal Compliance",
    status: "pre-populated", completeness: 92,
    fields: [
      { label: "Business Unit", value: "Payment Clearing", filled: true },
      { label: "Incident Classification", value: "Unauthorized Access Attempt", filled: true },
      { label: "Customer Data Exposure", value: "None confirmed", filled: true },
      { label: "Regulatory Notification Required", value: "Under review", filled: true },
      { label: "Estimated Financial Impact", value: "$0 (contained)", filled: true },
      { label: "Sign-off", value: "", filled: false },
    ]
  },
];

const complianceStats = [
  { label: "Frameworks Tracked", value: "5", icon: Building, color: "#8b5cf6" },
  { label: "Controls Automated", value: "62%", icon: CheckCircle2, color: "#2ed573" },
  { label: "Evidence Packs", value: "4", icon: Archive, color: "#22d3ee" },
  { label: "Forms Ready", value: "3", icon: FileText, color: "#ffa502" },
];

function ControlCoverageMatrix() {
  const allStatuses = controls.flatMap(c => frameworks.map(f => c.coverage[f as keyof typeof c.coverage]));
  const autoCount = allStatuses.filter(s => s === "automated").length;
  const manualCount = allStatuses.filter(s => s === "manual").length;
  const naCount = allStatuses.filter(s => s === "not_covered").length;
  const total = allStatuses.length;

  return (
    <Card data-testid="card-coverage-matrix">
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Shield className="h-4 w-4 text-primary" />
          Control Coverage Matrix
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4 mb-4 p-3 rounded-md border border-border flex-wrap">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
            <span className="text-xs font-medium">{autoCount} Automated</span>
            <span className="text-[10px] text-muted-foreground">({Math.round(autoCount/total*100)}%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-orange-500" />
            <span className="text-xs font-medium">{manualCount} Manual</span>
            <span className="text-[10px] text-muted-foreground">({Math.round(manualCount/total*100)}%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <XCircle className="h-3.5 w-3.5 text-red-500" />
            <span className="text-xs font-medium">{naCount} Not Covered</span>
            <span className="text-[10px] text-muted-foreground">({Math.round(naCount/total*100)}%)</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-[10px]" data-testid="table-coverage">
            <thead>
              <tr>
                <th className="text-left p-2 text-muted-foreground font-medium">Control ID</th>
                <th className="text-left p-2 text-muted-foreground font-medium">Control Name</th>
                {frameworks.map((f, i) => (
                  <th key={i} className="p-2 text-center text-muted-foreground font-medium whitespace-nowrap">{f}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {controls.map((control, ri) => (
                <tr key={ri} className="border-t border-border">
                  <td className="p-2 font-mono font-medium">{control.id}</td>
                  <td className="p-2 font-medium">{control.name}</td>
                  {frameworks.map((f, ci) => {
                    const status = control.coverage[f as keyof typeof control.coverage];
                    return (
                      <td key={ci} className="p-2 text-center" data-testid={`coverage-${ri}-${ci}`}>
                        <div className="flex items-center justify-center gap-1">
                          {status === "automated" && <><CheckCircle2 className="h-3 w-3 text-green-500" /><span className="text-green-500">Auto</span></>}
                          {status === "manual" && <><Clock className="h-3 w-3 text-orange-500" /><span className="text-orange-500">Manual</span></>}
                          {status === "not_covered" && <><XCircle className="h-3 w-3 text-red-500" /><span className="text-red-500">N/A</span></>}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function EvidencePackBuilder() {
  return (
    <div className="space-y-4">
      <Card data-testid="card-evidence-builder">
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Archive className="h-4 w-4 text-primary" />
            Evidence Pack Builder
          </CardTitle>
          <Button size="sm" className="text-xs gap-1" data-testid="button-build-evidence">
            <Download className="h-3.5 w-3.5" />
            Build New Pack
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <span className="text-[10px] text-muted-foreground font-medium mb-2 block">Bundle Contents</span>
              <div className="space-y-1.5">
                {evidenceItems.map((item, i) => (
                  <div key={i} className="flex items-center gap-2 text-[10px] p-1.5 rounded-md border border-border" data-testid={`evidence-item-${i}`}>
                    {item.included ? <CheckCircle2 className="h-3 w-3 text-green-500 shrink-0" /> : <XCircle className="h-3 w-3 text-muted-foreground shrink-0" />}
                    <span className="flex-1">{item.type}</span>
                    <Badge variant="secondary" className="text-[8px] px-1 py-0 no-default-hover-elevate no-default-active-elevate">{item.format}</Badge>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <span className="text-[10px] text-muted-foreground font-medium mb-2 block">Generated Packs</span>
              <div className="space-y-1.5">
                {evidencePacks.map((pack) => (
                  <div key={pack.id} className="p-2 rounded-md border border-border" data-testid={`evidence-pack-${pack.id}`}>
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-[10px] font-semibold">{pack.name}</span>
                      {pack.status === "ready" ? (
                        <Button variant="ghost" size="icon" data-testid={`download-${pack.id}`}>
                          <Download className="h-3 w-3" />
                        </Button>
                      ) : (
                        <Badge variant="secondary" className="text-[8px] px-1 py-0 no-default-hover-elevate no-default-active-elevate animate-pulse">Generating...</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[9px] text-muted-foreground flex-wrap">
                      {pack.frameworks.map((f, i) => (
                        <Badge key={i} variant="secondary" className="text-[8px] px-1 py-0 no-default-hover-elevate no-default-active-elevate">{f}</Badge>
                      ))}
                      <span>{pack.files} files</span>
                      <span>{pack.size}</span>
                      <span>{pack.date}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function RegulatoryForms() {
  const [expandedForm, setExpandedForm] = useState<string>("RF-001");

  return (
    <Card data-testid="card-regulatory-forms">
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Clipboard className="h-4 w-4 text-primary" />
          Regulatory Form Helper
        </CardTitle>
        <Badge variant="secondary" className="text-[10px] no-default-hover-elevate no-default-active-elevate">AI Pre-populated</Badge>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {regulatoryForms.map((form) => (
            <div key={form.id} className="rounded-md border border-border overflow-hidden" data-testid={`reg-form-${form.id}`}>
              <div
                className="flex items-center justify-between gap-2 p-3 cursor-pointer"
                onClick={() => setExpandedForm(expandedForm === form.id ? "" : form.id)}
                data-testid={`reg-form-toggle-${form.id}`}
              >
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <span className="text-xs font-semibold block">{form.name}</span>
                    <span className="text-[9px] text-muted-foreground">{form.agency}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-20 h-1.5 bg-muted rounded-full">
                    <div className="h-full rounded-full" style={{
                      width: `${form.completeness}%`,
                      backgroundColor: form.completeness >= 80 ? "#2ed573" : form.completeness >= 50 ? "#ffa502" : "#ff6b6b"
                    }} />
                  </div>
                  <span className="text-[9px] text-muted-foreground">{form.completeness}%</span>
                  <Badge
                    className="text-[9px] px-1 py-0 no-default-hover-elevate no-default-active-elevate"
                    style={{
                      backgroundColor: form.status === "pre-populated" ? "#2ed57320" : "#ffa50220",
                      color: form.status === "pre-populated" ? "#2ed573" : "#ffa502",
                    }}
                  >
                    {form.status}
                  </Badge>
                </div>
              </div>
              {expandedForm === form.id && (
                <div className="border-t border-border p-3 space-y-1.5 animate-fade-in-up">
                  {form.fields.map((field, fi) => (
                    <div key={fi} className="flex items-center gap-2 text-[10px]" data-testid={`form-field-${form.id}-${fi}`}>
                      <span className="w-40 text-muted-foreground font-medium shrink-0">{field.label}:</span>
                      {field.filled ? (
                        <span className="font-medium">{field.value}</span>
                      ) : (
                        <span className="text-muted-foreground/50 italic">Not yet filled</span>
                      )}
                      {field.filled && <CheckCircle2 className="h-3 w-3 text-green-500 shrink-0 ml-auto" />}
                    </div>
                  ))}
                  <div className="flex gap-2 mt-3 pt-2 border-t border-border">
                    <Button size="sm" className="text-xs gap-1" data-testid={`export-form-${form.id}`}>
                      <Download className="h-3 w-3" />
                      Export PDF
                    </Button>
                    <Button variant="outline" size="sm" className="text-xs" data-testid={`edit-form-${form.id}`}>
                      Edit Fields
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default function Compliance() {
  useEffect(() => { document.title = "Compliance & Audit | Athena AI"; }, []);

  return (
    <div className="pb-8" data-testid="page-compliance">
      <div className="px-4 pt-4 mb-4">
        <h1 className="text-xl font-bold tracking-tight dark:neon-text" data-testid="text-page-title">
          Compliance & Audit Center
        </h1>
        <p className="text-xs text-muted-foreground mt-1">
          Framework coverage tracking, one-click evidence generation, and regulatory reporting automation.
        </p>
      </div>
      <div className="px-4 space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {complianceStats.map((stat, i) => {
            const Icon = stat.icon;
            return (
              <Card key={i} className="animate-fade-in-up" style={{ animationDelay: `${i * 100}ms` }} data-testid={`stat-${stat.label.toLowerCase().replace(/\s+/g, "-")}`}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[10px] text-muted-foreground font-medium">{stat.label}</span>
                    <Icon className="h-4 w-4" style={{ color: stat.color }} />
                  </div>
                  <span className="text-xl font-bold">{stat.value}</span>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Tabs defaultValue="coverage" className="w-full">
          <TabsList className="mb-4" data-testid="tabs-compliance">
            <TabsTrigger value="coverage" data-testid="tab-coverage">Coverage Matrix</TabsTrigger>
            <TabsTrigger value="evidence" data-testid="tab-evidence">Evidence Packs</TabsTrigger>
            <TabsTrigger value="regulatory" data-testid="tab-regulatory">Regulatory Forms</TabsTrigger>
          </TabsList>
          <TabsContent value="coverage"><ControlCoverageMatrix /></TabsContent>
          <TabsContent value="evidence"><EvidencePackBuilder /></TabsContent>
          <TabsContent value="regulatory"><RegulatoryForms /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
