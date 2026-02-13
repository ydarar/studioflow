import Link from "next/link";

export default function HomePage() {
  return (
    <main>
      <div className="card" data-testid="home-card">
        <h1 data-testid="home-title">Acme Workspace</h1>
        <p data-testid="home-subtitle">Demo-ready onboarding and billing sample app.</p>
        <div className="actions">
          <Link href="/onboarding" className="btn primary" data-testid="go-onboarding">
            Start onboarding
          </Link>
          <Link href="/billing" className="btn secondary" data-testid="go-billing">
            View billing
          </Link>
        </div>
      </div>
    </main>
  );
}
