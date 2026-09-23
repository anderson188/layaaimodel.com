import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static HTML for Cloudflare Pages (`out/`).
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
