/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["sharp", "ioredis", "bullmq"],
  },
};

export default nextConfig;
