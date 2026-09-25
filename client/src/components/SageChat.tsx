import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from 'react';

import { Sage } from './Sage';
import { Icon } from './icons';
import { useSageChat, type ChatContext, type ChatMessage } from '../lib/queries';

type Props = {
  open: boolean;
  onClose: () => void;
  context: ChatContext;
};

export function SageChat({ open, onClose, context }: Props) {
  const chat = useSageChat();
  const greeting: ChatMessage = {
    role: 'assistant',
    content: context.title
      ? `Ask me anything about "${context.title}". I'll keep it short.`
      : "Ask me anything about this guide. I'll keep it short.",
  };
  const [messages, setMessages] = useState<ChatMessage[]>([greeting]);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [messages, chat.isPending, open]);

  useEffect(() => {
    if (open) {
      const t = setTimeout(() => inputRef.current?.focus(), 60);
      return () => clearTimeout(t);
    }
  }, [open]);

  const send = (raw: string) => {
    const text = raw.trim();
    if (!text || chat.isPending) return;
    const next: ChatMessage[] = [...messages, { role: 'user', content: text }];
    setMessages(next);
    setDraft('');
    setError(null);
    const forServer = next.slice(1);
    chat.mutate(
      { messages: forServer, context },
      {
        onSuccess: ({ reply }) => {
          setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
        },
        onError: (e) => {
          setError(e.message || 'Sage hit a snag — try again.');
        },
      },
    );
    inputRef.current?.focus();
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    send(draft);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send(draft);
    }
  };

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-label="Chat with Sage"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 90,
        display: 'flex',
        flexDirection: 'column',
        background: 'rgba(0,0,0,0.35)',
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          marginTop: 'auto',
          background: 'var(--bg)',
          borderTopLeftRadius: 22,
          borderTopRightRadius: 22,
          border: '2px solid var(--hairline-strong)',
          borderBottom: 'none',
          height: '85vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 -8px 30px rgba(0,0,0,0.18)',
        }}
      >
        <div
          style={{
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            background: 'var(--surface)',
            borderBottom: '2px solid var(--hairline)',
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
          }}
        >
          <Sage pose="happy" size={32} animated={false} />
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', lineHeight: 1.05 }}>
            <span style={{ fontFamily: 'var(--font-sans)', fontWeight: 900, fontSize: 15, color: 'var(--ink)' }}>
              Sage
            </span>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: 'var(--ink-3)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              Expert on {context.title || 'this guide'}
            </span>
          </div>
          <button
            type="button"
            aria-label="Close chat"
            onClick={onClose}
            style={{
              width: 38,
              height: 38,
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
            <Icon.Close s={16} />
          </button>
        </div>

        <div
          ref={scrollRef}
          className="no-scrollbar"
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '14px 14px 18px',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          {messages.map((m, i) => (
            <Bubble key={i} role={m.role} content={m.content} />
          ))}
          {chat.isPending && <TypingBubble />}
          {error && (
            <div
              style={{
                alignSelf: 'flex-start',
                maxWidth: '85%',
                padding: '10px 14px',
                borderRadius: 16,
                background: 'var(--red-soft, #FFE3E3)',
                border: '2px solid var(--red, #E54545)',
                color: 'var(--red, #B12C2C)',
                fontSize: 13,
                fontWeight: 700,
              }}
            >
              {error}
            </div>
          )}
        </div>

        <form
          onSubmit={onSubmit}
          style={{
            padding: '10px 12px 16px',
            borderTop: '2px solid var(--hairline)',
            background: 'var(--surface)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-end',
              gap: 10,
              background: 'var(--surface-2)',
              border: '2px solid var(--hairline-strong)',
              borderRadius: 18,
              padding: '8px 10px 8px 14px',
            }}
          >
            <textarea
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Ask about this guide…"
              rows={1}
              disabled={chat.isPending}
              style={{
                flex: 1,
                border: 'none',
                outline: 'none',
                resize: 'none',
                background: 'transparent',
                fontFamily: 'inherit',
                fontSize: 15,
                fontWeight: 600,
                color: 'var(--ink)',
                maxHeight: 120,
                padding: '6px 0',
                lineHeight: 1.4,
              }}
            />
            <button
              type="submit"
              aria-label="Send"
              disabled={!draft.trim() || chat.isPending}
              style={{
                width: 40,
                height: 40,
                borderRadius: 14,
                background: !draft.trim() || chat.isPending ? 'var(--hairline-strong)' : 'var(--green)',
                color: 'white',
                border: 'none',
                boxShadow: !draft.trim() || chat.isPending ? 'none' : '0 3px 0 var(--green-dark)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: !draft.trim() || chat.isPending ? 'not-allowed' : 'pointer',
                flex: '0 0 auto',
              }}
            >
              <Icon.Send s={18} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Bubble({ role, content }: { role: 'user' | 'assistant'; content: string }) {
  if (role === 'user') {
    return (
      <div style={{ alignSelf: 'flex-end', maxWidth: '85%' }}>
        <div
          style={{
            padding: '10px 14px',
            borderRadius: 18,
            borderBottomRightRadius: 6,
            background: 'var(--green)',
            color: 'white',
            border: '2px solid var(--green-dark)',
            boxShadow: '0 3px 0 var(--green-dark)',
            fontSize: 14,
            fontWeight: 700,
            lineHeight: 1.45,
            whiteSpace: 'pre-wrap',
          }}
        >
          {content}
        </div>
      </div>
    );
  }
  return (
    <div style={{ alignSelf: 'flex-start', maxWidth: '90%', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
      <div style={{ flex: '0 0 auto', marginTop: 2 }}>
        <Sage pose="read" size={32} animated={false} />
      </div>
      <div
        style={{
          padding: '10px 14px',
          borderRadius: 18,
          borderBottomLeftRadius: 6,
          background: 'var(--surface)',
          color: 'var(--ink)',
          border: '2px solid var(--hairline-strong)',
          boxShadow: '0 3px 0 var(--hairline-strong)',
          fontSize: 14,
          fontWeight: 600,
          lineHeight: 1.5,
          whiteSpace: 'pre-wrap',
        }}
      >
        {content}
      </div>
    </div>
  );
}

function TypingBubble() {
  return (
    <div style={{ alignSelf: 'flex-start', display: 'flex', gap: 8, alignItems: 'flex-end' }}>
      <Sage pose="think" size={32} animated />
      <div
        style={{
          padding: '10px 14px',
          borderRadius: 18,
          borderBottomLeftRadius: 6,
          background: 'var(--surface)',
          border: '2px solid var(--hairline-strong)',
          boxShadow: '0 3px 0 var(--hairline-strong)',
          display: 'inline-flex',
          gap: 4,
        }}
      >
        <Dot delay={0} />
        <Dot delay={120} />
        <Dot delay={240} />
      </div>
    </div>
  );
}

function Dot({ delay }: { delay: number }) {
  return (
    <span
      style={{
        width: 7,
        height: 7,
        borderRadius: '50%',
        background: 'var(--ink-3)',
        animation: 'pg-typing-bounce 900ms ease-in-out infinite',
        animationDelay: `${delay}ms`,
      }}
    />
  );
}
