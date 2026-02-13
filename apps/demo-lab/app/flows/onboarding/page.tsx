"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { AppShell } from "../../../components/app-shell";
import { integrationCatalog } from "../../../lib/demo-data";

const steps = ["Workspace", "Team", "Integrations", "Launch"];

export default function OnboardingFlowPage() {
  const [step, setStep] = useState(0);
  const [workspaceName, setWorkspaceName] = useState("Summit Labs");
  const [workspaceSlug, setWorkspaceSlug] = useState("summit-labs");
  const [industry, setIndustry] = useState("SaaS");
  const [seats, setSeats] = useState(12);
  const [region, setRegion] = useState("us");
  const [integrations, setIntegrations] = useState<string[]>(["slack", "github"]);
  const [seedData, setSeedData] = useState(true);
  const [sandboxMode, setSandboxMode] = useState(false);
  const [completed, setCompleted] = useState(false);

  const progress = ((step + 1) / steps.length) * 100;

  const canAdvance = useMemo(() => {
    if (step === 0) {
      return workspaceName.trim().length > 2 && workspaceSlug.trim().length > 2;
    }
    if (step === 1) {
      return seats > 0 && region !== "";
    }
    if (step === 2) {
      return integrations.length > 0;
    }
    return true;
  }, [integrations.length, region, seats, step, workspaceName, workspaceSlug]);

  function toggleIntegration(id: string) {
    setIntegrations((current) =>
      current.includes(id) ? current.filter((integration) => integration !== id) : [...current, id]
    );
  }

  function goNext() {
    setStep((current) => Math.min(current + 1, steps.length - 1));
  }

  function goPrev() {
    setStep((current) => Math.max(current - 1, 0));
  }

  function finishSetup() {
    setCompleted(true);
  }

  return (
    <AppShell
      title="Guided Onboarding"
      subtitle="Multi-step setup wizard with deterministic branching for scripted demos."
      activeRoute="/flows/onboarding"
    >
      <section className="card stack" data-testid="onboarding-progress-card">
        <div className="space-between">
          <h3>
            Step {step + 1} of {steps.length}: {steps[step]}
          </h3>
          <span className="pill">{Math.round(progress)}%</span>
        </div>
        <div className="progress-track" aria-hidden="true">
          <div className="progress-bar" style={{ width: `${progress}%` }} />
        </div>
      </section>

      <section className="card stack" data-testid="onboarding-step-card">
        {step === 0 ? (
          <div className="grid-two" data-testid="onboarding-step-workspace">
            <label className="field">
              <span className="label">Workspace name</span>
              <input
                className="input"
                data-testid="onboarding-workspace-name"
                value={workspaceName}
                onChange={(event) => setWorkspaceName(event.target.value)}
              />
            </label>
            <label className="field">
              <span className="label">Workspace URL slug</span>
              <input
                className="input"
                data-testid="onboarding-workspace-slug"
                value={workspaceSlug}
                onChange={(event) => setWorkspaceSlug(event.target.value)}
              />
            </label>
            <label className="field" style={{ gridColumn: "1 / -1" }}>
              <span className="label">Primary industry</span>
              <select
                className="select"
                data-testid="onboarding-industry"
                value={industry}
                onChange={(event) => setIndustry(event.target.value)}
              >
                <option>SaaS</option>
                <option>FinTech</option>
                <option>HealthTech</option>
                <option>Retail</option>
              </select>
            </label>
          </div>
        ) : null}

        {step === 1 ? (
          <div className="stack" data-testid="onboarding-step-team">
            <label className="field">
              <span className="label">Team seats: {seats}</span>
              <input
                className="input"
                data-testid="onboarding-seats"
                min={1}
                max={250}
                type="range"
                value={seats}
                onChange={(event) => setSeats(Number(event.target.value))}
              />
            </label>
            <label className="field">
              <span className="label">Default region</span>
              <select
                className="select"
                data-testid="onboarding-region"
                value={region}
                onChange={(event) => setRegion(event.target.value)}
              >
                <option value="us">US</option>
                <option value="eu">EU</option>
                <option value="apac">APAC</option>
              </select>
            </label>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="stack" data-testid="onboarding-step-integrations">
            <p className="muted">Choose one or more integrations to initialize.</p>
            <div className="grid-three">
              {integrationCatalog.map((integration) => (
                <label key={integration.id} className="checkbox-row card" style={{ margin: 0 }}>
                  <input
                    data-testid={`onboarding-integration-${integration.id}`}
                    type="checkbox"
                    checked={integrations.includes(integration.id)}
                    onChange={() => toggleIntegration(integration.id)}
                  />
                  <span>
                    <strong>{integration.label}</strong>
                    <br />
                    <span className="muted">{integration.category}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="stack" data-testid="onboarding-step-launch">
            <label className="checkbox-row">
              <input
                data-testid="onboarding-seed-data"
                type="checkbox"
                checked={seedData}
                onChange={(event) => setSeedData(event.target.checked)}
              />
              Load sandbox sample data on first login
            </label>
            <label className="checkbox-row">
              <input
                data-testid="onboarding-sandbox-mode"
                type="checkbox"
                checked={sandboxMode}
                onChange={(event) => setSandboxMode(event.target.checked)}
              />
              Keep new workflows in sandbox mode
            </label>
            <div className="banner info">
              Finalize setup to unlock all flow routes for demo recording.
            </div>
          </div>
        ) : null}

        <div className="row">
          <button
            className="button ghost"
            data-testid="onboarding-prev"
            onClick={goPrev}
            type="button"
            disabled={step === 0}
          >
            Previous
          </button>

          {step < steps.length - 1 ? (
            <button
              className="button primary"
              data-testid="onboarding-next"
              onClick={goNext}
              type="button"
              disabled={!canAdvance}
            >
              Continue
            </button>
          ) : (
            <button
              className="button primary"
              data-testid="onboarding-finish"
              onClick={finishSetup}
              type="button"
              disabled={!canAdvance}
            >
              Finish setup
            </button>
          )}
        </div>
      </section>

      {completed ? (
        <section className="card stack" data-testid="onboarding-summary-card">
          <h3>Workspace configured</h3>
          <p className="muted">
            {workspaceName} ({workspaceSlug}) is ready with {seats} seats in {region.toUpperCase()}.
          </p>
          <p className="muted">Integrations: {integrations.join(", ")}</p>
          <div className="row">
            <Link href="/workspace" className="button-link primary" data-testid="onboarding-go-workspace">
              Return to workspace
            </Link>
            <Link href="/flows/crm" className="button-link secondary" data-testid="onboarding-next-crm">
              Continue to CRM flow
            </Link>
          </div>
        </section>
      ) : null}
    </AppShell>
  );
}
