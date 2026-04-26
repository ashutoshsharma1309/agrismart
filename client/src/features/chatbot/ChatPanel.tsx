import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Phone, RotateCcw, Send, ShieldAlert, Wifi } from 'lucide-react';
import { Avatar } from '../../components/shared/Avatar';
import { Button } from '../../components/ui/Button';
import { useChat } from './ChatContext';
import { cn } from '../../lib/utils';
import { AiDisclaimer } from '../../components/shared/AiDisclaimer';

export function ChatPanel({
  variant = 'popover',
  onClose,
}: {
  variant?: 'popover' | 'fullscreen';
  onClose?: () => void;
}) {
  const { t } = useTranslation();
  const { messages, typing, send, reset } = useChat();
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, typing]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim() || typing) return;
    const message = input;
    setInput('');
    await send(message);
  };

  const quickReplies = useMemo(() => contextualQuickReplies(messages, t), [messages, t]);

  return (
    <div
      className={cn(
        'flex h-full flex-col bg-white',
        variant === 'popover' ? 'rounded-2xl' : '',
      )}
    >
      {/* Header */}
      <div
        className={cn(
          'flex items-center gap-3 border-b border-border bg-white p-4',
          variant === 'popover' && 'rounded-t-2xl',
        )}
      >
        <Avatar name="AgriSmart Assistant" size={40} />
        <div className="flex-1">
          <div className="font-semibold text-ink">{t('chat.title')}</div>
          <div className="flex items-center gap-1.5 text-xs text-ink-muted">
            <span className="inline-block h-2 w-2 rounded-full bg-success animate-pulse-dot" />
            {t('chat.online')}
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={reset}
          leadingIcon={<RotateCcw size={14} />}
          aria-label={t('chat.reset')}
          className="h-9 w-9 !px-0"
        />
        {onClose ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-9 w-9 !px-0"
            aria-label={t('common.close')}
          >
            ×
          </Button>
        ) : null}
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto bg-surface-2 p-4">
        {messages.map((m) => (
          <MessageBubble key={m.id} role={m.role} text={m.text} fallback={m.fallback} />
        ))}
        {typing ? (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 text-xs text-ink-muted"
          >
            <Avatar name="A" size={24} />
            <span className="inline-flex gap-0.5">
              <Dot delay={0} />
              <Dot delay={0.15} />
              <Dot delay={0.3} />
            </span>
          </motion.div>
        ) : null}
      </div>

      {/* Contextual quick replies */}
      {quickReplies.length ? (
        <div className="flex flex-wrap gap-2 border-t border-border bg-white px-4 pt-3">
          {quickReplies.map((q) => (
            <button
              key={q}
              type="button"
              className="rounded-full border border-border bg-white px-3 py-1.5 text-xs font-medium text-ink-muted hover:border-brand-200 hover:bg-brand-50/40 hover:text-ink"
              onClick={() => void send(q)}
            >
              {q}
            </button>
          ))}
        </div>
      ) : null}

      {/* Input */}
      <form
        onSubmit={handleSubmit}
        className={cn(
          'flex items-center gap-2 border-t border-border bg-white p-3',
          variant === 'popover' && 'rounded-b-2xl',
        )}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t('chat.placeholder')}
          className="h-11 flex-1 rounded-xl border border-border bg-white px-3.5 text-sm placeholder:text-ink-subtle focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
          aria-label={t('chat.placeholder')}
        />
        <Button
          type="submit"
          disabled={!input.trim() || typing}
          leadingIcon={<Send size={16} />}
          aria-label={t('chat.send')}
        >
          <span className="hidden sm:inline">{t('chat.send')}</span>
        </Button>
      </form>

      {/* Persistent escalation footer */}
      <div
        className={cn(
          'flex flex-wrap items-center justify-between gap-2 border-t border-border bg-brand-50/30 px-4 py-2 text-xs',
          variant === 'popover' && 'rounded-b-2xl',
        )}
      >
        <span className="text-ink-muted">{t('chat.escalation.intro')}</span>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/app/kvk-directory"
            className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-1 font-medium text-brand-700 hover:bg-brand-50"
          >
            <ShieldAlert size={11} />
            {t('chat.escalation.kvk')}
          </Link>
          <a
            href="tel:1800-180-1551"
            className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-1 font-medium text-brand-700 hover:bg-brand-50"
          >
            <Phone size={11} />
            1800-180-1551
          </a>
        </div>
      </div>
    </div>
  );
}

