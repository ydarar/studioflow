export type FlowCard = {
  id: string;
  title: string;
  route: string;
  summary: string;
  tags: string[];
  estMinutes: number;
};

export const flowCards: FlowCard[] = [
  {
    id: "onboarding",
    title: "Guided Onboarding",
    route: "/flows/onboarding",
    summary: "Multi-step workspace setup with integrations and launch toggles.",
    tags: ["forms", "wizard", "validation"],
    estMinutes: 3
  },
  {
    id: "crm",
    title: "CRM Pipeline",
    route: "/flows/crm",
    summary: "Kanban-like opportunity board with stage transitions and lead creation.",
    tags: ["kanban", "filters", "state"],
    estMinutes: 4
  },
  {
    id: "commerce",
    title: "Commerce Checkout",
    route: "/flows/commerce",
    summary: "Cart management, coupon rules, shipping selection, and order finalization.",
    tags: ["cart", "totals", "checkout"],
    estMinutes: 4
  },
  {
    id: "support",
    title: "Support Desk",
    route: "/flows/support",
    summary: "Ticket queue triage, macros, internal notes, and resolution workflow.",
    tags: ["inbox", "triage", "sla"],
    estMinutes: 4
  },
  {
    id: "analytics",
    title: "Analytics Hub",
    route: "/flows/analytics",
    summary: "Metric switching, channel filtering, exports, and anomaly scans.",
    tags: ["charts", "filters", "reports"],
    estMinutes: 3
  },
  {
    id: "settings",
    title: "Admin Settings",
    route: "/flows/settings",
    summary: "Tabbed account controls across profile, security, billing, and team.",
    tags: ["tabs", "permissions", "forms"],
    estMinutes: 4
  },
  {
    id: "qa",
    title: "QA Release Lab",
    route: "/flows/qa",
    summary: "Stepwise release checklist with failure paths and incident drafting.",
    tags: ["checklist", "incident", "runbook"],
    estMinutes: 4
  }
];

export const integrationCatalog = [
  { id: "github", label: "GitHub", category: "Code" },
  { id: "slack", label: "Slack", category: "Comms" },
  { id: "jira", label: "Jira", category: "Planning" },
  { id: "hubspot", label: "HubSpot", category: "CRM" },
  { id: "stripe", label: "Stripe", category: "Billing" },
  { id: "segment", label: "Segment", category: "Data" }
];

export type PipelineLead = {
  id: string;
  company: string;
  contact: string;
  value: number;
  stage: "lead" | "qualified" | "proposal" | "negotiation" | "won";
  owner: "Ari" | "Nina" | "Sol";
  health: "green" | "amber" | "red";
  nextAction: string;
};

export const pipelineSeed: PipelineLead[] = [
  {
    id: "L-201",
    company: "Northstar Retail",
    contact: "Tessa Lin",
    value: 32000,
    stage: "lead",
    owner: "Ari",
    health: "green",
    nextAction: "Schedule discovery call"
  },
  {
    id: "L-202",
    company: "Mosaic Health",
    contact: "Ravi Patel",
    value: 58000,
    stage: "qualified",
    owner: "Nina",
    health: "amber",
    nextAction: "Share security packet"
  },
  {
    id: "L-203",
    company: "Helio Finance",
    contact: "Marta Gomez",
    value: 86000,
    stage: "proposal",
    owner: "Sol",
    health: "green",
    nextAction: "Finalize legal redlines"
  },
  {
    id: "L-204",
    company: "Vertex Labs",
    contact: "Cole Bryant",
    value: 44000,
    stage: "negotiation",
    owner: "Ari",
    health: "red",
    nextAction: "Handle pricing objection"
  },
  {
    id: "L-205",
    company: "Aster Logistics",
    contact: "Elliot Kane",
    value: 25000,
    stage: "won",
    owner: "Nina",
    health: "green",
    nextAction: "Kickoff implementation"
  }
];

export type CatalogProduct = {
  id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
};

export const productCatalog: CatalogProduct[] = [
  { id: "P-11", name: "Starter Kit", category: "Bundles", price: 49, stock: 200 },
  { id: "P-12", name: "Growth Add-on", category: "Add-ons", price: 99, stock: 155 },
  { id: "P-13", name: "Automation Credits", category: "Usage", price: 129, stock: 999 },
  { id: "P-14", name: "Priority Support", category: "Services", price: 199, stock: 85 },
  { id: "P-15", name: "Analytics Pack", category: "Insights", price: 149, stock: 120 }
];

