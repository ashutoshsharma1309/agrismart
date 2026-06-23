import { Component, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  children?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

/**
 * Friendly, retryable error fallback. Works both as a React Router
 * `errorElement` (React Router catches the error and renders this element) and
 * as a wrapping render error boundary around `children`.
 *
 * Uses plain English so it never depends on i18n being initialized.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    // eslint-disable-next-line no-console
    console.error('Render error caught by ErrorBoundary:', error);
  }

  private handleRetry = () => {
    // A full reload is the most reliable way to recover from a chunk-load or
    // render failure, and resets any corrupted in-memory state.
    if (typeof window !== 'undefined') {
      window.location.reload();
    } else {
      this.setState({ hasError: false });
    }
  };

  render() {
    // When used as a router `errorElement`, React Router renders this component
    // directly on a route error, so we always render the fallback in that case.
    // When wrapping children, only render the fallback after catching an error.
    const showFallback = this.props.children === undefined || this.state.hasError;

    if (!showFallback) {
      return this.props.children;
    }

    return (
      <div className="flex min-h-[70vh] items-center justify-center px-6 py-16">
        <div className="text-center">
          <div className="mx-auto mb-6 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
            <svg
              width={28}
              height={28}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-ink sm:text-4xl">Something went wrong</h1>
          <p className="mx-auto mt-2 max-w-md text-sm text-ink-muted">
            An unexpected error occurred. Please try again — your data is safe.
          </p>
          <div className="mt-6 flex justify-center">
            <button
              type="button"
              onClick={this.handleRetry}
              className="inline-flex h-11 items-center justify-center rounded-xl bg-brand px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-600 hover:shadow-md active:bg-brand-700 focus:ring-2 focus:ring-brand/20 focus:outline-none"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }
}
