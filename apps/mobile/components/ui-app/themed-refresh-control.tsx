'use client';
import { RefreshControl, type RefreshControlProps } from 'react-native';
import { useTokens } from '@/theme/use-token';

/**
 * One of the few wrappers this codebase justifies.
 *
 * react-native-css-interop does NOT map RefreshControl — its component list
 * covers View, Text, Pressable, ScrollView, FlatList, KeyboardAvoidingView,
 * TextInput, ActivityIndicator, Switch, Image and SafeAreaView, and nothing
 * else. So `className` cannot reach it, and the spinner stays dark-on-dark in
 * dark mode. Its color props take literal strings, hence useTokens.
 */
export function ThemedRefreshControl(props: RefreshControlProps) {
  const c = useTokens('primary-500', 'background-0');
  return (
    <RefreshControl
      tintColor={c['primary-500']}
      colors={[c['primary-500']]}
      progressBackgroundColor={c['background-0']}
      {...props}
    />
  );
}
