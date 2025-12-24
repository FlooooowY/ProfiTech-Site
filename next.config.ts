import type { NextConfig } from "next";
import path from "path";
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

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
  webpack: (config, { dir }) => {
    // Ensure webpack resolves modules from the project directory
    config.resolve.modules = [
      path.resolve(dir, 'node_modules'),
      ...(config.resolve.modules || []),
    ];
    
    // Исключаем скрипты из сборки (они не должны быть частью production bundle)
    config.externals = config.externals || [];
    if (Array.isArray(config.externals)) {
      config.externals.push({
        // Игнорируем импорты из scripts
        'scripts/translateProducts': 'commonjs scripts/translateProducts',
        'scripts/translateProductsLocal': 'commonjs scripts/translateProductsLocal',
      });
    }
    
    return config;
  },
  turbopack: {
    // Set the root directory to the current project directory
    root: process.cwd(),
  },
};

export default withNextIntl(nextConfig);
