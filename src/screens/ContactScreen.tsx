import { useCallback, useEffect, useRef, useState, type FormEvent, type KeyboardEvent, type MouseEvent } from 'react';
import { createPortal } from 'react-dom';
import { McButton } from '../ui/McButton';
import { ItemIcon, type IconName } from '../ui/ItemIcon';
import { useNav } from '../nav';
import { contact, site } from '../data/content';
import { sfx } from '../audio/sfx';
import './contact.css';

type Kind = 'system' | 'chat' | 'you' | 'ok' | 'err' | 'info' | 'cmd';
type Line = { id: number; kind: Kind; name?: string; text: string };
type ContactLink = (typeof contact.links)[number];

/** PNG icon for a chat command such as "/github" (falls back to the envelope). */
const commandIcons: Record<string, IconName> = {
  '/email': 'contact-email',
  '/linkedin': 'contact-linkedin',
  '/github': 'projects',
  '/location': 'contact-location',
};

const INTRO: Omit<Line, 'id'>[] = [
  { kind: 'system', text: `[Server] ${site.name} joined the game` },
  { kind: 'chat', name: site.name, text: 'Hey! Want to build something together?' },
  { kind: 'chat', name: site.name, text: 'Click a command below or type /help' },
];
const INTRO_DELAYS = [350, 1100, 1900]; // ms after mount for each intro line

const MAX_LINES = 80;

function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

/** "https://github.com/x" → "github.com/x", "mailto:a@b" → "a@b" */
function prettyHref(href: string) {
  return href.replace(/^mailto:/, '').replace(/^https?:\/\//, '').replace(/\/$/, '');
}

async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through to legacy copy */
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

/** Phones / small tablets (and iOS in general) render PDFs in frames badly, so show links instead. */
function canEmbedPdf() {
  if (typeof window === 'undefined') return false;
  if (window.matchMedia?.('(max-width: 699px)').matches) return false;
  return navigator.pdfViewerEnabled !== false;
}

const FOCUSABLE = 'a[href], button:not([disabled]), object, [tabindex]:not([tabindex="-1"])';

/** Book-framed resume preview. Portalled to <body> so it sits above the HUD/hotbar. */
function ResumeModal({ onClose }: { onClose: () => void }) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [embed] = useState(canEmbedPdf);

  useEffect(() => {
    closeRef.current?.focus();
    // Capture phase so App's global shortcuts (Esc → title, 1–9, ←/→) never see these keys.
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === 'Tab') {
        // simple focus trap
        const box = dialogRef.current;
        const els = Array.from(box?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []);
        if (!box || !els.length) return;
        const first = els[0];
        const last = els[els.length - 1];
        const active = document.activeElement;
        if (e.shiftKey && (active === first || !box.contains(active))) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && (active === last || !box.contains(active))) {
          e.preventDefault();
          first.focus();
        }
        return;
      }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || /^[1-9]$/.test(e.key)) e.preventDefault();
    };
    window.addEventListener('keydown', onKey, true);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey, true);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  return createPortal(
    <div className="ct-resume" onClick={onClose}>
      <div
        ref={dialogRef}
        className="ct-resume__book"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ct-resume-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="ct-resume__head">
          <ItemIcon name="craft-books" size={20} />
          <h2 id="ct-resume-title" className="ct-resume__title">
            Resume
          </h2>
          <button ref={closeRef} type="button" className="ct-resume__x" onClick={onClose} aria-label="Close resume preview">
            ✕
          </button>
        </header>

        <div className="ct-resume__page">
          {embed ? (
            <object className="ct-resume__frame" data={`${contact.resume}#view=FitH`} type="application/pdf" aria-label="Resume (PDF)">
              <ResumeFallback />
            </object>
          ) : (
            <ResumeFallback />
          )}
        </div>

        <footer className="ct-resume__actions">
          <McButton size="sm" href={contact.resume} download="Jason-Tjandra-Resume.pdf">
            Download
          </McButton>
          <McButton size="sm" href={contact.resume} target="_blank" rel="noreferrer">
            Open in new tab
          </McButton>
          <McButton size="sm" onClick={onClose}>
            Close
          </McButton>
        </footer>
      </div>
    </div>,
    document.body,
  );
}

/** Shown on small screens, or inside the <object> when the browser can't embed the PDF. */
function ResumeFallback() {
  return (
    <div className="ct-resume__fallback">
      <ItemIcon name="craft-books" size={48} />
      <p>This book can't be opened here. Read it in a new tab or take a copy.</p>
      <div className="ct-resume__fallback-btns">
        <McButton href={contact.resume} target="_blank" rel="noreferrer">
          Open Resume
        </McButton>
        <McButton href={contact.resume} download="Jason-Tjandra-Resume.pdf">
          Download PDF
        </McButton>
      </div>
    </div>
  );
}

