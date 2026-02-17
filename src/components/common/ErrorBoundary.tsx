import React, { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { WithTranslation, withTranslation } from 'react-i18next';

import { logger } from '../../utils/logger';
import { Button } from '../ui';
import { Card, CardContent } from '../ui';

interface ErrorBoundaryProps extends WithTranslation {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
  moduleName?: string; // Optional: name of the module for better error messages
  language?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

/**
 * React Error Boundary Component
 * Prevents entire app from crashing when a component throws an error
 */
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Sync language with i18next if provided
    if (this.props.language && this.props.i18n.language !== this.props.language) {
      this.props.i18n.changeLanguage(this.props.language);
    }

    // Log error using structured logger
    logger.error('[ErrorBoundary] Caught error:', {
      error,
      componentStack: errorInfo.componentStack,
    });

    this.setState({ errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    this.props.onReset?.();
  };

  handleReload = () => {
    globalThis.location.reload();
  };

  handleGoHome = () => {
    globalThis.location.href = '/dashboard';
  };

  render() {
    // HOC injects t function
    const { t } = this.props;

    if (this.state.hasError) {
      // Custom fallback provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const moduleName = this.props.moduleName || t('common.page', 'Page');

      // Default fallback UI
      return (
        <div className="min-h-[400px] flex items-center justify-center p-8">
          <Card className="max-w-md w-full text-center">
            <CardContent className="p-8">
              {/* Error Icon */}
              <div className="w-20 h-20 mx-auto mb-6 bg-red-100 rounded-2xl border-2 border-red-200 flex items-center justify-center">
                <AlertTriangle className="w-10 h-10 text-red-500" />
              </div>

              {/* Title */}
              <h2 className="text-2xl font-black text-muted-foreground mb-2">{t('errors.oops')}</h2>

              {/* Description */}
              <p className="text-muted-foreground font-medium mb-6">
                {t('errors.loadError', { module: moduleName })}
              </p>

              {/* Error Details - Only in development */}
              {import.meta.env.DEV && this.state.error && (
                <div className="mb-6 p-4 bg-muted rounded-xl text-left overflow-auto max-h-40">
                  <p className="text-xs font-mono text-red-600 break-all">
                    {this.state.error.toString()}
                  </p>
                  {this.state.errorInfo?.componentStack && (
                    <pre className="text-xs text-muted-foreground mt-2 whitespace-pre-wrap">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button
                  type="button"
                  size="auto"
                  onClick={this.handleReset}
                  className="flex items-center justify-center gap-2 px-6 py-3 bg-lime-300 border-2 border-foreground rounded-xl font-bold text-sm hover:bg-lime-400 shadow-[4px_4px_0px_0px_#18181B] active:shadow-none active:translate-x-1 active:translate-y-1 transition-all"
                >
                  <RefreshCw className="w-4 h-4" />
                  {t('errors.retry')}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="auto"
                  onClick={this.handleGoHome}
                  className="flex items-center justify-center gap-2 px-6 py-3 bg-card border-2 border-border rounded-xl font-bold text-sm text-muted-foreground hover:border-foreground transition-all"
                >
                  <Home className="w-4 h-4" />
                  {t('errors.backToHome')}
                </Button>
              </div>

              {/* Reload hint */}
              <p className="mt-6 text-xs text-muted-foreground">
                {t('errors.reloadPrompt')}{' '}
                <Button
                  type="button"
                  variant="ghost"
                  size="auto"
                  onClick={this.handleReload}
                  className="text-indigo-500 hover:underline p-0 h-auto font-bold"
                >
                  {t('errors.refreshPage')}
                </Button>
              </p>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default withTranslation()(ErrorBoundary);
