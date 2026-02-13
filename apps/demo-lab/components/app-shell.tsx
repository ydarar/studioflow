import type { ReactNode } from "react";
import Link from "next/link";

import { flowCards } from "../lib/demo-data";

type AppShellProps = {
  title: string;
  subtitle: string;
  activeRoute: string;
  children: ReactNode;
};

const topLinks = [
  { label: "Landing", href: "/" },
  { label: "Login", href: "/login" },
  { label: "Workspace", href: "/workspace" },
  { label: "All Flows", href: "/flows" }
];

export function AppShell({ title, subtitle, activeRoute, children }: AppShellProps) {
  return (
    <div className="shell" data-testid="app-shell">
      <aside className="sidebar" data-testid="app-shell-sidebar">
        <div className="sidebar-header">
          <p className="eyebrow">StudioFlow Demo Lab</p>
          <h1>Automation Playground</h1>
          <p className="muted">
            Frontend-only stateful flows with deterministic selectors for repeatable demos.
          </p>
        </div>

        <div className="sidebar-block">
          <p className="sidebar-label">Core Views</p>
          <div className="sidebar-links" data-testid="top-links">
            {topLinks.map((link) => (
              <Link
                key={link.href}
                className={link.href === activeRoute ? "sidebar-link active" : "sidebar-link"}
                href={link.href}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="sidebar-block">
          <p className="sidebar-label">Flow Routes</p>
          <div className="sidebar-links" data-testid="flow-links">
            {flowCards.map((flow) => (
              <Link
                key={flow.id}
                className={flow.route === activeRoute ? "sidebar-link active" : "sidebar-link"}
                href={flow.route}
              >
                {flow.title}
              </Link>
            ))}
          </div>
        </div>
      </aside>

      <section className="content" data-testid="app-shell-content">
        <header className="page-header">
          <div>
            <p className="eyebrow">Demo Surface</p>
            <h2>{title}</h2>
            <p className="muted">{subtitle}</p>
          </div>
        </header>

        {children}
      </section>
    </div>
  );
}
