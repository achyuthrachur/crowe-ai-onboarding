import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  experimental: {
    // Use Windows system TLS certificates — required on Crowe network (SSL proxy)
    turbopackUseSystemTlsCerts: true,
  },
  turbopack: {
    // Explicitly set workspace root to this project directory to avoid
    // Turbopack picking up C:\Users\RachurA\package-lock.json as workspace root
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
