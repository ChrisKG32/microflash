# Screen tests live here, not beside the screens

Everywhere else in this repo tests sit next to their source. Screens are the
exception, and it is not a style choice.

expo-router builds its route table with:

    require.context(APP_ROOT, true,
      /^(?:\.\/)(?!(?:(?:(?:.*\+api)|(?:\+html)|(?:\+middleware)))\.[tj]sx?$).*\.[tj]sx?$/)

Only `+api`, `+html` and `+middleware` are excluded. Every other `.tsx` under
`app/` is treated as a route AND pulled into the production bundle — so a
colocated `screen.test.tsx` drags `@testing-library/react-native` into the app
and the build fails with "Unable to resolve module console".

So: tests for `app/**` mirror the route path under `__tests__/app/**`. Tests
for `components/`, `hooks/`, `lib/` and `theme/` stay colocated, since expo
-router never scans those directories.
