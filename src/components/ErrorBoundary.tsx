import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
    this.setState({
      error,
      errorInfo
    });
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-zen-bg flex items-center justify-center p-4">
          <div className="bg-white p-6 rounded-2xl shadow-sm max-w-md w-full border border-red-100">
            <h2 className="text-xl font-bold text-red-600 mb-4">应用遇到了一些问题 (App Error)</h2>
            <p className="text-sm text-gray-600 mb-4">
              很抱歉，应用在加载时遇到了错误。请截图此页面并反馈给我们，以便修复。
            </p>
            <div className="bg-gray-50 p-4 rounded-lg overflow-auto max-h-64 mb-4">
              <p className="font-mono text-xs text-red-500 font-bold mb-2">
                {this.state.error && this.state.error.toString()}
              </p>
              <pre className="font-mono text-[10px] text-gray-500 whitespace-pre-wrap">
                {this.state.errorInfo?.componentStack}
              </pre>
            </div>
            <button
              onClick={() => {
                localStorage.clear();
                window.location.reload();
              }}
              className="w-full bg-red-50 text-red-600 py-3 rounded-xl font-bold hover:bg-red-100 transition-colors"
            >
              清除缓存并重试 (Clear Cache & Retry)
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
