"use client";

import { useMemo, useState } from "react";

import { AppShell } from "../../../components/app-shell";
import { releaseSuitesSeed, type ReleaseSuite } from "../../../lib/demo-data";

type StepState = "pending" | "passed" | "failed";

type RuntimeSuite = {
  id: string;
  title: string;
  environment: ReleaseSuite["environment"];
  steps: Array<{ text: string; status: StepState }>;
};

function initializeSuites(): RuntimeSuite[] {
  return releaseSuitesSeed.map((suite) => ({
    id: suite.id,
    title: suite.title,
    environment: suite.environment,
    steps: suite.steps.map((step) => ({ text: step, status: "pending" }))
  }));
}

export default function QaFlowPage() {
  const [suites, setSuites] = useState<RuntimeSuite[]>(initializeSuites());
  const [selectedSuiteId, setSelectedSuiteId] = useState(suites[0].id);
  const [incidentSeverity, setIncidentSeverity] = useState("high");
  const [incidentSummary, setIncidentSummary] = useState("Checkout tax mismatch in CA region.");
  const [incidentLog, setIncidentLog] = useState<string[]>([]);

  const selectedSuite = useMemo(
    () => suites.find((suite) => suite.id === selectedSuiteId) ?? suites[0],
    [selectedSuiteId, suites]
  );

  const suiteProgress = useMemo(() => {
    const completed = selectedSuite.steps.filter((step) => step.status !== "pending").length;
    return Math.round((completed / selectedSuite.steps.length) * 100);
  }, [selectedSuite]);

  function updateSuite(updater: (suite: RuntimeSuite) => RuntimeSuite) {
    setSuites((current) => current.map((suite) => (suite.id === selectedSuiteId ? updater(suite) : suite)));
  }

  function runNextStep() {
    const nextStep = selectedSuite.steps.find((step) => step.status === "pending");
    if (!nextStep) {
      return;
    }

    updateSuite((suite) => ({
      ...suite,
      steps: suite.steps.map((step) =>
        step.text === nextStep.text && step.status === "pending" ? { ...step, status: "passed" } : step
      )
    }));
    setIncidentLog((current) => [`Passed: ${nextStep.text}`, ...current]);
  }

  function failNextStep() {
    const nextStep = selectedSuite.steps.find((step) => step.status === "pending");
    if (!nextStep) {
      return;
    }

    updateSuite((suite) => ({
      ...suite,
      steps: suite.steps.map((step) =>
        step.text === nextStep.text && step.status === "pending" ? { ...step, status: "failed" } : step
      )
    }));
    setIncidentLog((current) => [`Failed: ${nextStep.text}`, ...current]);
  }

  function resetSuite() {
    setSuites((current) =>
      current.map((suite) =>
        suite.id === selectedSuiteId
          ? {
              ...suite,
              steps: suite.steps.map((step) => ({ ...step, status: "pending" }))
            }
          : suite
      )
    );
    setIncidentLog((current) => [`Reset checklist for ${selectedSuite.title}.`, ...current]);
  }

  function createIncident() {
    if (incidentSummary.trim() === "") {
      return;
    }
    setIncidentLog((current) => [`Incident (${incidentSeverity}): ${incidentSummary.trim()}`, ...current]);
  }

  function statusClass(status: StepState) {
    if (status === "passed") {
      return "pill green";
    }
    if (status === "failed") {
      return "pill red";
    }
    return "pill";
  }

  return (
    <AppShell
      title="QA Release Lab"
      subtitle="Run release suites step-by-step, force failures, and draft incident records."
      activeRoute="/flows/qa"
    >
      <div className="grid-two">
        <section className="card stack" data-testid="qa-suite-card">
          <div className="space-between">
            <h3>Release suites</h3>
            <span className="pill">{suites.length} suites</span>
          </div>

          <label className="field">
            <span className="label">Select suite</span>
            <select
              className="select"
              data-testid="qa-suite-select"
              value={selectedSuiteId}
              onChange={(event) => setSelectedSuiteId(event.target.value)}
            >
              {suites.map((suite) => (
                <option key={suite.id} value={suite.id}>
                  {suite.title}
                </option>
              ))}
            </select>
          </label>

          <div className="banner info" data-testid="qa-suite-meta">
            Environment: <strong>{selectedSuite.environment}</strong> · Progress: <strong>{suiteProgress}%</strong>
          </div>

          <div className="progress-track" aria-hidden="true">
            <div className="progress-bar" style={{ width: `${suiteProgress}%` }} />
          </div>

          <div className="stack" data-testid="qa-step-list">
            {selectedSuite.steps.map((step, index) => (
              <div key={`${step.text}-${index}`} className="space-between card">
                <span>{step.text}</span>
                <span className={statusClass(step.status)}>{step.status}</span>
              </div>
            ))}
          </div>

          <div className="row">
            <button className="button primary" data-testid="qa-run-next" type="button" onClick={runNextStep}>
              Run next step
            </button>
            <button className="button danger" data-testid="qa-fail-next" type="button" onClick={failNextStep}>
              Fail next step
            </button>
            <button className="button ghost" data-testid="qa-reset" type="button" onClick={resetSuite}>
              Reset suite
            </button>
          </div>
        </section>

        <section className="card stack" data-testid="qa-incident-card">
          <h3>Incident draft</h3>
          <label className="field">
            <span className="label">Severity</span>
            <select
              className="select"
              data-testid="qa-incident-severity"
              value={incidentSeverity}
              onChange={(event) => setIncidentSeverity(event.target.value)}
            >
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </label>
          <label className="field">
            <span className="label">Summary</span>
            <textarea
              className="textarea"
              data-testid="qa-incident-summary"
              value={incidentSummary}
              onChange={(event) => setIncidentSummary(event.target.value)}
            />
          </label>
          <button className="button warning" data-testid="qa-create-incident" type="button" onClick={createIncident}>
            Log incident
          </button>

          <div className="stack">
            <h4>Execution log</h4>
            <div className="timeline" data-testid="qa-execution-log">
              {incidentLog.length === 0 ? <p className="muted">No entries yet.</p> : null}
              {incidentLog.map((entry, index) => (
                <div key={`${entry}-${index}`} className="timeline-item">
                  {entry}
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
