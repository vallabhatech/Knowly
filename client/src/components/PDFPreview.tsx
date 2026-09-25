import { useEffect, useState, type CSSProperties } from 'react';

import { Icon } from './icons';
import { PGBadge } from './primitives';

export type PDFPreviewItem = {
  id: string;
  file: File;
};

export function PDFPreview({
  items,
  disabled,
  onAdd,
  onRemove,
  onReorder,
}: {
  items: PDFPreviewItem[];
  disabled?: boolean;
  onAdd: () => void;
  onRemove: (id: string) => void;
  onReorder: (from: number, to: number) => void;
}) {
  if (items.length === 0) return null;

  return (
    <div style={{ marginTop: 22 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div className="t-h3">Your pages</div>
        <PGBadge tone="green">{items.length}/10</PGBadge>
      </div>
      <div className="no-scrollbar" style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8, paddingRight: 4 }}>
        {items.map((item, index) => (
          <PreviewTile
            key={item.id}
            item={item}
            index={index}
            disabled={disabled}
            onRemove={() => onRemove(item.id)}
            onReorder={onReorder}
          />
        ))}
        <button
          onClick={onAdd}
          disabled={disabled || items.length >= 10}
          aria-label="Add page"
          style={{
            width: 60,
            height: 78,
            borderRadius: 14,
            border: '2px dashed var(--hairline-strong)',
            background: 'transparent',
            color: disabled || items.length >= 10 ? 'var(--ink-4)' : 'var(--ink-3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: disabled || items.length >= 10 ? 'not-allowed' : 'pointer',
            flexShrink: 0,
          }}
        >
          <Icon.Plus s={22} />
        </button>
      </div>
      <div className="t-mono" style={{ color: 'var(--ink-3)', marginTop: 6 }}>
        Drag pages to reorder.
      </div>
    </div>
  );
}

function PreviewTile({
  item,
  index,
  disabled,
  onRemove,
  onReorder,
}: {
  item: PDFPreviewItem;
  index: number;
  disabled?: boolean;
  onRemove: () => void;
  onReorder: (from: number, to: number) => void;
}) {
  const [isOver, setIsOver] = useState(false);
  const objectUrl = useObjectUrl(item.file);
  const isPdf = item.file.type === 'application/pdf';
  const tileStyle: CSSProperties = {
    width: 72,
    height: 94,
    borderRadius: 14,
    background: 'var(--surface-2)',
    border: isOver ? '3px solid var(--green)' : '2px solid var(--hairline-strong)',
    position: 'relative',
    overflow: 'hidden',
    cursor: disabled ? 'default' : 'grab',
    flexShrink: 0,
  };

  return (
    <div style={{ position: 'relative', width: 72, height: 102, flexShrink: 0 }}>
      <div
        draggable={!disabled}
        onDragStart={(event) => {
          event.dataTransfer.effectAllowed = 'move';
          event.dataTransfer.setData('text/plain', String(index));
        }}
        onDragOver={(event) => {
          event.preventDefault();
          if (!disabled) setIsOver(true);
        }}
        onDragLeave={() => setIsOver(false)}
        onDrop={(event) => {
          event.preventDefault();
          setIsOver(false);
          const from = Number(event.dataTransfer.getData('text/plain'));
          if (Number.isInteger(from) && from !== index) onReorder(from, index);
        }}
        style={tileStyle}
      >
        {isPdf ? (
          <PdfGlyph />
        ) : (
          objectUrl && (
            <img
              src={objectUrl}
              alt=""
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          )
        )}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(to top, rgba(0,0,0,0.34), transparent 45%)',
            pointerEvents: 'none',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: 5,
            left: 5,
            fontFamily: 'var(--font-mono)',
            fontSize: 9,
            color: 'white',
            background: 'rgba(0,0,0,0.55)',
            padding: '1px 5px',
            borderRadius: 5,
            fontWeight: 700,
          }}
        >
          {isPdf ? 'PDF' : `P. ${index + 1}`}
        </div>
      </div>
      <button
        onClick={(event) => {
          event.stopPropagation();
          onRemove();
        }}
        disabled={disabled}
        aria-label={`Remove page ${index + 1}`}
        style={{
          position: 'absolute',
          top: -7,
          right: -7,
          width: 24,
          height: 24,
          borderRadius: '50%',
          background: disabled ? 'var(--ink-4)' : 'var(--red)',
          color: 'white',
          border: '2px solid white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: disabled ? 'not-allowed' : 'pointer',
          padding: 0,
        }}
      >
        <Icon.Close s={12} />
      </button>
    </div>
  );
}

function PdfGlyph() {
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-3)' }}>
      <Icon.Doc s={30} />
    </div>
  );
}

function useObjectUrl(file: File): string | null {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (file.type === 'application/pdf') return undefined;
    const nextUrl = URL.createObjectURL(file);
    setUrl(nextUrl);
    return () => URL.revokeObjectURL(nextUrl);
  }, [file]);

  return url;
}
