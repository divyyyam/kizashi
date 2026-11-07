import { join } from "node:path";
import type { NextConfig } from "next";
// Import order matters: load the root .env, then validate the public environment so dev and
// build fail loudly when it is invalid.
import "./src/lib/load-root-env";
import "./src/lib/env";

// The Docker image (deploy/Dockerfile.web) sets NEXT_OUTPUT=standalone; Vercel builds without it.
const standalone = process.env.NEXT_OUTPUT === "standalone";

const nextConfig: NextConfig = {
  ...(standalone
    ? { output: "standalone" as const, outputFileTracingRoot: join(process.cwd(), "../..") }
    : {}),
  reactStrictMode: true,
  poweredByHeader: false,
  transpilePackages: ["@kizashi/contracts"],
  // RainbowKit's Base Account connector pulls in @coinbase/cdp-sdk, which lazily imports optional
  // @x402/* peers that are not installed. Loading it from node_modules at SSR time (instead of
  // bundling) keeps those optional imports unresolved until called, which this app never does.
  serverExternalPackages: ["@coinbase/cdp-sdk"],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(self), microphone=(self), geolocation=(), payment=()",
          },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
        ],
      },
    ];
  },
  async rewrites() {
    return [
      { source: "/market/:id", destination: "/markets/:id" },
      { source: "/create", destination: "/markets/new" },
    ];
  },
  experimental: {
    optimizePackageImports: ["lucide-react", "@rainbow-me/rainbowkit"],
  },
};

export default nextConfig;
