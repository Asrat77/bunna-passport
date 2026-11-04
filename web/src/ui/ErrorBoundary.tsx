import { Component, type ReactNode } from "react";
import { reportError } from "@/lib/errorReporting";

type Props = { fallback: ReactNode; children: ReactNode };

/** A render crash shows the fallback instead of a blank Mini App, and is reported. */
export class ErrorBoundary extends Component<Props, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    reportError(error);
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