export type SupportTicket = {
  id: string;
  customer: string;
  subject: string;
  status: "new" | "open" | "pending" | "resolved";
  priority: "low" | "medium" | "high";
  assignee: string;
  slaHours: number;
  logs: string[];
};

export const supportTicketSeed: SupportTicket[] = [
  {
    id: "T-901",
    customer: "Kepler Health",
    subject: "Unable to sync webhook events",
    status: "new",
    priority: "high",
    assignee: "Unassigned",
    slaHours: 2,
    logs: ["Ticket opened from in-app chat."]
  },
  {
    id: "T-902",
    customer: "Prime Retail",
    subject: "Need invoice line item breakdown",
    status: "open",
    priority: "medium",
    assignee: "Dani",
    slaHours: 6,
    logs: ["Finance requested export template."]
  },
  {
    id: "T-903",
    customer: "Beacon Learning",
    subject: "Intermittent login timeout",
    status: "pending",
    priority: "high",
    assignee: "Jules",
    slaHours: 3,
    logs: ["Engineering asked for HAR capture."]
  },
  {
    id: "T-904",
    customer: "Nova Supply",
    subject: "How to invite external collaborators",
    status: "resolved",
    priority: "low",
    assignee: "Dani",
    slaHours: 12,
    logs: ["Resolved with team settings guide."]
  }
];

export type MetricKey = "revenue" | "conversion" | "retention";
export type PeriodKey = "7" | "30" | "90";

export type ChannelMetric = {
  id: string;
  label: string;
  metrics: {
    revenue: Record<PeriodKey, number>;
    conversion: Record<PeriodKey, number>;
    retention: Record<PeriodKey, number>;
  };
};

export const analyticsChannels: ChannelMetric[] = [
  {
    id: "paid-search",
    label: "Paid Search",
    metrics: {
      revenue: { "7": 18400, "30": 76800, "90": 221900 },
      conversion: { "7": 2.8, "30": 2.6, "90": 2.5 },
      retention: { "7": 76, "30": 74, "90": 72 }
    }
  },
  {
    id: "organic",
    label: "Organic",
    metrics: {
      revenue: { "7": 14200, "30": 55400, "90": 163100 },
      conversion: { "7": 3.4, "30": 3.3, "90": 3.2 },
      retention: { "7": 81, "30": 79, "90": 77 }
    }
  },
  {
    id: "partner",
    label: "Partner",
    metrics: {
      revenue: { "7": 7600, "30": 30100, "90": 84200 },
      conversion: { "7": 2.1, "30": 2.2, "90": 2.0 },
      retention: { "7": 73, "30": 70, "90": 69 }
    }
  },
  {
    id: "email",
    label: "Lifecycle Email",
    metrics: {
      revenue: { "7": 5900, "30": 24200, "90": 70800 },
      conversion: { "7": 4.1, "30": 3.8, "90": 3.7 },
      retention: { "7": 86, "30": 84, "90": 82 }
    }
  }
];

export type TeamMember = {
  id: string;
  name: string;
  role: "Owner" | "Admin" | "Editor" | "Viewer";
  region: string;
};

export const teamMembersSeed: TeamMember[] = [
  { id: "M-01", name: "Ari Chen", role: "Owner", region: "US" },
  { id: "M-02", name: "Nina Bose", role: "Admin", region: "UK" },
  { id: "M-03", name: "Sol Marquez", role: "Editor", region: "US" },
  { id: "M-04", name: "Jules Okafor", role: "Viewer", region: "DE" }
];

export type ReleaseSuite = {
  id: string;
  title: string;
  environment: "staging" | "preview" | "production";
  steps: string[];
};

export const releaseSuitesSeed: ReleaseSuite[] = [
  {
    id: "suite-1",
    title: "Core checkout regression",
    environment: "staging",
    steps: [
      "Validate tax calculation",
      "Verify coupon fallback",
      "Run smoke order",
      "Confirm confirmation email event"
    ]
  },
  {
    id: "suite-2",
    title: "CRM sync handshake",
    environment: "preview",
    steps: [
      "Create opportunity",
      "Push update to webhook sink",
      "Retry failed delivery",
      "Confirm pipeline stage parity"
    ]
  },
  {
    id: "suite-3",
    title: "Team permissions audit",
    environment: "production",
    steps: [
      "Check owner-only controls",
      "Ensure viewer restrictions",
      "Test invite revocation",
      "Capture audit log snapshot"
    ]
  }
];
