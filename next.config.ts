import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    '@prisma/client',
    '@prisma/adapter-pg',
    'pg',
    '../generated/prisma',
    '@napi-rs/canvas',
    'sharp',
  ],
};

export default nextConfig;
