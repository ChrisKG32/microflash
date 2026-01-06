import cron, { type ScheduledTask } from 'node-cron';

let schedulerTask: ScheduledTask | null = null;
let isRunning = false;

/**
 * Placeholder for the notification check function.
 * Will be implemented in subsequent sub-issues (#22-#25).
 */
async function runNotificationCheck(): Promise<void> {
  // Prevent concurrent runs
  if (isRunning) {
    console.log('[Scheduler] Previous run still in progress, skipping...');
    return;
  }

  isRunning = true;
  console.log('[Scheduler] Running notification check...');

  try {
    // TODO: Implement in #22-#25
    // 1. Find cards due for review (±7 min window)
    // 2. Group by user and deck
    // 3. Send push notifications via Expo
    // 4. Mark cards as notified
    console.log('[Scheduler] Notification check complete');
  } catch (error) {
    console.error('[Scheduler] Error:', error);
  } finally {
    isRunning = false;
  }
}

/**
 * Starts the background scheduler that runs every 15 minutes.
 * Cron pattern runs at :00, :15, :30, :45 of every hour.
 */
export function startScheduler(): void {
  if (schedulerTask) {
    console.log('[Scheduler] Already running');
    return;
  }

  // Run every 15 minutes
  const cronPattern = '*/15 * * * *';
  schedulerTask = cron.schedule(cronPattern, runNotificationCheck, {
    scheduled: true,
    timezone: 'UTC',
  });

  schedulerTask.start();
  console.log('[Scheduler] Started - running every 15 minutes');
}

/**
 * Stops the background scheduler gracefully.
 */
export function stopScheduler(): void {
  if (schedulerTask) {
    schedulerTask.stop();
    schedulerTask = null;
    console.log('[Scheduler] Stopped');
  }
}

/**
 * Returns whether the scheduler is currently active.
 */
export function isSchedulerRunning(): boolean {
  return schedulerTask !== null;
}
