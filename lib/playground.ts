import { TOOLS, type QuestionSpec, type ToolDef } from "@/lib/tools";

export type ResultField = {
  key: string;
  label: string;
  type: "choice" | "score" | "noul";
};

export type PlaygroundDemo = {
  slug: string;
  label: string;
};

/** Flat tool chips on the homepage playground (mirrors /tools). */
export const PLAYGROUND_DEMOS: PlaygroundDemo[] = [
  { slug: "social-post-analyze", label: "Viral post analysis" },
  { slug: "email-triage", label: "Email triage" },
  { slug: "content-classify", label: "Content tagging" },
  { slug: "support-triage", label: "Support triage" },
  { slug: "content-moderate", label: "Content moderation" },
  { slug: "lead-qualify", label: "Lead scoring" },
  { slug: "agent-risk", label: "Tool-call risk gate" },
  { slug: "prompt-guard", label: "Prompt injection guard" },
  { slug: "model-route", label: "Model routing" },
  { slug: "rag-relevance", label: "RAG relevance" },
  { slug: "scam-spot", label: "Scam spotter" },
  { slug: "pr-risk", label: "PR risk judge" },
].filter((d) => TOOLS.some((t) => t.slug === d.slug));

/** Hand-tuned sample headlines for the preview cards (before a live run). */
const SAMPLE_DISPLAY: Record<string, Record<string, string>> = {
  "social-post-analyze": {
    hook: "scroll-stopping · 72%",
    opens_loop: "yes · 91%",
    has_evidence: "no · 32%",
    format: "how_to · 68%",
    viral_potential: "high · 61%",
  },
  "email-triage": {
    category: "billing · 88%",
    priority: "2.8 · urgent",
    is_spam: "no · 8%",
    needs_reply: "yes · 94%",
    route: "support · 71%",
  },
  "support-triage": {
    team: "engineering · 85%",
    issue_type: "outage · 84%",
    severity: "2.4 · high",
    urgency: "2.1 · urgent",
    escalate: "yes · 78%",
  },
  "content-moderate": {
    action: "block · 81%",
    toxicity: "yes · 88%",
    threats: "yes · 74%",
    spam: "no · 6%",
  },
  "lead-qualify": {
    qualified: "yes · 82%",
    icp_match: "2.6 · good",
    segment: "mid_market · 64%",
    buying_now: "yes · 71%",
    route: "ae · 70%",
  },
  "agent-risk": {
    action: "confirm · 66%",
    risk: "2.4 · high",
    destructive: "yes · 81%",
  },
  "prompt-guard": {
    action: "quarantine · 69%",
    injection: "yes · 74%",
    risk: "2.4 · high",
  },
  "model-route": {
    tier: "fast-mini · 79%",
    complex: "no · 18%",
  },
  "content-classify": {
    topic: "career · 71%",
    format: "story · 66%",
    tone: "earnest · 58%",
    engagement: "2.4 · high",
  },
  "rag-relevance": {
    relevant: "yes · 81%",
    score: "2.7 · direct",
  },
  "scam-spot": {
    label: "phishing · 86%",
    risk: "2.8 · high",
  },
  "pr-risk": {
    merge_risk: "2.9 · block",
    security_review: "yes · 93%",
    blast_radius: "prod_wide · 61%",
  },
};

export function playgroundTool(slug: string): ToolDef | undefined {
  return TOOLS.find((t) => t.slug === slug);
}

export function resultFieldsFor(tool: ToolDef): ResultField[] {
  return Object.entries(tool.questions).map(([key, q]) => ({
    key,
    label: key,
    type: q.type,
  }));
}

export function sampleDisplayFor(tool: ToolDef): Record<string, string> {
  const override = SAMPLE_DISPLAY[tool.slug];
  if (override) return { ...override };
  const out: Record<string, string> = {};
  for (const [key, q] of Object.entries(tool.questions)) {
    out[key] = fallbackDisplay(q);
  }
  return out;
}

function fallbackDisplay(q: QuestionSpec): string {
  if (q.type === "choice") {
    const keys = Object.keys(q.criteria ?? {});
    return `${keys[0] ?? "unknown"} · 70%`;
  }
  if (q.type === "score") {
    const levels = Array.isArray(q.criteria) ? q.criteria : [];
    const mid = levels[Math.min(2, Math.max(0, levels.length - 1))] ?? "medium";
    return `1.8 · ${mid}`;
  }
  return "yes · 75%";
}

/** Build structured answers from display strings for the sample preview bars. */
export function sampleAnswersFor(
  tool: ToolDef,
  display: Record<string, string>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, q] of Object.entries(tool.questions)) {
    const raw = display[key] ?? "";
    const pctMatch = raw.match(/(\d+(?:\.\d+)?)\s*%/);
    const pct = pctMatch ? Number(pctMatch[1]) / 100 : 0.7;

    if (q.type === "choice") {
      const value = raw.split("·")[0]?.trim() || Object.keys(q.criteria ?? {})[0] || "unknown";
      const keys = Object.keys(q.criteria ?? {});
      const probabilities = Object.fromEntries(
        keys.map((k) => [k, k === value ? pct : Math.max(0.02, (1 - pct) / Math.max(1, keys.length - 1))]),
      );
      out[key] = { type: "choice", choice: value, confidence: pct, probabilities };
    } else if (q.type === "score") {
      const scoreMatch = raw.match(/^(\d+(?:\.\d+)?)/);
      const levels = Array.isArray(q.criteria) ? q.criteria.length : 4;
      const score = scoreMatch ? Number(scoreMatch[1]) : Math.max(0, levels - 1.2);
      out[key] = { type: "score", score, confidence: 0.86, legend: Object.fromEntries(
        (Array.isArray(q.criteria) ? q.criteria : []).map((label, i) => [String(i), label]),
      ) };
    } else {
      const yes = raw.toLowerCase().startsWith("yes");
      const p = pctMatch ? (yes ? pct : 1 - pct) : yes ? 0.82 : 0.22;
      out[key] = { type: "noul", noul: p };
    }
  }
  return out;
}

/** Turn live API answers into short display headlines for the cards. */
export function displayFromAnswers(
  tool: ToolDef,
  answers: Record<string, unknown>,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, q] of Object.entries(tool.questions)) {
    const ans = answers[key] as
      | {
          type?: string;
          choice?: string;
          score?: number;
          noul?: number;
          confidence?: number;
          legend?: Record<string, string>;
        }
      | undefined;
    if (!ans) {
      out[key] = "—";
      continue;
    }
    if (q.type === "choice" && ans.choice) {
      const conf = typeof ans.confidence === "number" ? ` · ${Math.round(ans.confidence * 100)}%` : "";
      out[key] = `${ans.choice}${conf}`;
    } else if (q.type === "score" && typeof ans.score === "number") {
      const legend = ans.legend ?? {};
      const nearest = String(Math.round(ans.score));
      const label = legend[nearest] ?? legend[String(Math.floor(ans.score))] ?? "";
      out[key] = label ? `${ans.score.toFixed(1)} · ${label}` : ans.score.toFixed(2);
    } else if (typeof ans.noul === "number") {
      const yes = ans.noul >= 0.5;
      out[key] = `${yes ? "yes" : "no"} · ${Math.round(ans.noul * 100)}%`;
    } else {
      out[key] = "—";
    }
  }
  return out;
}
