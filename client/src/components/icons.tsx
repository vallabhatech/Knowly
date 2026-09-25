type IconProps = { s?: number };

export const Icon = {
  Camera: ({ s = 22 }: IconProps) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9a2 2 0 0 1 2-2h2.5l1.5-2h6l1.5 2H19a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <circle cx="12" cy="13" r="3.6" />
    </svg>
  ),
  Upload: ({ s = 20 }: IconProps) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 16V4M6 10l6-6 6 6M4 20h16" />
    </svg>
  ),
  Plus: ({ s = 20 }: IconProps) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
      <path d="M12 5v14M5 12h14" />
    </svg>
  ),
  Close: ({ s = 18 }: IconProps) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  ),
  Check: ({ s = 18 }: IconProps) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <path d="m5 12 4 4 10-10" />
    </svg>
  ),
  X: ({ s = 16 }: IconProps) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  ),
  ArrowRight: ({ s = 20 }: IconProps) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="m10 6 6 6-6 6" />
    </svg>
  ),
  ArrowLeft: ({ s = 20 }: IconProps) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="m14 6-6 6 6 6" />
    </svg>
  ),
  Heart: ({ s = 18 }: IconProps) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="#FF4B4B" stroke="#3C3C3C" strokeWidth="2">
      <path d="M12 21s-7-4.5-9-9.5C1.4 7 4 4 7 4c1.7 0 3.4 1 5 3 1.6-2 3.3-3 5-3 3 0 5.6 3 4 7.5C19 16.5 12 21 12 21z" />
    </svg>
  ),
  Fire: ({ s = 18 }: IconProps) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="#FF9600" stroke="#3C3C3C" strokeWidth="2" strokeLinejoin="round">
      <path d="M12 3s4 4 4 8c0 1-.5 2-1 2.5C16 12 18 13 18 16a6 6 0 0 1-12 0c0-3 2-4 3-2.5C8 12 7 10 8 8c1-2 4-5 4-5z" />
    </svg>
  ),
  Lightning: ({ s = 18 }: IconProps) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="#FFC800" stroke="#3C3C3C" strokeWidth="2" strokeLinejoin="round">
      <path d="M13 2 4 14h7l-1 8 9-12h-7z" />
    </svg>
  ),
  Star: ({ s = 16 }: IconProps) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="#FFC800" stroke="#3C3C3C" strokeWidth="2" strokeLinejoin="round">
      <path d="M12 3l3 6 6 .9-4.5 4.4L18 21l-6-3-6 3 1.5-6.7L3 9.9 9 9z" />
    </svg>
  ),
  Settings: ({ s = 20 }: IconProps) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19 12a7 7 0 0 0-.1-1.2l2-1.5-2-3.4-2.3.9a7 7 0 0 0-2-1.2L14 3h-4l-.6 2.6a7 7 0 0 0-2 1.2l-2.3-.9-2 3.4 2 1.5A7 7 0 0 0 5 12c0 .4 0 .8.1 1.2l-2 1.5 2 3.4 2.3-.9a7 7 0 0 0 2 1.2L10 21h4l.6-2.6a7 7 0 0 0 2-1.2l2.3.9 2-3.4-2-1.5c0-.4.1-.8.1-1.2z" />
    </svg>
  ),
  Library: ({ s = 20 }: IconProps) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h4v16H4zM10 4h4v16h-4zM16 6l4 1-3 14-4-1z" />
    </svg>
  ),
  Doc: ({ s = 18 }: IconProps) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5" />
    </svg>
  ),
  Sparkle: ({ s = 18 }: IconProps) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2 L13 9 L20 10 L13 11 L12 18 L11 11 L4 10 L11 9 Z" />
    </svg>
  ),
  Refresh: ({ s = 18 }: IconProps) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12a9 9 0 0 1 15.5-6.3L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-15.5 6.3L3 16" />
      <path d="M3 21v-5h5" />
    </svg>
  ),
  Flip: ({ s = 14 }: IconProps) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 7v4a4 4 0 0 0 4 4h10" />
      <path d="m13 11 4 4-4 4" />
    </svg>
  ),
  Quote: ({ s = 16 }: IconProps) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor">
      <path d="M7 7c-2 0-3.5 1.5-3.5 3.5S5 14 7 14v3l3-3.5V10c0-1.7-1.3-3-3-3zm10 0c-2 0-3.5 1.5-3.5 3.5S15 14 17 14v3l3-3.5V10c0-1.7-1.3-3-3-3z" />
    </svg>
  ),
  ChevronDown: ({ s = 16 }: IconProps) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="m6 9 6 6 6-6" />
    </svg>
  ),
  Image: ({ s = 18 }: IconProps) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <circle cx="9" cy="9" r="2" />
      <path d="m21 16-5-5L5 21" />
    </svg>
  ),
  Expand: ({ s = 18 }: IconProps) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
    </svg>
  ),
  Collapse: ({ s = 18 }: IconProps) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" />
    </svg>
  ),
  Send: ({ s = 18 }: IconProps) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 12 20 4l-7 16-2-7z" />
    </svg>
  ),
  Chat: ({ s = 18 }: IconProps) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H9l-4 4z" />
    </svg>
  ),
  MoreVertical: ({ s = 18 }: IconProps) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor">
      <circle cx="12" cy="5.5" r="1.8" />
      <circle cx="12" cy="12" r="1.8" />
      <circle cx="12" cy="18.5" r="1.8" />
    </svg>
  ),
  Pencil: ({ s = 18 }: IconProps) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 20h4l10-10-4-4L4 16z" />
      <path d="m13.5 6.5 4 4" />
    </svg>
  ),
  Trash: ({ s = 18 }: IconProps) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 7h16" />
      <path d="M9 7V4h6v3" />
      <path d="M6 7v13a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V7" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  ),
};
