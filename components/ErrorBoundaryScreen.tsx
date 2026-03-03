import React, { Component, ErrorInfo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS } from '@/constants/theme';

interface Props {
  children: React.ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundaryScreen extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Ionicons name="warning-outline" size={48} color={COLORS.gray} />
          <Text style={styles.title}>{this.props.fallbackTitle || 'Oops!'}</Text>
          <Text style={styles.message}>
            Something went wrong. / Une erreur est survenue.
          </Text>
          {__DEV__ && this.state.error && (
            <Text style={styles.errorDetail} numberOfLines={4}>
              {this.state.error.message}
            </Text>
          )}
          <Pressable onPress={this.handleRetry} style={styles.retryBtn} accessibilityLabel="Retry" accessibilityRole="button">
            <Ionicons name="refresh-outline" size={18} color={COLORS.white} />
            <Text style={styles.retryText}>Retry / Réessayer</Text>
          </Pressable>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.cream,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
    gap: SPACING.sm,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.black,
    marginTop: SPACING.md,
  },
  message: {
    fontSize: 15,
    color: COLORS.gray,
    textAlign: 'center',
  },
  errorDetail: {
    fontSize: 12,
    color: COLORS.red,
    fontFamily: 'SpaceMono',
    backgroundColor: COLORS.grayLight + '40',
    padding: SPACING.sm,
    borderRadius: RADIUS.sm,
    marginTop: SPACING.sm,
    alignSelf: 'stretch',
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    backgroundColor: COLORS.burgundy,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm + 2,
    borderRadius: RADIUS.full,
    marginTop: SPACING.md,
  },
  retryText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '600',
  },
});
