import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { ArrowLeft, Send, Sparkles, Video, Tag, BookOpen, Loader2 } from "lucide-react";
import { MobileShell } from "@/components/layout/BottomNav";
import {
  askSupport,
  type SupportAudience,
  type SupportSource,
} from "@/lib/support.functions";

export const Route = createFileRoute("/support")({
  head: () => ({
    meta: [
      { title: "Support — Travidz" },
      { name: "description", content: "Ask the Travidz assistant about deals, videos, itineraries and how the platform works." },
    ],
  }),
  component: SupportPage,
});

type Msg = {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: SupportSource[];
  pending?: boolean;
};

const AUDIENCES: { value: SupportAudience; label: string }[] = [
  { value: "traveller", label: "Traveller" },
  { value: "creator", label: "Creator" },
  { value: "business", label: "Business" },
];

const SUGGESTIONS: Record<SupportAudience, string[]> = {
  traveller: [
    "Find me a quiet beach with snorkeling",
    "How do collections work?",
    "Plan me 5 days in Lisbon",
  ],
  creator: [
    "How do I tag a business in my video?",
    "What commission do I earn on deals?",
    "How do I apply to promote a deal?",
  ],
  business: [
    "How do I list a deal on Travidz?",
    "What's the commission structure?",
    "How are creator applications reviewed?",
  ],
};

function SupportPage() {
  const ask = useServerFn(askSupport);
  const [audience, setAudience] = useState<SupportAudience>("traveller");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send(question: string) {
    const q = question.trim();
    if (!q || streaming) return;
    setInput("");
    const userMsg: Msg = { id: crypto.randomUUID(), role: "user", content: q };
    const aMsgId = crypto.randomUUID();
    const aMsg: Msg = { id: aMsgId, role: "assistant", content: "", pending: true };
    const history = messages
      .filter((m) => !m.pending)
      .slice(-6)
      .map((m) => ({ role: m.role, content: m.content }));
    setMessages((prev) => [...prev, userMsg, aMsg]);
    setStreaming(true);
    try {
      const stream = await ask({ data: { question: q, audience, history } });
      for await (const chunk of stream as AsyncIterable<{
        delta: string;
        sources: SupportSource[];
        done: boolean;
      }>) {
        if (chunk.delta) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === aMsgId ? { ...m, content: m.content + chunk.delta, pending: false } : m,
            ),
          );
        }
        if (chunk.done) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === aMsgId
                ? { ...m, pending: false, sources: chunk.sources, content: m.content || "I couldn't generate a response. Please try again." }
                : m,
            ),
          );
        }
      }
    } catch (e: any) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === aMsgId
            ? { ...m, pending: false, content: e?.message ?? "Something went wrong. Please try again." }
            : m,
        ),
      );
    } finally {
      setStreaming(false);
    }
  }

  return (
    <MobileShell>
      <div className="flex h-screen flex-col">
        <header className="border-b border-border bg-background/95 px-4 pb-3 pt-6 backdrop-blur">
          <Link to="/" className="mb-2 inline-flex items-center gap-1 text-xs text-muted-foreground">
            <ArrowLeft className="h-3 w-3" /> Home
          </Link>
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <Sparkles className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <h1 className="font-display text-lg font-semibold leading-tight">Travidz Support</h1>
              <p className="text-[11px] text-muted-foreground">
                AI assistant — grounded in real videos &amp; deals on the platform.
              </p>
            </div>
          </div>
          <div className="mt-3 flex gap-1.5 overflow-x-auto">
            {AUDIENCES.map((a) => (
              <button
                key={a.value}
                onClick={() => setAudience(a.value)}
                className={`shrink-0 rounded-full border px-3 py-1 text-[11px] font-semibold ${
                  audience === a.value
                    ? "border-primary bg-primary/15 text-primary"
                    : "border-border bg-card text-muted-foreground"
                }`}
              >
                {a.label}
              </button>
            ))}
          </div>
          <p className="mt-3 text-[11px] text-muted-foreground">
            Prefer email? Reach a human at{" "}
            <a href="mailto:support@travidz.com" className="font-medium text-primary hover:underline">
              support@travidz.com
            </a>
          </p>
        </header>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          {messages.length === 0 ? (
            <div className="mx-auto max-w-md pt-6 text-center">
              <h2 className="font-display text-xl font-semibold">Ask me anything</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                I can answer questions about how Travidz works and surface real content for you.
              </p>
              <div className="mt-5 flex flex-col gap-2 text-left">
                {SUGGESTIONS[audience].map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="rounded-xl border border-border bg-card px-3 py-2.5 text-sm hover:border-primary/40 hover:bg-primary/5"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <ul className="mx-auto flex max-w-2xl flex-col gap-4">
              {messages.map((m) => (
                <li
                  key={m.id}
                  className={`flex flex-col ${m.role === "user" ? "items-end" : "items-start"}`}
                >
                  <div
                    className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-sm ${
                      m.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-card text-foreground"
                    }`}
                  >
                    {m.pending && !m.content ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : m.role === "assistant" ? (
                      <div className="prose prose-sm max-w-none dark:prose-invert prose-p:my-2 prose-li:my-0.5">
                        <ReactMarkdown>{m.content}</ReactMarkdown>
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap">{m.content}</p>
                    )}
                  </div>
                  {m.sources && m.sources.length > 0 && (
                    <div className="mt-2 flex max-w-[88%] flex-wrap gap-1.5">
                      {m.sources.map((s) => (
                        <SourceChip key={`${s.kind}-${s.id}`} source={s} />
                      ))}
                    </div>
                  )}
                </li>
              ))}
              <div ref={endRef} />
            </ul>
          )}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="border-t border-border bg-background/95 p-3 pb-6 backdrop-blur"
        >
          <div className="mx-auto flex max-w-2xl items-end gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send(input);
                }
              }}
              placeholder="Ask Travidz Support…"
              rows={1}
              maxLength={2000}
              className="max-h-32 min-h-[44px] flex-1 resize-none rounded-2xl border border-border bg-card px-3.5 py-2.5 text-sm outline-none focus:border-primary"
            />
            <button
              type="submit"
              disabled={!input.trim() || streaming}
              aria-label="Send"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground disabled:opacity-50"
            >
              {streaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </div>
        </form>
      </div>
    </MobileShell>
  );
}

function SourceChip({ source }: { source: SupportSource }) {
  const Icon = source.kind === "video" ? Video : source.kind === "deal" ? Tag : BookOpen;
  const label = source.title.length > 42 ? `${source.title.slice(0, 42)}…` : source.title;
  const content = (
    <span className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2 py-0.5 text-[10px] text-muted-foreground hover:border-primary/40 hover:text-foreground">
      <Icon className="h-3 w-3" />
      {label}
    </span>
  );
  if (source.href && source.kind === "deal") {
    return (
      <Link to="/deals/$id" params={{ id: source.id }}>
        {content}
      </Link>
    );
  }
  if (source.href) {
    return <a href={source.href}>{content}</a>;
  }
  return content;
}