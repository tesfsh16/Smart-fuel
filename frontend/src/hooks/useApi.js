import { useEffect, useState, useCallback } from "react";

// Auto-retry on network errors (e.g. "Failed to fetch" when the dev
// server just restarted). Retries up to 2 times with a short delay.
async function withRetry(fn, retries = 2, delayMs = 800) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const isNetwork =
        err instanceof TypeError && err.message === "Failed to fetch";
      if (isNetwork && attempt < retries) {
        await new Promise((r) => setTimeout(r, delayMs * (attempt + 1)));
      } else {
        throw err;
      }
    }
  }
}

// useApi(fn, deps) — calls fn() on mount, returns { data, loading, error, refetch }.
export function useApi(fn, deps = []) {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await withRetry(fn);
      setData(result);
    } catch (err) {
      const msg = err instanceof TypeError && err.message === "Failed to fetch"
        ? "Could not reach the server. Please check your connection."
        : err.message || "Something went wrong.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => { fetch(); }, [fetch]);

  return { data, loading, error, refetch: fetch };
}
