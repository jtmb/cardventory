// Next.js instrumentation hook — runs once on server startup
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startCron } = await import("./lib/cron");
    await startCron();

    // Patch the Node.js HTTP server to capture request timing for perf metrics.
    // This runs in the same process as the in-memory ring buffer, so the data
    // is immediately available to /api/admin/performance-metrics.
    const http = await import("node:http");
    const { recordRequest } = await import("./lib/security-metrics");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const _originalEmit = http.Server.prototype.emit as (...args: any[]) => boolean;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (http.Server.prototype as any).emit = function (event: string, ...args: any[]) {
      if (event === "request") {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const req = args[0] as any;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const res = args[1] as any;
        const start = Date.now();
        res.on("finish", () => {
          recordRequest({
            path: req.url ?? "/",
            method: req.method ?? "GET",
            status: res.statusCode,
            durationMs: Date.now() - start,
          });
        });
      }
      return _originalEmit.apply(this, [event, ...args]);
    };
  }
}

