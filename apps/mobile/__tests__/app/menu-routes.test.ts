/**
 * The avatar-menu screens must sit directly on the root Stack.
 *
 * app/(menu)/ once had its own _layout.tsx. Because every one of those screens
 * is entered from the avatar popover, each landed at index 0 of that nested
 * stack — and a native stack only draws a back button when the screen has a
 * predecessor *in the same stack*. The root entry they were pushed onto was
 * headerShown: false, so the only header on screen was the nested one, with
 * nothing behind it. Result: no way back except the tab bar.
 *
 * Deleting that layout hoists the screens into the root Stack, where the push
 * from the popover is a real predecessor. This is a source-level check because
 * the failure is structural: the app renders fine either way, so no render
 * test catches it.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const APP_DIR = join(__dirname, '../../app');
const MENU_DIR = join(APP_DIR, '(menu)');

const menuFiles = readdirSync(MENU_DIR).filter((f) => f.endsWith('.tsx'));
const rootLayout = readFileSync(join(APP_DIR, '_layout.tsx'), 'utf8');

describe('(menu) routes', () => {
  it('has no nested _layout, so its screens hoist to the root Stack', () => {
    expect(menuFiles).not.toContain('_layout.tsx');
  });

  it('registers every menu screen on the root Stack', () => {
    // Names keep the group segment once hoisted: "(menu)/profile", not
    // "profile". A name that matches no route is silently ignored by
    // expo-router, so a typo here would lose the options without any error.
    const missing = menuFiles
      .map((f) => `(menu)/${f.replace(/\.tsx$/, '')}`)
      .filter((route) => !rootLayout.includes(`name="${route}"`));

    expect(missing).toEqual([]);
  });

  it('gives every menu screen a back title', () => {
    for (const file of menuFiles) {
      const route = `(menu)/${file.replace(/\.tsx$/, '')}`;
      const entry = rootLayout.slice(
        rootLayout.indexOf(`name="${route}"`),
        rootLayout.indexOf('/>', rootLayout.indexOf(`name="${route}"`)),
      );
      expect(entry).toContain("headerBackTitle: 'Back'");
    }
  });

  it('gives every menu screen a title', () => {
    // Each screen declares its own inline <Stack.Screen options={{ title }} />
    // rather than the root layout owning titles — one source per screen.
    for (const file of menuFiles) {
      const src = readFileSync(join(MENU_DIR, file), 'utf8');
      expect(src).toMatch(
        /<Stack\.Screen options=\{\{ title: '[^']+' \}\} \/>/,
      );
    }
  });
});
