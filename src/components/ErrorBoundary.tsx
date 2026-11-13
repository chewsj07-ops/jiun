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
        <div className="min-h-screen bg-paper flex items-center justify-center p-4">
          <div className="bg-surface p-6 rounded-2xl max-w-md w-full border border-line">
            <h2 className="text-xl font-bold text-red-600 mb-4">应用遇到了一些问题 (App Error)</h2>
            <p className="text-sm text-ink-2 mb-4">
              很抱歉，应用在加载时遇到了错误。请截图此页面并反馈给我们，以便修复。
            </p>
            <div className="bg-surface-2 p-4 rounded-lg overflow-auto max-h-64 mb-4 border border-line">
              <p className="font-mono text-xs text-red-500 font-bold mb-2">
                {this.state.error && this.state.error.toString()}
              </p>
              <pre className="font-mono text-[10px] text-ink-2 whitespace-pre-wrap">
                {this.state.errorInfo?.componentStack}
              </pre>
            </div>
            <div className="space-y-2">
              <button
                onClick={() => {
                  window.location.reload();
                }}
                className="w-full bg-accent text-on-accent hover:bg-accent-hover py-3 rounded-xl font-bold transition-colors"
              >
                刷新并重试 (Reload & Continue)
              </button>
              <button
                onClick={() => {
                  try {
                    // Safe cleanup: only remove temporary UI flags, keep identity and practice history
                    const tempKeys = ['meditation_progress', 'zen_draft', 'zen_workflow'];
                    tempKeys.forEach(k => localStorage.removeItem(k));
                  } catch (e) {
                    console.error("Failed to clear temporary cache", e);
                  }
                  window.location.reload();
                }}
                className="w-full bg-surface-2 text-ink py-2.5 rounded-xl text-sm font-medium hover:bg-accent-mist transition-colors border border-line"
              >
                修复临时缓存 (Repair Temporary Cache)
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
