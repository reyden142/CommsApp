import React, { Component } from "react";

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error: error };
  }

  componentDidCatch(error, errorInfo) {
    // Log the error to the console and optionally to an error reporting service
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    this.setState({
      errorInfo: errorInfo,
    });
  }

  render() {
    if (this.state.hasError) {
      // Render a custom fallback UI
      return (
        <div
          style={{
            textAlign: "center",
            padding: "20px",
            border: "1px solid #ccc",
            margin: "20px",
          }}
        >
          <h2>Something went wrong.</h2>
          <p>Please try again later.</p>
          {this.state.errorInfo && (
            <details style={{ whiteSpace: "pre-wrap", textAlign: "left" }}>
              <h3>Error Details:</h3>
              <p>
                Error Message: {this.state.error && this.state.error.message}
              </p>
              <p>Error Stack:</p>
              <pre>{this.state.errorInfo.componentStack}</pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
