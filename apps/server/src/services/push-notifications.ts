import Expo, {
  type ExpoPushMessage,
  type ExpoPushSuccessTicket,
} from 'expo-server-sdk';
import pAll from 'p-all';

/**
 * Result of sending a single push notification.
 */
export interface PushNotificationResult {
  pushToken: string;
  success: boolean;
  ticketId?: string;
  error?: string;
}

/**
 * Result of checking a push notification receipt.
 */
export interface ReceiptCheckResult {
  receiptId: string;
  status: 'ok' | 'error';
  error?: string;
  shouldRemoveToken?: boolean;
}

// Create Expo client singleton
let expoClient: Expo | null = null;

/**
 * Gets or creates the Expo client singleton.
 * Uses EXPO_ACCESS_TOKEN if available for authenticated requests.
 */
export function getExpoClient(): Expo {
  if (!expoClient) {
    const accessToken = process.env.EXPO_ACCESS_TOKEN;
    expoClient = new Expo({
      accessToken: accessToken || undefined,
    });
  }
  return expoClient;
}

/**
 * Resets the Expo client (useful for testing).
 */
export function resetExpoClient(): void {
  expoClient = null;
}

/**
 * Validates whether a string is a valid Expo push token.
 *
 * @param token - The token to validate
 * @returns true if the token is a valid Expo push token
 */
export function isValidExpoPushToken(token: string): boolean {
  return Expo.isExpoPushToken(token);
}

/**
 * Sends a single push notification.
 *
 * @param pushToken - The Expo push token to send to
 * @param title - Notification title
 * @param body - Notification body
 * @param data - Optional data payload
 * @returns Result indicating success or failure
 */
