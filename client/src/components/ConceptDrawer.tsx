import { PGBadge, PGDrawer } from './primitives';
import type { Concept } from '../lib/sampleDoc';

export function ConceptDrawer({
  concept,
  concepts,
  onClose,
  onSelect,
}: {
  concept: Concept | null;
  concepts: Concept[];
  onClose: () => void;
  onSelect: (concept: Concept) => void;
}) {
  const relatedConcepts = concept
    ? concept.related
        .map((relatedId) => concepts.find((item) => item.id === relatedId))
        .filter((item): item is Concept => Boolean(item))
    : [];

  return (
    <PGDrawer open={Boolean(concept)} onClose={onClose} title={concept?.term}>
      {concept && (
        <>
          <PGBadge tone="green" style={{ marginBottom: 14 }}>
            Concept
          </PGBadge>
          <p className="t-body" style={{ color: 'var(--ink-2)', marginTop: 0, marginBottom: 0 }}>
            {concept.def}
          </p>
          <div style={{ marginTop: 18 }}>
            <div className="t-h3" style={{ marginBottom: 10 }}>
              Related terms
            </div>
            {relatedConcepts.length > 0 ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {relatedConcepts.map((relatedConcept, index) => {
                  const tone = index % 2 === 0 ? 'blue' : 'yellow';
                  return (
                    <button
                      key={relatedConcept.id}
                      onClick={() => onSelect(relatedConcept)}
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
                      {relatedConcept.term}
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="t-body-sm" style={{ color: 'var(--ink-3)', margin: 0 }}>
                No related terms were generated for this concept.
              </p>
            )}
          </div>
        </>
      )}
    </PGDrawer>
  );
}
