import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: any;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error; retry: () => void }>;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('🚨 ErrorBoundary caught an error:', error);
    console.error('🚨 Error info:', errorInfo);
    this.setState({ error, errorInfo });
  }

  retry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      const { fallback: Fallback } = this.props;
      
      if (Fallback && this.state.error) {
        return <Fallback error={this.state.error} retry={this.retry} />;
      }
      
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>🚨 Something went wrong</Text>
          <Text style={styles.errorMessage}>
            {this.state.error?.message || 'An unexpected error occurred'}
          </Text>
          <Text style={styles.errorStack}>
            {this.state.error?.stack?.substring(0, 200)}...
          </Text>
          <TouchableOpacity style={styles.retryButton} onPress={this.retry}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

// Custom error component for chat errors
export function ChatErrorFallback({ error, retry }: { error: Error; retry: () => void }) {
  return (
    <View style={styles.chatErrorContainer}>
      <Text style={styles.chatErrorTitle}>💬 Chat Error</Text>
      <Text style={styles.chatErrorMessage}>{error.message}</Text>
      {error.message.includes('structuredClone') && (
        <Text style={styles.chatErrorHint}>
          💡 This looks like a React Native compatibility issue
        </Text>
      )}
      <TouchableOpacity style={styles.retryButton} onPress={retry}>
        <Text style={styles.retryButtonText}>Retry Chat</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#dc2626',
    marginBottom: 16,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 16,
    color: '#374151',
    marginBottom: 12,
    textAlign: 'center',
  },
  errorStack: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 24,
    textAlign: 'center',
    fontFamily: 'monospace',
  },
  retryButton: {
    backgroundColor: '#dc2626',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  chatErrorContainer: {
    margin: 16,
    padding: 20,
    backgroundColor: '#fef2f2',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  chatErrorTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#dc2626',
    marginBottom: 8,
  },
  chatErrorMessage: {
    fontSize: 14,
    color: '#b91c1c',
    marginBottom: 8,
  },
  chatErrorHint: {
    fontSize: 12,
    color: '#7f1d1d',
    fontStyle: 'italic',
    marginBottom: 12,
  },
});