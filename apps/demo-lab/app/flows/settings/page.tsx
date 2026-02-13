"use client";

import { FormEvent, useState } from "react";

import { AppShell } from "../../../components/app-shell";
import { teamMembersSeed, type TeamMember } from "../../../lib/demo-data";

type TabId = "profile" | "notifications" | "security" | "billing" | "team";
const tabs: Array<{ id: TabId; label: string }> = [
  { id: "profile", label: "Profile" },
  { id: "notifications", label: "Notifications" },
  { id: "security", label: "Security" },
  { id: "billing", label: "Billing" },
  { id: "team", label: "Team" }
];

export default function SettingsFlowPage() {
  const [activeTab, setActiveTab] = useState<TabId>("profile");
  const [companyName, setCompanyName] = useState("StudioFlow Labs");
  const [timezone, setTimezone] = useState("America/New_York");
  const [contactEmail, setContactEmail] = useState("ops@studioflow.dev");
  const [emailDigest, setEmailDigest] = useState(true);
  const [slackAlerts, setSlackAlerts] = useState(false);
  const [incidentAlerts, setIncidentAlerts] = useState(true);
  const [mfaRequired, setMfaRequired] = useState(true);
  const [sessionTimeout, setSessionTimeout] = useState("30");
  const [apiToken, setApiToken] = useState("sf_demo_public_token_7a8d9");
  const [plan, setPlan] = useState("Growth");
  const [seatCap, setSeatCap] = useState(35);
  const [members, setMembers] = useState<TeamMember[]>(teamMembersSeed);
  const [inviteEmail, setInviteEmail] = useState("new.user@studioflow.dev");
  const [inviteRole, setInviteRole] = useState<TeamMember["role"]>("Viewer");
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [nextMemberId, setNextMemberId] = useState(10);

  function saveChanges() {
    setSaveMessage(`Saved at ${new Date().toLocaleTimeString("en-US")}.`);
  }

  function rotateToken() {
    setApiToken("sf_demo_rotated_token_93fd1");
    setSaveMessage("API token rotated.");
  }

  function updateRole(memberId: string, role: TeamMember["role"]) {
    setMembers((current) => current.map((member) => (member.id === memberId ? { ...member, role } : member)));
  }

  function inviteMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const newMember: TeamMember = {
      id: `M-${nextMemberId}`,
      name: inviteEmail.split("@")[0],
      role: inviteRole,
      region: "US"
    };
    setMembers((current) => [...current, newMember]);
    setNextMemberId((current) => current + 1);
    setInviteEmail("");
    setSaveMessage(`Invite queued for ${newMember.name}.`);
  }

  return (
    <AppShell
      title="Admin Settings"
      subtitle="Tab-rich account controls for profile, alerts, security, billing, and team."
      activeRoute="/flows/settings"
    >
      <section className="card stack" data-testid="settings-tabs-card">
        <div className="tab-row">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={activeTab === tab.id ? "tab active" : "tab"}
              data-testid={`settings-tab-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              type="button"
            >
              {tab.label}
            </button>
          ))}
        </div>
      </section>

      {activeTab === "profile" ? (
        <section className="card stack" data-testid="settings-profile-card">
          <h3>Workspace profile</h3>
          <div className="grid-two">
            <label className="field">
              <span className="label">Company name</span>
              <input
                className="input"
                data-testid="settings-company-name"
                value={companyName}
                onChange={(event) => setCompanyName(event.target.value)}
              />
            </label>
            <label className="field">
              <span className="label">Contact email</span>
              <input
                className="input"
                data-testid="settings-contact-email"
                value={contactEmail}
                onChange={(event) => setContactEmail(event.target.value)}
              />
            </label>
            <label className="field" style={{ gridColumn: "1 / -1" }}>
              <span className="label">Timezone</span>
              <select
                className="select"
                data-testid="settings-timezone"
                value={timezone}
                onChange={(event) => setTimezone(event.target.value)}
              >
                <option value="America/New_York">America/New_York</option>
                <option value="America/Los_Angeles">America/Los_Angeles</option>
                <option value="Europe/London">Europe/London</option>
                <option value="Asia/Singapore">Asia/Singapore</option>
              </select>
            </label>
          </div>
        </section>
      ) : null}

      {activeTab === "notifications" ? (
        <section className="card stack" data-testid="settings-notifications-card">
          <h3>Notification policy</h3>
          <label className="checkbox-row">
            <input
              data-testid="settings-email-digest"
              type="checkbox"
              checked={emailDigest}
              onChange={(event) => setEmailDigest(event.target.checked)}
            />
            Daily email digest
          </label>
          <label className="checkbox-row">
            <input
              data-testid="settings-slack-alerts"
              type="checkbox"
              checked={slackAlerts}
              onChange={(event) => setSlackAlerts(event.target.checked)}
            />
            Slack alerts for failed runs
          </label>
          <label className="checkbox-row">
            <input
              data-testid="settings-incident-alerts"
              type="checkbox"
              checked={incidentAlerts}
              onChange={(event) => setIncidentAlerts(event.target.checked)}
            />
            Incident escalation alerts
          </label>
        </section>
      ) : null}

      {activeTab === "security" ? (
        <section className="card stack" data-testid="settings-security-card">
          <h3>Security controls</h3>
          <label className="checkbox-row">
            <input
              data-testid="settings-mfa-required"
              type="checkbox"
              checked={mfaRequired}
              onChange={(event) => setMfaRequired(event.target.checked)}
            />
            Require MFA for all members
          </label>
          <label className="field">
            <span className="label">Session timeout (minutes)</span>
            <select
              className="select"
              data-testid="settings-session-timeout"
              value={sessionTimeout}
              onChange={(event) => setSessionTimeout(event.target.value)}
            >
              <option value="15">15</option>
              <option value="30">30</option>
              <option value="60">60</option>
            </select>
          </label>
          <label className="field">
            <span className="label">Current API token</span>
            <input className="input" data-testid="settings-api-token" value={apiToken} readOnly />
          </label>
          <button className="button warning" data-testid="settings-rotate-token" type="button" onClick={rotateToken}>
            Rotate token
          </button>
        </section>
      ) : null}

      {activeTab === "billing" ? (
        <section className="card stack" data-testid="settings-billing-card">
          <h3>Plan controls</h3>
          <label className="field">
            <span className="label">Active plan</span>
            <select
              className="select"
              data-testid="settings-plan"
              value={plan}
              onChange={(event) => setPlan(event.target.value)}
            >
              <option value="Starter">Starter</option>
              <option value="Growth">Growth</option>
              <option value="Enterprise">Enterprise</option>
            </select>
          </label>
          <label className="field">
            <span className="label">Seat cap: {seatCap}</span>
            <input
              className="input"
              data-testid="settings-seat-cap"
              type="range"
              min={5}
              max={300}
              value={seatCap}
              onChange={(event) => setSeatCap(Number(event.target.value))}
            />
          </label>
        </section>
      ) : null}

      {activeTab === "team" ? (
        <section className="card stack" data-testid="settings-team-card">
          <h3>Team members</h3>
          <table className="table" data-testid="settings-team-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Role</th>
                <th>Region</th>
              </tr>
            </thead>
            <tbody>
              {members.map((member) => (
                <tr key={member.id}>
                  <td>{member.name}</td>
                  <td>
                    <select
                      className="select"
                      data-testid={`settings-role-${member.id}`}
                      value={member.role}
                      onChange={(event) => updateRole(member.id, event.target.value as TeamMember["role"])}
                    >
                      <option value="Owner">Owner</option>
                      <option value="Admin">Admin</option>
                      <option value="Editor">Editor</option>
                      <option value="Viewer">Viewer</option>
                    </select>
                  </td>
                  <td>{member.region}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <form className="grid-two" onSubmit={inviteMember}>
            <label className="field">
              <span className="label">Invite email</span>
              <input
                className="input"
                data-testid="settings-invite-email"
                value={inviteEmail}
                onChange={(event) => setInviteEmail(event.target.value)}
              />
            </label>
            <label className="field">
              <span className="label">Role</span>
              <select
                className="select"
                data-testid="settings-invite-role"
                value={inviteRole}
                onChange={(event) => setInviteRole(event.target.value as TeamMember["role"])}
              >
                <option value="Viewer">Viewer</option>
                <option value="Editor">Editor</option>
                <option value="Admin">Admin</option>
              </select>
            </label>
            <button className="button primary" data-testid="settings-invite-submit" type="submit">
              Send invite
            </button>
          </form>
        </section>
      ) : null}

      <section className="card stack" data-testid="settings-save-card">
        <div className="row">
          <button className="button primary" data-testid="settings-save" type="button" onClick={saveChanges}>
            Save changes
          </button>
          {saveMessage ? <span className="banner success">{saveMessage}</span> : null}
        </div>
      </section>
    </AppShell>
  );
}
