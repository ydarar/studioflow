export default async function SuccessPage({
  searchParams
}: {
  searchParams: Promise<{ plan?: string }>;
}) {
  const params = await searchParams;
  const plan = params.plan ?? "starter";

  return (
    <main>
      <div className="card" data-testid="success-card">
        <h2 data-testid="success-title">Setup Complete</h2>
        <p data-testid="selected-plan">Selected plan: {plan}</p>
      </div>
    </main>
  );
}
