import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.entero.ru',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
