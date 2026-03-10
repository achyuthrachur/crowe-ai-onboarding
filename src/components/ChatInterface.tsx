'use client';
// Aesthetic: Swiss / typographic — structured, professional, type-led hierarchy

import { useState, useRef, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Send, Copy, Check, Sparkles, BookOpen } from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface HistoryTurn {
  role: 'user' | 'assistant';
  content: string;
}

interface Source {
  docId: string;
  docTitle: string;
  similarity: number;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: Source[];
}

// ─── Constants ───────────────────────────────────────────────────────────────

const STARTER_PROMPTS = [
  { label: 'Tech stack', prompt: 'What tech stack does the Crowe AI practice use?' },
  { label: 'Brand colors', prompt: 'What are the Crowe brand colors and when should I use them?' },
  { label: 'Dev setup', prompt: 'How do I set up my local development environment?' },
  { label: 'AI tools', prompt: 'What AI tools does the team use day-to-day?' },
];

// ─── Sub-components ──────────────────────────────────────────────────────────

function CodeBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <div className="relative group my-3 rounded-lg overflow-hidden">
      <pre className="bg-crowe-indigo-dark text-tint-100 p-4 overflow-x-auto text-sm font-mono leading-relaxed">
        <code>{code}</code>
      </pre>
      <button
        onClick={() => {
          navigator.clipboard.writeText(code);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }}
        className="absolute top-2 right-2 p-1.5 rounded bg-white/10 hover:bg-white/20 text-white/60 hover:text-white transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
        aria-label="Copy code"
      >
        {copied ? <Check size={13} /> : <Copy size={13} />}
      </button>
    </div>
  );
}

function SourceChip({ source }: { source: Source }) {
  const [expanded, setExpanded] = useState(false);
  const pct = Math.round(source.similarity * 100);

  return (
    <button
      onClick={() => setExpanded(e => !e)}
      title={source.docTitle}
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all cursor-pointer bg-white border-tint-200 text-tint-700 hover:bg-tint-50 hover:border-crowe-indigo/30 hover:text-crowe-indigo-dark"
    >
      <BookOpen size={11} className="text-crowe-amber flex-shrink-0" />
      <span className={expanded ? '' : 'max-w-[160px] truncate'}>{source.docTitle}</span>
      <span className="text-tint-500 flex-shrink-0 font-normal">{pct}%</span>
    </button>
  );
}

function LoadingSkeleton() {
  return (
    <div className="flex-1 space-y-2.5 pt-0.5 py-4">
      <div className="h-3 bg-tint-200 rounded-full animate-pulse" style={{ width: '72%' }} />
      <div className="h-3 bg-tint-200 rounded-full animate-pulse" style={{ width: '55%' }} />
      <div className="h-3 bg-tint-200 rounded-full animate-pulse" style={{ width: '64%' }} />
    </div>
  );
}

