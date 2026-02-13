"use client";

import { useMemo, useState } from "react";

import { AppShell } from "../../../components/app-shell";
import { analyticsChannels, type MetricKey, type PeriodKey } from "../../../lib/demo-data";

const metricLabels: Record<MetricKey, string> = {
  revenue: "Revenue",
  conversion: "Conversion Rate",
  retention: "Retention"
};

function formatMetric(metric: MetricKey, value: number) {
  if (metric === "revenue") {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(
      value
    );
  }
  return `${value.toFixed(1)}%`;
}

export default function AnalyticsFlowPage() {
  const [period, setPeriod] = useState<PeriodKey>("30");
  const [metric, setMetric] = useState<MetricKey>("revenue");
  const [compare, setCompare] = useState(true);
  const [enabledChannels, setEnabledChannels] = useState<string[]>(analyticsChannels.map((channel) => channel.id));
  const [notes, setNotes] = useState<string[]>([]);
  const [noteInput, setNoteInput] = useState("Investigate drop in partner conversions.");
  const [lastExport, setLastExport] = useState<string | null>(null);
  const [anomalyResult, setAnomalyResult] = useState<string>("No scan yet.");

  const series = useMemo(
    () =>
      analyticsChannels
        .filter((channel) => enabledChannels.includes(channel.id))
        .map((channel) => ({
          id: channel.id,
          label: channel.label,
          value: channel.metrics[metric][period]
        })),
    [enabledChannels, metric, period]
  );

  const total = useMemo(() => series.reduce((sum, item) => sum + item.value, 0), [series]);
  const previous = compare ? total * (metric === "revenue" ? 0.91 : 0.96) : null;
  const maxValue = Math.max(...series.map((item) => item.value), 1);

  function toggleChannel(channelId: string) {
    setEnabledChannels((current) =>
      current.includes(channelId) ? current.filter((id) => id !== channelId) : [...current, channelId]
    );
  }

  function addNote() {
    if (noteInput.trim() === "") {
      return;
    }
    setNotes((current) => [noteInput.trim(), ...current]);
    setNoteInput("");
  }

  function exportReport() {
    setLastExport(`${new Date().toLocaleDateString("en-US")} ${new Date().toLocaleTimeString("en-US")}`);
  }

  function runAnomalyScan() {
    if (series.length === 0) {
      setAnomalyResult("No channels selected.");
      return;
    }

    const ranked = [...series].sort((a, b) => b.value - a.value);
    const top = ranked[0];
    const bottom = ranked[ranked.length - 1];
    setAnomalyResult(`Largest spread: ${top.label} vs ${bottom.label}. Review attribution mix.`);
  }

  return (
    <AppShell
      title="Analytics Hub"
      subtitle="Switch metrics, filter channels, export summaries, and log analyst notes."
      activeRoute="/flows/analytics"
    >
      <section className="card stack" data-testid="analytics-controls-card">
        <div className="grid-three">
          <label className="field">
            <span className="label">Metric</span>
            <select
              className="select"
              data-testid="analytics-metric"
              value={metric}
              onChange={(event) => setMetric(event.target.value as MetricKey)}
            >
              <option value="revenue">Revenue</option>
              <option value="conversion">Conversion Rate</option>
              <option value="retention">Retention</option>
            </select>
          </label>
          <label className="field">
            <span className="label">Window</span>
            <select
              className="select"
              data-testid="analytics-period"
              value={period}
              onChange={(event) => setPeriod(event.target.value as PeriodKey)}
            >
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
            </select>
          </label>
          <label className="checkbox-row" style={{ marginTop: 22 }}>
            <input
              data-testid="analytics-compare-toggle"
              type="checkbox"
              checked={compare}
              onChange={(event) => setCompare(event.target.checked)}
            />
            Compare against previous period
          </label>
        </div>

        <div className="kpi-grid">
          <article className="kpi-card" data-testid="analytics-total-kpi">
            <p className="label">Total {metricLabels[metric]}</p>
            <p className="kpi-value">{formatMetric(metric, total)}</p>
          </article>
          <article className="kpi-card">
            <p className="label">Selected channels</p>
            <p className="kpi-value">{series.length}</p>
          </article>
          <article className="kpi-card">
            <p className="label">Previous period</p>
            <p className="kpi-value">{previous === null ? "Off" : formatMetric(metric, previous)}</p>
          </article>
          <article className="kpi-card">
            <p className="label">Last export</p>
            <p className="kpi-value">{lastExport ? "Done" : "None"}</p>
          </article>
        </div>
      </section>

      <div className="grid-two">
        <section className="card stack" data-testid="analytics-chart-card">
          <h3>Channel performance</h3>
          <div className="bar-chart">
            {series.map((item) => (
              <div key={item.id} className="bar-row" data-testid={`analytics-bar-${item.id}`}>
                <div className="space-between">
                  <span>{item.label}</span>
                  <strong>{formatMetric(metric, item.value)}</strong>
                </div>
                <div className="bar-track">
                  <div className="bar-fill" style={{ width: `${(item.value / maxValue) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>

          <div className="row">
            {analyticsChannels.map((channel) => (
              <label key={channel.id} className="checkbox-row">
                <input
                  data-testid={`analytics-channel-${channel.id}`}
                  type="checkbox"
                  checked={enabledChannels.includes(channel.id)}
                  onChange={() => toggleChannel(channel.id)}
                />
                {channel.label}
              </label>
            ))}
          </div>

          <div className="row">
            <button className="button secondary" data-testid="analytics-scan" type="button" onClick={runAnomalyScan}>
              Run anomaly scan
            </button>
            <button className="button ghost" data-testid="analytics-export" type="button" onClick={exportReport}>
              Export report
            </button>
          </div>
          <div className="banner info" data-testid="analytics-scan-result">
            {anomalyResult}
          </div>
        </section>

        <section className="card stack" data-testid="analytics-notes-card">
          <h3>Analyst notes</h3>
          <label className="field">
            <span className="label">Add note</span>
            <textarea
              className="textarea"
              data-testid="analytics-note-input"
              value={noteInput}
              onChange={(event) => setNoteInput(event.target.value)}
            />
          </label>
          <button className="button primary" data-testid="analytics-add-note" type="button" onClick={addNote}>
            Save note
          </button>
          <div className="timeline" data-testid="analytics-notes-list">
            {notes.length === 0 ? <p className="muted">No notes yet.</p> : null}
            {notes.map((note, index) => (
              <div key={`${note}-${index}`} className="timeline-item">
                {note}
              </div>
            ))}
          </div>
          <p className="muted">Last export: {lastExport ?? "Not exported yet"}</p>
        </section>
      </div>
    </AppShell>
  );
}
