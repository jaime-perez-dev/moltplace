import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
        ],
      },
    ];
  },
  async rewrites() {
    return [
      // Serve canvas PNG at both /canvas.png and /api/canvas.png
      { source: "/canvas.png", destination: "/api/canvas-image" },
      { source: "/api/canvas.png", destination: "/api/canvas-image" },
      // Non-api aliases (parity with Express backend)
      { source: "/leaderboard", destination: "/api/leaderboard" },
      { source: "/analytics", destination: "/api/analytics" },
      { source: "/health", destination: "/api/health" },
    ];
  },
};

export default nextConfig;
