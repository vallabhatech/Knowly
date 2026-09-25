import { useRef, useState, type DragEvent } from 'react';

import { Icon } from './icons';
import { PGButton } from './primitives';

export function Camera({
  disabled,
  uploadInputId,
  onFiles,
}: {
  disabled?: boolean;
  uploadInputId?: string;
  onFiles: (files: File[]) => void;
}) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const uploadRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const addInputFiles = (files: FileList | null) => {
    if (!files) return;
    onFiles(Array.from(files));
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOver(false);
    if (disabled) return;
    onFiles(Array.from(event.dataTransfer.files));
  };

  return (
    <div
      onDragOver={(event) => {
        event.preventDefault();
        if (!disabled) setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
      style={{
        border: `3px dashed ${isDragOver ? 'var(--green)' : 'var(--hairline-strong)'}`,
        background: isDragOver ? 'var(--green-bg)' : 'var(--surface)',
        borderRadius: 24,
        padding: '22px 16px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 14,
        transition: 'all 160ms',
      }}
    >
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        disabled={disabled}
        style={{ display: 'none' }}
        onChange={(event) => {
          addInputFiles(event.target.files);
          event.target.value = '';
        }}
      />
      <input
        ref={uploadRef}
        id={uploadInputId}
        type="file"
        accept="image/*,application/pdf"
        multiple
        disabled={disabled}
        style={{ display: 'none' }}
        onChange={(event) => {
          addInputFiles(event.target.files);
          event.target.value = '';
        }}
      />

      <div
        style={{
          width: 72,
          height: 72,
          borderRadius: '50%',
          background: 'var(--green)',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 6px 0 var(--green-dark)',
        }}
      >
        <Icon.Camera s={32} />
      </div>
      <div style={{ textAlign: 'center' }}>
        <div className="t-h3">Open camera</div>
        <div className="t-body-sm" style={{ color: 'var(--ink-3)' }}>or drop pages / a PDF</div>
      </div>
      <div style={{ display: 'flex', gap: 10, width: '100%' }}>
        <PGButton
          variant="primary"
          size="md"
          icon={<Icon.Camera s={18} />}
          fullWidth
          disabled={disabled}
          onClick={() => cameraRef.current?.click()}
        >
          Camera
        </PGButton>
        <PGButton
          variant="secondary"
          size="md"
          icon={<Icon.Upload s={18} />}
          onClick={() => uploadRef.current?.click()}
          disabled={disabled}
          fullWidth
        >
          Upload
        </PGButton>
      </div>
    </div>
  );
}
