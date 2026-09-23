export type CommunityVideo = {
  id: string;
  title: string;
  channel: string;
  note: string;
};

/** Community YouTube explainers about Laya. Not official Convai Innovations content. */
export const COMMUNITY_VIDEOS: CommunityVideo[] = [
  {
    id: "UoRNo5LoDRE",
    title: "Laya: Open-Source Counterpart to Jev | Multilingual System 1 Model for Fast AI Decisions",
    channel: "Mohamed Naji Aboo",
    note: "Overview of Laya as a multilingual System 1 decision model.",
  },
  {
    id: "kWToHpdxScE",
    title: "Open Source, Faster Jev is HERE",
    channel: "CoderOne",
    note: "Walkthrough of the open-weight Laya stack against the closed Jev API.",
  },
  {
    id: "F_8pd-AhmkM",
    title: 'Laya vs Jev: What "7.8x Faster" Actually Means',
    channel: "AICKStudio | Agentic AI",
    note: "Latency claim from the README comparison, explained for producers.",
  },
  {
    id: "cGhKKRHhYqs",
    title: "Run This Powerful Jev AI on Your Laptop for $0",
    channel: "Edwin Chen | AI Automation",
    note: "Local setup angle for the open System 1 model you can run without an API key.",
  },
];

export function youtubeWatchUrl(id: string) {
  return `https://www.youtube.com/watch?v=${id}`;
}

export function youtubeEmbedUrl(id: string) {
  return `https://www.youtube-nocookie.com/embed/${id}`;
}

export function youtubeThumbUrl(id: string) {
  return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
}
