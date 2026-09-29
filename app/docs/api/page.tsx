import type { Metadata } from "next";
import Link from "next/link";
import { CodeBlock } from "@/components/CodeBlock";
import { PageTitle } from "@/components/PageTitle";
import { API_BASE_URL, API_DISCLAIMER } from "@/lib/api";
import { canonical } from "@/lib/site";

export const metadata: Metadata = {
  description:
    "Laya hosted API reference: /v1/decide, batch, gate, ready-made tools, auth, metering, and errors. Instant laya_ keys.",
  alternates: { canonical: canonical("/docs/api/") },
};

const curlDecide = `curl ${API_BASE_URL}/v1/decide \\
  -H "Authorization: Bearer laya_YOUR_KEY_HERE" \\
  -H "Content-Type: application/json" \\
  -d '{
    "state": {
      "ticket": "I was charged twice and nobody has replied for 3 days.",
      "channel": "email"
    },
    "questions": {
      "route": {
        "type": "choice",
        "instructions": "Where should this go?",
        "criteria": { "billing": "money", "bug": "broken", "account": "login" }
      },
      "urgency": {
        "type": "score",
        "instructions": "How urgent is this?",
        "criteria": ["routine", "today", "urgent", "critical"]
      },
      "escalate": {
        "type": "noul",
        "instructions": "Escalate to a human now?"
      }
    }
  }'`;

const pythonDecide = `import os, requests

resp = requests.post(
    "${API_BASE_URL}/v1/decide",
    headers={"Authorization": f"Bearer {os.environ['LAYA_API_KEY']}"},
    json={
        "state": "Customer: I was charged twice and nobody has replied for 3 days.",
        "questions": {
            "route": {
                "type": "choice",
                "instructions": "Where should this go?",
                "criteria": {"billing": "money", "bug": "broken", "account": "login"},
            },
            "urgency": {
                "type": "score",
                "instructions": "How urgent is this?",
                "criteria": ["routine", "today", "urgent", "critical"],
            },
            "escalate": {"type": "noul", "instructions": "Escalate to a human now?"},
        },
    },
    timeout=30,
)
resp.raise_for_status()
print(resp.json())`;

const tsDecide = `const res = await fetch("${API_BASE_URL}/v1/decide", {
  method: "POST",
  headers: {
    Authorization: \`Bearer \${process.env.LAYA_API_KEY}\`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    state: "Customer: I was charged twice and nobody has replied for 3 days.",
    questions: {
      route: {
        type: "choice",
        instructions: "Where should this go?",
        criteria: { billing: "money", bug: "broken", account: "login" },
      },
      urgency: {
        type: "score",
        instructions: "How urgent is this?",
        criteria: ["routine", "today", "urgent", "critical"],
      },
      escalate: { type: "noul", instructions: "Escalate to a human now?" },
    },
  }),
});
if (!res.ok) throw new Error(await res.text());
console.log(await res.json());`;

const batchCurl = `curl ${API_BASE_URL}/v1/batch/decide \\
  -H "Authorization: Bearer laya_YOUR_KEY_HERE" \\
  -H "Content-Type: application/json" \\
  -d '{
    "states": ["Passage A…", "Passage B…"],
    "questions": {
      "relevant": {
        "type": "noul",
        "instructions": "Does this passage answer: How do I rotate my API key?"
      }
    }
  }'`;

const gateCurl = `curl ${API_BASE_URL}/v1/gate \\
  -H "Authorization: Bearer laya_YOUR_KEY_HERE" \\
  -H "Content-Type: application/json" \\
  -d '{
    "answers": {
      "action": { "type": "choice", "choice": "allow", "confidence": 0.91 },
      "toxicity": { "type": "noul", "noul": 0.12 }
    },
    "policy": {
      "min_confidence": 0.55,
      "noul": { "toxicity": { "block_above": 0.85, "review_above": 0.4 } },
      "choice": { "action": { "allow": ["allow"], "block": ["block"], "review": ["review"] } }
    }
  }'`;

const toolPaths = [
  "/v1/email/triage",
  "/v1/support/triage",
  "/v1/content/moderate",
  "/v1/leads/qualify",
  "/v1/agent/risk",
  "/v1/prompt/guard",
  "/v1/model/route",
  "/v1/social/post-analyze",
  "/v1/rag/relevance",
  "/v1/scam/spot",
  "/v1/pr/risk",
  "/v1/content/classify",
  "/v1/context/filter",
  "/v1/ads/analyze",
  "/v1/seo/page-relevance",
  "/v1/app/review",
  "/v1/review/fake",
];

