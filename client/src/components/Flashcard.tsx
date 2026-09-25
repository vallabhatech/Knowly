import { useEffect, useRef, useState } from 'react';

import { Icon } from './icons';
import { PGBadge } from './primitives';

const SWIPE_THRESHOLD = 72;

type DragState = {
  dragging: boolean;
  startX: number;
  x: number;
};

export function Flashcard({
  front,
  back,
  index,
  total,
  onNext,
  onPrev,
}: {
  front: string;
  back: string;
  index: number;
  total: number;
  onNext: () => void;
  onPrev: () => void;
}) {
  const [flipped, setFlipped] = useState(false);
  const [dragX, setDragX] = useState(0);
  const dragRef = useRef<DragState>({ dragging: false, startX: 0, x: 0 });

  useEffect(() => {
    setFlipped(false);
    dragRef.current = { dragging: false, startX: 0, x: 0 };
    setDragX(0);
  }, [front, back]);

  const resetDrag = () => {
    dragRef.current = { dragging: false, startX: 0, x: 0 };
    setDragX(0);
  };

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { dragging: true, startX: event.clientX, x: 0 };
    setDragX(0);
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current.dragging) return;
    const nextX = event.clientX - dragRef.current.startX;
    dragRef.current = { ...dragRef.current, x: nextX };
    setDragX(nextX);
  };

  const onPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    const delta = dragRef.current.x;
    if (Math.abs(delta) >= SWIPE_THRESHOLD) {
      if (delta < 0 && index < total - 1) onNext();
      if (delta > 0 && index > 0) onPrev();
      resetDrag();
      return;
    }

    if (Math.abs(delta) < 8) {
      setFlipped((current) => !current);
    }
    resetDrag();
  };

  const onPointerCancel = () => resetDrag();

  return (
    <div
      className={`flip-card${flipped ? ' flipped' : ''}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      style={{
        position: 'absolute',
        inset: 0,
        transform: `translateX(${dragX}px) rotate(${dragX * 0.04}deg)`,
        transition: dragRef.current.dragging ? 'none' : 'transform 280ms cubic-bezier(.2,.7,.3,1)',
        cursor: 'grab',
        touchAction: 'pan-y',
        userSelect: 'none',
      }}
    >
      <div className="flip-card-inner">
        <div
          className="flip-card-face"
          style={{
            background: 'linear-gradient(180deg, var(--surface) 0%, #FFFDF7 100%)',
            border: '3px solid var(--hairline-strong)',
            borderRadius: 22,
            boxShadow: '0 6px 0 var(--hairline-strong)',
            padding: 22,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: 18,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
            <PGBadge tone="yellow">Prompt</PGBadge>
            <div className="t-mono" style={{ fontSize: 10, color: 'var(--ink-3)' }}>
              {index + 1}/{total}
            </div>
          </div>
          <div className="t-h2" style={{ fontSize: 18, lineHeight: 1.35 }}>
            {front}
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              color: 'var(--ink-3)',
            }}
          >
            <Icon.Flip s={13} />
            <span className="t-mono" style={{ fontSize: 10 }}>
              TAP TO FLIP · SWIPE TO MOVE
            </span>
          </div>
        </div>
        <div
          className="flip-card-face flip-card-back"
          style={{
            background: 'linear-gradient(180deg, var(--green-soft) 0%, #F3FFE8 100%)',
            border: '3px solid var(--green)',
            borderRadius: 22,
            boxShadow: '0 6px 0 var(--green)',
            padding: 22,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: 18,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
            <PGBadge tone="green">Answer</PGBadge>
            <div className="t-mono" style={{ fontSize: 10, color: 'var(--green-dark)' }}>
              {index + 1}/{total}
            </div>
          </div>
          <div className="t-h2" style={{ fontSize: 18, lineHeight: 1.4, color: 'var(--ink)' }}>
            {back}
          </div>
          <div className="t-body-sm" style={{ color: 'var(--green-dark)' }}>
            Flip back or keep swiping through the deck.
          </div>
        </div>
      </div>
    </div>
  );
}