function EmptyState({ onSelect }: { onSelect: (prompt: string) => void }) {
  return (
    <div className="flex flex-col items-center justify-center flex-1 px-4 py-16 text-center">
      <div className="w-12 h-12 rounded-2xl bg-crowe-indigo-dark flex items-center justify-center mb-6 shadow-crowe-lg">
        <Sparkles size={22} className="text-crowe-amber" />
      </div>
      <h2 className="text-xl font-display font-bold text-crowe-indigo-dark mb-2">
        Ask me anything about Crowe AI
      </h2>
      <p className="text-sm text-tint-500 mb-8 max-w-sm">
        I&apos;m trained on the Crowe AI practice knowledge base — stack, brand, workflows, and more.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full max-w-lg">
        {STARTER_PROMPTS.map(({ label, prompt }) => (
          <button
            key={label}
            onClick={() => onSelect(prompt)}
            className="text-left px-4 py-3 rounded-xl border border-tint-200 bg-white hover:border-crowe-indigo/30 hover:bg-tint-50 hover:shadow-crowe-sm transition-all text-sm"
          >
            <span className="font-semibold text-crowe-indigo-dark block mb-0.5">{label}</span>
            <span className="text-xs text-tint-500 line-clamp-1">{prompt}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Markdown components ──────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const markdownComponents: Record<string, React.ComponentType<any>> = {
  code({ children, className }: { children?: React.ReactNode; className?: string }) {
    const text = String(children ?? '').replace(/\n$/, '');
    const isBlock = text.includes('\n') || !!className;
    if (!isBlock) {
      return (
        <code className="bg-tint-100 text-crowe-indigo px-1.5 py-0.5 rounded text-[0.85em] font-mono">
          {children}
        </code>
      );
    }
    return <CodeBlock code={text} />;
  },
  pre({ children }: { children?: React.ReactNode }) {
    return <>{children}</>;
  },
  h1({ children }: { children?: React.ReactNode }) {
    return <h1 className="text-lg font-display font-bold text-crowe-indigo-dark mt-4 mb-2 first:mt-0">{children}</h1>;
  },
  h2({ children }: { children?: React.ReactNode }) {
    return <h2 className="text-base font-display font-bold text-crowe-indigo-dark mt-4 mb-2 first:mt-0">{children}</h2>;
  },
  h3({ children }: { children?: React.ReactNode }) {
    return <h3 className="text-sm font-display font-bold text-crowe-indigo-dark mt-3 mb-1.5 first:mt-0">{children}</h3>;
  },
  ul({ children }: { children?: React.ReactNode }) {
    return <ul className="list-disc list-outside pl-5 space-y-1 my-2">{children}</ul>;
  },
  ol({ children }: { children?: React.ReactNode }) {
    return <ol className="list-decimal list-outside pl-5 space-y-1 my-2">{children}</ol>;
  },
  li({ children }: { children?: React.ReactNode }) {
    return <li className="text-sm leading-relaxed">{children}</li>;
  },
  p({ children }: { children?: React.ReactNode }) {
    return <p className="text-sm leading-relaxed mb-2 last:mb-0">{children}</p>;
  },
  strong({ children }: { children?: React.ReactNode }) {
    return <strong className="font-semibold text-crowe-indigo-dark">{children}</strong>;
  },
  a({ href, children }: { href?: string; children?: React.ReactNode }) {
    return (
      <a href={href} className="text-crowe-blue hover:text-crowe-blue-dark underline" target="_blank" rel="noopener noreferrer">
        {children}
      </a>
    );
  },
  blockquote({ children }: { children?: React.ReactNode }) {
    return (
      <blockquote className="border-l-2 border-crowe-amber pl-4 my-2 text-tint-600 italic">
        {children}
      </blockquote>
    );
  },
  table({ children }: { children?: React.ReactNode }) {
    return (
      <div className="overflow-x-auto my-3">
        <table className="text-sm border-collapse w-full">{children}</table>
      </div>
    );
  },
  th({ children }: { children?: React.ReactNode }) {
    return <th className="text-left px-3 py-2 bg-tint-100 font-semibold text-crowe-indigo-dark border border-tint-200 text-xs">{children}</th>;
  },
  td({ children }: { children?: React.ReactNode }) {
    return <td className="px-3 py-2 border border-tint-200 text-tint-700">{children}</td>;
  },
};

// ─── Main component ───────────────────────────────────────────────────────────

export function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [history, setHistory] = useState<HistoryTurn[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(ta.scrollHeight, 120)}px`;
  }, [input]);

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: trimmed };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmed, history }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: { reply: string; sources: Source[] } = await res.json();

      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.reply,
        sources: data.sources,
      };
      setMessages(prev => [...prev, assistantMsg]);
      setHistory(prev => [
        ...prev,
        { role: 'user', content: trimmed },
        { role: 'assistant', content: data.reply },
      ]);
    } catch {
      setMessages(prev => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: 'Something went wrong. Please try again.',
          sources: [],
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [history, isLoading]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-page">
      {/* Header */}
      <header className="flex-shrink-0 h-14 bg-crowe-indigo-dark flex items-center px-4 sm:px-6 shadow-crowe-md">
        <div className="flex items-center gap-3">
          <span className="text-white font-display font-bold text-lg tracking-tight">Crowe</span>
          <div className="w-px h-4 bg-white/20" />
          <span className="text-white/70 text-sm font-body">AI Onboarding</span>
        </div>
      </header>

      {/* Messages */}
      <main className="flex-1 overflow-y-auto flex flex-col">
        {messages.length === 0 && !isLoading ? (
          <EmptyState onSelect={(p) => sendMessage(p)} />
        ) : (
          <div className="max-w-3xl mx-auto w-full px-4 py-6 space-y-6">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'assistant' && (
                  <div className="w-7 h-7 rounded-full bg-crowe-indigo-dark flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Sparkles size={13} className="text-crowe-amber" />
                  </div>
                )}

                <div className={`flex flex-col gap-2 min-w-0 ${msg.role === 'user' ? 'items-end max-w-[85%] sm:max-w-[75%]' : 'items-start max-w-[90%] sm:max-w-[80%]'}`}>
                  <div className={
                    msg.role === 'user'
                      ? 'bg-crowe-indigo-dark text-white px-4 py-3 rounded-2xl rounded-tr-sm text-sm leading-relaxed'
                      : 'bg-white border border-tint-200 px-4 py-3 rounded-2xl rounded-tl-sm shadow-crowe-sm text-tint-700'
                  }>
                    {msg.role === 'user' ? (
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                    ) : (
                      <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                        {msg.content}
                      </ReactMarkdown>
                    )}
                  </div>

                  {msg.role === 'assistant' && msg.sources && msg.sources.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 px-1">
                      {msg.sources.map((source) => (
                        <SourceChip key={source.docId} source={source} />
                      ))}
                    </div>
                  )}
                </div>

                {msg.role === 'user' && (
                  <div className="w-7 h-7 rounded-full bg-tint-200 flex items-center justify-center flex-shrink-0 mt-0.5 text-[10px] font-semibold text-tint-600">
                    YOU
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-3">
                <div className="w-7 h-7 rounded-full bg-crowe-indigo-dark flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Sparkles size={13} className="text-crowe-amber" />
                </div>
                <LoadingSkeleton />
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </main>

      {/* Input */}
      <footer className="flex-shrink-0 border-t border-tint-200 bg-white px-4 py-4 sm:px-6">
        <div className="max-w-3xl mx-auto">
          <div className="flex gap-3 items-end bg-tint-50 border border-tint-200 rounded-2xl px-4 py-3 focus-within:border-crowe-indigo/50 focus-within:bg-white transition-all">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about the Crowe AI practice…"
              disabled={isLoading}
              rows={1}
              className="flex-1 resize-none bg-transparent text-sm text-tint-700 placeholder-tint-400 outline-none leading-relaxed py-0.5 min-h-[24px] max-h-[120px] disabled:opacity-50"
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || isLoading}
              className="flex-shrink-0 w-8 h-8 rounded-xl bg-crowe-indigo-dark hover:bg-crowe-indigo disabled:bg-tint-200 text-white disabled:text-tint-400 flex items-center justify-center transition-all shadow-crowe-sm disabled:shadow-none"
              aria-label="Send message"
            >
              <Send size={14} />
            </button>
          </div>
          <p className="text-center text-xs text-tint-400 mt-2">
            Powered by Crowe AI practice knowledge · Enter to send · Shift+Enter for new line
          </p>
        </div>
      </footer>
    </div>
  );
}
