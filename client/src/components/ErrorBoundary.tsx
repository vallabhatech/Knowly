import { Component, type ErrorInfo, type ReactNode } from 'react';

import { PGButton, PGCard } from './primitives';
import { Sage } from './Sage';

type Props = { children: ReactNode };
type State = { error: Error | null };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // eslint-disable-next-line no-console
    console.error('Route error boundary caught:', error, info);
  }

  handleStartOver = (): void => {
    this.setState({ error: null });
    if (typeof window !== 'undefined') {
      window.location.assign('/app');
    }
  };

  render(): ReactNode {
    if (!this.state.error) return this.props.children;

    return (
      <div className="pg-shell" style={{ padding: '40px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18 }}>
        <Sage pose="read" size={120} />
        <PGCard thick padding={20} style={{ width: '100%', textAlign: 'center' }}>
          <div className="t-h2" style={{ marginBottom: 8 }}>
            Something went sideways
          </div>
          <p className="t-body-sm" style={{ color: 'var(--ink-2)', margin: '0 0 16px' }}>
            We hit an unexpected snag. Let&apos;s start fresh from the home screen.
          </p>
          <PGButton variant="primary" size="md" onClick={this.handleStartOver} fullWidth>
            Start Over
          </PGButton>
        </PGCard>
      </div>
    );
  }
}
