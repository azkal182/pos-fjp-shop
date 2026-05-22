import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Cloudflare R2 public bucket (pub-*.r2.dev)
      {
        protocol: "https",
        hostname: "*.r2.dev",
      },
      // Custom domain R2 (jika dikonfigurasi)
      // Tambahkan hostname custom domain Anda di sini jika perlu
    ],
  },
};

export default nextConfig;
