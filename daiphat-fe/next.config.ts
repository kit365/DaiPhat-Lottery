import type { NextConfig } from 'next';
import path from 'path';

// Dev API calls use a relative base URL (same-origin) so HttpOnly cookies work.
// Proxy /api/* to the Spring backend (defaults to local core-api).
const backendProxyTarget =
  process.env.VITE_DEV_PROXY_TARGET ||
  process.env.BACKEND_UPSTREAM ||
  'http://localhost:8080';

const nextConfig: NextConfig = {
  compress: true,
  experimental: {
    optimizePackageImports: [
      '@mui/material',
      '@mui/icons-material',
      'lucide-react',
      'framer-motion',
      'dayjs',
      '@iconify/react',
    ],
  },
  images: {
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
        hostname: '**',
      },
    ],
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${backendProxyTarget.replace(/\/$/, '')}/api/:path*`,
      },
    ];
  },
  webpack: (config) => {
    config.externals = [...(config.externals || []), { canvas: 'canvas' }];
    config.resolve.alias = {
      ...config.resolve.alias,
      'react-router-dom': path.resolve(__dirname, 'src/components/router-compat.tsx'),
      'react-apexcharts': path.resolve(__dirname, 'src/components/ApexChartCompat.tsx'),
    };
    return config;
  },
};

export default nextConfig;
