/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

const tintColorLight = '#0a7ea4';
const tintColorDark = '#fff';

export const Colors = {
  light: {
    text: '#11181C',
    background: '#fff',
    tint: tintColorLight,
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: '#ECEDEE',
    background: '#151718',
    tint: tintColorDark,
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: tintColorDark,
  },
};

// /* Your existing Radix tokens can stay as-is */
// .dark, .dark-theme {
//   /* gluestack primary scale (rgb triplets) */
//   --color-primary-0:   12 17 28;   /* --blue-1  #0c111c */
//   --color-primary-50:  17 23 37;   /* --blue-2  #111725 */
//   --color-primary-100: 23 36 72;   /* --blue-3  #172448 */
//   --color-primary-200: 29 46 97;   /* --blue-4  #1d2e61 */
//   --color-primary-300: 36 57 116;  /* --blue-5  #243974 */
//   --color-primary-400: 45 68 132;  /* --blue-6  #2d4484 */
//
//   /* Key: make Radix step 9 your primary “500” */
//   --color-primary-500: 61 99 221;  /* --blue-9  #3d63dd */
//   --color-primary-600: 63 92 176;  /* --blue-10 #3f5cb0 */
//   --color-primary-700: 147 180 255;/* --blue-11 #93b4ff */
//   --color-primary-800: 213 226 255;/* --blue-12 #d5e2ff */
//   --color-primary-900: 213 226 255;
//   --color-primary-950: 213 226 255;
//
//   /* Optional: if you want indicators to follow the same accent */
//   --color-indicator-primary: 61 99 221;
// }

// /* global.css */
//
// /* DARK MODE variables (when .dark is present) */
// .dark, .dark-theme {
//   /* Background scale: dark -> light */
//   --color-background-0:   17 17 19;   /* gray-1  #111113 */
//   --color-background-50:  25 25 27;   /* gray-2  #19191b */
//   --color-background-100: 34 35 37;   /* gray-3  #222325 */
//   --color-background-200: 41 42 46;   /* gray-4  #292a2e */
//   --color-background-300: 48 49 54;   /* gray-5  #303136 */
//   --color-background-400: 57 58 64;   /* gray-6  #393a40 */
//   --color-background-500: 70 72 79;   /* gray-7  #46484f */
//   --color-background-600: 95 96 106;  /* gray-8  #5f606a */
//   --color-background-700: 108 110 121;/* gray-9  #6c6e79 */
//   --color-background-800: 121 123 134;/* gray-10 #797b86 */
//   --color-background-900: 178 179 189;/* gray-11 #b2b3bd */
//   --color-background-950: 238 238 240;/* gray-12 #eeeef0 */
//
//   /* Typography scale: light -> dark (so text classes stay consistent) */
//   --color-typography-0:   238 238 240;/* gray-12 */
//   --color-typography-50:  178 179 189;/* gray-11 */
//   --color-typography-100: 121 123 134;/* gray-10 */
//   --color-typography-200: 108 110 121;/* gray-9 */
//   --color-typography-300: 95 96 106;  /* gray-8 */
//   --color-typography-400: 70 72 79;   /* gray-7 */
//   --color-typography-500: 57 58 64;   /* gray-6 */
//   --color-typography-600: 48 49 54;   /* gray-5 */
//   --color-typography-700: 41 42 46;   /* gray-4 */
//   --color-typography-800: 34 35 37;   /* gray-3 */
//   --color-typography-900: 25 25 27;   /* gray-2 */
//   --color-typography-950: 17 17 19;   /* gray-1 */
//
//   /* Outline/borders: pick a mid-gray band that reads on your surfaces */
//   --color-outline-0:   34 35 37;      /* gray-3 */
//   --color-outline-200: 57 58 64;      /* gray-6 */
//   --color-outline-500: 95 96 106;     /* gray-8 */
//   --color-outline-700: 121 123 134;   /* gray-10 */
// }
