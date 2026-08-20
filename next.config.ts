import type { NextConfig } from "next";

const isProduction = process.env.NODE_ENV === "production";
const objectStorageOrigin = (() => {
  if (!process.env.OBJECT_STORAGE_ENDPOINT) return "";

  try {
    return new URL(process.env.OBJECT_STORAGE_ENDPOINT).origin;
  } catch {
    return "";
  }
})();
const objectStorageSource = objectStorageOrigin ? ` ${objectStorageOrigin}` : "";
const defaultDevOrigins = ["127.0.0.1", "localhost", "192.168.1.4", "192.168.100.83"];
const configuredDevOrigins = (process.env.LEVELUP_DEV_ORIGINS ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const allowedDevOrigins = [...new Set([...defaultDevOrigins, ...configuredDevOrigins])];

const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  `img-src 'self' data: blob:${objectStorageSource}`,
  "font-src 'self' data:",
  "style-src 'self' 'unsafe-inline'",
  `script-src 'self' 'unsafe-inline'${isProduction ? "" : " 'unsafe-eval'"}`,
  `connect-src 'self'${objectStorageSource}${isProduction ? "" : " ws: wss:"}`,
  "media-src 'self' blob:",
].join("; ");

const nextConfig: NextConfig = {
  // The demo is opened on this machine's LAN address during local reviews.
  allowedDevOrigins,
  async headers() {
    const headers = [
      { key: "Content-Security-Policy", value: contentSecurityPolicy },
      ...(isProduction
        ? [
            { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
            { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
            { key: "Origin-Agent-Cluster", value: "?1" },
          ]
        : []),
      {
        key: "Permissions-Policy",
        value: "camera=(self), geolocation=(), microphone=(), payment=()",
      },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "DENY" },
    ];

    if (isProduction) {
      headers.push({
        key: "Strict-Transport-Security",
        value: "max-age=63072000; includeSubDomains; preload",
      });
    }

    return [{ source: "/(.*)", headers }];
  },
};

export default nextConfig;
