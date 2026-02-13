"use client";

import { useRouter } from "next/navigation";
import { plans } from "../../lib/fake-data";

export default function BillingPage() {
  const router = useRouter();

  return (
    <main>
      <div className="card" data-testid="billing-card">
        <h2 data-testid="billing-title">Billing</h2>
        <p>Select a plan to continue.</p>
        <div style={{ display: "grid", gap: 10 }}>
          {plans.map((plan) => (
            <button
              key={plan.id}
              className="secondary"
              data-testid={`plan-${plan.id}`}
              onClick={() => router.push(`/success?plan=${plan.id}`)}
            >
              {plan.name} — {plan.price}
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}
