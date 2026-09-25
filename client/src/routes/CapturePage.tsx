import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { UseQueryResult } from '@tanstack/react-query';

import { AuthNav } from '../components/AuthNav';
import { AuthNudge } from '../components/AuthNudge';
import { Camera } from '../components/Camera';
import { PDFPreview, type PDFPreviewItem } from '../components/PDFPreview';
import { Sage, SageBadge } from '../components/Sage';
import { SettingsMenu } from '../components/SettingsMenu';
import { Icon } from '../components/icons';
import { PGButton, PGCard, PGNav, PGProgress, PGSkel } from '../components/primitives';
import { ApiError } from '../lib/api';
import { buildPdfFromImages } from '../lib/pdf';
import {
  useDeleteDocument,
  useDocumentList,
  useMe,
  useProcess,
  useRenameDocument,
  type DocumentList,
  type DocumentSummary,
} from '../lib/queries';

type CaptureState = 'idle' | 'building-pdf' | 'uploading' | 'processing' | 'done' | 'error';
type PreparedUpload = { file: File; title?: string };
type RecentTone = 'blue' | 'pink' | 'purple' | 'orange';

const TONE_MAP: Record<RecentTone, { bg: string; ic: string }> = {
  blue:   { bg: 'var(--blue-soft)',   ic: 'var(--blue)' },
  pink:   { bg: 'var(--pink-soft)',   ic: 'var(--pink)' },
  purple: { bg: 'var(--purple-soft)', ic: 'var(--purple)' },
  orange: { bg: 'var(--orange-soft)', ic: 'var(--orange)' },
};

const RECENT_TONES: RecentTone[] = ['blue', 'pink', 'purple', 'orange'];
const UPLOAD_INPUT_ID = 'capture-upload-input';

