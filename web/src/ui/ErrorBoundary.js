import { Component } from "react";
import { reportError } from "@/lib/errorReporting";
/** A render crash shows the fallback instead of a blank Mini App, and is reported. */
export class ErrorBoundary extends Component {
    state = { failed: false };
    static getDerivedStateFromError() {
        return { failed: true };
    }
    componentDidCatch(error) {
        reportError(error);
    }
    render() {
        return this.state.failed ? this.props.fallback : this.props.children;
    }
}
