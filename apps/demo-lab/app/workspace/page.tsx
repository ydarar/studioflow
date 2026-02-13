"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { AppShell } from "../../components/app-shell";
import { flowCards } from "../../lib/demo-data";

const scenarios = [
  {
    id: "funnel",
    title: "Lead-to-customer funnel",
    route: "/flows/crm",
    objective: "Move an opportunity to Won, then complete checkout in Commerce.",
    checklist: ["Filter owner", "Advance stages", "Create quote order"]
  },
  {
    id: "support-escalation",
    title: "Escalation and resolution",
    route: "/flows/support",
    objective: "Escalate a new high-priority ticket and resolve it with an internal note.",
    checklist: ["Select ticket", "Apply macro", "Resolve"]
  },
  {
    id: "release-readiness",
    title: "Release readiness review",
    route: "/flows/qa",
    objective: "Run checklist steps and open an incident for a failed check.",
    checklist: ["Run next step", "Mark failure", "Draft incident"]
  }
];

export default function WorkspacePage() {
  const [scenarioId, setScenarioId] = useState(scenarios[0].id);
  const [showTips, setShowTips] = useState(true);

  const scenario = useMemo(
    () => scenarios.find((item) => item.id === scenarioId) ?? scenarios[0],
    [scenarioId]
  );

  return (
    <AppShell
      title="Workspace Control Center"
      subtitle="Pick a demo narrative and jump into any deterministic flow route."
      activeRoute="/workspace"
    >
      <div className="grid-two">
        <section className="card stack" data-testid="workspace-scenario-card">
          <div className="space-between">
            <h3>Scenario presets</h3>
            <span className="pill">3 templates</span>
          </div>

          <label className="field">
            <span className="label">Choose scenario</span>
            <select
              className="select"
              data-testid="workspace-scenario-select"
              value={scenarioId}
              onChange={(event) => setScenarioId(event.target.value)}
            >
              {scenarios.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title}
                </option>
              ))}
            </select>
          </label>

          <div className="banner info" data-testid="workspace-scenario-objective">
            <strong>Objective:</strong> {scenario.objective}
          </div>

          <div className="stack">
            <p className="label">Checklist</p>
            {scenario.checklist.map((step) => (
              <label key={step} className="checkbox-row">
                <input type="checkbox" defaultChecked={false} />
                {step}
              </label>
            ))}
          </div>

          <div className="row">
            <Link href={scenario.route} className="button-link primary" data-testid="workspace-launch-scenario">
              Launch scenario
            </Link>
            <button
              className="button ghost"
              data-testid="workspace-toggle-tips"
              type="button"
              onClick={() => setShowTips((current) => !current)}
            >
              {showTips ? "Hide tips" : "Show tips"}
            </button>
          </div>
        </section>

        <section className="card stack" data-testid="workspace-kpis">
          <h3>Live demo status</h3>
          <div className="kpi-grid">
            <article className="kpi-card">
              <p className="label">Available flows</p>
              <p className="kpi-value">{flowCards.length}</p>
            </article>
            <article className="kpi-card">
              <p className="label">Interactive controls</p>
              <p className="kpi-value">58+</p>
            </article>
            <article className="kpi-card">
              <p className="label">Distinct routes</p>
              <p className="kpi-value">10</p>
            </article>
            <article className="kpi-card">
              <p className="label">Backend calls</p>
              <p className="kpi-value">0</p>
            </article>
          </div>

          {showTips ? (
            <div className="banner success" data-testid="workspace-tip-banner">
              Use route-level `data-testid` hooks to keep scripts stable across UI changes.
            </div>
          ) : null}

          <Link href="/flows" className="button-link ghost" data-testid="workspace-open-flow-index">
            Open route index
          </Link>
        </section>
      </div>
    </AppShell>
  );
}
