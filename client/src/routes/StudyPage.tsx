import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { ConceptDrawer } from '../components/ConceptDrawer';
import { ConceptMap } from '../components/ConceptMap';
import { Flashcard } from '../components/Flashcard';
import { Icon } from '../components/icons';
import { PGBadge, PGButton, PGCard, PGIconBtn, PGNav, PGSkel } from '../components/primitives';
import { Sage } from '../components/Sage';
import { SageChat } from '../components/SageChat';
import { adaptDocument } from '../lib/docAdapter';
import { useDocument, type ChatContext } from '../lib/queries';
import { SAMPLE_DOC, type Concept, type SampleDoc } from '../lib/sampleDoc';

type Tab = 'summary' | 'map' | 'cards';
const CONCEPT_CHIP_TONES = ['green', 'blue', 'yellow', 'pink', 'orange'] as const;

export default function StudyPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('summary');
  const [drawer, setDrawer] = useState<Concept | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);

  const isSample = !id || id === 'sample';
  const docQuery = useDocument(isSample ? undefined : id);
  const doc: SampleDoc | null = isSample
    ? SAMPLE_DOC
    : docQuery.data
      ? adaptDocument(docQuery.data)
      : null;

  const goBack = () => navigate('/app');
  const startQuiz = () => navigate(`/quiz/${id ?? 'sample'}`);

  if (!doc) {
    return (
      <div className="pg-shell">
        <PGNav left={<PGIconBtn icon={<Icon.ArrowLeft s={18} />} onClick={goBack} />} title="Study guide" />
        <div style={{ padding: '14px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {docQuery.error ? (
            <div className="t-body-sm" style={{ color: 'var(--red)' }}>Couldn&apos;t load this document.</div>
          ) : (
            <>
              <PGSkel w="60%" h={20} />
              <PGSkel w="100%" h={120} r={16} />
              <PGSkel w="100%" h={80} r={16} />
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="pg-shell">
      <PGNav
        left={<PGIconBtn icon={<Icon.ArrowLeft s={18} />} onClick={goBack} />}
        title="Study guide"
        right={
          <button
            type="button"
            aria-label="Chat with Sage about this guide"
            onClick={() => setChatOpen(true)}
            style={{
              width: 42,
              height: 42,
              borderRadius: 14,
              background: 'var(--surface)',
              border: '2px solid var(--hairline-strong)',
              boxShadow: '0 3px 0 var(--hairline-strong)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              padding: 0,
            }}
          >
            <Sage pose="happy" size={28} animated={false} />
          </button>
        }
      />

      <div style={{ padding: '16px 20px 10px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <div className="t-eyebrow" style={{ marginBottom: 6 }}>{doc.source}</div>
          <h1 className="t-h1" style={{ margin: 0, fontSize: 24, lineHeight: 1.15 }}>{doc.title}</h1>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <PGBadge tone="green">{doc.concepts.length} concepts</PGBadge>
          <PGBadge tone="blue">{doc.flashcards.length} cards</PGBadge>
          <PGBadge tone="yellow">{doc.quiz.length} quiz questions</PGBadge>
        </div>
        <PGCard
          thick
          style={{
            padding: 18,
            background: 'linear-gradient(180deg, #FFFDF8 0%, #F7FFF0 100%)',
          }}
        >
          <div className="study-prose">
            {doc.summary.map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
          </div>
        </PGCard>
      </div>

      <div style={{ padding: '0 16px 12px' }}>
        <div style={{ display: 'flex', gap: 6, padding: 4, background: 'var(--surface-2)', borderRadius: 14, border: '2px solid var(--hairline)' }}>
          {(['summary', 'map', 'cards'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                flex: 1,
                padding: '10px 6px',
                background: tab === t ? 'var(--surface)' : 'transparent',
                border: tab === t ? '2px solid var(--hairline-strong)' : '2px solid transparent',
                borderBottomWidth: tab === t ? 3 : 2,
                borderRadius: 10,
                color: tab === t ? 'var(--ink)' : 'var(--ink-3)',
                fontSize: 13,
                fontWeight: 800,
                cursor: 'pointer',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="no-scrollbar" style={{ flex: 1, overflowY: tab === 'map' ? 'hidden' : 'auto' }}>
        {tab === 'summary' && (
          <div style={{ padding: '4px 20px 110px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <PGCard thick style={{ padding: 16 }}>
              <div className="t-h3" style={{ marginBottom: 8 }}>How to use this guide</div>
              <p className="t-body-sm" style={{ color: 'var(--ink-2)', margin: 0 }}>
                Read the recap, open a concept to review its definition, then switch to cards when you want faster repetition.
              </p>
            </PGCard>
            <div className="t-h3" style={{ marginBottom: 0 }}>Key concepts</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {doc.concepts.map((concept, index) => {
                const tone = CONCEPT_CHIP_TONES[index % CONCEPT_CHIP_TONES.length];
                return (
                  <button
                    key={concept.id}
                    onClick={() => setDrawer(concept)}
                    style={{
                      padding: '8px 14px',
                      background: `var(--${tone}-soft)`,
                      color: 'var(--ink)',
                      border: `2px solid var(--${tone === 'yellow' ? 'yellow-dark' : tone})`,
                      borderRadius: 999,
                      cursor: 'pointer',
                      fontSize: 13,
                      fontWeight: 800,
                    }}
                  >
                    {concept.term}
                  </button>
                );
              })}
            </div>
          </div>
        )}
        {tab === 'map' && !fullscreen && <ConceptMap doc={doc} activeConceptId={drawer?.id ?? null} onSelect={setDrawer} />}
        {tab === 'cards' && !fullscreen && <FlashcardsView doc={doc} />}
      </div>

      {(tab === 'map' || tab === 'cards') && !fullscreen && (
        <button
          type="button"
          aria-label="Expand to full screen"
          onClick={() => setFullscreen(true)}
          style={{
            position: 'absolute',
            right: 24,
            bottom: 96,
            zIndex: 12,
            width: 44,
            height: 44,
            borderRadius: '50%',
            background: 'var(--surface)',
            color: 'var(--ink)',
            border: '2px solid var(--hairline-strong)',
            boxShadow: '0 4px 0 var(--hairline-strong)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <Icon.Expand s={18} />
        </button>
      )}

      {fullscreen && (tab === 'map' || tab === 'cards') && (
        <FullscreenSection
          title={tab === 'map' ? 'Mind map' : 'Flashcards'}
          subtitle={doc.title}
          onClose={() => setFullscreen(false)}
        >
          {tab === 'map' ? (
            <ConceptMap doc={doc} activeConceptId={drawer?.id ?? null} onSelect={setDrawer} />
          ) : (
            <FlashcardsView doc={doc} />
          )}
        </FullscreenSection>
      )}

      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          padding: '12px 20px 24px',
          background: 'linear-gradient(to top, var(--bg) 80%, transparent)',
          pointerEvents: 'none',
        }}
      >
        <div style={{ pointerEvents: 'auto' }}>
          <PGButton variant="primary" size="lg" fullWidth icon={<Icon.Lightning s={18} />} onClick={startQuiz}>
            Start quiz · {doc.quiz.length} questions
          </PGButton>
        </div>
      </div>

      <ConceptDrawer concept={drawer} concepts={doc.concepts} onClose={() => setDrawer(null)} onSelect={setDrawer} />

      <SageChat
        open={chatOpen}
        onClose={() => setChatOpen(false)}
        context={buildChatContext(doc)}
      />
    </div>
  );
}

function buildChatContext(doc: SampleDoc): ChatContext {
  return {
    title: doc.title,
    source: doc.source,
    summary: doc.summary.join(' ').slice(0, 3500),
    concepts: doc.concepts
      .slice(0, 24)
      .map((c) => `${c.term}: ${c.def}`)
      .join(' | ')
      .slice(0, 1800),
  };
}

function FlashcardsView({ doc }: { doc: SampleDoc }) {
  const cards = doc.flashcards;
  const total = cards.length;
  const [i, setI] = useState(0);

  const next = () => {
    setI((v) => Math.min(v + 1, total - 1));
  };
  const prev = () => {
    setI((v) => Math.max(v - 1, 0));
  };

  if (total === 0) {
    return (
      <div style={{ padding: '12px 20px 110px' }}>
        <PGCard thick style={{ padding: 18 }}>
          <div className="t-h3" style={{ marginBottom: 8 }}>No flashcards yet</div>
          <p className="t-body-sm" style={{ color: 'var(--ink-2)', margin: 0 }}>
            This study guide did not generate any flashcards for the document.
          </p>
        </PGCard>
      </div>
    );
  }

  return (
    <div style={{ padding: '12px 0 110px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <PGBadge tone="blue">Card {i + 1} of {total}</PGBadge>
      </div>
      <p className="t-body-sm" style={{ color: 'var(--ink-3)', margin: '0 24px 16px', textAlign: 'center' }}>
        Flip for the answer, then swipe or use the arrows to move through the deck.
      </p>
      <div style={{ position: 'relative', width: 320, maxWidth: 'calc(100vw - 40px)', height: 250 }}>
        {i > 0 && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              transform: 'translateX(-30px) scale(0.92) rotate(-4deg)',
              opacity: 0.5,
              background: 'var(--surface)',
              border: '2px solid var(--hairline-strong)',
              borderRadius: 22,
              boxShadow: '0 4px 0 var(--hairline)',
            }}
          />
        )}
        {i < total - 1 && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              transform: 'translateX(30px) scale(0.92) rotate(4deg)',
              opacity: 0.5,
              background: 'var(--surface)',
              border: '2px solid var(--hairline-strong)',
              borderRadius: 22,
              boxShadow: '0 4px 0 var(--hairline)',
            }}
          />
        )}
        <Flashcard
          front={cards[i].front}
          back={cards[i].back}
          index={i}
          total={total}
          onNext={next}
          onPrev={prev}
        />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 22 }}>
        <button
          onClick={prev}
          disabled={i === 0}
          style={{
            width: 50,
            height: 50,
            borderRadius: 14,
            background: 'var(--surface)',
            border: '2px solid var(--hairline-strong)',
            boxShadow: i === 0 ? '0 2px 0 var(--hairline)' : '0 4px 0 var(--hairline-strong)',
            color: i === 0 ? 'var(--ink-4)' : 'var(--ink)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: i === 0 ? 'not-allowed' : 'pointer',
          }}
        >
          <Icon.ArrowLeft s={20} />
        </button>
        <div style={{ display: 'flex', gap: 5, alignItems: 'center', height: 8 }}>
          {cards.map((_, k) => (
            <div
              key={k}
              style={{
                width: k === i ? 22 : 8,
                height: 8,
                borderRadius: 4,
                background: k === i ? 'var(--green)' : 'var(--hairline-strong)',
                transition: 'all 220ms',
              }}
            />
          ))}
        </div>
        <button
          onClick={next}
          disabled={i === total - 1}
          style={{
            width: 50,
            height: 50,
            borderRadius: 14,
            background: i === total - 1 ? 'var(--surface)' : 'var(--green)',
            color: i === total - 1 ? 'var(--ink-4)' : 'white',
            border: '2px solid ' + (i === total - 1 ? 'var(--hairline-strong)' : 'var(--green-dark)'),
            boxShadow: i === total - 1 ? '0 2px 0 var(--hairline)' : '0 4px 0 var(--green-dark)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: i === total - 1 ? 'not-allowed' : 'pointer',
          }}
        >
          <Icon.ArrowRight s={20} />
        </button>
      </div>
    </div>
  );
}

function FullscreenSection({
  title,
  subtitle,
  onClose,
  children,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 80,
        background: 'var(--bg)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div
        style={{
          padding: '12px 16px',
          minHeight: 56,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          background: 'var(--surface)',
          borderBottom: '2px solid var(--hairline)',
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="t-eyebrow" style={{ marginBottom: 2 }}>{title}</div>
          {subtitle && (
            <div
              className="t-body-sm"
              style={{
                color: 'var(--ink-2)',
                fontWeight: 800,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {subtitle}
            </div>
          )}
        </div>
        <button
          type="button"
          aria-label="Exit full screen"
          onClick={onClose}
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            background: 'var(--surface-2)',
            color: 'var(--ink)',
            border: '2px solid var(--hairline-strong)',
            boxShadow: '0 3px 0 var(--hairline-strong)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <Icon.Collapse s={18} />
        </button>
      </div>
      <div className="no-scrollbar" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        {children}
      </div>
    </div>
  );
}
