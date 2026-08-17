import type { NextConfig } from 'next';

const withBundleAnalyzer = (config: NextConfig): NextConfig => {  if (process.env.ANALYZE === 'true') {
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

// Proxy /api/* → Spring. Docker: BACKEND_UPSTREAM=backend; local mặc định 8080.
const backendOrigin = (() => {
  const raw = process.env.BACKEND_UPSTREAM || 'http://localhost:8080';
  return `${raw.startsWith('http') ? raw : `http://${raw}`}`.replace(/\/$/, '');
})();

const nextConfig: NextConfig = {
  output: 'standalone',
  compress: true,
  experimental: {    // No App Router client cache — pages are SSR or CSR via React Query.
    staleTimes: {
      dynamic: 0,
      static: 0,
    },
    optimizePackageImports: [
      '@mui/material',
      '@mui/icons-material',
      '@mui/x-data-grid',
      '@mui/x-date-pickers',
      'lucide-react',
      'framer-motion',
      'dayjs',
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
  // Browser gọi /api, /uploads trên origin FE → Next rewrite sang Spring.
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${backendOrigin}/api/:path*`,
      },
      {
        source: '/uploads/:path*',
        destination: `${backendOrigin}/uploads/:path*`,
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
      {
        source: '/admin/dashboard/settings/content',
        destination: '/admin/dashboard/settings/pages',
        permanent: true,
      },
      {
        source: '/admin/dashboard/settings/page-privacy',
        destination: '/admin/dashboard/settings/policies',
        permanent: true,
      },
      {
        source: '/admin/dashboard/settings/page-terms',
        destination: '/admin/dashboard/settings/policies',
        permanent: true,
      },
      {
        source: '/admin/dashboard/settings/page-shipping',
        destination: '/admin/dashboard/settings/policies',
        permanent: true,
      },
      {
        source: '/admin/dashboard/settings/page-returns',
        destination: '/admin/dashboard/settings/policies',
        permanent: true,
      },
      {
        source: '/admin/dashboard/settings/page-about',
        destination: '/admin/dashboard/settings/pages',
        permanent: true,
      },
      {
        source: '/admin/dashboard/settings/page-faq',
        destination: '/admin/dashboard/settings/pages',
        permanent: true,
      },
      {
        source: '/admin/dashboard/settings/map',
        destination: '/admin/dashboard/settings/general',
        permanent: true,
      },
      {
        source: '/admin/dashboard/settings/point',
        destination: '/admin/dashboard/settings/general',
        permanent: true,
      },
      {
        source: '/admin/dashboard/settings/shipping',
        destination: '/admin/dashboard/settings/general',
        permanent: true,
      },
      {
        source: '/admin/dashboard/settings/payment',
        destination: '/admin/dashboard/settings/general',
        permanent: true,
      },
      {
        source: '/admin/dashboard/settings/social',
        destination: '/admin/dashboard/settings/general',
        permanent: true,
      },
    ];
  },
};
export default withBundleAnalyzer(nextConfig);
