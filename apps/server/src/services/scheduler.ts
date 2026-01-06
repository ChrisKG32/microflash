import cron, { type ScheduledTask } from 'node-cron';
import { sendDueCardNotifications } from './notification-orchestrator';

let schedulerTask: ScheduledTask | null = null;
let isRunning = false;

/**
 * Runs the notification check process.
 * Finds due cards, groups them, sends notifications, and marks them as notified.
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
    const result = await sendDueCardNotifications();
    console.log(
      `[Scheduler] Notification check complete - ${result.totalCardsFound} cards found, ${result.successfulNotifications} notifications sent`,
    );
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
