import { Component } from 'react';

export default class ErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('UI error:', error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="max-w-md rounded-xl bg-white p-8 text-center shadow-sm">
          <h1 className="text-xl font-bold">Something went wrong</h1>
          <p className="mt-2 text-slate-600">
            An unexpected error happened. Reloading the page usually fixes it.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-6 rounded-lg bg-accent px-5 py-2.5 font-semibold text-primary transition hover:bg-accent-dark"
          >
            Reload page
          </button>
        </div>
      </div>
    );
  }
}