export async function sendPushNotification(
  pushToken: string,
  title: string,
  body: string,
  data?: Record<string, unknown>,
): Promise<PushNotificationResult> {
  if (!isValidExpoPushToken(pushToken)) {
    return {
      pushToken,
      success: false,
      error: 'Invalid Expo push token',
    };
  }

  const expo = getExpoClient();

  const message: ExpoPushMessage = {
    to: pushToken,
    sound: 'default',
    title,
    body,
    data: data || {},
  };

  try {
    const tickets = await expo.sendPushNotificationsAsync([message]);
    const ticket = tickets[0];

    if (ticket.status === 'ok') {
      return {
        pushToken,
        success: true,
        ticketId: (ticket as ExpoPushSuccessTicket).id,
      };
    } else {
      return {
        pushToken,
        success: false,
        error: ticket.message || 'Unknown error',
      };
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    console.error('[PushNotifications] Error sending notification:', error);
    return {
      pushToken,
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Sends push notifications to multiple users in batches.
 * Uses Expo's chunking to optimize API requests.
 *
 * @param notifications - Array of notifications to send
 * @returns Array of results for each notification
 */
export async function sendBatchNotifications(
  notifications: Array<{
    pushToken: string;
    title: string;
    body: string;
    categoryId?: string;
    data?: Record<string, unknown>;
  }>,
): Promise<PushNotificationResult[]> {
  if (notifications.length === 0) {
    return [];
  }

  const expo = getExpoClient();
  const results: PushNotificationResult[] = [];

  // Filter out invalid tokens and track them
  const validNotifications: Array<{
    pushToken: string;
    title: string;
    body: string;
    categoryId?: string;
    data?: Record<string, unknown>;
  }> = [];

  for (const notification of notifications) {
    if (!isValidExpoPushToken(notification.pushToken)) {
      results.push({
        pushToken: notification.pushToken,
        success: false,
        error: 'Invalid Expo push token',
      });
    } else {
      validNotifications.push(notification);
    }
  }

  if (validNotifications.length === 0) {
    return results;
  }

  // Build messages
  // Note: categoryId maps to iOS APNs 'category' field for interactive notifications
  const messages: ExpoPushMessage[] = validNotifications.map((n) => ({
    to: n.pushToken,
    sound: 'default' as const,
    title: n.title,
    body: n.body,
    data: n.data || {},
    // categoryId is passed through to APNs for iOS interactive notifications
    ...(n.categoryId && { categoryId: n.categoryId }),
  }));

  // Chunk messages for efficient sending
  const chunks = expo.chunkPushNotifications(messages);

  // Track which token corresponds to which index
  const tokenIndexMap = new Map<string, number>();
  validNotifications.forEach((n, i) => {
    tokenIndexMap.set(n.pushToken, i);
  });

  // Send each chunk
  let ticketIndex = 0;
  for (const chunk of chunks) {
    try {
      const tickets = await expo.sendPushNotificationsAsync(chunk);

      for (let i = 0; i < tickets.length; i++) {
        const ticket = tickets[i];
        const notification = validNotifications[ticketIndex + i];

        if (ticket.status === 'ok') {
          results.push({
            pushToken: notification.pushToken,
            success: true,
            ticketId: (ticket as ExpoPushSuccessTicket).id,
          });
        } else {
          results.push({
            pushToken: notification.pushToken,
            success: false,
            error: ticket.message || 'Unknown error',
          });
        }
      }

      ticketIndex += tickets.length;
    } catch (error) {
      // If a chunk fails, mark all notifications in that chunk as failed
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      console.error('[PushNotifications] Error sending chunk:', error);

      for (let i = 0; i < chunk.length; i++) {
        const notification = validNotifications[ticketIndex + i];
        if (notification) {
          results.push({
            pushToken: notification.pushToken,
            success: false,
            error: errorMessage,
          });
        }
      }

      ticketIndex += chunk.length;
    }
  }

  return results;
}

/**
 * Checks push notification receipts to verify delivery.
 * Should be called after a delay (e.g., 15-30 seconds) to allow delivery.
 * Uses concurrent processing with limited concurrency for efficiency.
 *
 * @param receiptIds - Array of receipt IDs from successful ticket sends
 * @returns Array of receipt check results
 */
export async function checkPushNotificationReceipts(
  receiptIds: string[],
): Promise<ReceiptCheckResult[]> {
  if (receiptIds.length === 0) {
    return [];
  }

  const expo = getExpoClient();

  // Chunk receipt IDs for efficient fetching
  const chunks = expo.chunkPushNotificationReceiptIds(receiptIds);

  // Process each chunk concurrently with limited concurrency
  const processChunk = async (
    chunk: string[],
  ): Promise<ReceiptCheckResult[]> => {
    const chunkResults: ReceiptCheckResult[] = [];

    try {
      const receipts = await expo.getPushNotificationReceiptsAsync(chunk);

      for (const receiptId of chunk) {
        const receipt = receipts[receiptId];

        if (!receipt) {
          chunkResults.push({
            receiptId,
            status: 'error',
            error: 'Receipt not found',
          });
          continue;
        }

        if (receipt.status === 'ok') {
          chunkResults.push({
            receiptId,
            status: 'ok',
          });
        } else {
          const errorDetails = receipt.details?.error;
          chunkResults.push({
            receiptId,
            status: 'error',
            error: receipt.message || errorDetails || 'Unknown error',
            // DeviceNotRegistered means the token should be removed
            shouldRemoveToken: errorDetails === 'DeviceNotRegistered',
          });
        }
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      console.error('[PushNotifications] Error fetching receipts:', error);

      // Mark all receipts in this chunk as errored
      for (const receiptId of chunk) {
        chunkResults.push({
          receiptId,
          status: 'error',
          error: errorMessage,
        });
      }
    }

    return chunkResults;
  };

  // Create array of functions to process each chunk
  const chunkProcessors = chunks.map((chunk) => () => processChunk(chunk));

  // Process all chunks concurrently with limited concurrency (5 concurrent requests)
  const chunkResults = await pAll(chunkProcessors, { concurrency: 5 });

  // Flatten results from all chunks
  return chunkResults.flat();
}

/**
 * Logs notification results for monitoring.
 *
 * @param results - Array of push notification results
 */
export function logNotificationResults(
  results: PushNotificationResult[],
): void {
  const successful = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;

  console.log(
    `[PushNotifications] Sent ${results.length} notifications: ${successful} successful, ${failed} failed`,
  );

  // Log individual failures for debugging
  for (const result of results) {
    if (!result.success) {
      console.error(
        `[PushNotifications] Failed to send to ${result.pushToken}: ${result.error}`,
      );
    }
  }
}
