import type { NextConfig } from 'next';
import path from 'path';

const withBundleAnalyzer = (config: NextConfig): NextConfig => {
  if (process.env.ANALYZE === 'true') {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const bundleAnalyzer = require('@next/bundle-analyzer');
      return bundleAnalyzer({ enabled: true })(config);
    } catch {
      console.warn('Warning: @next/bundle-analyzer is not installed. Skipping bundle analysis.');
    }
  }
  return config;
};

// Dev API calls use a relative base URL (same-origin) so HttpOnly cookies work.
// Proxy /api/* to the Spring backend (defaults to local core-api).
const backendProxyTarget =
  process.env.BACKEND_UPSTREAM ||
  process.env.VITE_DEV_PROXY_TARGET ||
  'http://localhost:8080';

const normalizedBackendProxyTarget = backendProxyTarget.startsWith('http')
  ? backendProxyTarget
  : `http://${backendProxyTarget}`;

const nextConfig: NextConfig = {
  output: 'standalone',
  compress: true,
  turbopack: {
    resolveAlias: {
      'react-router-dom': './src/components/router-compat.tsx',
    },
  },
  experimental: {
    // Keep visited pages' RSC payload in the router cache so back-navigation is instant.
    staleTimes: {
      dynamic: 30,
      static: 180,
    },
    optimizePackageImports: [
      '@mui/material',
      '@mui/icons-material',
      'lucide-react',
      'framer-motion',
      'dayjs',
      '@iconify/react',
      'react-day-picker',
      'date-fns',
    ],
  },
  images: {
    qualities: [25, 50, 75, 85],
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
      },
      {
        protocol: 'https',
        hostname: 'i.ibb.co',
      },
      {
        protocol: 'https',
        hostname: 'cdn.phototourl.com',
      },
      {
        protocol: 'https',
        hostname: 'upload.wikimedia.org',
      },
    ],
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${normalizedBackendProxyTarget.replace(/\/$/, '')}/api/:path*`,
      },
      {
        source: '/uploads/:path*',
        destination: `${normalizedBackendProxyTarget.replace(/\/$/, '')}/uploads/:path*`,
      },
    ];
  },
  async redirects() {
    return [
      {
        source: '/results',
        destination: '/',
        permanent: false,
      },
      {
        source: '/ticket-search',
        destination: '/tickets',
        permanent: true,
      },
      {
        source: '/buy-ticket',
        destination: '/tickets',
        permanent: true,
      },
      {
        source: '/gieo-que',
        destination: '/fortune',
        permanent: true,
      },
      {
        source: '/lich-mo-thuong',
        destination: '/schedule',
        permanent: true,
      },
      {
        source: '/admin/management/dashboard',
        destination: '/admin/dashboard',
        permanent: false,
      },
    ];
  },
  webpack: (config) => {
    config.externals = [...(config.externals || []), { canvas: 'canvas' }];
    config.resolve.alias = {
      ...config.resolve.alias,
      'react-router-dom': path.resolve(__dirname, 'src/components/router-compat.tsx'),
    };

    // NOTE: no custom splitChunks here on purpose. Forcing single "admin" /
    // "client-public" / "mui" chunks made every page download code for the
    // whole section (e.g. Home pulled all of MUI for one icon). Next.js's
    // default granular chunking splits per-route far better.

    return config;
  },
};

export default withBundleAnalyzer(nextConfig);
