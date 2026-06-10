import type { NextConfig } from "next";

// Security response headers applied to every route.
// Mitigates MITRE ATT&CK T1539 (session cookie theft via XSS/clickjacking) and
// T1190 (public-facing app); aligns with NIST CSF PR.IR-01 / CIS Control 4.
// NOTE: a strict Content-Security-Policy is intentionally NOT set here yet — it
// requires validating every third-party origin (Supabase, Mercado Pago, Google,
// Gemini) plus inline-script handling, and is tracked as a separate follow-up.
const securityHeaders = [
  {
    // Force HTTPS for 2 years, including subdomains (HSTS preload-ready).
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    // Block the app from being framed (clickjacking).
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    // Prevent MIME-type sniffing.
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    // Limit referrer leakage to other origins.
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    // Disable browser features the app does not use (Google Meet runs off-site).
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
];

const nextConfig: NextConfig = {
  // Remove the "X-Powered-By: Next.js" fingerprint header.
  poweredByHeader: false,
  experimental: {
    serverActions: {
      // Default is 1MB; the activity PDF import sends the file through a
      // server action (FormData). The action re-validates size server-side.
      bodySizeLimit: "10mb",
    },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
