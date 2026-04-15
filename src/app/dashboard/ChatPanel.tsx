'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, ChevronDown, ChevronRight, Loader2 } from 'lucide-react';
import { ChatMessage } from './types';

const SUGGESTIONS = [
  'How many active members do we have right now?',
  "What's our total MRR by tier this month?",
  'Show me the top 5 deals by MRR that closed in March',
  'Which billing source has the highest churn rate?',
];

function formatCellValue(key: string, val: unknown): string {
  if (val == null) return '\u2014';
  if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(val)) {
    const d = new Date(val);
    if (!isNaN(d.getTime())) {
      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        timeZone: 'America/Los_Angeles',
      }).format(d);
    }
  }
  if (typeof val === 'number') {
    const formatted = new Intl.NumberFormat('en-US').format(val);
    if (/mrr|revenue|amount/i.test(key)) return `$${formatted}`;
    return formatted;
  }
  return String(val);
}

function ChatBubble({ msg }: { msg: ChatMessage }) {
  const [sqlOpen, setSqlOpen] = useState(false);
  const MAX_DISPLAY_ROWS = 20;

  const thClass = 'text-left text-xs font-medium uppercase tracking-wider pb-2 border-b';
  const tdClass = 'py-2 border-b';

  return (
    <div className="space-y-2">
      <div className="rounded-lg p-3 text-sm" style={{ background: 'var(--neutral-100)', color: 'var(--neutral-700)' }}>
        {msg.question}
      </div>

      {msg.loading && (
        <div className="flex items-center gap-2 text-sm py-2" style={{ color: 'var(--neutral-400)' }}>
          <Loader2 className="w-4 h-4 animate-spin" />
          Generating query...
        </div>
      )}

      {msg.error && (
        <div className="rounded-lg p-3 text-sm border" style={{ background: 'var(--color-danger-light)', borderColor: '#fecaca', color: '#b91c1c' }}>
          {msg.error}
          {msg.sql && (
            <pre className="mt-2 rounded-lg p-3 font-mono text-xs overflow-x-auto whitespace-pre-wrap" style={{ background: 'var(--neutral-900)', color: 'var(--neutral-100)' }}>{msg.sql}</pre>
          )}
        </div>
      )}

      {msg.summary && (
        <div className="text-base font-medium py-1" style={{ color: 'var(--neutral-900)' }}>{msg.summary}</div>
      )}

      {msg.sql && !msg.error && (
        <button
          onClick={() => setSqlOpen(!sqlOpen)}
          className="flex items-center gap-1 text-xs transition-colors hover:opacity-70"
          style={{ color: 'var(--neutral-400)' }}
        >
          {sqlOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          {sqlOpen ? 'Hide SQL' : 'Show SQL'}
        </button>
      )}
      {sqlOpen && msg.sql && (
        <pre className="rounded-lg p-4 font-mono text-xs overflow-x-auto whitespace-pre-wrap" style={{ background: 'var(--neutral-900)', color: 'var(--neutral-100)' }}>{msg.sql}</pre>
      )}

      {msg.rows && msg.rows.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                {Object.keys(msg.rows[0]).map((col) => (
                  <th key={col} className={thClass} style={{ color: 'var(--neutral-400)', borderColor: 'var(--neutral-200)' }}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {msg.rows.slice(0, MAX_DISPLAY_ROWS).map((row, i) => (
                <tr key={i}>
                  {Object.entries(row).map(([key, val], j) => (
                    <td key={j} className={tdClass} style={{ borderColor: 'var(--neutral-100)' }}>{formatCellValue(key, val)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {msg.row_count > MAX_DISPLAY_ROWS && (
            <p className="text-xs mt-2" style={{ color: 'var(--neutral-400)' }}>Showing {MAX_DISPLAY_ROWS} of {msg.row_count} rows</p>
          )}
        </div>
      )}
    </div>
  );
}

export default function ChatPanel() {
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatOpen, setChatOpen] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const submitQuestion = useCallback(async (question: string) => {
    const id = crypto.randomUUID();
    const msg: ChatMessage = { id, question, summary: null, sql: null, rows: null, row_count: 0, error: null, loading: true };
    setChatMessages((prev) => [...prev, msg]);
    setChatInput('');

    try {
      const res = await fetch('/api/dashboard/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
      });
      const data = await res.json();
      if (!res.ok) {
        setChatMessages((prev) => prev.map((m) => m.id === id ? { ...m, loading: false, error: data.error || 'Request failed', sql: data.sql || null } : m));
      } else {
        setChatMessages((prev) => prev.map((m) => m.id === id ? { ...m, loading: false, summary: data.summary, sql: data.sql, rows: data.rows, row_count: data.row_count } : m));
      }
    } catch {
      setChatMessages((prev) => prev.map((m) => m.id === id ? { ...m, loading: false, error: 'Network error' } : m));
    }
  }, []);

  return (
    <div
      className="rounded-2xl border"
      style={{ background: 'var(--card-bg)', borderColor: 'var(--card-border)', boxShadow: 'var(--shadow-sm)' }}
    >
      <button
        onClick={() => setChatOpen(!chatOpen)}
        className="w-full flex items-center justify-between p-4 transition-colors rounded-2xl hover:bg-[var(--neutral-50)]"
      >
        <h2 className="text-sm font-medium" style={{ color: 'var(--neutral-400)' }}>Ask a question about your data</h2>
        {chatOpen
          ? <ChevronDown className="w-5 h-5" style={{ color: 'var(--neutral-400)' }} />
          : <ChevronRight className="w-5 h-5" style={{ color: 'var(--neutral-400)' }} />
        }
      </button>

      {chatOpen && (
        <div className="border-t p-4 space-y-4" style={{ borderColor: 'var(--neutral-100)' }}>
          {chatMessages.length === 0 && (
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => submitQuestion(s)}
                  className="text-xs rounded-full px-4 py-2 transition-all border font-medium"
                  style={{ color: 'var(--neutral-600)', background: 'var(--card-bg)', borderColor: 'var(--neutral-200)', boxShadow: 'var(--shadow-xs)' }}
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {chatMessages.length > 0 && (
            <div className="max-h-[600px] overflow-y-auto space-y-4">
              {chatMessages.map((msg) => (
                <ChatBubble key={msg.id} msg={msg} />
              ))}
              <div ref={chatEndRef} />
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (chatInput.trim()) submitQuestion(chatInput.trim());
            }}
            className="flex gap-2"
          >
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Ask about revenue, members, deals, churn..."
              className="flex-1 border rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/20 focus:border-[var(--brand-primary)]"
              style={{ borderColor: 'var(--neutral-200)' }}
            />
            <button
              type="submit"
              disabled={!chatInput.trim()}
              className="px-4 py-2 text-white rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: 'var(--brand-primary)', boxShadow: 'var(--shadow-xs)' }}
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
