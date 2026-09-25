import { useNavigate } from 'react-router-dom';

import { GoogleIcon } from '../components/AuthNav';
import { Sage } from '../components/Sage';
import { Icon } from '../components/icons';
import { PGButton } from '../components/primitives';

export default function LoginPage() {
  const navigate = useNavigate();

  return (
    <div className="pg-shell login-shell">
      <div
        className="polka-yellow"
        style={{
          position: 'relative',
          height: 280,
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center',
          borderBottom: '4px solid var(--yellow)',
          overflow: 'hidden',
        }}
      >
        <button
          onClick={() => navigate(-1)}
          aria-label="Back"
          style={{
            position: 'absolute',
            top: 18,
            left: 18,
            width: 38,
            height: 38,
            borderRadius: 12,
            background: 'var(--surface)',
            border: '2px solid var(--hairline-strong)',
            boxShadow: '0 3px 0 var(--hairline)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            zIndex: 2,
          }}
        >
          <Icon.ArrowLeft s={18} />
        </button>
        <AccentStar />
        <AccentBolt />
        <div style={{ position: 'absolute', top: 130, left: 24, width: 18, height: 18, borderRadius: 4, background: 'var(--purple)', border: '2px solid var(--ink)', transform: 'rotate(20deg)' }} />
        <div style={{ position: 'absolute', top: 160, right: 40, width: 14, height: 14, borderRadius: '50%', background: 'var(--green)', border: '2px solid var(--ink)' }} />
        <div style={{ paddingBottom: 14 }}>
          <Sage pose="wave" size={180} />
        </div>
      </div>

      <div style={{ position: 'relative', marginTop: -22, marginLeft: 'auto', marginRight: 'auto', background: 'white', border: '2px solid var(--ink)', borderRadius: 18, padding: '10px 16px', boxShadow: '0 4px 0 var(--ink)', zIndex: 2 }}>
        <div style={{ position: 'absolute', top: -8, left: '50%', transform: 'translateX(-50%) rotate(45deg)', width: 14, height: 14, background: 'white', border: '2px solid var(--ink)', borderRight: 0, borderBottom: 0 }} />
        <div style={{ fontWeight: 800, fontSize: 13, color: 'var(--ink)' }}>Welcome back, friend!</div>
      </div>

      <div className="no-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: '22px 22px 28px' }}>
        <div style={{ textAlign: 'center', marginBottom: 22 }}>
          <h1 className="t-display" style={{ margin: '0 0 6px', fontSize: 28 }}>Sign in to PocketGuru</h1>
          <div className="t-body-sm" style={{ color: 'var(--ink-3)' }}>
            Keep every guide synced to your Google account.
          </div>
        </div>

        <button
          className="pg-btn"
          onClick={() => window.location.assign('/api/auth/login/google?next=/app')}
          style={{
            width: '100%',
            height: 54,
            borderRadius: 14,
            background: '#fff',
            color: 'var(--ink)',
            border: '2px solid var(--hairline-strong)',
            boxShadow: '0 4px 0 var(--hairline-strong)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
            fontSize: 14,
            textTransform: 'none',
            letterSpacing: 0,
          }}
        >
          <GoogleIcon />
          Continue with Google
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '22px 0' }}>
          <div style={{ flex: 1, height: 2, background: 'var(--hairline)' }} />
          <span className="t-mono" style={{ color: 'var(--ink-3)', fontSize: 11 }}>OR</span>
          <div style={{ flex: 1, height: 2, background: 'var(--hairline)' }} />
        </div>

        <PGButton variant="secondary" size="lg" fullWidth icon={<Icon.Camera s={18} />} onClick={() => navigate('/app')}>
          Continue as guest
        </PGButton>

        <div style={{ marginTop: 18, textAlign: 'center' }}>
          <button
            onClick={() => navigate('/')}
            style={{ background: 'transparent', border: 0, color: 'var(--green-dark)', fontWeight: 900, cursor: 'pointer', fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.04em' }}
          >
            See how PocketGuru works
          </button>
        </div>
      </div>
    </div>
  );
}

function AccentStar() {
  return (
    <div style={{ position: 'absolute', top: 28, left: 78, transform: 'rotate(-12deg)', color: 'var(--pink)' }}>
      <Icon.Star s={34} />
    </div>
  );
}

function AccentBolt() {
  return (
    <div style={{ position: 'absolute', top: 50, right: 36, transform: 'rotate(18deg)' }}>
      <Icon.Lightning s={28} />
    </div>
  );
}
