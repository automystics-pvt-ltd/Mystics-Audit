import { logger } from "./logger";
import { runAutomationChecks } from "../routes/automation";

let _timer: ReturnType<typeof setInterval> | null = null;
const INTERVAL_MS = 5 * 60 * 1000; /* run every 5 minutes */

export function startScheduler(): void {
  if (_timer) return;

  /* Run once at startup (after a short delay to let DB settle) */
  setTimeout(() => {
    runOnce();
  }, 15_000);

  _timer = setInterval(runOnce, INTERVAL_MS);
  logger.info({ intervalMs: INTERVAL_MS }, "Automation scheduler started");
}

async function runOnce(): Promise<void> {
  try {
    const result = await runAutomationChecks();
    if (result.created > 0) {
      logger.info(result, "Automation checks completed — notifications created");
    }
  } catch (err) {
    logger.error({ err }, "Automation scheduler run failed");
  }
}

export function stopScheduler(): void {
  if (_timer) {
    clearInterval(_timer);
    _timer = null;
    logger.info("Automation scheduler stopped");
  }
}
