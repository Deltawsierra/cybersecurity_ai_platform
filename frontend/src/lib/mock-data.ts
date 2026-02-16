export const securityNews = [
  "News completed - 22 threats identified",
  "Security patch applied to database layer",
  "New malware signature added to detection engine",
  "Active monitoring - 6 systems under surveillance",
  "DoD compliance tracking initiated",
  "Zero-day vulnerability patched in authentication module",
  "Threat intelligence feed updated - 147 new indicators",
  "Network perimeter scan completed successfully",
];

export const dashboardStats = {
  totalScans: 24,
  threatsDetected: 22,
  activeMonitors: 8,
  detectionRate: 98,
};

export const recentPentests = [
  { id: 1, severity: "high", protocol: "RDP", target: "Credential Submission", time: "1 hour ago", status: "completed" },
  { id: 2, severity: "critical", protocol: "AWS", target: "Elevated Permissions", time: "2 hours ago", status: "flagged" },
  { id: 3, severity: "exploited", protocol: "Splunk", target: "Outdated Component", time: "Exploited", status: "exploited" },
  { id: 4, severity: "low", protocol: "Web Proxy", target: "Enum Recon", time: "3 hours ago", status: "completed" },
  { id: 5, severity: "medium", protocol: "SSH", target: "Brute Force Attempt", time: "5 hours ago", status: "completed" },
];

export const threatDetections = [
  { id: "CVE-2024-21882", severity: "high", status: "detected" },
  { id: "CVE-2024-45882", severity: "critical", status: "active" },
  { id: "CVE-2023-27997", severity: "exploited", status: "exploited" },
  { id: "CVE-2024-12332", severity: "high", status: "detected" },
  { id: "CVE-2024-38077", severity: "medium", status: "monitoring" },
  { id: "CVE-2024-6387", severity: "critical", status: "active" },
];

export const recentActivity = [
  { id: 1, event: "Pentest scan completed", time: "1 hour ago", severity: "medium" },
  { id: 2, event: "CVE classification processed", time: "2 hours ago", severity: "medium" },
  { id: 3, event: "Security audit generated", time: "3 hours ago", severity: "low" },
  { id: 4, event: "Threat detection initiated", time: "3 hours ago", severity: "critical" },
  { id: 5, event: "Firewall rules updated", time: "4 hours ago", severity: "info" },
];

export const threatBreakdown = [
  { name: "Malicious", value: 20, fill: "hsl(0, 75%, 55%)" },
  { name: "Suspicious", value: 15, fill: "hsl(35, 90%, 55%)" },
  { name: "Low Risk", value: 30, fill: "hsl(210, 80%, 55%)" },
  { name: "Clean", value: 35, fill: "hsl(145, 70%, 45%)" },
];

export const topKeywords = [
  { keyword: "injection", count: 7 },
  { keyword: "xss", count: 6 },
  { keyword: "auth-bypass", count: 5 },
  { keyword: "rce", count: 5 },
  { keyword: "ssrf", count: 4 },
  { keyword: "csrf", count: 4 },
  { keyword: "idor", count: 3 },
  { keyword: "sqli", count: 3 },
  { keyword: "lfi", count: 2 },
  { keyword: "xxe", count: 2 },
];

export const attackPathNodes = [
  { id: "kali", label: "Kali Client", x: 50, y: 350, type: "client" },
  { id: "webapp", label: "Web App", x: 200, y: 150, type: "server" },
  { id: "fileserver", label: "File Server", x: 200, y: 350, type: "server" },
  { id: "dbserver", label: "DB Server", x: 350, y: 350, type: "database" },
  { id: "aws", label: "AWS", x: 350, y: 80, type: "cloud" },
  { id: "remote", label: "Remote", x: 350, y: 220, type: "server" },
  { id: "domain", label: "Domain Controller", x: 200, y: 500, type: "server" },
];

export const attackPathEdges = [
  { from: "kali", to: "webapp", status: "compromised" },
  { from: "kali", to: "fileserver", status: "compromised" },
  { from: "webapp", to: "aws", status: "compromised" },
  { from: "webapp", to: "remote", status: "scanning" },
  { from: "fileserver", to: "dbserver", status: "compromised" },
  { from: "fileserver", to: "domain", status: "scanning" },
];

