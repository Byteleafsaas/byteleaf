import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Project pictures are shown at quality 92 so fine interface text stays crisp; 75 is the default.
  images: { qualities: [75, 92] },
  distDir: process.env.NEXT_DIST_DIR || '.next',
  async redirects() {
    return [{ source: '/process', destination: '/workflow', permanent: true }];
  },
};
export default nextConfig;
