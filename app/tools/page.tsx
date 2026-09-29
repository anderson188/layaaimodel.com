import type { Metadata } from "next";
import { PageTitle } from "@/components/PageTitle";
import { ToolsClient } from "@/components/ToolsClient";
import { canonical } from "@/lib/site";

export const metadata: Metadata = {
  title: "Decision templates",
  description:
    "Laya decision templates: support triage, moderation, leads, agent risk, and more. Paste a laya_ key or use 5 free anonymous runs.",
  alternates: { canonical: canonical("/tools/") },
};

export default function ToolsPage() {
  return (
    <div className="space-y-10">
      <PageTitle
        section="Decision templates"
        lede="Runnable production templates for triage, moderation, agents, and labeling — mirror the same patterns on /v1/decide. Anonymous: 5 free runs. Signed in / pasted key: prepaid balance."
      />
      <ToolsClient />
    </div>
  );
}
