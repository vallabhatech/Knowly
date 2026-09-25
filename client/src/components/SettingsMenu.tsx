import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { GoogleIcon } from './AuthNav';
import { Icon } from './icons';
import { PGButton, PGIconBtn } from './primitives';
import { useMe } from '../lib/queries';

export function SettingsMenu() {
  const me = useMe();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    };
    window.addEventListener('pointerdown', onPointerDown);
    return () => window.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  const authed = me.data && !me.data.anonymous ? me.data : null;

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <PGIconBtn
        icon={<Icon.Settings s={18} />}
        label="Settings"
        onClick={() => setOpen((v) => !v)}
      />

      {open && (
        <div
          style={{
            position: 'absolute',
            top: 44,
            left: 0,
            zIndex: 30,
            width: 240,
            background: 'var(--surface)',
            border: '2px solid var(--hairline-strong)',
            borderBottomWidth: 4,
            borderRadius: 16,
            padding: 12,
            boxShadow: '0 12px 24px rgba(60,60,60,0.16)',
          }}
        >
          {authed ? (
            <>
              <div className="t-eyebrow" style={{ marginBottom: 4 }}>Signed in</div>
              <div className="t-body-sm" style={{ color: 'var(--ink)', overflowWrap: 'anywhere', marginBottom: 10 }}>
                {authed.email}
              </div>
              <PGButton
                variant="secondary"
                size="sm"
                fullWidth
                icon={<Icon.Library s={14} />}
                onClick={() => {
                  setOpen(false);
                  navigate('/');
                }}
              >
                Homepage
              </PGButton>
            </>
          ) : (
            <>
              <div className="t-eyebrow" style={{ marginBottom: 4 }}>Account</div>
              <div className="t-body-sm" style={{ color: 'var(--ink-3)', marginBottom: 10 }}>
                Sign in to save your guides across devices.
              </div>
              <PGButton
                variant="primary"
                size="sm"
                fullWidth
                icon={<GoogleIcon />}
                onClick={() => window.location.assign('/api/auth/login/google?next=/app')}
              >
                Sign in with Google
              </PGButton>
            </>
          )}
        </div>
      )}
    </div>
  );
}