export default function CapturePage() {
  const navigate = useNavigate();
  const docsQuery = useDocumentList();
  const meQuery = useMe();
  const process = useProcess();
  const [thumbs, setThumbs] = useState<PDFPreviewItem[]>([]);
  const [captureState, setCaptureState] = useState<CaptureState>('idle');
  const [preparedUpload, setPreparedUpload] = useState<PreparedUpload | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [retryAfterSec, setRetryAfterSec] = useState(0);
  const isWorking = captureState === 'building-pdf' || captureState === 'uploading' || captureState === 'processing' || captureState === 'done';
  const isRateLimited = retryAfterSec > 0;

  useEffect(() => {
    if (retryAfterSec <= 0) return;
    const t = window.setInterval(() => {
      setRetryAfterSec((s) => Math.max(0, s - 1));
    }, 1000);
    return () => window.clearInterval(t);
  }, [retryAfterSec]);

  const resetPreparedUpload = () => {
    setPreparedUpload(null);
    setUploadProgress(0);
    if (captureState === 'error') setCaptureState('idle');
    setError(null);
  };

  const removeThumb = (id: string) => {
    resetPreparedUpload();
    setThumbs((items) => items.filter((item) => item.id !== id));
  };

  const reorderThumbs = (from: number, to: number) => {
    resetPreparedUpload();
    setThumbs((items) => {
      if (from < 0 || to < 0 || from >= items.length || to >= items.length) return items;
      const next = [...items];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  };

  const addFiles = (files: File[]) => {
    const accepted = files.filter((file) => file.type.startsWith('image/') || file.type === 'application/pdf');
    if (!accepted.length) {
      setError('Add images or a PDF.');
      setCaptureState('error');
      return;
    }

    resetPreparedUpload();
    const pdf = accepted.find((file) => file.type === 'application/pdf');
    if (pdf) {
      if (accepted.length > 1 || thumbs.length > 0) {
        setError('PDF uploads work one file at a time. I kept the PDF you selected.');
        setCaptureState('error');
      }
      setThumbs([{ id: makeThumbId(), file: pdf }]);
      return;
    }

    const slots = Math.max(0, 10 - thumbs.length);
    if (slots === 0) {
      setError('You can upload up to 10 pages at once.');
      setCaptureState('error');
      return;
    }
    if (accepted.length > slots) {
      setError(`I added the first ${slots} page${slots === 1 ? '' : 's'} so this stays under 10 pages.`);
      setCaptureState('error');
    }
    setThumbs((items) => [
      ...items,
      ...accepted.slice(0, slots).map((file) => ({ id: makeThumbId(), file })),
    ]);
  };

  const handleProcess = async () => {
    if (!thumbs.length || isWorking || process.isPending || isRateLimited) return;
    setError(null);
    try {
      const upload = preparedUpload ?? await prepareUpload(thumbs, setCaptureState);
      setPreparedUpload(upload);
      setCaptureState('uploading');
      setUploadProgress(0);
      const res = await process.mutateAsync({
        ...upload,
        onUploadProgress: (progress) => {
          setUploadProgress(progress);
          if (progress >= 1) setCaptureState('processing');
        },
      });
      setCaptureState('done');
      navigate(`/study/${res.document_id}`);
    } catch (e) {
      setCaptureState('error');
      if (e instanceof ApiError) {
        if (e.status === 429) {
          setRetryAfterSec(e.retryAfter ?? 60);
          setError("We're studying a lot right now — give us a moment.");
          return;
        }
        if (e.code === 'ocr_too_short') {
          setError("We couldn't read this document — try a clearer photo.");
          return;
        }
        setError(e.message);
        return;
      }
      setError(e instanceof Error ? e.message : 'Upload failed');
    }
  };

  if (isWorking) {
    return <CaptureLoading pages={thumbs.length} state={captureState} progress={uploadProgress} />;
  }

  return (
    <div className="pg-shell">
      <PGNav
        left={<SettingsMenu />}
        title={
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <SageBadge size={28} /> PocketGuru
          </span>
        }
        right={<AuthNav />}
      />

      <div className="no-scrollbar" style={{ flex: 1, overflowY: 'auto' }}>
        <div className="polka-green" style={{ padding: '18px 20px 22px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <Sage pose="wave" size={92} />
            <div>
              <div className="t-eyebrow" style={{ color: 'var(--green-dark)', marginBottom: 2 }}>Hi, I&apos;m Sage!</div>
              <h1 className="t-h1" style={{ margin: 0, fontSize: 22, lineHeight: 1.15 }}>
                Snap a page,<br />I&apos;ll teach the rest.
              </h1>
            </div>
          </div>
        </div>

        <div style={{ padding: '20px 16px 24px' }}>
          <Camera disabled={isWorking} uploadInputId={UPLOAD_INPUT_ID} onFiles={addFiles} />

          {error && (
            <div
              className="t-body-sm"
              style={{
                marginTop: 12,
                padding: '10px 12px',
                background: 'var(--red-soft)',
                border: '2px solid var(--red)',
                borderRadius: 12,
                color: 'var(--red)',
              }}
            >
              <div>{error}</div>
              {isRateLimited && (
                <div className="t-mono" style={{ marginTop: 6, color: 'var(--ink-2)' }}>
                  Try again in {retryAfterSec}s
                </div>
              )}
              {thumbs.length > 0 && !isRateLimited && (
                <div style={{ marginTop: 10 }}>
                  <PGButton variant="secondary" size="sm" icon={<Icon.Refresh s={15} />} onClick={handleProcess}>
                    Retry
                  </PGButton>
                </div>
              )}
            </div>
          )}

          <PDFPreview
            items={thumbs}
            disabled={isWorking}
            onAdd={() => document.getElementById(UPLOAD_INPUT_ID)?.click()}
            onRemove={removeThumb}
            onReorder={reorderThumbs}
          />

          <div style={{ marginTop: thumbs.length > 0 ? 16 : 18 }}>
            <PGButton
              variant="primary"
              size="lg"
              fullWidth
              icon={<Icon.Sparkle s={18} />}
              onClick={handleProcess}
              disabled={thumbs.length === 0 || isWorking || isRateLimited}
            >
              {isRateLimited ? `Wait ${retryAfterSec}s…` : 'Generate Study Guide'}
            </PGButton>
          </div>

          <div style={{ marginTop: 28 }}>
            <div className="t-h3" style={{ marginBottom: 10 }}>Pick up where you left off</div>
            <AuthNudge
              me={meQuery.data}
              show={(docsQuery.data?.items.length ?? 0) >= 1}
            />
            <RecentDocs query={docsQuery} onOpen={(id) => navigate(`/study/${id}`)} />
          </div>
        </div>
      </div>
    </div>
  );
}

async function prepareUpload(
  items: PDFPreviewItem[],
  setState: (state: CaptureState) => void,
): Promise<PreparedUpload> {
  const files = items.map((item) => item.file);
  const pdfFiles = files.filter((file) => file.type === 'application/pdf');
  const titleSource = pdfFiles[0] ?? files[0];
  const title = titleSource.name.replace(/\.[^.]+$/, '') || 'notes';

  if (pdfFiles.length > 0) {
    if (files.length > 1) throw new Error('Upload one PDF by itself, or remove it and use images.');
    return { file: pdfFiles[0], title };
  }

  setState('building-pdf');
  const pdfBlob = await buildPdfFromImages(files);
  return {
    file: new File([pdfBlob], `${title}.pdf`, { type: 'application/pdf' }),
    title,
  };
}

function makeThumbId(): string {
  return `t${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function CaptureLoading({
  pages,
  state,
  progress,
}: {
  pages: number;
  state: CaptureState;
  progress: number;
}) {
  const heading = state === 'building-pdf'
    ? 'Building your PDF...'
    : state === 'uploading'
      ? 'Uploading your pages...'
      : 'Reading your document...';
  const detail = state === 'building-pdf'
    ? 'Putting your pages in the order you chose'
    : state === 'uploading'
      ? `${Math.round(progress * 100)}% uploaded`
      : `Studying ${pages} page${pages !== 1 ? 's' : ''} of your notes`;

  return (
    <div className="pg-shell">
      <PGNav title={heading} />
      <div style={{ flex: 1, padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 24, alignItems: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, padding: '20px 0 8px' }}>
          <Sage pose="read" size={140} />
          <div style={{ textAlign: 'center' }}>
            <h2 className="t-h2" style={{ margin: 0, marginBottom: 6 }}>{heading}</h2>
            <div className="t-body-sm" style={{ color: 'var(--ink-3)' }}>
              {detail}
            </div>
          </div>
        </div>

        {state === 'uploading' && (
          <div style={{ width: '100%' }}>
            <PGProgress value={progress} max={1} color="var(--blue)" height={14} />
          </div>
        )}

        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <PGCard padding={14}>
            <PGSkel w="55%" h={16} style={{ marginBottom: 14 }} />
            <PGSkel w="100%" h={10} style={{ marginBottom: 8 }} />
            <PGSkel w="92%" h={10} style={{ marginBottom: 8 }} />
            <PGSkel w="76%" h={10} />
          </PGCard>
          <PGCard padding={14}>
            <PGSkel w="40%" h={12} style={{ marginBottom: 14 }} />
            <div style={{ display: 'flex', gap: 8 }}>
              <PGSkel w="100%" h={48} r={12} />
              <PGSkel w="100%" h={48} r={12} />
            </div>
          </PGCard>
        </div>

        <ProcessingSteps />
      </div>
    </div>
  );
}

function relativeWhen(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const diffMin = Math.max(0, Math.round((Date.now() - then) / 60_000));
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffH = Math.round(diffMin / 60);
  if (diffH < 24) return `${diffH}h ago`;
  const diffD = Math.round(diffH / 24);
  if (diffD < 7) return `${diffD}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function RecentDocs({
  query,
  onOpen,
}: {
  query: UseQueryResult<DocumentList, Error>;
  onOpen: (id: string) => void;
}) {
  const renameMutation = useRenameDocument();
  const deleteMutation = useDeleteDocument();
  const [renameTarget, setRenameTarget] = useState<DocumentSummary | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DocumentSummary | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  if (query.isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <PGSkel w="100%" h={72} r={16} />
        <PGSkel w="100%" h={72} r={16} />
      </div>
    );
  }
  if (query.error) {
    return (
      <div className="t-body-sm" style={{ color: 'var(--red)' }}>
        Couldn&apos;t load your library. Try again in a bit.
      </div>
    );
  }
  const items = query.data?.items ?? [];
  if (items.length === 0) {
    return (
      <PGCard padding={16} style={{ textAlign: 'center' }}>
        <div className="t-body-sm" style={{ color: 'var(--ink-3)' }}>
          No notes yet — snap your first page to get started!
        </div>
      </PGCard>
    );
  }

  const submitRename = async (title: string) => {
    if (!renameTarget) return;
    setActionError(null);
    try {
      await renameMutation.mutateAsync({ id: renameTarget.id, title });
      setRenameTarget(null);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Could not rename');
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setActionError(null);
    try {
      await deleteMutation.mutateAsync({ id: deleteTarget.id });
      setDeleteTarget(null);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Could not delete');
    }
  };

  return (
    <>
      {actionError && (
        <div
          className="t-body-sm"
          style={{
            marginBottom: 10,
            padding: '8px 12px',
            background: 'var(--red-soft)',
            border: '2px solid var(--red)',
            borderRadius: 12,
            color: 'var(--red)',
          }}
        >
          {actionError}
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {items.slice(0, 5).map((d, i) => (
          <RecentDocCard
            key={d.id}
            doc={d}
            tone={RECENT_TONES[i % RECENT_TONES.length]}
            onOpen={onOpen}
            onRename={() => {
              setActionError(null);
              setRenameTarget(d);
            }}
            onDelete={() => {
              setActionError(null);
              setDeleteTarget(d);
            }}
          />
        ))}
      </div>
      {renameTarget && (
        <RenameDocDialog
          doc={renameTarget}
          busy={renameMutation.isPending}
          onCancel={() => setRenameTarget(null)}
          onSubmit={submitRename}
        />
      )}
      {deleteTarget && (
        <DeleteDocDialog
          doc={deleteTarget}
          busy={deleteMutation.isPending}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={confirmDelete}
        />
      )}
    </>
  );
}

function RecentDocCard({
  doc,
  tone,
  onOpen,
  onRename,
  onDelete,
}: {
  doc: DocumentSummary;
  tone: RecentTone;
  onOpen: (id: string) => void;
  onRename: () => void;
  onDelete: () => void;
}) {
  const map = TONE_MAP[tone];
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handle = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [menuOpen]);

  return (
    <PGCard
      thick
      padding={14}
      onClick={() => onOpen(doc.id)}
      style={{ display: 'flex', alignItems: 'center', gap: 12, position: 'relative' }}
    >
      <div
        style={{
          width: 44,
          height: 52,
          borderRadius: 10,
          background: map.bg,
          border: `2px solid ${map.ic}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: map.ic,
          flexShrink: 0,
        }}
      >
        <Icon.Doc s={20} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          className="t-body-sm"
          style={{
            color: 'var(--ink)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            fontWeight: 800,
          }}
        >
          {doc.title}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
          <span className="t-mono" style={{ color: 'var(--ink-3)' }}>
            {doc.page_count} page{doc.page_count === 1 ? '' : 's'}
          </span>
          <span style={{ width: 3, height: 3, borderRadius: '50%', background: 'var(--ink-4)' }} />
          <span className="t-mono" style={{ color: 'var(--ink-3)' }}>{relativeWhen(doc.created_at)}</span>
        </div>
      </div>
      {doc.last_attempt_score != null && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            padding: '4px 10px',
            borderRadius: 999,
            background: 'var(--yellow-soft)',
            border: '2px solid var(--yellow-dark)',
          }}
        >
          <Icon.Star s={13} />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 800, color: '#7A5A00' }}>
            {doc.last_attempt_score}%
          </span>
        </div>
      )}
      <div ref={menuRef} style={{ position: 'relative' }}>
        <button
          type="button"
          aria-label="Document actions"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          onClick={(e) => {
            e.stopPropagation();
            setMenuOpen((v) => !v);
          }}
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: 'var(--surface-2)',
            border: '2px solid var(--hairline-strong)',
            boxShadow: '0 2px 0 var(--hairline-strong)',
            color: 'var(--ink)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            padding: 0,
            flexShrink: 0,
          }}
        >
          <Icon.MoreVertical s={18} />
        </button>
        {menuOpen && (
          <div
            role="menu"
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'absolute',
              top: 38,
              right: 0,
              minWidth: 168,
              background: 'var(--surface)',
              border: '2px solid var(--hairline-strong)',
              borderRadius: 12,
              boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
              padding: 6,
              zIndex: 10,
            }}
          >
            <MenuItem
              icon={<Icon.Pencil s={16} />}
              label="Rename"
              onClick={() => {
                setMenuOpen(false);
                onRename();
              }}
            />
            <MenuItem
              icon={<Icon.Trash s={16} />}
              label="Delete"
              danger
              onClick={() => {
                setMenuOpen(false);
                onDelete();
              }}
            />
          </div>
        )}
      </div>
    </PGCard>
  );
}

function MenuItem({
  icon,
  label,
  onClick,
  danger,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        width: '100%',
        padding: '8px 10px',
        borderRadius: 8,
        background: 'transparent',
        border: 0,
        cursor: 'pointer',
        color: danger ? 'var(--red)' : 'var(--ink)',
        fontSize: 14,
        fontWeight: 700,
        textAlign: 'left',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = danger ? 'var(--red-soft)' : 'var(--surface-2)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'transparent';
      }}
    >
      {icon}
      {label}
    </button>
  );
}

function ModalShell({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(20,20,20,0.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        zIndex: 9998,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--surface)',
          borderRadius: 20,
          padding: 18,
          width: '100%',
          maxWidth: 360,
          boxShadow: '0 12px 40px rgba(0,0,0,0.18)',
        }}
      >
        {children}
      </div>
    </div>
  );
}

function RenameDocDialog({
  doc,
  busy,
  onCancel,
  onSubmit,
}: {
  doc: DocumentSummary;
  busy: boolean;
  onCancel: () => void;
  onSubmit: (title: string) => void;
}) {
  const [value, setValue] = useState(doc.title);
  const trimmed = value.trim();
  const canSave = trimmed.length > 0 && trimmed !== doc.title && !busy;
  return (
    <ModalShell onClose={busy ? () => {} : onCancel}>
      <div className="t-h2" style={{ margin: 0, marginBottom: 10 }}>Rename study guide</div>
      <input
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && canSave) onSubmit(trimmed);
          if (e.key === 'Escape' && !busy) onCancel();
        }}
        maxLength={200}
        style={{
          width: '100%',
          padding: '10px 12px',
          borderRadius: 12,
          border: '2px solid var(--hairline-strong)',
          fontSize: 15,
          fontWeight: 600,
          background: 'var(--surface)',
          color: 'var(--ink)',
          outline: 'none',
        }}
      />
      <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
        <PGButton variant="secondary" size="md" fullWidth onClick={onCancel} disabled={busy}>
          Cancel
        </PGButton>
        <PGButton
          variant="primary"
          size="md"
          fullWidth
          onClick={() => onSubmit(trimmed)}
          disabled={!canSave}
        >
          {busy ? 'Saving…' : 'Save'}
        </PGButton>
      </div>
    </ModalShell>
  );
}

function DeleteDocDialog({
  doc,
  busy,
  onCancel,
  onConfirm,
}: {
  doc: DocumentSummary;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <ModalShell onClose={busy ? () => {} : onCancel}>
      <div className="t-h2" style={{ margin: 0, marginBottom: 8 }}>Delete this study guide?</div>
      <div className="t-body-sm" style={{ color: 'var(--ink-2)', marginBottom: 14 }}>
        “{doc.title}” will be removed from your library. This can&apos;t be undone.
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        <PGButton variant="secondary" size="md" fullWidth onClick={onCancel} disabled={busy}>
          Cancel
        </PGButton>
        <PGButton
          variant="primary"
          size="md"
          fullWidth
          icon={<Icon.Trash s={16} />}
          onClick={onConfirm}
          disabled={busy}
          style={{ background: 'var(--red)', color: 'white' }}
        >
          {busy ? 'Deleting…' : 'Delete'}
        </PGButton>
      </div>
    </ModalShell>
  );
}

function ProcessingSteps() {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setStep((s) => Math.min(s + 1, 2)), 800);
    return () => clearInterval(t);
  }, []);
  const steps = [
    { id: 'ocr', label: 'Reading', icon: <Icon.Image s={14} /> },
    { id: 'gen', label: 'Summarizing', icon: <Icon.Sparkle s={14} /> },
    { id: 'quiz', label: 'Building quiz', icon: <Icon.Lightning s={14} /> },
  ];
  return (
    <div style={{ display: 'flex', gap: 8, marginTop: 'auto' }}>
      {steps.map((s, i) => (
        <div
          key={s.id}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '8px 12px',
            background: i <= step ? 'var(--green-soft)' : 'var(--surface-2)',
            border: `2px solid ${i <= step ? 'var(--green)' : 'var(--hairline)'}`,
            borderRadius: 999,
            color: i <= step ? 'var(--green-dark)' : 'var(--ink-4)',
            transition: 'all 240ms',
          }}
        >
          {i < step ? <Icon.Check s={14} /> : s.icon}
          <span style={{ fontSize: 12, fontWeight: 800 }}>{s.label}</span>
        </div>
      ))}
    </div>
  );
}
