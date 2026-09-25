import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';

import type { Concept, MindMap, MindMapBranch, MindMapColor, SampleDoc } from '../lib/sampleDoc';

type ColorTokens = {
  bg: string;
  border: string;
  borderDark: string;
  ink: string;
};

const MM_COLORS: Record<MindMapColor, ColorTokens> = {
  red:    { bg: '#FFE6E6', border: '#FF4B4B', borderDark: '#D63B3B', ink: '#A02525' },
  orange: { bg: '#FFE6C7', border: '#FF9600', borderDark: '#D67E00', ink: '#7A4500' },
  yellow: { bg: '#FFF1B8', border: '#FFC800', borderDark: '#D9A800', ink: '#7A5A00' },
  green:  { bg: '#E8FCD2', border: '#58CC02', borderDark: '#46A302', ink: '#2D6800' },
  blue:   { bg: '#D0EFFF', border: '#1CB0F6', borderDark: '#1899D6', ink: '#0D5A82' },
  purple: { bg: '#EFD9FF', border: '#CE82FF', borderDark: '#A85DD9', ink: '#5A1F8A' },
  pink:   { bg: '#FFD4E2', border: '#FF4B8B', borderDark: '#D63773', ink: '#8A2050' },
};

const FALLBACK_COLORS: MindMapColor[] = ['orange', 'blue', 'purple', 'green', 'pink', 'yellow'];

const VIEW_W = 900;
const VIEW_H = 800;
const HUB = { x: VIEW_W / 2, y: VIEW_H / 2 };
const BRANCH_RADIUS = 250;
const LEAF_RADIUS = 145;
const MIN_SCALE = 0.35;
const MAX_SCALE = 1.4;

type Pos = { x: number; y: number };
type ResolvedBranch = {
  id: string;
  label: string;
  color: MindMapColor;
  pos: Pos;
  leaves: Array<{ concept: Concept; pos: Pos }>;
};

type Connector = {
  from: Pos;
  to: Pos;
  color: string;
  thick: number;
};

