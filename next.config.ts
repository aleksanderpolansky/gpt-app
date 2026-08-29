import type { NextConfig } from "next";

const LOCAL_EDITOR_CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "base-uri 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "img-src 'self' data: blob:",
  "font-src 'self' data: https://fonts.gstatic.com",
  "connect-src 'self'",
  "object-src 'none'",
  "frame-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'none'",
  "worker-src 'self' blob:",
  "child-src 'self' blob:",
  "media-src 'none'",
].join("; ");

const nextConfig: NextConfig = {
  turbopack: {
    resolveAlias: {
      "@schnsrw/core": "./src/lib/local-editors/casual-core-foreign-converter-disabled.ts",
    },
  },
  async headers() {
    return [
      {
        source: "/local-editors/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: LOCAL_EDITOR_CONTENT_SECURITY_POLICY,
          },
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Permissions-Policy",
            value:
              "camera=(), microphone=(), geolocation=(), payment=(), usb=(), serial=(), bluetooth=()",
          },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
