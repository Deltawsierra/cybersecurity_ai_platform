import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
  resetKey?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  componentDidUpdate(prevProps: Props) {
    if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false, error: null });
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center animate-fade-in-up"
          data-testid="error-boundary-fallback"
        >
          <div className="relative mb-4">
            <div className="absolute inset-0 rounded-full blur-xl bg-destructive/20" />
            <AlertTriangle className="relative h-12 w-12 text-destructive" />
          </div>
          <h2 className="text-lg font-bold tracking-tight mb-1">Something went wrong</h2>
          <p className="text-sm text-muted-foreground max-w-md mb-4">
            This section hit an unexpected error, but the rest of the dashboard is still running.
            You can retry or navigate to another page.
          </p>
          {this.state.error?.message && (
            <p className="text-[11px] font-mono text-muted-foreground/80 bg-muted/40 rounded px-3 py-1.5 mb-4 max-w-md break-all">
              {this.state.error.message}
            </p>
          )}
          <Button onClick={this.handleReset} variant="outline" size="sm" className="gap-1.5" data-testid="button-error-retry">
            <RotateCcw className="h-3.5 w-3.5" />
            Retry
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
