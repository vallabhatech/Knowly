import { useEffect, useState } from 'react';

import { Icon } from './icons';
import { PGButton } from './primitives';
import type { MeResponse } from '../lib/queries';

const DISMISS_KEY = 'pocketguru-auth-nudge-dismissed-until';
const DISMISS_MS = 7 * 24 * 60 * 60 * 1000;

export function AuthNudge({ me, show }: { me: MeResponse | undefined; show: boolean }) {
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const until = Number(window.localStorage.getItem(DISMISS_KEY) ?? 0);
    setDismissed(Number.isFinite(until) && until > Date.now());
  }, []);

  if (!show || !me?.anonymous || dismissed) return null;

  const dismiss = () => {
    window.localStorage.setItem(DISMISS_KEY, String(Date.now() + DISMISS_MS));
    setDismissed(true);
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 12px',
        background: 'var(--green-soft)',
        border: '2px solid var(--green)',
        borderBottomWidth: 4,
        borderRadius: 16,
        marginBottom: 12,
      }}
    >
      <div style={{ color: 'var(--green-dark)', flexShrink: 0 }}>
        <Icon.Library s={18} />
      </div>
      <div className="t-body-sm" style={{ color: 'var(--ink)', flex: 1, fontWeight: 800 }}>
        Save these guides
      </div>
      <PGButton
        variant="primary"
        size="sm"
        onClick={() => window.location.assign('/api/auth/login/google?next=/app')}
        style={{ height: 34, padding: '0 12px', fontSize: 12 }}
      >
        Sign in
      </PGButton>
      <button
        onClick={dismiss}
        aria-label="Dismiss"
        style={{
          width: 30,
          height: 30,
          borderRadius: 10,
          border: '2px solid var(--green)',
          background: 'rgba(255,255,255,0.7)',
          color: 'var(--green-dark)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          padding: 0,
        }}
      >
        <Icon.Close s={12} />
      </button>
    </div>
  );
}
