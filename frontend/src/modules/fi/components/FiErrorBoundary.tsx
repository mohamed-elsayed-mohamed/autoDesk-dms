import { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  pageName?: string;
}

interface State {
  hasError: boolean;
  message: string;
}

export class FiErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: unknown): State {
    const message = error instanceof Error ? error.message : 'An unexpected error occurred.';
    return { hasError: true, message };
  }

  handleRetry = () => {
    this.setState({ hasError: false, message: '' });
  };

  render() {
    if (this.state.hasError) {
      const label = this.props.pageName ?? 'this section';
      return (
        <div style={{ padding: 32, textAlign: 'center', maxWidth: 480, margin: '0 auto' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>⚠</div>
          <h3 style={{ margin: '0 0 8px', color: '#c62828' }}>Something went wrong</h3>
          <p style={{ color: '#616161', marginBottom: 20 }}>
            We were unable to load {label}. Please try again or contact support if the problem
            persists.
          </p>
          <button
            onClick={this.handleRetry}
            style={{
              padding: '10px 20px',
              borderRadius: 8,
              border: 'none',
              background: '#1976d2',
              color: 'white',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Retry
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
