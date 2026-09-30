import { TOOLS, type ToolDef } from "@/lib/tools";
import { sampleDisplayFor } from "@/lib/playground";

/** Demand-intent tool landing pages (SEO). Keep in sync with generateStaticParams. */
export const TOOL_LANDING_SLUGS = [
  "prompt-guard",
  "support-triage",
  "email-triage",
  "content-moderate",
  "scam-spot",
] as const;

export type ToolLandingSlug = (typeof TOOL_LANDING_SLUGS)[number];

export type ToolLandingCopy = {
  slug: ToolLandingSlug;
  h1: string;
  title: string;
  description: string;
  intent: string;
  whenToUse: string;
  howItWorks: string;
  exampleNarrative: string;
  /** Extra SEO body paragraphs (scenario + integration). */
  body: string[];
};

export const TOOL_LANDINGS: Record<ToolLandingSlug, ToolLandingCopy> = {
  "prompt-guard": {
    slug: "prompt-guard",
    h1: "Prompt injection guard for agent pipelines",
    title: "Prompt Injection Guard API",
    description:
      "Score untrusted chat or tool input for prompt injection risk. Laya returns allow / quarantine / block plus calibrated yes/no and risk score — not free text.",
    intent: "prompt injection detection API",
    whenToUse:
      "Use this when user text, emails, or retrieved documents reach an agent that can call tools. You need a fast gate before the LLM sees the payload — not another chat reply.",
    howItWorks:
      "POST a text blob and optional context. Laya answers typed questions: choice action (allow, quarantine, block), noul injection flag, and an ordinal risk score. Prepaid metering charges input tokens only.",
    exampleNarrative:
      "A classic jailbreak (“Ignore previous instructions…”) should land on quarantine or block with a high injection probability. Clean support questions should stay on allow with low risk.",
    body: [
      "Most agent stacks still treat the first LLM call as the security boundary. That fails when the attacker’s payload is the user message itself: “ignore previous instructions,” “exfiltrate the system prompt,” or a RAG chunk that smuggles tool-calling instructions. A generative classifier that answers in paragraphs is slow and hard to wire into allow/deny logic. A System One decision model returns typed fields you can branch on in one hop.",
      "Wire the guard on every untrusted ingress: chat widgets, email-to-agent bridges, browser tool outputs, and retrieved documents before they enter the prompt. Keep the generative model behind the gate. If action is quarantine or block, drop or sandbox the turn; if allow, pass the original text through unchanged. The same laya_ key meters this template and /v1/decide, so you do not run a second billing stack.",
      "This page is for teams searching for a prompt injection detection API — not for people who already know the Laya brand. Pair it with agent-risk checks when the model can call tools that spend money or change state.",
    ],
  },
  "support-triage": {
    slug: "support-triage",
    h1: "Support ticket triage API",
    title: "Support Ticket Triage API",
    description:
      "Route support tickets to the right team with typed severity, urgency, and escalate flags. Hosted Laya decide API for helpdesk automation.",
    intent: "support ticket triage API",
    whenToUse:
      "Inbound tickets need team routing (billing vs engineering), issue type, severity, and a human-escalate flag before an agent drafts a reply.",
    howItWorks:
      "Send subject + body. The template runs several questions in one call: choice team and issue type, score severity and urgency, noul escalate. Same prepaid balance as /v1/decide.",
    exampleNarrative:
      "“Production dashboard returns 500 for all users” should route to engineering, mark outage, raise severity/urgency, and lean toward escalate.",
    body: [
      "Helpdesk queues die when every ticket looks the same to a keyword rule. Teams need structured routing: which queue owns it, how severe it is, and whether a human should interrupt an auto-reply. Generative “summarize this ticket” helpers still leave you parsing free text. A support ticket triage API that returns choice and score fields plugs straight into Zendesk, Intercom, Linear, or a custom worker.",
      "Typical flow: webhook receives a new ticket → POST subject and body to this template → write team, issue type, severity, urgency, and escalate onto ticket fields → only then let a drafting model propose a reply. Keep label sets small; Banking77-style 50+ option prompts are where Laya is known to be weak versus closed APIs like Jev.",
      "Use this when search intent is support ticket triage, helpdesk routing, or severity scoring — not when you only need a chatbot. Prepaid input tokens; outputs are free structured decisions.",
    ],
  },
  "email-triage": {
    slug: "email-triage",
    h1: "Inbound email triage API",
    title: "Email Triage API",
    description:
      "Classify inbound email: category, priority, spam, needs-reply, and route. Structured Laya decisions for mailbox automation.",
    intent: "email classification API",
    whenToUse:
      "Shared inboxes and CS tools that must label mail before a human or generative model answers — especially billing disputes and spam.",
    howItWorks:
      "POST subject and body. Returns choice category and route, score priority, and noul flags for spam and needs_reply in a single System One pass.",
    exampleNarrative:
      "“Charged twice and need this fixed today” should classify as billing, high priority, not spam, needs reply, and route to support/billing.",
    body: [
      "Shared inboxes mix sales, billing disputes, partnership mail, and spam. Rule-based filters miss intent; a full LLM thread for every message is expensive and still returns prose. An email classification API that emits category, priority, spam, needs-reply, and route lets you sort before anyone opens the thread.",
      "Drop this on the ingest path of a support mailbox or a Gmail/Microsoft Graph worker. Spam and needs_reply are yes/no (noul) fields you can threshold. Priority is an ordinal score for SLA queues. Category and route are choice labels you map to folders or assignees. One forward pass — no multi-turn chat.",
      "Searchers looking for email triage, mailbox automation, or inbound classification land here. Brand-aware Laya users still benefit, but the page is written for the job-to-be-done.",
    ],
  },
  "content-moderate": {
    slug: "content-moderate",
    h1: "Content moderation API for user text",
    title: "Content Moderation API",
    description:
      "Moderate UGC with allow / review / block plus toxicity, threats, and spam scores. Fast typed decisions via hosted Laya.",
    intent: "content moderation API",
    whenToUse:
      "Comments, DMs, and chat strings that need a policy gate before publish or before an LLM replies.",
    howItWorks:
      "POST the raw text. Get a choice action and noul flags for toxicity, threats, and spam. Confidence and probabilities come back calibrated — no free-text rationale to parse.",
    exampleNarrative:
      "Harassing or threatening language should prefer review/block with elevated toxicity/threats. Neutral product feedback should allow with low flags.",
    body: [
      "UGC pipelines need a hard gate: allow, send to review, or block. Vision and multimodal stacks can wait; plain text comments and DMs are the hot path. A content moderation API that returns action plus toxicity/threats/spam flags is easier to enforce than a model that “explains” why something is bad.",
      "Call the template synchronously on submit. If action is block, reject. If review, enqueue for a human. If allow, publish or hand off to a generative reply. Because answers are typed, you can unit-test thresholds and keep audit logs as JSON instead of scraped paragraphs.",
      "This landing targets people searching for content moderation API, toxicity scoring, or UGC allow/review/block — demand terms, not only the Laya brand.",
    ],
  },
  "scam-spot": {
    slug: "scam-spot",
    h1: "Scam and phishing message detector",
    title: "Scam & Phishing Spotter API",
    description:
      "Label inbound messages as legitimate, suspicious, phishing, or scam with a risk score. Laya System One template for trust & safety.",
    intent: "phishing detection API",
    whenToUse:
      "Email, SMS, or chat that may be phishing — especially urgent account-closure links and shortened URLs.",
    howItWorks:
      "POST message + channel. Returns a choice label and ordinal scam risk. Wire it in front of user-facing inboxes or agent tools that open links.",
    exampleNarrative:
      "“Urgent: verify at http://bit.ly/…” should score as phishing/scam with high risk. A banal shipping update should stay legitimate/low.",
    body: [
      "Phishing copy is short, urgent, and full of shortened links. Signature-based filters lag; asking a chat model “is this a scam?” every time adds latency and ambiguous prose. A phishing detection API that returns a label plus risk score slots into mail gateways, SMS webhooks, and agent tools that might open URLs.",
      "Score the message before link unfurling or auto-click. High-risk phishing/scam labels should quarantine the message and strip actionable links. Suspicious mid scores can warn the user. Legitimate lows pass through. Channel metadata (email vs sms vs chat) helps the template interpret urgency tropes.",
      "Built for trust-and-safety and mailbox teams hunting scam spotter or phishing detector APIs. Laya vs Jev benchmark pages cover broader accuracy claims; this page stays on the scam-spotting job.",
    ],
  },
};

export function toolLanding(slug: string): { tool: ToolDef; copy: ToolLandingCopy } | null {
  if (!(TOOL_LANDING_SLUGS as readonly string[]).includes(slug)) return null;
  const copy = TOOL_LANDINGS[slug as ToolLandingSlug];
  const tool = TOOLS.find((t) => t.slug === slug);
  if (!tool) return null;
  return { tool, copy };
}

export function exampleRequestBody(tool: ToolDef): Record<string, string> {
  return Object.fromEntries(tool.fields.map((f) => [f.key, f.defaultValue]));
}

export function exampleSampleAnswers(tool: ToolDef): Record<string, string> {
  return sampleDisplayFor(tool);
}