export default function ApiDocsPage() {
  return (
    <div className="space-y-12">
      <PageTitle
        section="API reference"
        lede="Instant laya_ keys. Core decide accepts string or structured JSON state — Choice / Score / Noul. Plus batch decide, a free confidence gate, and ready-made application APIs. Prepaid input tokens; output free."
      />

      <section className="space-y-3 rounded-lg border border-line bg-panel px-5 py-4">
        <h2 className="text-base font-semibold text-ink">Disclaimer</h2>
        <p className="max-w-3xl text-sm leading-relaxed text-muted">{API_DISCLAIMER}</p>
        <p className="max-w-3xl text-sm leading-relaxed text-muted">
          Product shape mirrors unofficial hosts like{" "}
          <a className="text-accent hover:underline" href="https://jevtypesafe.org/docs/api/" rel="noreferrer">
            jevtypesafe.org API docs
          </a>
          , but inference runs Laya (not Jev). Upstream provider keys stay on our servers.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold tracking-tight">Authentication</h2>
        <p className="max-w-3xl text-sm leading-relaxed text-muted">
          Create keys on{" "}
          <Link className="text-accent hover:underline" href="/account/">
            Account
          </Link>{" "}
          after buying a prepaid pack (or using monthly free tokens).
        </p>
        <CodeBlock
          label="headers"
          code={`Authorization: Bearer laya_your_key_here\nContent-Type: application/json`}
        />
        <CodeBlock label="text" code={API_BASE_URL} />
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold tracking-tight">Core API — /v1/decide</h2>
        <p className="max-w-3xl text-sm leading-relaxed text-muted">
          Also available as <code className="font-mono text-ink">/v1/systemone</code> (same body). Models:{" "}
          <code className="font-mono text-ink">convaiinnovations/laya</code> (default) or{" "}
          <code className="font-mono text-ink">convaiinnovations/laya-multilingual</code>.
        </p>
        <CodeBlock label="bash" code={curlDecide} />
        <CodeBlock label="python" code={pythonDecide} />
        <CodeBlock label="typescript" code={tsDecide} />
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold tracking-tight">Request body</h2>
        <ul className="max-w-3xl list-disc space-y-2 pl-5 text-sm leading-relaxed text-muted">
          <li>
            <code className="font-mono text-ink">state</code> — string, object, or array
          </li>
          <li>
            <code className="font-mono text-ink">questions</code> — map of ids →{" "}
            <code className="font-mono text-ink">noul | choice | score</code>
          </li>
          <li>
            <code className="font-mono text-ink">usage.input_tokens</code> is deducted from prepaid balance; output is
            free
          </li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold tracking-tight">Batch decide — /v1/batch/decide</h2>
        <p className="max-w-3xl text-sm leading-relaxed text-muted">
          Same questions, many states (up to 20). One auth header; prepaid settlement per state.
        </p>
        <CodeBlock label="bash" code={batchCurl} />
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold tracking-tight">Confidence gate — /v1/gate</h2>
        <p className="max-w-3xl text-sm leading-relaxed text-muted">
          No upstream call and no token burn. Returns <code className="font-mono text-ink">allow | review | block</code>.
        </p>
        <CodeBlock label="bash" code={gateCurl} />
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold tracking-tight">Errors & limits</h2>
        <ul className="max-w-3xl list-disc space-y-2 pl-5 text-sm leading-relaxed text-muted">
          <li>Rate limit starts ≈ 60/min; higher RPM on Staging+ packs (up to 240).</li>
          <li>Soft burn caps ≈ 5,000,000 tokens/hour and 80,000,000 tokens/day per account.</li>
          <li>Anonymous tools: 5 free runs/IP. Registered: ~10k free input tokens/month.</li>
          <li>
            Prefer many questions in one <code className="font-mono text-ink">/v1/decide</code>; use batch for many
            states.
          </li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold tracking-tight">Ready-made application APIs</h2>
        <p className="max-w-3xl text-sm leading-relaxed text-muted">
          Fixed templates — same Bearer key and prepaid metering. Try them on{" "}
          <Link className="text-accent hover:underline" href="/tools/">
            /tools/
          </Link>{" "}
          (paste your key to consume balance).
        </p>
        <ul className="grid gap-2 sm:grid-cols-2">
          {toolPaths.map((p) => (
            <li key={p} className="rounded-md border border-line bg-panel px-3 py-2 font-mono text-xs text-ink">
              POST {p}
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-3 text-sm text-muted">
        <p>
          Buy packs on{" "}
          <Link className="text-accent hover:underline" href="/pricing/">
            Pricing
          </Link>
          . Monitor usage on{" "}
          <Link className="text-accent hover:underline" href="/account/">
            Account
          </Link>
          . Gateway health:{" "}
          <Link className="text-accent hover:underline" href="/status/">
            Status
          </Link>
          .
        </p>
      </section>
    </div>
  );
}
