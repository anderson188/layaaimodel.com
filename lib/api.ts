/** Public API gateway base URL (Cloudflare Worker). */
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://api.layaaimodel.com";

export const API_DISCLAIMER =
  "Unofficial community API gateway. Inference is proxied to a third-party host (Impossibl) by default. Not affiliated with Convai Innovations, TypeSafe, or Impossibl. Hosted latency is not the README T4 figure.";
