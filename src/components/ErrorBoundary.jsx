import { Component } from 'react';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });
  }

  resetError = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            padding: '20px',
            margin: '20px',
            borderRadius: '8px',
            background: '#ffe9e9',
            border: '1px solid #e74c3c',
            color: '#c0392b',
          }}
        >
          <h3 style={{ margin: '0 0 10px' }}>⚠️ Something went wrong</h3>
          <p style={{ margin: '0 0 10px', fontSize: '14px' }}>
            {this.state.error?.message || 'An unexpected error occurred'}
          </p>
          <button
            onClick={this.resetError}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: 'none',
              background: '#e74c3c',
              color: '#fff',
              fontWeight: '700',
              cursor: 'pointer',
            }}
          >
            Try Again
          </button>
          {process.env.NODE_ENV === 'development' && (
            <details style={{ marginTop: '10px', fontSize: '12px' }}>
              <summary>Error Details (Dev Only)</summary>
              <pre
                style={{
                  background: '#f5f5f5',
                  padding: '10px',
                  borderRadius: '4px',
                  overflow: 'auto',
                }}
              >
                {this.state.error?.toString()}
                {'\n\n'}
                {this.state.errorInfo?.componentStack}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
