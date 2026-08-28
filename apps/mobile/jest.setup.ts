/**
 * Jest setup file for Expo/React Native tests.
 * This file runs before each test file and sets up common mocks.
 */

// Extend Jest matchers with React Native Testing Library matchers
import '@testing-library/jest-native/extend-expect';

// Setup react-native-reanimated mock for Jest
// This must be called before any component that uses Reanimated is imported
jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  // Silence the warning: Animated: `useNativeDriver` is not supported
  Reanimated.default.call = () => {};
  return Reanimated;
});

// Setup react-native-gesture-handler mock
jest.mock('react-native-gesture-handler', () => {
  const View = require('react-native').View;
  return {
    Swipeable: View,
    DrawerLayout: View,
    State: {},
    ScrollView: View,
    Slider: View,
    Switch: View,
    TextInput: View,
    ToolbarAndroid: View,
    ViewPagerAndroid: View,
    DrawerLayoutAndroid: View,
    WebView: View,
    NativeViewGestureHandler: View,
    TapGestureHandler: View,
    FlingGestureHandler: View,
    ForceTouchGestureHandler: View,
    LongPressGestureHandler: View,
    PanGestureHandler: View,
    PinchGestureHandler: View,
    RotationGestureHandler: View,
    RawButton: View,
    BaseButton: View,
    RectButton: View,
    BorderlessButton: View,
    FlatList: View,
    gestureHandlerRootHOC: jest.fn(),
    Directions: {},
    GestureHandlerRootView: View,
  };
});

// Silence NativeAnimatedHelper warnings (path varies by RN version, so we use try/catch)
try {
  jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper');
} catch {
  // Module path may not exist in newer RN versions, which is fine
}

// Mock expo-router to prevent navigation-related crashes in component tests
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    canGoBack: jest.fn(() => false),
    setParams: jest.fn(),
  }),
  useLocalSearchParams: () => ({}),
  useGlobalSearchParams: () => ({}),
  useSegments: () => [],
  // Screens fetch on focus; under test there is no navigator, so run the
  // effect once like useEffect (cleanup included).
  useFocusEffect: (cb: () => void | (() => void)) => {
    const React = require('react');
    React.useEffect(cb, [cb]);
  },
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
    setOptions: jest.fn(),
    addListener: jest.fn(() => jest.fn()),
  }),
  usePathname: () => '/',
  Link: ({ children }: { children: React.ReactNode }) => children,
  // Navigators render their children; `.Screen` is config-only, so it renders
  // nothing. Without the `.Screen` statics any layout file throws on render,
  // since `Stack.Screen` would be undefined.
  Stack: Object.assign(
    ({ children }: { children: React.ReactNode }) => children,
    { Screen: () => null },
  ),
  Tabs: Object.assign(
    ({ children }: { children: React.ReactNode }) => children,
    { Screen: () => null },
  ),
  Slot: ({ children }: { children: React.ReactNode }) => children,
  Redirect: () => null,
  router: {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    canGoBack: jest.fn(() => false),
    setParams: jest.fn(),
  },
  Href: String,
}));

// Mock expo-web-browser (used by ExternalLink component)
jest.mock('expo-web-browser', () => ({
  openBrowserAsync: jest.fn(),
  WebBrowserPresentationStyle: {
    AUTOMATIC: 'automatic',
    FULL_SCREEN: 'fullScreen',
    PAGE_SHEET: 'pageSheet',
    FORM_SHEET: 'formSheet',
    CURRENT_CONTEXT: 'currentContext',
    OVER_FULL_SCREEN: 'overFullScreen',
    OVER_CURRENT_CONTEXT: 'overCurrentContext',
    POPOVER: 'popover',
  },
}));

// Mock expo-haptics (used by HapticTab component)
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  selectionAsync: jest.fn(),
  ImpactFeedbackStyle: {
    Light: 'light',
    Medium: 'medium',
    Heavy: 'heavy',
  },
  NotificationFeedbackType: {
    Success: 'success',
    Warning: 'warning',
    Error: 'error',
  },
}));

// @legendapp/motion drives the animated backdrops in modal, drawer,
// actionsheet, toast, popover, menu and fab. Its animation runtime is
// irrelevant to render-smoke tests, so flatten it to plain views.
jest.mock('@legendapp/motion', () => {
  const { View, Text } = require('react-native');
  return {
    Motion: { View, Text, Pressable: View },
    AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
    createMotionAnimatedComponent: (c: unknown) => c,
    MotionSvg: { View },
  };
});

// CardContent renders KaTeX in a WebView; jsdom/jest-expo can't run it.
jest.mock('react-native-webview', () => {
  const { View } = require('react-native');
  return { __esModule: true, default: View, WebView: View };
});

/**
 * NativeWind learns `darkMode: 'class'` from the CSS that metro's transformer
 * compiles out of tailwind.config.js. That transformer does not run under
 * jest-expo, so the runtime falls back to `media` and `setColorScheme()`
 * throws "Unable to manually set color scheme without using darkMode: class"
 * — which would make every gluestack component unrenderable in tests, since
 * GluestackUIProvider calls it on mount.
 *
 * Replace ONLY the color-scheme hook, keeping `vars`, `cssInterop` and
 * `remapProps` real (config.ts needs a genuine `vars()` return shape, and the
 * interop functions run at module scope in nearly every gluestack component).
 *
 * Note this means `className` styling is inert in tests: the style data comes
 * from the same compiler. Assert on testID / text / role, never on resolved
 * colors — those are verified on-device via app/_dev/theme-probe.
 */
jest.mock('nativewind', () => {
  const actual = jest.requireActual('nativewind');
  const React = require('react');

  let scheme: 'light' | 'dark' = 'light';
  const listeners = new Set<() => void>();

  const setColorScheme = (next: 'light' | 'dark' | 'system') => {
    scheme = next === 'system' ? 'light' : next;
    listeners.forEach((notify) => notify());
  };

  return {
    ...actual,
    useColorScheme: () => {
      const colorScheme = React.useSyncExternalStore(
        (cb: () => void) => {
          listeners.add(cb);
          return () => listeners.delete(cb);
        },
        () => scheme,
        () => scheme,
      );
      return {
        colorScheme,
        setColorScheme,
        toggleColorScheme: () =>
          setColorScheme(scheme === 'light' ? 'dark' : 'light'),
      };
    },
  };
});

// app/_layout.tsx calls into expo-notifications at module scope (handler +
// category registration) and on mount (cold-start response lookup).
jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  setNotificationCategoryAsync: jest.fn().mockResolvedValue(undefined),
  getLastNotificationResponseAsync: jest.fn().mockResolvedValue(null),
  addNotificationResponseReceivedListener: jest.fn(() => ({
    remove: jest.fn(),
  })),
  addNotificationReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  removeNotificationSubscription: jest.fn(),
  getPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  requestPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  getExpoPushTokenAsync: jest
    .fn()
    .mockResolvedValue({ data: 'ExponentPushToken[test]' }),
  scheduleNotificationAsync: jest.fn().mockResolvedValue('notification-id'),
  cancelScheduledNotificationAsync: jest.fn().mockResolvedValue(undefined),
  setNotificationChannelAsync: jest.fn().mockResolvedValue(undefined),
  DEFAULT_ACTION_IDENTIFIER: 'expo.modules.notifications.actions.DEFAULT',
  AndroidImportance: { MAX: 5, HIGH: 4, DEFAULT: 3 },
}));
