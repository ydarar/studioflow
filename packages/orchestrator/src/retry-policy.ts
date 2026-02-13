export async function withRetry<T>(
  fn: () => Promise<T>,
  opts: { retries?: number; delaysMs?: number[] } = {}
): Promise<T> {
  const retries = opts.retries ?? 2;
  const delays = opts.delaysMs ?? [500, 1500, 2500];
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt === retries) break;
      const delay = delays[Math.min(attempt, delays.length - 1)] ?? 800;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}
