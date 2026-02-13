"use client";

import { FormEvent, useMemo, useState } from "react";

import { AppShell } from "../../../components/app-shell";
import { pipelineSeed, type PipelineLead } from "../../../lib/demo-data";

const stages: Array<PipelineLead["stage"]> = ["lead", "qualified", "proposal", "negotiation", "won"];
const owners: Array<PipelineLead["owner"]> = ["Ari", "Nina", "Sol"];

function money(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(
    value
  );
}

export default function CrmFlowPage() {
  const [leads, setLeads] = useState<PipelineLead[]>(pipelineSeed);
  const [ownerFilter, setOwnerFilter] = useState<"all" | PipelineLead["owner"]>("all");
  const [activity, setActivity] = useState<string[]>(["Pipeline initialized from deterministic seed data."]);
  const [nextLeadNumber, setNextLeadNumber] = useState(300);
  const [draftCompany, setDraftCompany] = useState("Aurora Systems");
  const [draftContact, setDraftContact] = useState("Kira Moss");
  const [draftValue, setDraftValue] = useState(28000);
  const [draftOwner, setDraftOwner] = useState<PipelineLead["owner"]>("Ari");

  const visibleLeads = useMemo(() => {
    if (ownerFilter === "all") {
      return leads;
    }
    return leads.filter((lead) => lead.owner === ownerFilter);
  }, [leads, ownerFilter]);

  const totalPipeline = useMemo(
    () => visibleLeads.reduce((sum, lead) => sum + lead.value, 0),
    [visibleLeads]
  );

  function advanceLead(id: string, direction: -1 | 1) {
    let changedLead: PipelineLead | undefined;

    setLeads((current) =>
      current.map((lead) => {
        if (lead.id !== id) {
          return lead;
        }
        const stageIndex = stages.indexOf(lead.stage);
        const nextStageIndex = stageIndex + direction;
        if (nextStageIndex < 0 || nextStageIndex >= stages.length) {
          return lead;
        }

        changedLead = { ...lead, stage: stages[nextStageIndex] };
        return changedLead;
      })
    );

    if (changedLead) {
      setActivity((current) => [
        `${changedLead?.company} moved to ${changedLead?.stage.toUpperCase()} stage.`,
        ...current
      ]);
    }
  }

  function addLead(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const newLead: PipelineLead = {
      id: `L-${nextLeadNumber}`,
      company: draftCompany,
      contact: draftContact,
      value: draftValue,
      stage: "lead",
      owner: draftOwner,
      health: "green",
      nextAction: "Book intro discovery"
    };

    setLeads((current) => [newLead, ...current]);
    setActivity((current) => [`Created ${newLead.id} for ${newLead.company}.`, ...current]);
    setNextLeadNumber((current) => current + 1);
  }

  function resetBoard() {
    setLeads(pipelineSeed);
    setOwnerFilter("all");
    setActivity(["Pipeline reset to initial state."]);
  }

  function healthClass(health: PipelineLead["health"]) {
    if (health === "green") {
      return "pill green";
    }
    if (health === "amber") {
      return "pill amber";
    }
    return "pill red";
  }

  return (
    <AppShell
      title="CRM Pipeline"
      subtitle="Move deals across stages, filter owners, and seed new opportunities."
      activeRoute="/flows/crm"
    >
      <section className="card stack" data-testid="crm-overview-card">
        <div className="space-between">
          <h3>Pipeline controls</h3>
          <span className="pill" data-testid="crm-pipeline-total">
            {money(totalPipeline)} total
          </span>
        </div>
        <div className="row">
          <label className="field" style={{ minWidth: 200 }}>
            <span className="label">Filter by owner</span>
            <select
              className="select"
              data-testid="crm-owner-filter"
              value={ownerFilter}
              onChange={(event) => setOwnerFilter(event.target.value as "all" | PipelineLead["owner"])}
            >
              <option value="all">All owners</option>
              {owners.map((owner) => (
                <option key={owner} value={owner}>
                  {owner}
                </option>
              ))}
            </select>
          </label>
          <button className="button ghost" data-testid="crm-reset" onClick={resetBoard} type="button">
            Reset board
          </button>
        </div>
      </section>

      <section className="kanban" data-testid="crm-kanban-board">
        {stages.map((stage) => (
          <article key={stage} className="kanban-column" data-testid={`crm-column-${stage}`}>
            <div className="space-between">
              <h4>{stage.toUpperCase()}</h4>
              <span className="pill">{visibleLeads.filter((lead) => lead.stage === stage).length}</span>
            </div>

            {visibleLeads
              .filter((lead) => lead.stage === stage)
              .map((lead) => (
                <div key={lead.id} className="lead-card" data-testid={`crm-lead-${lead.id}`}>
                  <div className="space-between">
                    <strong>{lead.company}</strong>
                    <span className={healthClass(lead.health)}>{lead.health}</span>
                  </div>
                  <p className="muted">{lead.contact}</p>
                  <p>
                    {money(lead.value)} · {lead.owner}
                  </p>
                  <p className="muted">Next: {lead.nextAction}</p>
                  <div className="row">
                    <button
                      className="button ghost"
                      data-testid={`crm-back-${lead.id}`}
                      onClick={() => advanceLead(lead.id, -1)}
                      type="button"
                    >
                      Back
                    </button>
                    <button
                      className="button secondary"
                      data-testid={`crm-forward-${lead.id}`}
                      onClick={() => advanceLead(lead.id, 1)}
                      type="button"
                    >
                      Advance
                    </button>
                  </div>
                </div>
              ))}
          </article>
        ))}
      </section>

      <div className="grid-two">
        <section className="card stack" data-testid="crm-add-lead-card">
          <h3>Create opportunity</h3>
          <form className="stack" onSubmit={addLead}>
            <label className="field">
              <span className="label">Company</span>
              <input
                className="input"
                data-testid="crm-new-company"
                value={draftCompany}
                onChange={(event) => setDraftCompany(event.target.value)}
              />
            </label>
            <label className="field">
              <span className="label">Contact</span>
              <input
                className="input"
                data-testid="crm-new-contact"
                value={draftContact}
                onChange={(event) => setDraftContact(event.target.value)}
              />
            </label>
            <div className="grid-two">
              <label className="field">
                <span className="label">Deal value</span>
                <input
                  className="input"
                  data-testid="crm-new-value"
                  type="number"
                  value={draftValue}
                  min={1000}
                  step={500}
                  onChange={(event) => setDraftValue(Number(event.target.value))}
                />
              </label>
              <label className="field">
                <span className="label">Owner</span>
                <select
                  className="select"
                  data-testid="crm-new-owner"
                  value={draftOwner}
                  onChange={(event) => setDraftOwner(event.target.value as PipelineLead["owner"])}
                >
                  {owners.map((owner) => (
                    <option key={owner} value={owner}>
                      {owner}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <button className="button primary" data-testid="crm-create-lead" type="submit">
              Add lead to board
            </button>
          </form>
        </section>

        <section className="card stack" data-testid="crm-activity-card">
          <div className="space-between">
            <h3>Activity stream</h3>
            <span className="pill">{activity.length} events</span>
          </div>
          <div className="timeline">
            {activity.slice(0, 8).map((event, index) => (
              <div key={`${event}-${index}`} className="timeline-item">
                {event}
              </div>
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
