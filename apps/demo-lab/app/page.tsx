import Link from "next/link";

import { flowCards } from "../lib/demo-data";

export default function HomePage() {
  return (
    <main className="marketing-shell" data-testid="home-page">
      <section className="marketing-hero">
        <p className="eyebrow">StudioFlow</p>
        <h1>Demo Lab: Rich Frontend App for Automation Tests</h1>
        <p className="muted">
          This app is intentionally stateful and route-heavy so you can script multiple deterministic demo
          narratives without backend dependencies.
        </p>
        <div className="row">
          <Link href="/login" className="button-link primary" data-testid="home-go-login">
            Start at login
          </Link>
          <Link href="/workspace" className="button-link secondary" data-testid="home-go-workspace">
            Open workspace
          </Link>
          <Link href="/flows" className="button-link ghost" data-testid="home-go-flows">
            Browse flows
          </Link>
        </div>
      </section>

      <section className="card stack">
        <div className="space-between">
          <h2>Automation-ready flows</h2>
          <span className="pill">{flowCards.length} routes</span>
        </div>
        <div className="grid-two">
          {flowCards.map((flow) => (
            <article key={flow.id} className="card stack" data-testid={`home-flow-${flow.id}`}>
              <div className="space-between">
                <h3>{flow.title}</h3>
                <span className="pill">~{flow.estMinutes}m</span>
              </div>
              <p className="muted">{flow.summary}</p>
              <div className="row">
                {flow.tags.map((tag) => (
                  <span key={tag} className="pill">
                    {tag}
                  </span>
                ))}
              </div>
              <Link href={flow.route} className="button-link ghost" data-testid={`home-open-${flow.id}`}>
                Open route
              </Link>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