function Dot({ delay }: { delay: number }) {
  return (
    <motion.span
      className="inline-block h-1.5 w-1.5 rounded-full bg-ink-muted"
      animate={{ opacity: [0.2, 1, 0.2] }}
      transition={{ duration: 1.2, repeat: Infinity, delay }}
    />
  );
}

function MessageBubble({
  role,
  text,
  fallback,
}: {
  role: 'user' | 'assistant';
  text: string;
  fallback?: boolean;
}) {
  const { t } = useTranslation();
  const isUser = role === 'user';
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn('flex', isUser ? 'justify-end' : 'justify-start')}
    >
      <div
        className={cn(
          'max-w-[85%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed',
          isUser
            ? 'rounded-br-md bg-brand text-white'
            : 'rounded-bl-md border border-border bg-white text-ink',
        )}
      >
        {!isUser && fallback ? (
          <div className="mb-1 inline-flex items-center gap-1 rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-900">
            <Wifi size={10} />
            {t('ai.banner.fallback')}
          </div>
        ) : null}
        {isUser ? (
          <span>{text}</span>
        ) : (
          <>
            <RichText text={text} />
            <AiDisclaimer className="mt-2 border-t border-border/50 pt-1.5" />
          </>
        )}
      </div>
    </motion.div>
  );
}

// Lightweight markdown renderer: paragraph breaks, • bullets, **bold**.
// Avoids pulling in a full markdown lib for chat output where the surface is
// small and predictable.
function RichText({ text }: { text: string }) {
  const blocks = text
    .replace(/\r\n/g, '\n')
    .split(/\n{2,}/)
    .map((b) => b.trim())
    .filter(Boolean);
  return (
    <>
      {blocks.map((block, i) => {
        const lines = block.split('\n');
        const isList = lines.length >= 2 && lines.every((l) => /^[•\-*]\s/.test(l.trim()));
        if (isList) {
          return (
            <ul key={i} className="my-1 list-none space-y-1 pl-0">
              {lines.map((line, j) => (
                <li key={j} className="flex gap-2">
                  <span className="mt-1.5 inline-block h-1 w-1 shrink-0 rounded-full bg-current opacity-60" />
                  <span>{renderInline(line.replace(/^[•\-*]\s+/, ''))}</span>
                </li>
              ))}
            </ul>
          );
        }
        return (
          <p key={i} className={cn(i > 0 && 'mt-2')}>
            {renderInline(block)}
          </p>
        );
      })}
    </>
  );
}

function renderInline(s: string): React.ReactNode {
  // Split on **bold** runs, leaving everything else as plain text.
  const parts = s.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (/^\*\*[^*]+\*\*$/.test(part)) {
      return (
        <strong key={i} className="font-semibold">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

// Pick contextual quick-reply chips by lightly inspecting the last assistant
// message. Keyword extraction is intentionally simple — no second LLM call.
function contextualQuickReplies(
  messages: { role: 'user' | 'assistant'; text: string }[],
  t: (k: string) => string,
): string[] {
  const lastBot = [...messages].reverse().find((m) => m.role === 'assistant')?.text ?? '';
  const lower = lastBot.toLowerCase();

  if (!lastBot) {
    return [
      t('chat.quick.starter.plant'),
      t('chat.quick.starter.yellowing'),
      t('chat.quick.starter.weatherRisks'),
      t('chat.quick.starter.schemes'),
    ];
  }

  if (
    /pesticide|insecticide|fungicide|fertili[sz]er|spray|dose|chemical/.test(lower)
  ) {
    return [
      t('chat.quick.chem.organic'),
      t('chat.quick.chem.applySafely'),
      t('chat.quick.chem.timing'),
      t('chat.quick.chem.rainAfter'),
    ];
  }

  if (
    /disease|blight|wilt|rust|spot|mildew|rot|virus|bacterial/.test(lower)
  ) {
    return [
      t('chat.quick.disease.prevent'),
      t('chat.quick.disease.organic'),
      t('chat.quick.disease.spread'),
      t('chat.quick.disease.kvk'),
    ];
  }

  if (/paddy|wheat|cotton|maize|sugarcane|chickpea|pulse|ragi|jowar|bajra|tomato|onion|chilli/.test(lower)) {
    return [
      t('chat.quick.crop.pests'),
      t('chat.quick.crop.yield'),
      t('chat.quick.crop.variety'),
      t('chat.quick.crop.tellMore'),
    ];
  }

  return [
    t('chat.quick.starter.plant'),
    t('chat.quick.starter.yellowing'),
    t('chat.quick.starter.weatherRisks'),
    t('chat.quick.starter.schemes'),
  ];
}
