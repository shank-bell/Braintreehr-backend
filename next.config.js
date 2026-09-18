/** @type {import('next').NextConfig} */
const isDev = process.env.NODE_ENV !== "production";

const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      // 'unsafe-inline' is needed because the admin pages use inline styles.
      // 'unsafe-eval' is required ONLY in dev: `next dev` compiles pages with
      // eval-based source maps and HMR, so without it the browser downloads
      // the JS but refuses to run it — React never hydrates and every form
      // silently falls back to a native submit. Never enabled in production.
      `script-src 'self' 'unsafe-inline' ${isDev ? "'unsafe-eval' " : ""}https://challenges.cloudflare.com`,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self' data:",
      // ws:/wss: are dev-only too — Next.js hot-reload talks over a websocket.
      `connect-src 'self' https://*.supabase.co${isDev ? " ws: wss:" : ""}`,
      "frame-src https://challenges.cloudflare.com",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
  },
];

const nextConfig = {
  reactStrictMode: true,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

module.exports = nextConfig;