"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function OnboardingPage() {
  const [company, setCompany] = useState("");
  const router = useRouter();

  return (
    <main>
      <div className="card" data-testid="onboarding-card">
        <h2 data-testid="onboarding-title">Onboarding</h2>
        <p>Set up your company profile.</p>
        <label htmlFor="companyName">Company Name</label>
        <input
          id="companyName"
          data-testid="company-name-input"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          placeholder="Acme Inc"
          style={{ width: "100%", marginTop: 8, padding: 10, borderRadius: 8, border: "1px solid #ccd5ce" }}
        />
        <div className="actions">
          <button
            className="primary"
            data-testid="complete-onboarding"
            onClick={() => router.push("/billing")}
            disabled={!company}
          >
            Continue to billing
          </button>
        </div>
      </div>
    </main>
  );
}
