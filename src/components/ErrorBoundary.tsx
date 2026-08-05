import { Ionicons } from '@expo/vector-icons';
import * as Sentry from '@sentry/react-native';
import { Component, type ErrorInfo, type PropsWithChildren } from 'react';
import { Pressable, Text, View } from 'react-native';
import { darkColors, lightColors, radius, spacing, typography } from '../theme/tokens';

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * Catches render-phase crashes anywhere below it so a single bad screen
 * shows a recoverable message instead of blanking the whole app.
 *
 * Styling deliberately uses raw tokens rather than useTheme(): a class
 * component can't call hooks, and the theme provider itself may be part of
 * what crashed. Colours are picked to be legible on either scheme.
 */
export class ErrorBoundary extends Component<PropsWithChildren, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Unhandled render error:', error, info.componentStack);
    // This boundary swallows the error to show a fallback UI, so Sentry.wrap's
    // own boundary at the root never sees it — report it here instead.
    Sentry.captureException(error, { extra: { componentStack: info.componentStack } });
  }

  handleReset = () => {
    this.setState({ error: null });
  };

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <View
        style={{
          flex: 1,
          backgroundColor: lightColors.background,
          alignItems: 'center',
          justifyContent: 'center',
          padding: spacing.lg,
          gap: spacing.md,
        }}
      >
        <Ionicons name="warning-outline" size={48} color={lightColors.danger} />
        <Text style={[typography.heading, { color: lightColors.textPrimary, textAlign: 'center' }]}>
          Something went wrong
        </Text>
        <Text
          style={[typography.body, { color: lightColors.textSecondary, textAlign: 'center' }]}
        >
          The app hit an unexpected error. You can try again — your logged workouts are safe.
        </Text>
        {__DEV__ ? (
          <Text
            style={[typography.caption, { color: darkColors.textMuted, textAlign: 'center' }]}
            numberOfLines={3}
          >
            {error.message}
          </Text>
        ) : null}
        <Pressable
          onPress={this.handleReset}
          accessibilityRole="button"
          accessibilityLabel="Try again"
          style={({ pressed }) => ({
            backgroundColor: lightColors.primary,
            borderRadius: radius.md,
            paddingVertical: spacing.md,
            paddingHorizontal: spacing.lg,
            opacity: pressed ? 0.8 : 1,
          })}
        >
          <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>Try again</Text>
        </Pressable>
      </View>
    );
  }
}
