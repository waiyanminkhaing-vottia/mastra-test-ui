'use client';

import { AlertTriangle, RefreshCw } from 'lucide-react';
import React, { Component, ErrorInfo, ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import { logger } from '@/lib/logger';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Error boundary component that catches JavaScript errors in the component tree
 * and displays a fallback UI instead of crashing the entire application
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  /**
   * Updates state to display error UI when an error is caught
   */
  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  /**
   * Handles error logging and reporting when component catches an error
   */
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log the error for debugging
    logger.error(
      {
        error: {
          message: error.message,
          stack: error.stack,
          name: error.name,
        },
        errorInfo,
        componentStack: errorInfo.componentStack,
      },
      'React Error Boundary caught an error'
    );

    // Update state with error info
    this.setState({
      error,
      errorInfo,
    });

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);

    // Report to external error tracking service in production
    if (process.env.NODE_ENV === 'production') {
      // Add your error reporting service here
      // e.g., Sentry, Rollbar, etc.
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  /**
   * Renders error UI or children based on error state
   */
  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center">
          <div className="flex items-center justify-center w-16 h-16 mb-4 rounded-full bg-destructive/10">
            <AlertTriangle className="w-8 h-8 text-destructive" />
          </div>

          <h2 className="mb-2 text-xl font-semibold text-foreground">
            Something went wrong
          </h2>

          <p className="mb-6 text-sm text-muted-foreground max-w-md">
            An unexpected error occurred. Please try refreshing the page or
            contact support if the problem persists.
          </p>

          <div className="flex gap-3">
            <Button
              onClick={this.handleRetry}
              variant="outline"
              className="flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Try Again
            </Button>

            <Button
              onClick={() => window.location.reload()}
              className="flex items-center gap-2"
            >
              Refresh Page
            </Button>
          </div>

          {process.env.NODE_ENV === 'development' && this.state.error && (
            <details className="mt-8 max-w-2xl">
              <summary className="cursor-pointer text-sm font-medium mb-2">
                Error Details (Development Only)
              </summary>
              <div className="text-left bg-muted p-4 rounded-md text-sm font-mono">
                <div className="mb-2">
                  <strong>Error:</strong> {this.state.error.message}
                </div>
                {this.state.error.stack && (
                  <div className="mb-2">
                    <strong>Stack:</strong>
                    <pre className="whitespace-pre-wrap text-xs mt-1">
                      {this.state.error.stack}
                    </pre>
                  </div>
                )}
                {this.state.errorInfo?.componentStack && (
                  <div>
                    <strong>Component Stack:</strong>
                    <pre className="whitespace-pre-wrap text-xs mt-1">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  </div>
                )}
              </div>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
