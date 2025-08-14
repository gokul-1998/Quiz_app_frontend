/** @type {import('next').NextConfig} */
const nextConfig = {
  // Remove static export to enable dynamic routes and SSR during dev
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: { unoptimized: true },
};

module.exports = nextConfig;
