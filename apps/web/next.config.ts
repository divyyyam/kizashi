import type { NextConfig } from "next";
// Import order matters: load the root .env, then validate the public environment so dev and
// build fail loudly when it is invalid.
import "./src/lib/load-root-env";
import "./src/lib/env";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  transpilePackages: ["@kizashi/contracts"],
  // RainbowKit's Base Account connector pulls in @coinbase/cdp-sdk, which lazily imports optional
  // @x402/* peers that are not installed. Loading it from node_modules at SSR time (instead of
  // bundling) keeps those optional imports unresolved until called, which this app never does.
  serverExternalPackages: ["@coinbase/cdp-sdk"],
};

export default nextConfig;