export function ConceptMap({
  doc,
  activeConceptId,
  onSelect,
}: {
  doc: SampleDoc;
  activeConceptId: string | null;
  onSelect: (concept: Concept) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{ x: number; y: number; panX: number; panY: number; pointerId: number } | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      setSize({
        width: Math.round(entry.contentRect.width),
        height: Math.round(entry.contentRect.height),
      });
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const conceptById = useMemo(() => {
    const map = new Map<string, Concept>();
    doc.concepts.forEach((c) => map.set(c.id, c));
    return map;
  }, [doc.concepts]);

  const mindMap: MindMap = useMemo(() => {
    if (doc.mindMap) return doc.mindMap;
    return autoMindMap(doc);
  }, [doc]);

  const { branches, connectors } = useMemo(() => {
    const resolved: ResolvedBranch[] = [];
    const conns: Connector[] = [];
    const branchCount = mindMap.branches.length;

    mindMap.branches.forEach((branch, i) => {
      const baseAngle = -Math.PI / 2 + (i / Math.max(1, branchCount)) * Math.PI * 2;
      const branchPos: Pos = {
        x: HUB.x + Math.cos(baseAngle) * BRANCH_RADIUS,
        y: HUB.y + Math.sin(baseAngle) * BRANCH_RADIUS,
      };
      const tokens = MM_COLORS[branch.color];

      conns.push({ from: HUB, to: branchPos, color: tokens.border, thick: 4 });

      const leaves = branch.conceptIds
        .map((id) => conceptById.get(id))
        .filter((c): c is Concept => Boolean(c));

      const M = leaves.length;
      const spread = Math.min(Math.PI * 0.75, Math.max(0.6, M * 0.32));

      const placed = leaves.map((concept, k) => {
        const phi = M === 1 ? 0 : ((k / (M - 1)) - 0.5) * spread;
        const angle = baseAngle + phi;
        const pos: Pos = {
          x: branchPos.x + Math.cos(angle) * LEAF_RADIUS,
          y: branchPos.y + Math.sin(angle) * LEAF_RADIUS,
        };
        conns.push({ from: branchPos, to: pos, color: tokens.border, thick: 2.5 });
        return { concept, pos };
      });

      resolved.push({
        id: branch.id,
        label: branch.label,
        color: branch.color,
        pos: branchPos,
        leaves: placed,
      });
    });

    return { branches: resolved, connectors: conns };
  }, [mindMap, conceptById]);

  const fitScale = useMemo(() => {
    if (size.width === 0 || size.height === 0) return MIN_SCALE;
    const sx = (size.width - 32) / VIEW_W;
    const sy = (size.height - 32) / VIEW_H;
    return Math.max(MIN_SCALE, Math.min(MAX_SCALE, Math.min(sx, sy)));
  }, [size]);

  useEffect(() => {
    setZoom(fitScale);
    setPan({ x: 0, y: 0 });
  }, [fitScale]);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest('[data-mm-node]')) return;
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
    dragRef.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y, pointerId: e.pointerId };
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    setPan({ x: drag.panX + (e.clientX - drag.x), y: drag.panY + (e.clientY - drag.y) });
  };
  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    dragRef.current = null;
  };

  const onWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (!e.ctrlKey && !e.metaKey && Math.abs(e.deltaY) < 4) return;
    e.preventDefault();
    const next = Math.max(MIN_SCALE, Math.min(MAX_SCALE, zoom * (e.deltaY > 0 ? 0.92 : 1.08)));
    setZoom(next);
  };

  if (doc.concepts.length < 3) {
    return (
      <div style={{ padding: '12px 20px 110px' }}>
        <div
          style={{
            padding: 18,
            background: 'linear-gradient(180deg, #FFFBEA 0%, #FFF3C7 100%)',
            border: '2px solid var(--hairline-strong)',
            borderRadius: 22,
          }}
        >
          <div className="t-h3" style={{ marginBottom: 8 }}>
            Mind map needs a few more nodes
          </div>
          <p className="t-body-sm" style={{ color: 'var(--ink-2)', margin: 0 }}>
            This document only has {doc.concepts.length} concept{doc.concepts.length === 1 ? '' : 's'}, so the study guide is showing the summary and flashcards instead.
          </p>
        </div>
      </div>
    );
  }

  const totalLeaves = branches.reduce((sum, b) => sum + b.leaves.length, 0);
  const hubColor = MM_COLORS[mindMap.hubColor];

  return (
    <div
      ref={containerRef}
      className="concept-map-shell"
      style={{
        position: 'relative',
        flex: 1,
        minHeight: 460,
        margin: '0 16px 110px',
        background: 'transparent',
      }}
    >
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onWheel={onWheel}
        style={{
          position: 'absolute',
          inset: 0,
          overflow: 'hidden',
          borderRadius: 24,
          touchAction: 'none',
          cursor: dragRef.current ? 'grabbing' : 'grab',
          background:
            'radial-gradient(circle at 1px 1px, rgba(60,60,60,0.10) 1.5px, transparent 0), linear-gradient(180deg, #FFFDF3 0%, #F7FFF0 100%)',
          backgroundSize: '24px 24px, 100% 100%',
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            width: VIEW_W,
            height: VIEW_H,
            transform: `translate(-50%, -50%) translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: 'center',
            transition: dragRef.current ? 'none' : 'transform 220ms cubic-bezier(.2,.7,.3,1)',
          }}
        >
          <svg
            width={VIEW_W}
            height={VIEW_H}
            style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
          >
            {connectors.map((c, i) => (
              <CurvedConnector key={i} {...c} />
            ))}
          </svg>

          <CenterNode
            label={mindMap.hubLabel}
            tokens={hubColor}
            selected={activeConceptId === '__hub__'}
          />

          {branches.map((b) => {
            const tokens = MM_COLORS[b.color];
            return (
              <BranchNode key={b.id} pos={b.pos} label={b.label} count={b.leaves.length} tokens={tokens} />
            );
          })}

          {branches.flatMap((b) => {
            const tokens = MM_COLORS[b.color];
            return b.leaves.map(({ concept, pos }) => (
              <LeafNode
                key={concept.id}
                pos={pos}
                concept={concept}
                tokens={tokens}
                active={activeConceptId === concept.id}
                onClick={() => onSelect(concept)}
              />
            ));
          })}
        </div>
      </div>

      <div
        className="concept-map-hint"
        style={{
          left: 14,
          top: 14,
          background: 'rgba(255,255,255,0.95)',
        }}
      >
        Drag · pinch to zoom · tap a concept
      </div>

      <div
        style={{
          position: 'absolute',
          right: 14,
          top: 14,
          padding: '6px 10px',
          borderRadius: 999,
          border: '2px solid var(--hairline-strong)',
          background: 'rgba(255,255,255,0.95)',
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          color: 'var(--ink-2)',
        }}
      >
        {branches.length} branches · {totalLeaves} concepts
      </div>

      <div
        style={{
          position: 'absolute',
          right: 14,
          bottom: 14,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        <RoundBtn label="Zoom in" onClick={() => setZoom((z) => Math.min(MAX_SCALE, z * 1.18))}>+</RoundBtn>
        <RoundBtn label="Zoom out" onClick={() => setZoom((z) => Math.max(MIN_SCALE, z * 0.85))}>−</RoundBtn>
        <RoundBtn label="Re-center" small onClick={() => { setZoom(fitScale); setPan({ x: 0, y: 0 }); }}>⤾</RoundBtn>
      </div>
    </div>
  );
}

function CurvedConnector({ from, to, color, thick }: Connector) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const mx = from.x + dx * 0.5;
  const my = from.y + dy * 0.5;
  const cx = mx + -dy * 0.15;
  const cy = my + dx * 0.15;
  return (
    <path
      d={`M ${from.x} ${from.y} Q ${cx} ${cy} ${to.x} ${to.y}`}
      stroke={color}
      strokeWidth={thick}
      strokeLinecap="round"
      fill="none"
      opacity={0.85}
    />
  );
}

function CenterNode({ label, tokens, selected }: { label: string; tokens: ColorTokens; selected: boolean }) {
  return (
    <div
      data-mm-node
      style={{
        position: 'absolute',
        left: HUB.x,
        top: HUB.y,
        transform: 'translate(-50%, -50%)',
      }}
    >
      <div
        style={{
          background: tokens.border,
          color: 'white',
          borderRadius: 999,
          padding: '22px 32px',
          border: `4px solid ${tokens.borderDark}`,
          boxShadow: `0 6px 0 ${tokens.borderDark}`,
          fontFamily: 'var(--font-sans)',
          fontWeight: 900,
          fontSize: 26,
          lineHeight: 1.05,
          whiteSpace: 'pre-line',
          textAlign: 'center',
          minWidth: 160,
          outline: selected ? '4px solid #FFC800' : 'none',
          outlineOffset: 4,
        }}
      >
        {label}
      </div>
    </div>
  );
}

function BranchNode({
  pos,
  label,
  count,
  tokens,
}: {
  pos: Pos;
  label: string;
  count: number;
  tokens: ColorTokens;
}) {
  return (
    <div
      data-mm-node
      style={{
        position: 'absolute',
        left: pos.x,
        top: pos.y,
        transform: 'translate(-50%, -50%)',
      }}
    >
      <div
        style={{
          background: tokens.bg,
          color: tokens.ink,
          borderRadius: 22,
          padding: '12px 20px',
          border: `3px solid ${tokens.border}`,
          boxShadow: `0 5px 0 ${tokens.border}`,
          fontFamily: 'var(--font-sans)',
          fontWeight: 900,
          fontSize: 20,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          whiteSpace: 'nowrap',
        }}
      >
        <div
          style={{
            width: 14,
            height: 14,
            background: tokens.border,
            borderRadius: '50%',
            boxShadow: `inset 0 -2px 0 ${tokens.borderDark}`,
          }}
        />
        {label}
        <div
          style={{
            background: tokens.border,
            color: 'white',
            borderRadius: 12,
            padding: '2px 8px',
            fontSize: 12,
            fontWeight: 800,
          }}
        >
          {count}
        </div>
      </div>
    </div>
  );
}

function LeafNode({
  pos,
  concept,
  tokens,
  active,
  onClick,
}: {
  pos: Pos;
  concept: Concept;
  tokens: ColorTokens;
  active: boolean;
  onClick: () => void;
}) {
  const style: CSSProperties = {
    position: 'absolute',
    left: pos.x,
    top: pos.y,
    transform: 'translate(-50%, -50%)',
    padding: '9px 14px',
    background: active ? tokens.bg : 'white',
    color: 'var(--ink)',
    border: `2.5px solid ${tokens.border}`,
    borderRadius: 16,
    boxShadow: `0 4px 0 ${tokens.border}`,
    fontFamily: 'var(--font-sans)',
    fontWeight: 800,
    fontSize: 14,
    maxWidth: 180,
    textAlign: 'center',
    cursor: 'pointer',
    outline: active ? '4px solid #FFC800' : 'none',
    outlineOffset: 3,
    whiteSpace: 'normal',
    lineHeight: 1.2,
  };
  return (
    <button data-mm-node type="button" onClick={onClick} style={style}>
      {concept.term}
    </button>
  );
}

function RoundBtn({
  children,
  onClick,
  label,
  small,
}: {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
  small?: boolean;
}) {
  const sz = small ? 36 : 42;
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      style={{
        width: sz,
        height: sz,
        borderRadius: '50%',
        background: 'white',
        color: 'var(--ink)',
        border: '2px solid var(--hairline-strong)',
        boxShadow: '0 4px 0 var(--hairline-strong)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'var(--font-sans)',
        fontWeight: 900,
        fontSize: small ? 16 : 20,
        cursor: 'pointer',
      }}
    >
      {children}
    </button>
  );
}

function autoMindMap(doc: SampleDoc): MindMap {
  const concepts = doc.concepts;
  if (concepts.length === 0) {
    return { hubLabel: doc.title || 'Map', hubColor: 'red', branches: [] };
  }

  const degree = new Map<string, number>();
  concepts.forEach((c) => degree.set(c.id, 0));
  concepts.forEach((c) => {
    c.related.forEach((r) => {
      if (degree.has(r)) {
        degree.set(c.id, (degree.get(c.id) || 0) + 1);
        degree.set(r, (degree.get(r) || 0) + 1);
      }
    });
  });

  const sorted = [...concepts].sort((a, b) => (degree.get(b.id) || 0) - (degree.get(a.id) || 0));
  const hub = sorted[0];
  const others = concepts.filter((c) => c.id !== hub.id);

  const branchCount = Math.max(2, Math.min(5, Math.ceil(others.length / 4)));
  const buckets: Concept[][] = Array.from({ length: branchCount }, () => []);
  others.forEach((c, i) => {
    buckets[i % branchCount].push(c);
  });

  const branches: MindMapBranch[] = buckets.map((bucket, i) => ({
    id: `auto-${i}`,
    label: `Group ${i + 1}`,
    color: FALLBACK_COLORS[i % FALLBACK_COLORS.length],
    conceptIds: bucket.map((c) => c.id),
  }));

  return {
    hubLabel: hub.term,
    hubColor: 'red',
    branches,
  };
}
