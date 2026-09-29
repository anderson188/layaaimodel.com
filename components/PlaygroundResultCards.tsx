"use client";

type ResultField = {
  key: string;
  label: string;
  type: "choice" | "score" | "noul";
};

type AnswerShape = {
  type?: string;
  choice?: string;
  score?: number;
  noul?: number;
  confidence?: number;
  probabilities?: Record<string, number>;
  legend?: Record<string, string>;
};

type Props = {
  resultFields: ResultField[];
  display: Record<string, string>;
  answers?: Record<string, unknown> | null;
  questions?: Record<string, { type: string; criteria?: Record<string, string | null> | string[] }>;
  emptyHint?: string;
};

function parseDisplay(raw: string | undefined): { headline: string; pct: number | null } {
  if (!raw) return { headline: "—", pct: null };
  const m = raw.match(/^(.*?)\s*·\s*(\d+(?:\.\d+)?)\s*%\s*$/);
  if (m) return { headline: m[1].trim(), pct: Number(m[2]) };
  return { headline: raw, pct: null };
}

function asAnswer(value: unknown): AnswerShape | null {
  if (!value || typeof value !== "object") return null;
  return value as AnswerShape;
}

function toneFor(type: ResultField["type"], headline: string): string {
  const lower = headline.toLowerCase();
  if (type === "choice") {
    if (
      lower.includes("block") ||
      lower.includes("hostile") ||
      lower.includes("high") ||
      lower.includes("phishing") ||
      lower.includes("scam") ||
      lower.includes("quarantine")
    ) {
      return "text-amber-400";
    }
    return "text-sky-400";
  }
  if (type === "score") return "text-amber-400";
  if (lower === "yes" || lower.startsWith("yes")) return "text-emerald-400";
  if (lower === "no" || lower.startsWith("no")) return "text-muted";
  return "text-emerald-400";
}

function barColor(type: ResultField["type"], headline: string): string {
  const lower = headline.toLowerCase();
  if (type === "choice") {
    if (
      lower.includes("block") ||
      lower.includes("hostile") ||
      lower.includes("high") ||
      lower.includes("phishing") ||
      lower.includes("scam") ||
      lower.includes("quarantine")
    ) {
      return "bg-amber-500/80";
    }
    return "bg-sky-500/80";
  }
  if (type === "score") return "bg-amber-500/80";
  if (lower === "yes" || lower.startsWith("yes")) return "bg-emerald-500/80";
  return "bg-muted/50";
}

function distributionBars(
  field: ResultField,
  answer: AnswerShape | null,
  questions: Props["questions"],
  headline: string,
  pct: number | null,
): Array<{ label: string; value: number }> {
  if (answer?.probabilities && Object.keys(answer.probabilities).length > 0) {
    const q = questions?.[field.key];
    const criteria = q && "criteria" in q ? q.criteria : undefined;
    const entries = Object.entries(answer.probabilities)
      .map(([k, v]) => {
        let label = k;
        if (Array.isArray(criteria) && /^\d+$/.test(k)) {
          label = criteria[Number(k)] ?? k;
        }
        return { label, value: Math.round(Number(v) * 100) };
      })
      .filter((e) => e.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
    if (entries.length > 0) return entries;
  }

  if (field.type === "noul") {
    const yesPct =
      typeof answer?.noul === "number"
        ? Math.round(answer.noul * 100)
        : headline.toLowerCase().startsWith("yes")
          ? (pct ?? 70)
          : 100 - (pct ?? 30);
    return [
      { label: "yes", value: yesPct },
      { label: "no", value: Math.max(0, 100 - yesPct) },
    ];
  }

  if (field.type === "score" && typeof answer?.score === "number") {
    const q = questions?.[field.key];
    const levels = Array.isArray(q?.criteria) ? q.criteria.length : 4;
    const max = Math.max(1, levels - 1);
    const fill = Math.round((answer.score / max) * 100);
    return [{ label: "level", value: Math.min(100, Math.max(0, fill)) }];
  }

  if (pct != null) {
    return [{ label: headline, value: pct }];
  }

  return [];
}

export function PlaygroundResultCards({
  resultFields,
  display,
  answers,
  questions,
  emptyHint,
}: Props) {
  if (resultFields.length === 0) {
    return <p className="mt-3 text-sm text-muted">{emptyHint ?? "—"}</p>;
  }

  return (
    <ul className="mt-3 space-y-3">
      {resultFields.map((rf) => {
        const parsed = parseDisplay(display[rf.key]);
        const answer = asAnswer(answers?.[rf.key]);
        let headline = parsed.headline;
        if (rf.type === "choice" && answer?.choice) headline = answer.choice;
        if (rf.type === "score" && typeof answer?.score === "number") {
          headline = display[rf.key] ?? String(answer.score);
        }
        if (rf.type === "noul" && typeof answer?.noul === "number") {
          const yes = answer.noul >= 0.5;
          headline = `${yes ? "yes" : "no"} · ${Math.round(answer.noul * 100)}%`;
        }

        const bars = distributionBars(rf, answer, questions, headline, parsed.pct);
        const confidence =
          typeof answer?.confidence === "number"
            ? Math.round(answer.confidence * 100)
            : parsed.pct;

        return (
          <li key={rf.key} className="rounded-lg border border-line bg-paper/60 px-3.5 py-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="rounded border border-line px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide text-muted">
                  {rf.type}
                </span>
                <span className="font-mono text-xs text-muted">{rf.label}</span>
              </div>
              <span className={`font-mono text-sm font-semibold ${toneFor(rf.type, headline)}`}>
                {headline}
              </span>
            </div>

            {bars.length > 0 ? (
              <div className="mt-2.5 space-y-1.5">
                {bars.map((bar) => (
                  <div key={`${rf.key}-${bar.label}`} className="flex items-center gap-2">
                    <span className="w-24 shrink-0 truncate font-mono text-[11px] text-muted">
                      {bar.label}
                    </span>
                    <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-line/80">
                      <div
                        className={`h-full rounded-full transition-[width] duration-500 ${barColor(rf.type, headline)}`}
                        style={{ width: `${Math.min(100, Math.max(2, bar.value))}%` }}
                      />
                    </div>
                    <span className="w-8 shrink-0 text-right font-mono text-[11px] text-muted">
                      {bar.value}%
                    </span>
                  </div>
                ))}
              </div>
            ) : null}

            {confidence != null ? (
              <p className="mt-2 font-mono text-[10px] text-muted">confidence {confidence}%</p>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
