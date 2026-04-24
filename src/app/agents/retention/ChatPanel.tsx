'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Send, Loader2 } from 'lucide-react';

interface ChatMessage {
  id: string;
  question: string;
  answer: string | null;
  error: string | null;
  loading: boolean;
}

const DEFAULT_SUGGESTIONS = [
  'Why do Skool-native members churn so much more than ACE/Recharge?',
  'Which segment has the highest churn risk?',
  'How is AI activation calculated?',
  'What should the CS team prioritize this month?',
];

const DEFAULT_DESCRIPTION =
  'Ask questions about this cohort — signals, anomalies, member segments, or how any metric is calculated.';
const DEFAULT_PLACEHOLDER = 'Ask about a signal, segment, or metric…';
const DEFAULT_LOADING_PLACEHOLDER = 'Loading cohort…';
const DEFAULT_API_ROUTE = '/api/agents/retention/chat';

function ChatBubble({ msg }: { msg: ChatMessage }) {
  return (
    <div className="space-y-2">
      <div
        className="rounded-lg p-3 text-sm"
        style={{
          background: 'var(--neutral-100)',
          color: 'var(--neutral-700)',
        }}
      >
        {msg.question}
      </div>

      {msg.loading && (
        <div
          className="flex items-center gap-2 text-sm py-2"
          style={{ color: 'var(--neutral-400)' }}
        >
          <Loader2 className="w-4 h-4 animate-spin" />
          Thinking…
        </div>
      )}

      {msg.error && (
        <div
          className="rounded-lg p-3 text-sm border"
          style={{
            background: 'var(--color-danger-light, #fef2f2)',
            borderColor: '#fecaca',
            color: '#b91c1c',
          }}
        >
          {msg.error}
        </div>
      )}

      {msg.answer && (
        <div
          className="text-sm py-1"
          style={{
            color: 'var(--neutral-800)',
            lineHeight: 1.6,
            whiteSpace: 'pre-wrap',
          }}
        >
          {msg.answer}
        </div>
      )}
    </div>
  );
}

export default function ChatPanel({
  cohort,
  noCard = false,
  apiRoute = DEFAULT_API_ROUTE,
  description = DEFAULT_DESCRIPTION,
  placeholder = DEFAULT_PLACEHOLDER,
  loadingPlaceholder = DEFAULT_LOADING_PLACEHOLDER,
  suggestions = DEFAULT_SUGGESTIONS,
}: {
  cohort: unknown;
  noCard?: boolean;
  apiRoute?: string;
  description?: string;
  placeholder?: string;
  loadingPlaceholder?: string;
  suggestions?: string[];
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const submitQuestion = useCallback(
    async (question: string) => {
      if (!cohort) return;
      const id = crypto.randomUUID();
      const msg: ChatMessage = {
        id,
        question,
        answer: null,
        error: null,
        loading: true,
      };
      const history = messages.slice(-8).map((m) => ({
        question: m.question,
        answer: m.answer,
      }));
      setMessages((prev) => [...prev, msg]);
      setInput('');

      try {
        const res = await fetch(apiRoute, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ question, history, cohort }),
        });
        const data = await res.json();
        if (!res.ok) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === id
                ? {
                    ...m,
                    loading: false,
                    error: data.error || 'Request failed',
                  }
                : m
            )
          );
        } else {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === id
                ? { ...m, loading: false, answer: data.answer }
                : m
            )
          );
        }
      } catch {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === id
              ? { ...m, loading: false, error: 'Network error' }
              : m
          )
        );
      }
    },
    [cohort, messages, apiRoute]
  );

  const ready = !!cohort;

  return (
    <div
      className={noCard ? '' : 'rounded-2xl border'}
      style={
        noCard
          ? { padding: 20 }
          : {
              background: 'var(--card-bg)',
              borderColor: 'var(--card-border)',
              boxShadow: 'var(--shadow-sm)',
              padding: 20,
            }
      }
    >
      <div
        style={{
          fontSize: 13,
          color: 'var(--neutral-500)',
          marginBottom: 14,
        }}
      >
        {description}
      </div>

      {messages.length === 0 && ready && (
        <div className="flex flex-wrap gap-2 mb-4">
          {suggestions.map((s) => (
            <button
              key={s}
              onClick={() => submitQuestion(s)}
              className="text-xs rounded-full px-4 py-2 transition-all border font-medium hover:bg-[var(--neutral-50)]"
              style={{
                color: 'var(--neutral-600)',
                background: 'var(--card-bg)',
                borderColor: 'var(--neutral-200)',
              }}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {messages.length > 0 && (
        <div className="max-h-[600px] overflow-y-auto space-y-4 mb-4">
          {messages.map((m) => (
            <ChatBubble key={m.id} msg={m} />
          ))}
          <div ref={endRef} />
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          const trimmed = input.trim();
          if (trimmed && ready) submitQuestion(trimmed);
        }}
        className="flex gap-2"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={ready ? placeholder : loadingPlaceholder}
          disabled={!ready}
          className="flex-1 border rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/20 focus:border-[var(--brand-primary)] disabled:opacity-60"
          style={{ borderColor: 'var(--neutral-200)' }}
        />
        <button
          type="submit"
          disabled={!input.trim() || !ready}
          className="px-4 py-2 text-white rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ background: 'var(--brand-primary, #7c3aed)' }}
          aria-label="Send message"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
