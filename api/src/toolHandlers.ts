export type QuestionSpec = {
  type: "noul" | "choice" | "score";
  instructions: string;
  criteria?: Record<string, string | null> | string[];
};

export type ToolHandler = {
  path: string;
  build: (body: Record<string, unknown>) => { state: unknown; questions: Record<string, QuestionSpec> } | { error: string };
};

function str(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}

export const TOOL_HANDLERS: ToolHandler[] = [
  {
    path: "/v1/support/triage",
    build: (b) => ({
      state: `Subject: ${str(b.subject)}\n\n${str(b.body)}`,
      questions: {
        team: {
          type: "choice",
          instructions: "Which team should handle this?",
          criteria: { billing: "Payments", engineering: "Bugs/outages", account: "Login/access", sales: "Sales" },
        },
        issue_type: {
          type: "choice",
          instructions: "Issue type?",
          criteria: { outage: null, bug: null, billing: null, how_to: null, other: null },
        },
        severity: { type: "score", instructions: "How severe?", criteria: ["low", "medium", "high", "critical"] },
        urgency: { type: "score", instructions: "How urgent?", criteria: ["routine", "today", "urgent", "critical"] },
        escalate: { type: "noul", instructions: "Escalate to a human now?" },
      },
    }),
  },
  {
    path: "/v1/email/triage",
    build: (b) => ({
      state: `Subject: ${str(b.subject)}\n\n${str(b.body)}`,
      questions: {
        category: {
          type: "choice",
          instructions: "Email category?",
          criteria: { billing: null, support: null, sales: null, spam: null, other: null },
        },
        priority: { type: "score", instructions: "Priority?", criteria: ["low", "normal", "high", "urgent"] },
        is_spam: { type: "noul", instructions: "Is this spam?" },
        needs_reply: { type: "noul", instructions: "Does this need a human reply?" },
        route: {
          type: "choice",
          instructions: "Route to?",
          criteria: { billing: null, support: null, sales: null, ignore: null },
        },
      },
    }),
  },
  {
    path: "/v1/content/moderate",
    build: (b) => ({
      state: str(b.text),
      questions: {
        action: { type: "choice", instructions: "Moderation action?", criteria: { allow: null, review: null, block: null } },
        toxicity: { type: "noul", instructions: "Contains toxic or harassing language?" },
        threats: { type: "noul", instructions: "Contains threats of harm?" },
        spam: { type: "noul", instructions: "Looks like spam?" },
      },
    }),
  },
  {
    path: "/v1/leads/qualify",
    build: (b) => ({
      state: str(b.lead),
      questions: {
        qualified: { type: "noul", instructions: "Is this a qualified lead?" },
        icp_match: { type: "score", instructions: "ICP match?", criteria: ["poor", "partial", "good", "excellent"] },
        segment: {
          type: "choice",
          instructions: "Segment?",
          criteria: { smb: null, mid_market: null, enterprise: null, unknown: null },
        },
        buying_now: { type: "noul", instructions: "Buying intent this quarter?" },
        route: { type: "choice", instructions: "Sales route?", criteria: { ae: null, sdr: null, partner: null, nurture: null } },
      },
    }),
  },
  {
    path: "/v1/agent/risk",
    build: (b) => ({
      state: { goal: str(b.goal), tool: str(b.tool), arguments: str(b.arguments), context: str(b.context) },
      questions: {
        action: { type: "choice", instructions: "Allow this tool call?", criteria: { allow: null, confirm: null, block: null } },
        risk: { type: "score", instructions: "Risk level?", criteria: ["low", "medium", "high", "critical"] },
        destructive: { type: "noul", instructions: "Is this destructive to production data?" },
      },
    }),
  },
  {
    path: "/v1/prompt/guard",
    build: (b) => ({
      state: { text: str(b.text), context: str(b.context) },
      questions: {
        action: {
          type: "choice",
          instructions: "Guard action?",
          criteria: { allow: null, quarantine: null, block: null },
        },
        injection: { type: "noul", instructions: "Looks like prompt injection?" },
        risk: { type: "score", instructions: "Injection risk?", criteria: ["none", "low", "medium", "high"] },
      },
    }),
  },
  {
    path: "/v1/model/route",
    build: (b) => ({
      state: { prompt: str(b.prompt), models: str(b.models) },
      questions: {
        tier: {
          type: "choice",
          instructions: "Which model tier?",
          criteria: { "fast-mini": "simple/short", balanced: "typical", frontier: "hard/long" },
        },
        complex: { type: "noul", instructions: "Is this a complex reasoning task?" },
      },
    }),
  },
  {
    path: "/v1/social/post-analyze",
    build: (b) => ({
      state: str(b.post),
      questions: {
        hook: {
          type: "choice",
          instructions: "How strong is the opening hook?",
          criteria: { "scroll-stopping": null, solid: null, weak: null, none: null },
        },
        opens_loop: { type: "noul", instructions: "Does it open an information loop?" },
        has_evidence: { type: "noul", instructions: "Does it include evidence or proof?" },
        format: {
          type: "choice",
          instructions: "Post format?",
          criteria: { how_to: null, story: null, hot_take: null, promo: null, other: null },
        },
        viral_potential: {
          type: "choice",
          instructions: "Viral potential?",
          criteria: { high: null, medium: null, low: null },
        },
      },
    }),
  },
  {
    path: "/v1/rag/relevance",
    build: (b) => ({
      state: { query: str(b.query), passage: str(b.passage) },
      questions: {
        relevant: { type: "noul", instructions: "Does this passage answer the query?" },
        score: { type: "score", instructions: "Relevance?", criteria: ["irrelevant", "tangential", "partial", "direct"] },
      },
    }),
  },
  {
    path: "/v1/scam/spot",
    build: (b) => ({
      state: { message: str(b.message), channel: str(b.channel, "email") },
      questions: {
        label: {
          type: "choice",
          instructions: "Label?",
          criteria: { legitimate: null, suspicious: null, phishing: null, scam: null },
        },
        risk: { type: "score", instructions: "Scam risk?", criteria: ["none", "low", "medium", "high"] },
      },
    }),
  },
  {
    path: "/v1/pr/risk",
    build: (b) => ({
      state: { title: str(b.title), summary: str(b.summary), files: str(b.files) },
      questions: {
        merge_risk: { type: "score", instructions: "Merge risk?", criteria: ["low", "medium", "high", "block"] },
        security_review: { type: "noul", instructions: "Needs security review?" },
        blast_radius: {
          type: "choice",
          instructions: "Blast radius?",
          criteria: { local: null, service: null, prod_wide: null },
        },
      },
    }),
  },
  {
    path: "/v1/content/classify",
    build: (b) => ({
      state: str(b.text),
      questions: {
        topic: {
          type: "choice",
          instructions: "Topic?",
          criteria: { career: null, business: null, product: null, lifestyle: null, other: null },
        },
        format: {
          type: "choice",
          instructions: "Format?",
          criteria: { story: null, how_to: null, hot_take: null, promo: null, other: null },
        },
        tone: {
          type: "choice",
          instructions: "Tone?",
          criteria: { earnest: null, hype: null, educational: null, humorous: null },
        },
        engagement: { type: "score", instructions: "Engagement potential?", criteria: ["low", "medium", "high"] },
      },
    }),
  },
  {
    path: "/v1/context/filter",
    build: (b) => ({
      state: { task: str(b.task), item: str(b.item) },
      questions: {
        action: {
          type: "choice",
          instructions: "What to do with this context item?",
          criteria: { keep: null, truncate: null, drop: null },
        },
        relevance: { type: "score", instructions: "Relevance to task?", criteria: ["none", "low", "medium", "high"] },
      },
    }),
  },
  {
    path: "/v1/ads/analyze",
    build: (b) => ({
      state: { headline: str(b.headline), primary_text: str(b.primary_text), cta: str(b.cta) },
      questions: {
        hook: {
          type: "choice",
          instructions: "Hook type?",
          criteria: { problem: null, benefit: null, curiosity: null, social_proof: null, other: null },
        },
        awareness: {
          type: "choice",
          instructions: "Awareness stage?",
          criteria: { unaware: null, problem_aware: null, solution_aware: null, product_aware: null },
        },
        clear_offer: { type: "noul", instructions: "Is the offer clear?" },
        cta_strong: { type: "noul", instructions: "Is the CTA strong?" },
        friction: { type: "score", instructions: "Friction?", criteria: ["low", "medium", "high"] },
      },
    }),
  },
  {
    path: "/v1/seo/page-relevance",
    build: (b) => ({
      state: { source: str(b.source), target: str(b.target) },
      questions: {
        should_link: { type: "noul", instructions: "Should source internally link to target?" },
        relevance: { type: "score", instructions: "Topical relevance?", criteria: ["none", "weak", "good", "strong"] },
      },
    }),
  },
  {
    path: "/v1/app/review",
    build: (b) => ({
      state: str(b.review),
      questions: {
        topic: {
          type: "choice",
          instructions: "Review topic?",
          criteria: { bug: null, billing: null, praise: null, feature: null, other: null },
        },
        refund_pressure: { type: "noul", instructions: "Mentions refund or cancel?" },
        chargeback_risk: { type: "noul", instructions: "Chargeback risk language?" },
        tone: {
          type: "choice",
          instructions: "Tone?",
          criteria: { angry: null, frustrated: null, neutral: null, positive: null },
        },
        severity: { type: "score", instructions: "Severity?", criteria: ["low", "medium", "high", "critical"] },
      },
    }),
  },
  {
    path: "/v1/review/fake",
    build: (b) => ({
      state: { review: str(b.review), product: str(b.product), rating: str(b.rating) },
      questions: {
        authenticity: {
          type: "choice",
          instructions: "Authenticity?",
          criteria: { authentic: null, incentivized: null, fabricated: null },
        },
        fake_likelihood: { type: "score", instructions: "Fake likelihood?", criteria: ["low", "medium", "high"] },
      },
    }),
  },
];

export function findToolHandler(path: string): ToolHandler | undefined {
  return TOOL_HANDLERS.find((t) => t.path === path);
}
