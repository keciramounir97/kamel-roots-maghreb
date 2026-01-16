import { Component } from "react";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    if (typeof this.props.onError === "function") {
      this.props.onError(error, info);
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (typeof this.props.onReset === "function") {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      const { fallback } = this.props;
      if (typeof fallback === "function") {
        return fallback({ error: this.state.error, reset: this.handleReset });
      }
      if (fallback) {
        return fallback;
      }
      return (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <div className="font-semibold">Something went wrong.</div>
          <button
            type="button"
            onClick={this.handleReset}
            className="mt-2 inline-flex items-center rounded-md border border-red-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-red-700"
          >
            Retry
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
