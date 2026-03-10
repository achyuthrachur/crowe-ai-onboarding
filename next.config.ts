import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Use Windows system TLS certificates — required on Crowe network (SSL proxy)
    // No-op on Vercel (Linux), safe to leave in place
    turbopackUseSystemTlsCerts: true,
  },
};

export default nextConfig;
