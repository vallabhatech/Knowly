import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { AuthNudge } from '../components/AuthNudge';
import { Sage } from '../components/Sage';
import { Icon } from '../components/icons';
import { PGButton, PGIconBtn, PGNav, PGSkel } from '../components/primitives';
import { adaptDocument } from '../lib/docAdapter';
import { useAttempt, useDocument, useDocumentList, useMe } from '../lib/queries';
import { SAMPLE_DOC } from '../lib/sampleDoc';
import { useQuizStore } from '../store/quizStore';

type StatTone = 'green' | 'red' | 'blue';
type ReviewTone = 'green' | 'red';

export default function ResultsPage() {
  const { attemptId } = useParams();
  const navigate = useNavigate();
  const stored = useQuizStore((s) => s.answers);

  const isSample = !attemptId || attemptId === 'sample';
  const attemptQuery = useAttempt(isSample ? undefined : attemptId);
  const documentId = isSample ? undefined : attemptQuery.data?.document_id;
  const docQuery = useDocument(isSample ? undefined : documentId);
  const docsQuery = useDocumentList();
  const meQuery = useMe();
  const doc = isSample ? SAMPLE_DOC : docQuery.data ? adaptDocument(docQuery.data) : null;
  const [open, setOpen] = useState<number | null>(null);

  const loadError = attemptQuery.error || docQuery.error;

  if (!doc) {
    return (
      <div className="pg-shell">
        <PGNav title="Results" right={<PGIconBtn icon={<Icon.Library s={18} />} onClick={() => navigate('/app')} />} />
        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {loadError ? (
            <div className="t-body-sm" style={{ color: 'var(--red)' }}>Couldn&apos;t load these results.</div>
          ) : (
            <>
              <PGSkel w="100%" h={180} r={22} />
              <PGSkel w="100%" h={64} r={14} />
              <PGSkel w="100%" h={64} r={14} />
            </>
          )}
        </div>
      </div>
    );
  }

  const fallback = doc.quiz.map((q, i) => (i % 4 === 0 ? (q.correct + 1) % 4 : q.correct));
  const apiAnswers = attemptQuery.data?.answers;
  const answers =
    apiAnswers && apiAnswers.length === doc.quiz.length
      ? apiAnswers
      : stored.length === doc.quiz.length
        ? stored
        : fallback;

  const correct = answers.reduce<number>((acc, a, i) => acc + (a === doc.quiz[i].correct ? 1 : 0), 0);
  const total = doc.quiz.length;
  const pct = correct / total;
  const verdict = pct >= 0.9 ? 'Amazing!' : pct >= 0.7 ? 'Great job!' : pct >= 0.5 ? 'Good start!' : 'Keep going!';
  const sub = pct >= 0.7 ? 'You really know your stuff.' : pct >= 0.5 ? 'A few weak spots — review and try again.' : 'Brush up on the key concepts!';
  const sagePose = pct >= 0.7 ? 'cheer' : pct >= 0.5 ? 'happy' : 'think';

  const retryTarget = isSample ? 'sample' : (documentId ?? 'sample');
  const retry = () => navigate(`/quiz/${retryTarget}`);
  const library = () => navigate('/app');

  return (
    <div className="pg-shell">
      <PGNav title="Results" right={<PGIconBtn icon={<Icon.Library s={18} />} onClick={library} />} />

      <div className="no-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: '12px 20px 110px' }}>
        <div
          className="polka-yellow"
          style={{
            borderRadius: 22,
            border: '3px solid var(--yellow)',
            boxShadow: '0 4px 0 var(--yellow-dark)',
            padding: '18px 20px 22px',
            textAlign: 'center',
            marginBottom: 18,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 6 }}>
            <Sage pose={sagePose} size={120} />
          </div>
          <h1 className="t-display" style={{ margin: 0, fontSize: 28 }}>{verdict}</h1>
          <p className="t-body-sm" style={{ color: 'var(--ink-2)', margin: '4px 0 14px' }}>{sub}</p>
          <ScoreRing correct={correct} total={total} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 22 }}>
          <StatCell label="Correct" value={String(correct)} tone="green" icon={<Icon.Check s={14} />} />
          <StatCell label="Wrong" value={String(total - correct)} tone="red" icon={<Icon.X s={12} />} />
          <StatCell label="Time" value="3:42" tone="blue" mono icon={<Icon.Lightning s={14} />} />
        </div>

        <AuthNudge me={meQuery.data} show={(docsQuery.data?.items.length ?? 0) >= 1} />

        <div className="t-h3" style={{ marginBottom: 10 }}>Review your answers</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {doc.quiz.map((q, idx) => {
            const userA = answers[idx];
            const ok = userA === q.correct;
            const expanded = open === idx;
            return (
              <div
                key={idx}
                style={{
                  background: 'var(--surface)',
                  border: `2px solid ${ok ? 'var(--green)' : 'var(--red)'}`,
                  borderBottomWidth: 3,
                  borderRadius: 16,
                  overflow: 'hidden',
                }}
              >
                <button
                  onClick={() => setOpen((o) => (o === idx ? null : idx))}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    background: 'transparent',
                    border: 0,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <div
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: 10,
                      background: ok ? 'var(--green)' : 'var(--red)',
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {ok ? <Icon.Check s={16} /> : <Icon.X s={13} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                      <span className="t-mono" style={{ color: 'var(--ink-4)' }}>Q{idx + 1}</span>
                      <span
                        className="t-body-sm"
                        style={{
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          display: '-webkit-box',
                          WebkitBoxOrient: 'vertical',
                          WebkitLineClamp: expanded ? 'unset' : 2,
                        }}
                      >
                        {q.prompt}
                      </span>
                    </div>
                  </div>
                  <div
                    style={{
                      transition: 'transform 200ms',
                      transform: expanded ? 'rotate(180deg)' : 'none',
                      color: 'var(--ink-3)',
                    }}
                  >
                    <Icon.ChevronDown s={18} />
                  </div>
                </button>
                {expanded && (
                  <div
                    style={{
                      padding: '0 14px 14px 56px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 8,
                      animation: 'fadeIn 200ms',
                    }}
                  >
                    <ReviewRow label="Your answer" value={userA != null ? q.options[userA] : '—'} tone={ok ? 'green' : 'red'} />
                    {!ok && <ReviewRow label="Correct answer" value={q.options[q.correct]} tone="green" />}
                    <p className="t-body-sm" style={{ color: 'var(--ink-2)', margin: '4px 0 0' }}>{q.explanation}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          padding: '12px 20px 24px',
          background: 'var(--surface)',
          borderTop: '2px solid var(--hairline)',
          display: 'flex',
          gap: 8,
        }}
      >
        <PGButton variant="secondary" size="lg" icon={<Icon.Library s={18} />} onClick={library}>
          Library
        </PGButton>
        <div style={{ flex: 1 }}>
          <PGButton variant="primary" size="lg" fullWidth icon={<Icon.Refresh s={18} />} onClick={retry}>
            Try again
          </PGButton>
        </div>
      </div>
    </div>
  );
}

function ScoreRing({ correct, total, size = 140 }: { correct: number; total: number; size?: number }) {
  const stroke = 14;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = correct / total;
  const offset = c * (1 - pct);
  const ringColor = pct >= 0.7 ? 'var(--green)' : pct >= 0.5 ? 'var(--orange)' : 'var(--red)';
  return (
    <div style={{ position: 'relative', width: size, height: size, margin: '0 auto' }}>
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="white" stroke="var(--hairline-strong)" strokeWidth={3} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={ringColor}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div style={{ fontSize: 38, fontWeight: 900, lineHeight: 1, color: 'var(--ink)' }}>
          {correct}
          <span style={{ color: 'var(--ink-3)' }}>/{total}</span>
        </div>
        <div className="t-mono" style={{ color: 'var(--ink-2)', marginTop: 4, fontSize: 12 }}>{Math.round(pct * 100)}%</div>
      </div>
    </div>
  );
}

const STAT_TONE: Record<StatTone, { bg: string; fg: string; bd: string }> = {
  green: { bg: 'var(--green-soft)', fg: 'var(--green-dark)', bd: 'var(--green)' },
  red:   { bg: 'var(--red-soft)',   fg: 'var(--red)',        bd: 'var(--red)' },
  blue:  { bg: 'var(--blue-soft)',  fg: 'var(--blue-dark)',  bd: 'var(--blue)' },
};

function StatCell({ label, value, tone, mono, icon }: { label: string; value: string; tone: StatTone; mono?: boolean; icon: React.ReactNode }) {
  const t = STAT_TONE[tone];
  return (
    <div
      style={{
        padding: '10px 12px',
        background: t.bg,
        border: `2px solid ${t.bd}`,
        borderBottomWidth: 3,
        borderRadius: 14,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: t.fg, marginBottom: 4 }}>
        {icon}
        <span className="t-eyebrow" style={{ fontSize: 10, color: t.fg }}>{label}</span>
      </div>
      <div style={{ fontSize: 22, fontWeight: 900, color: t.fg, fontFamily: mono ? 'var(--font-mono)' : 'inherit' }}>{value}</div>
    </div>
  );
}

const REVIEW_TONE: Record<ReviewTone, { bg: string; bd: string }> = {
  green: { bg: 'var(--green-soft)', bd: 'var(--green)' },
  red:   { bg: 'var(--red-soft)',   bd: 'var(--red)' },
};

function ReviewRow({ label, value, tone }: { label: string; value: string; tone: ReviewTone }) {
  const t = REVIEW_TONE[tone];
  return (
    <div style={{ padding: '8px 10px', background: t.bg, border: `2px solid ${t.bd}`, borderRadius: 10 }}>
      <div className="t-eyebrow" style={{ fontSize: 10, marginBottom: 2 }}>{label}</div>
      <div className="t-body-sm" style={{ color: 'var(--ink)' }}>{value}</div>
    </div>
  );
}
