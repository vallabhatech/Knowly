import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Icon } from './icons';
import { PGButton } from './primitives';
import { useLogout, useMe } from '../lib/queries';

export function AuthNav() {
  const me = useMe();
  const logout = useLogout();
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

  if (!me.data || me.data.anonymous) {
    return (
      <PGButton
        variant="secondary"
        size="sm"
        icon={<GoogleIcon />}
        onClick={() => window.location.assign('/api/auth/login/google?next=/app')}
        style={{ height: 34, padding: '0 10px', fontSize: 11, whiteSpace: 'nowrap' }}
      >
        Sign in
      </PGButton>
    );
  }

  const label = me.data.name || me.data.email;
  const initial = label.trim().charAt(0).toUpperCase() || 'P';

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Account"
        style={{
          width: 36,
          height: 36,
          borderRadius: '50%',
          border: '2px solid var(--green)',
          background: 'var(--green-soft)',
          color: 'var(--green-dark)',
          padding: 0,
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
        }}
      >
        {me.data.picture ? (
          <img src={me.data.picture} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <span style={{ fontSize: 14, fontWeight: 900 }}>{initial}</span>
        )}
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            top: 44,
            right: 0,
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
          <div className="t-eyebrow" style={{ marginBottom: 4 }}>Signed in</div>
          <div className="t-body-sm" style={{ color: 'var(--ink)', overflowWrap: 'anywhere', marginBottom: 10 }}>
            {me.data.email}
          </div>
          <PGButton
            variant="secondary"
            size="sm"
            fullWidth
            icon={<Icon.Close s={13} />}
            disabled={logout.isPending}
            onClick={() => {
              logout.mutate(undefined, {
                onSuccess: () => {
                  setOpen(false);
                  navigate('/');
                },
              });
            }}
          >
            Sign out
          </PGButton>
        </div>
      )}
    </div>
  );
}

export function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.4c-.2 1.2-.9 2.3-2 3v2.5h3.2c1.9-1.7 3-4.3 3-7.3z" />
      <path fill="#34A853" d="M12 22c2.7 0 5-.9 6.6-2.4l-3.2-2.5c-.9.6-2 .9-3.4.9-2.6 0-4.8-1.7-5.6-4.1H3.1v2.6C4.7 19.7 8.1 22 12 22z" />
      <path fill="#FBBC04" d="M6.4 13.9c-.4-1.2-.4-2.5 0-3.7V7.6H3.1c-1.4 2.7-1.4 5.9 0 8.6l3.3-2.3z" />
      <path fill="#EA4335" d="M12 5.9c1.5 0 2.8.5 3.8 1.5l2.8-2.8C16.9 3 14.7 2 12 2 8.1 2 4.7 4.3 3.1 7.6l3.3 2.6c.8-2.4 3-4.3 5.6-4.3z" />
    </svg>
  );
}
