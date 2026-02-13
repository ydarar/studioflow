import Link from "next/link";

import { AppShell } from "../../components/app-shell";
import { flowCards } from "../../lib/demo-data";

export default function FlowIndexPage() {
  return (
    <AppShell
      title="Flow Index"
      subtitle="Single place to discover route capabilities and pick a demo path."
      activeRoute="/flows"
    >
      <section className="card stack" data-testid="flow-index">
        <div className="space-between">
          <h3>All flow routes</h3>
          <span className="pill">{flowCards.length} routes</span>
        </div>

        <div className="grid-two">
          {flowCards.map((flow) => (
            <article key={flow.id} className="card stack" data-testid={`flow-card-${flow.id}`}>
              <div className="space-between">
                <h4>{flow.title}</h4>
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
              <Link href={flow.route} className="button-link primary" data-testid={`flow-open-${flow.id}`}>
                Open flow
              </Link>
            </article>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
