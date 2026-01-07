# Notification Controls (Client)

## Title

Notification permissions, token registration, and Notification Controls UI

## Goal

Complete the client side of notifications: permission handling, push token registration, and settings screen.

## Scope

Client: permission flow, token registration, Notification Controls screen.

## Acceptance Criteria

- Onboarding prompts for notifications and records "prompt shown" even if denied.
- If granted, app registers Expo push token with server.
- Notification Controls screen can edit all notification preferences.
- Shows OS-disabled guidance when system permissions are denied.
- Android notification channels are configured.

## Permission Flow

```typescript
async function registerForPushNotificationsAsync() {
  // 1. Check if physical device
  if (!Device.isDevice) {
    return null;
  }

  // 2. Android: create notification channel
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.MAX,
    });
  }

  // 3. Request permissions
  const { status } = await Notifications.requestPermissionsAsync();

  // 4. Record that prompt was shown (even if denied)
  await api.updateOnboarding({ notificationsPromptedAt: new Date() });

  if (status !== 'granted') {
    return null;
  }

  // 5. Get push token
  const token = await Notifications.getExpoPushTokenAsync({
    projectId: Constants.expoConfig.extra.eas.projectId,
  });

  // 6. Register with server
  await api.registerPushToken(token.data);

  return token.data;
}
```

## Notification Controls Screen

### Layout

```
+----------------------------------+
| Notification Controls            |
+----------------------------------+
|                                  |
| Notifications                    |
| [Toggle: ON/OFF]                 |
|                                  |
| [!] Notifications are disabled   |
|     in system settings.          |
|     [Open Settings]              |
|                                  |
+----------------------------------+
|                                  |
| Quiet Hours                      |
| Start: [10:00 PM]                |
| End:   [7:00 AM]                 |
|                                  |
+----------------------------------+
|                                  |
| Limits                           |
|                                  |
| Max per day                      |
| [1] -------|------- [12]         |
|            6                     |
|                                  |
| Cooldown between pushes          |
| [2h] ------|------- [8h]         |
|            2h                    |
|                                  |
+----------------------------------+
|                                  |
| Advanced                         |
|                                  |
| Only notify when due cards >=    |
| [Off] or [Number picker]         |
|                                  |
+----------------------------------+
```

### Behavior

- Toggle: calls `PATCH /api/notifications/preferences`.
- Quiet hours: time pickers, saves on change.
- Sliders: save on change (debounced).
- Backlog threshold: optional number input.
- "Open Settings": deep links to iOS/Android system settings.

## Notifications Disabled Indicator

- Persistent subtle indicator on Home when permissions denied.
- Tapping opens modal with:
  - Explanation of why notifications matter.
  - "Open Settings" button.
  - "Dismiss" button.

## Subtasks

- [ ] **12.1** Implement `registerForPushNotificationsAsync()` function.
- [ ] **12.2** Call registration during onboarding flow.
- [ ] **12.3** Configure Android notification channels.
- [ ] **12.4** Create Notification Controls screen.
- [ ] **12.5** Implement quiet hours time pickers.
- [ ] **12.6** Implement max/day slider.
- [ ] **12.7** Implement cooldown slider (min 2h).
- [ ] **12.8** Implement backlog threshold input.
- [ ] **12.9** Implement notifications toggle.
- [ ] **12.10** Implement "Open Settings" deep link.
- [ ] **12.11** Create notifications disabled indicator component.
- [ ] **12.12** Create notifications disabled modal.

## Dependencies

- Ticket 04 (onboarding flow calls registration).
- Ticket 11 (server notification preferences).

## Estimated Effort

Medium
