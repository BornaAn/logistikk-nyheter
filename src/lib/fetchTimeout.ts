/**
 * Native fetch has no default timeout — a single hanging source can wait
 * far longer than Vercel's real 60s function limit (Hobby plan) before the
 * platform kills the whole run. Since sources are fetched concurrently
 * (Promise.allSettled/bounded concurrency), one stuck request stalls that
 * entire phase for everyone else too, not just itself. This wraps any
 * fetch call with a hard timeout so a single bad source degrades to "that
 * one source failed" instead of "the whole cron run silently vanished".
 */
export async function fetchWithTimeout(
  url: string,
  init: RequestInit = {},
  timeoutMs = 10000,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (err) {
    if (controller.signal.aborted) {
      throw new Error(`Tidsavbrudd etter ${timeoutMs}ms: ${url}`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}
