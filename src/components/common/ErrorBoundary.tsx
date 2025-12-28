import React, { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface ErrorBoundaryProps {
    children: ReactNode;
    fallback?: ReactNode;
    onReset?: () => void;
    moduleName?: string; // Optional: name of the module for better error messages
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
            errorInfo: null
        };
    }

    static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        // Log error to console (could be sent to error reporting service)
        console.error('[ErrorBoundary] Caught error:', error);
        console.error('[ErrorBoundary] Component stack:', errorInfo.componentStack);

        this.setState({ errorInfo });
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null, errorInfo: null });
        this.props.onReset?.();
    };

    handleReload = () => {
        window.location.reload();
    };

    handleGoHome = () => {
        window.location.href = '/dashboard';
    };

    render() {
        if (this.state.hasError) {
            // Custom fallback provided
            if (this.props.fallback) {
                return this.props.fallback;
            }

            const isDev = (import.meta as any).env?.DEV || process.env.NODE_ENV === 'development';
            const moduleName = this.props.moduleName || '页面';

            // Default fallback UI
            return (
                <div className="min-h-[400px] flex items-center justify-center p-8">
                    <div className="max-w-md w-full text-center">
                        {/* Error Icon */}
                        <div className="w-20 h-20 mx-auto mb-6 bg-red-100 rounded-2xl border-2 border-red-200 flex items-center justify-center">
                            <AlertTriangle className="w-10 h-10 text-red-500" />
                        </div>

                        {/* Title */}
                        <h2 className="text-2xl font-black text-zinc-800 mb-2">
                            哎呀，出错了！
                        </h2>

                        {/* Description */}
                        <p className="text-zinc-500 font-medium mb-6">
                            {moduleName}加载时遇到了问题。别担心，这不会影响其他功能。
                        </p>

                        {/* Dev Mode Error Details */}
                        {isDev && this.state.error && (
                            <div className="mb-6 p-4 bg-zinc-100 rounded-xl text-left overflow-auto max-h-40">
                                <p className="text-xs font-mono text-red-600 break-all">
                                    {this.state.error.toString()}
                                </p>
                            </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex flex-col sm:flex-row gap-3 justify-center">
                            <button
                                onClick={this.handleReset}
                                className="flex items-center justify-center gap-2 px-6 py-3 bg-lime-300 border-2 border-zinc-900 rounded-xl font-bold text-sm hover:bg-lime-400 shadow-[4px_4px_0px_0px_#18181B] active:shadow-none active:translate-x-1 active:translate-y-1 transition-all"
                            >
                                <RefreshCw className="w-4 h-4" />
                                重试
                            </button>
                            <button
                                onClick={this.handleGoHome}
                                className="flex items-center justify-center gap-2 px-6 py-3 bg-white border-2 border-zinc-300 rounded-xl font-bold text-sm text-zinc-600 hover:border-zinc-900 transition-all"
                            >
                                <Home className="w-4 h-4" />
                                返回首页
                            </button>
                        </div>

                        {/* Reload hint */}
                        <p className="mt-6 text-xs text-zinc-400">
                            如果问题持续存在，请尝试{' '}
                            <button
                                onClick={this.handleReload}
                                className="text-indigo-500 hover:underline"
                            >
                                刷新页面
                            </button>
                        </p>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
