"use client";

import { FormEvent, useMemo, useState } from "react";

import { AppShell } from "../../../components/app-shell";
import { supportTicketSeed, type SupportTicket } from "../../../lib/demo-data";

const macros = {
  acknowledge: "Thanks for the report. We are investigating and will update you in under 2 hours.",
  diagnostics: "Can you share timestamps and the account ID so we can trace logs?",
  resolved: "Issue has been resolved on our side. Please confirm everything looks good now."
};

export default function SupportFlowPage() {
  const [tickets, setTickets] = useState<SupportTicket[]>(supportTicketSeed);
  const [statusFilter, setStatusFilter] = useState<"all" | SupportTicket["status"]>("all");
  const [selectedTicketId, setSelectedTicketId] = useState<string>(supportTicketSeed[0].id);
  const [reply, setReply] = useState(macros.acknowledge);
  const [newCustomer, setNewCustomer] = useState("Solaris Health");
  const [newSubject, setNewSubject] = useState("Cannot add secondary admin");
  const [newCounter, setNewCounter] = useState(940);

  const filteredTickets = useMemo(() => {
    if (statusFilter === "all") {
      return tickets;
    }
    return tickets.filter((ticket) => ticket.status === statusFilter);
  }, [statusFilter, tickets]);

  const selectedTicket = useMemo(
    () => tickets.find((ticket) => ticket.id === selectedTicketId) ?? tickets[0],
    [selectedTicketId, tickets]
  );

  function updateTicket(id: string, updater: (ticket: SupportTicket) => SupportTicket) {
    setTickets((current) => current.map((ticket) => (ticket.id === id ? updater(ticket) : ticket)));
  }

  function assignToMe() {
    if (!selectedTicket) {
      return;
    }

    updateTicket(selectedTicket.id, (ticket) => ({
      ...ticket,
      status: ticket.status === "new" ? "open" : ticket.status,
      assignee: "You",
      logs: [`Assigned to You.`, ...ticket.logs]
    }));
  }

  function applyMacro(template: keyof typeof macros) {
    setReply(macros[template]);
  }

  function sendReply() {
    if (!selectedTicket || reply.trim() === "") {
      return;
    }

    updateTicket(selectedTicket.id, (ticket) => ({
      ...ticket,
      status: "pending",
      logs: [`Reply sent: ${reply.trim()}`, ...ticket.logs]
    }));

    setReply("");
  }

  function markResolved() {
    if (!selectedTicket) {
      return;
    }

    updateTicket(selectedTicket.id, (ticket) => ({
      ...ticket,
      status: "resolved",
      logs: ["Ticket marked as resolved.", ...ticket.logs]
    }));
  }

  function escalate() {
    if (!selectedTicket) {
      return;
    }

    updateTicket(selectedTicket.id, (ticket) => ({
      ...ticket,
      priority: "high",
      status: "open",
      logs: ["Escalated to high priority queue.", ...ticket.logs]
    }));
  }

  function createTicket(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const id = `T-${newCounter}`;
    const ticket: SupportTicket = {
      id,
      customer: newCustomer,
      subject: newSubject,
      status: "new",
      priority: "medium",
      assignee: "Unassigned",
      slaHours: 8,
      logs: ["Ticket created from demo form."]
    };

    setTickets((current) => [ticket, ...current]);
    setSelectedTicketId(id);
    setNewCounter((current) => current + 1);
  }

  function priorityClass(priority: SupportTicket["priority"]) {
    if (priority === "high") {
      return "pill red";
    }
    if (priority === "medium") {
      return "pill amber";
    }
    return "pill green";
  }

  return (
    <AppShell
      title="Support Desk"
      subtitle="Queue triage with macros, escalations, SLA visibility, and ticket creation."
      activeRoute="/flows/support"
    >
      <div className="grid-two">
        <section className="card stack" data-testid="support-queue-card">
          <div className="space-between">
            <h3>Ticket queue</h3>
            <span className="pill">{filteredTickets.length} visible</span>
          </div>

          <label className="field">
            <span className="label">Status filter</span>
            <select
              className="select"
              data-testid="support-status-filter"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as "all" | SupportTicket["status"])}
            >
              <option value="all">All statuses</option>
              <option value="new">New</option>
              <option value="open">Open</option>
              <option value="pending">Pending</option>
              <option value="resolved">Resolved</option>
            </select>
          </label>

          <div className="ticket-list" data-testid="support-ticket-list">
            {filteredTickets.map((ticket) => (
              <button
                key={ticket.id}
                type="button"
                className={ticket.id === selectedTicketId ? "ticket-row active" : "ticket-row"}
                data-testid={`support-ticket-${ticket.id}`}
                onClick={() => setSelectedTicketId(ticket.id)}
              >
                <div className="space-between">
                  <strong>{ticket.subject}</strong>
                  <span className={priorityClass(ticket.priority)}>{ticket.priority}</span>
                </div>
                <p className="muted">{ticket.customer}</p>
                <p className="muted">
                  {ticket.status.toUpperCase()} · SLA {ticket.slaHours}h · {ticket.assignee}
                </p>
              </button>
            ))}
          </div>
        </section>

        <section className="card stack" data-testid="support-detail-card">
          {selectedTicket ? (
            <>
              <div className="space-between">
                <h3>{selectedTicket.id}</h3>
                <span className={priorityClass(selectedTicket.priority)}>{selectedTicket.priority}</span>
              </div>
              <p className="muted">{selectedTicket.subject}</p>
              <p className="muted">Assignee: {selectedTicket.assignee}</p>

              <div className="row">
                <button className="button ghost" data-testid="support-assign" type="button" onClick={assignToMe}>
                  Assign to me
                </button>
                <button className="button warning" data-testid="support-escalate" type="button" onClick={escalate}>
                  Escalate
                </button>
                <button className="button secondary" data-testid="support-resolve" type="button" onClick={markResolved}>
                  Resolve
                </button>
              </div>

              <div className="row">
                <button
                  className="button ghost"
                  data-testid="support-macro-ack"
                  type="button"
                  onClick={() => applyMacro("acknowledge")}
                >
                  Acknowledge macro
                </button>
                <button
                  className="button ghost"
                  data-testid="support-macro-diagnostics"
                  type="button"
                  onClick={() => applyMacro("diagnostics")}
                >
                  Diagnostics macro
                </button>
                <button
                  className="button ghost"
                  data-testid="support-macro-resolved"
                  type="button"
                  onClick={() => applyMacro("resolved")}
                >
                  Resolved macro
                </button>
              </div>

              <label className="field">
                <span className="label">Reply composer</span>
                <textarea
                  className="textarea"
                  data-testid="support-reply"
                  value={reply}
                  onChange={(event) => setReply(event.target.value)}
                />
              </label>

              <button className="button primary" data-testid="support-send-reply" type="button" onClick={sendReply}>
                Send reply
              </button>

              <div className="stack">
                <h4>Activity log</h4>
                <div className="timeline" data-testid="support-activity-log">
                  {selectedTicket.logs.map((log, index) => (
                    <div key={`${log}-${index}`} className="timeline-item">
                      {log}
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : null}
        </section>
      </div>

      <section className="card stack" data-testid="support-new-ticket-card">
        <h3>Create ticket</h3>
        <form className="grid-two" onSubmit={createTicket}>
          <label className="field">
            <span className="label">Customer</span>
            <input
              className="input"
              data-testid="support-new-customer"
              value={newCustomer}
              onChange={(event) => setNewCustomer(event.target.value)}
            />
          </label>
          <label className="field">
            <span className="label">Subject</span>
            <input
              className="input"
              data-testid="support-new-subject"
              value={newSubject}
              onChange={(event) => setNewSubject(event.target.value)}
            />
          </label>
          <button className="button primary" data-testid="support-create-ticket" type="submit">
            Create ticket
          </button>
        </form>
      </section>
    </AppShell>
  );
}
