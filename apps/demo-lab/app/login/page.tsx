"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { AppShell } from "../../components/app-shell";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("demo@studioflow.dev");
  const [password, setPassword] = useState("demo-pass-123");
  const [role, setRole] = useState("admin");
  const [region, setRegion] = useState("us");
  const [mfa, setMfa] = useState(true);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = new URLSearchParams({ email, role, region, mfa: String(mfa) });
    router.push(`/workspace?${query.toString()}`);
  }

  return (
    <AppShell
      title="Sign In"
      subtitle="Seeded credentials and toggles for repeatable auth demos."
      activeRoute="/login"
    >
      <form className="card stack" onSubmit={onSubmit} data-testid="login-form">
        <div className="grid-two">
          <label className="field">
            <span className="label">Email</span>
            <input
              className="input"
              data-testid="login-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>
          <label className="field">
            <span className="label">Password</span>
            <input
              className="input"
              data-testid="login-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>
        </div>

        <div className="grid-two">
          <label className="field">
            <span className="label">Role</span>
            <select
              className="select"
              data-testid="login-role"
              value={role}
              onChange={(event) => setRole(event.target.value)}
            >
              <option value="admin">Admin</option>
              <option value="manager">Manager</option>
              <option value="viewer">Viewer</option>
            </select>
          </label>
          <label className="field">
            <span className="label">Region</span>
            <select
              className="select"
              data-testid="login-region"
              value={region}
              onChange={(event) => setRegion(event.target.value)}
            >
              <option value="us">United States</option>
              <option value="eu">Europe</option>
              <option value="apac">APAC</option>
            </select>
          </label>
        </div>

        <label className="checkbox-row">
          <input
            data-testid="login-mfa-toggle"
            type="checkbox"
            checked={mfa}
            onChange={(event) => setMfa(event.target.checked)}
          />
          Require MFA challenge
        </label>

        <div className="row">
          <button className="button primary" data-testid="login-submit" type="submit">
            Enter workspace
          </button>
          <Link href="/" className="button-link ghost" data-testid="login-back-home">
            Back to landing
          </Link>
        </div>
      </form>
    </AppShell>
  );
}