export const pentestProgress = [
  { step: "Running reconnaissance", status: "in_progress" },
  { step: "Scanning vulnerable components", status: "in_progress" },
  { step: "Exploiting exposures", status: "active" },
  { step: "Generating evidence", status: "in_progress" },
];

export const attackPathModeling = {
  exploitationExperience: {
    exploited: "Web App",
    sourced: "AWS Key Pair",
    compromised: "Root Domain",
    escalated: "DB Server",
  },
};

export const graphAnalysis = [
  { id: "CVE-2024-21882", severity: "high", label: "HIGH" },
  { id: "CVE-2024-45882", severity: "high", label: "CRITICAL" },
  { id: "CVE-2023-27992", severity: "exploited", label: "EXPLOITED" },
  { id: "CVE-2024-12332", severity: "high", label: "HIGH" },
];

export const exploitationSequence = [
  { name: "SQL Injection", test: 8, autonomousAccess: 5, privilege: 3, minimized: 1 },
  { name: "RCE", test: 7, autonomousAccess: 4, privilege: 5, minimized: 2 },
  { name: "Password Spray", test: 6, autonomousAccess: 3, privilege: 2, minimized: 1 },
  { name: "Lateral Movement", test: 5, autonomousAccess: 6, privilege: 4, minimized: 3 },
];

export const triageHeatmapData = [
  [1, 3, 5, 7, 9, 8, 6],
  [2, 4, 6, 8, 7, 5, 3],
  [3, 5, 8, 9, 8, 6, 4],
  [4, 7, 9, 10, 9, 7, 5],
  [5, 6, 7, 8, 7, 5, 3],
];

export const threatCases = [
  {
    id: 1535,
    name: "Athinator",
    severity: "high",
    description: "Activated Trace Remediation",
    detail: "Detected A-record responses from Port 388 within 1 minute",
  },
  {
    id: 1476,
    name: "PythosOdin",
    severity: "critical",
    description: "Targeted enumeration",
    detail: "Targeted enumeration of AWS Key Pair using another compromised system",
  },
  {
    id: 1406,
    name: "EchoFrost",
    severity: "exploited",
    description: "Detection of abandoned Shady enclave",
    detail: "Unauthorized access to secure enclave detected",
  },
];

export const investigationDetails = {
  caseId: 1535,
  title: "Active Directory Credential Submission",
  target: "Port 398 - Local Domain",
  progress: 2,
  subCases: [
    {
      title: "AWS Parasitic Enumeration",
      severity: "critical",
      detail: "Triggered failed attempts on TRNB Domain",
      findings: "1 Target exposed 4 host linked work addresses",
    },
    {
      title: "Rootkit Installation on Target Device",
      severity: "exploited",
      detail: "UID Scanner 0-1 targeting DB Server",
    },
  ],
};

export const securityOperations = [
  { event: "Password spraying AD login endpoint initiated", time: "16 hours ago" },
  { event: "CVE prospection initialized", time: "14 hours ago" },
  { event: "Effective Posture Delta: 12%", time: "51h ago" },
  { event: "Investigating SQLi anomaly", time: "Shared policies" },
  { event: "Target shadow backup traces identified", time: "5 hours ago" },
];

export const recommendations = {
  steps: [
    "Limit AWS Roles of identified keys and rotate exposed credentials",
    "Segregate high-privilege hosts from geolocation network",
    "Catalog shadow backup traces for rollback response",
  ],
  operatorNotes: [
    { note: "WFH enabled for reclaim access on Root Domain", time: "15 minutes ago", status: "Tracked" },
    { note: "RDP service tokens regenerated in enclave", time: "5 hours ago", status: "Operational Status" },
    { note: "Active threat monitoring executed", time: "3 hour ago", status: "Export Routes" },
  ],
};

export const evidenceReview = {
  exploitChains: { title: "AWS Key Pair", severity: "high", cves: ["CWE-94", "RDP : Web Stealthing"] },
  credentials: { id: "CWE-998", cves: ["CWE 796"], title: "Hard-coded Credentials", detail: "DB Authentication Elevation", severity: "critical", time: "19 hours ago" },
};
