// Next.js instrumentation hook — runs once on server startup
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startCron } = await import("./lib/cron");
    await startCron();
  }
}