export default function ContactScreen() {
  const { go } = useNav();
  const reduced = useRef(prefersReducedMotion()).current;
  const nextId = useRef(0);
  const [lines, setLines] = useState<Line[]>(() =>
    reduced ? INTRO.map((l) => ({ ...l, id: nextId.current++ })) : [],
  );
  const [introDone, setIntroDone] = useState(reduced);
  const [typing, setTyping] = useState(false);
  const [value, setValue] = useState('');
  const history = useRef<string[]>([]);
  const histPos = useRef(-1);
  const logRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const timers = useRef<number[]>([]);
  const [resumeOpen, setResumeOpen] = useState(false);
  const resumeOpener = useRef<HTMLElement | null>(null);

  const push = useCallback((...add: Omit<Line, 'id'>[]) => {
    setLines((prev) => [...prev, ...add.map((l) => ({ ...l, id: nextId.current++ }))].slice(-MAX_LINES));
  }, []);

  const later = useCallback((fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  }, []);

  // Intro: messages arrive one by one with a short "typing" pause.
  useEffect(() => {
    if (reduced) return;
    INTRO.forEach((line, i) => {
      if (line.kind === 'chat') later(() => setTyping(true), INTRO_DELAYS[i] - 450);
      later(() => {
        setTyping(false);
        push(line);
        sfx.pop();
        if (i === INTRO.length - 1) setIntroDone(true);
      }, INTRO_DELAYS[i]);
    });
    const t = timers.current;
    return () => t.forEach((id) => window.clearTimeout(id));
  }, [reduced, later, push]);

  // Auto-scroll to the newest line.
  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines, typing]);

  const openLink = (link: ContactLink) => {
    if (link.href.startsWith('mailto:')) {
      window.location.href = link.href;
    } else {
      window.open(link.href, '_blank', 'noopener,noreferrer');
    }
  };

  const linkResult = (link: ContactLink): Omit<Line, 'id'> => ({
    kind: 'ok',
    text: link.href.startsWith('mailto:') ? `Opening mail to ${prettyHref(link.href)}…` : `Opening ${prettyHref(link.href)}…`,
  });

  const openResume = () => {
    resumeOpener.current = document.activeElement as HTMLElement | null;
    sfx.page();
    setResumeOpen(true);
  };

  const closeResume = useCallback(() => {
    setResumeOpen(false);
    // hand focus back to whatever opened it (button, command or chat input)
    window.setTimeout(() => resumeOpener.current?.focus(), 0);
  }, []);

  const copyEmail = async () => {
    sfx.click();
    const ok = await copyText(contact.email);
    if (ok) {
      sfx.xp();
      push({ kind: 'ok', text: `Copied ${contact.email} to clipboard!` });
    } else {
      sfx.deny();
      push({ kind: 'err', text: `Couldn't copy. The address is ${contact.email}` });
    }
  };

  const runCommand = (raw: string) => {
    const text = raw.trim();
    if (!text) return;
    history.current = [text, ...history.current.filter((h) => h !== text)].slice(0, 30);
    histPos.current = -1;

    if (!text.startsWith('/')) {
      push({ kind: 'you', name: 'You', text });
      sfx.pop();
      setTyping(true);
      later(() => {
        setTyping(false);
        push({
          kind: 'chat',
          name: site.name,
          text: 'Thanks for the message! Chat here is local only, so for a real reply type /email.',
        });
        sfx.pop();
      }, 700);
      return;
    }

    const cmd = text.split(/\s+/)[0].toLowerCase();
    const link = contact.links.find((l) => l.command.toLowerCase() === cmd);
    push({ kind: 'cmd', text });

    if (link) {
      sfx.click();
      push(linkResult(link));
      openLink(link);
      return;
    }

    switch (cmd) {
      case '/help':
        sfx.click();
        push(
          { kind: 'info', text: '--- Showing help ---' },
          ...contact.links.map((l) => ({ kind: 'info' as const, text: `${l.command}  ${l.label}` })),
          { kind: 'info', text: '/resume  Preview my resume' },
          { kind: 'info', text: '/location  Where I am based' },
          { kind: 'info', text: '/end  Roll the credits' },
          { kind: 'info', text: '/clear  Clear the chat' },
        );
        return;
      case '/resume':
      case '/cv':
        push({ kind: 'ok', text: 'Opening resume…' });
        openResume();
        return;
      case '/location':
        sfx.click();
        push({ kind: 'info', text: `Spawn point: ${contact.location}` });
        return;
      case '/clear':
        sfx.page();
        setLines([]);
        return;
      case '/end':
        push({ kind: 'ok', text: 'Entering the End portal…' });
        later(() => go('end'), 300);
        return;
      default:
        sfx.deny();
        push({ kind: 'err', text: 'Unknown command. Type /help for help.' });
    }
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    runCommand(value);
    setValue('');
  };

  const onInputKey = (e: KeyboardEvent<HTMLInputElement>) => {
    const h = history.current;
    if (e.key === 'ArrowUp' && h.length) {
      e.preventDefault();
      histPos.current = Math.min(h.length - 1, histPos.current + 1);
      setValue(h[histPos.current]);
    } else if (e.key === 'ArrowDown' && histPos.current >= 0) {
      e.preventDefault();
      histPos.current -= 1;
      setValue(histPos.current >= 0 ? h[histPos.current] : '');
    } else if (e.key === 'Escape') {
      setValue('');
      histPos.current = -1;
    }
  };

  // Clicking a command line: the <a> opens the link natively; we mirror it in the chat.
  const onLinkClick = (link: ContactLink) => (e: MouseEvent<HTMLAnchorElement>) => {
    e.stopPropagation();
    sfx.click();
    setValue(link.command);
    push({ kind: 'cmd', text: link.command }, linkResult(link));
    history.current = [link.command, ...history.current.filter((x) => x !== link.command)].slice(0, 30);
    later(() => setValue(''), 500);
  };

  const focusInput = () => {
    // don't steal a text selection the user is making in the log
    if (window.getSelection()?.toString()) return;
    inputRef.current?.focus();
  };

  return (
    <section className="ct" aria-labelledby="ct-title">
      <h2 id="ct-title" className="ct__title">
        Chat
      </h2>

      <div className="ct__chat" onClick={focusInput}>
        <div ref={logRef} className="ct__log" role="log" aria-live="polite" aria-label="Chat log" tabIndex={0}>
          {lines.map((l) => (
            <p key={l.id} className={`ct-line ct-line--${l.kind}`}>
              {l.name && <span className="ct-line__name">&lt;{l.name}&gt; </span>}
              {l.text}
            </p>
          ))}
          {typing && (
            <p className="ct-line ct-line--typing" aria-hidden="true">
              {site.name} is typing<span className="ct-dots" />
            </p>
          )}
        </div>

        <ul className={`ct__cmds ${introDone ? 'is-ready' : ''}`} aria-label="Contact commands" hidden={!introDone}>
          {contact.links.map((link) => {
            const isMail = link.href.startsWith('mailto:');
            return (
              <li key={link.command} className="ct-cmd">
                <a
                  className="ct-cmd__link"
                  href={link.href}
                  {...(isMail ? {} : { target: '_blank', rel: 'noreferrer' })}
                  onClick={onLinkClick(link)}
                >
                  <ItemIcon name={commandIcons[link.command] ?? 'contact-email'} size={16} />
                  <span className="ct-cmd__name">{link.command}</span>
                  <span className="ct-cmd__label">{link.label}</span>
                </a>
                {isMail && (
                  <button
                    type="button"
                    className="ct-cmd__copy"
                    onClick={(e) => {
                      e.stopPropagation();
                      void copyEmail();
                    }}
                  >
                    [Copy]
                  </button>
                )}
              </li>
            );
          })}
          <li className="ct-cmd">
            <button
              type="button"
              className="ct-cmd__link ct-cmd__link--btn"
              aria-haspopup="dialog"
              onClick={(e) => {
                e.stopPropagation();
                push({ kind: 'cmd', text: '/resume' }, { kind: 'ok', text: 'Opening resume…' });
                openResume();
              }}
            >
              <ItemIcon name="craft-books" size={16} />
              <span className="ct-cmd__name">/resume</span>
              <span className="ct-cmd__label">Preview my resume</span>
            </button>
          </li>
        </ul>

        <form className="ct__bar" onSubmit={onSubmit}>
          <label htmlFor="ct-input" className="sr-only">
            Chat message or command (type /help)
          </label>
          <span className="ct__prompt" aria-hidden="true">
            &gt;
          </span>
          <input
            ref={inputRef}
            id="ct-input"
            className="ct__input"
            type="text"
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              histPos.current = -1;
            }}
            onKeyDown={onInputKey}
            placeholder="Type /help"
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            maxLength={256}
            enterKeyHint="send"
          />
        </form>
      </div>

      <div className="ct__footer">
        <p className="ct__reply">{contact.replyTime}</p>
        <div className="ct__footer-btns">
          <McButton onClick={openResume} sound={null} aria-haspopup="dialog">
            View Resume
          </McButton>
          <McButton onClick={() => go('end')}>To The End</McButton>
        </div>
      </div>

      {resumeOpen && <ResumeModal onClose={closeResume} />}
    </section>
  );
}
