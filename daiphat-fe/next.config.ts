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

// Proxy /api/* → Spring. Không có trong .env local thì dùng 8080.
const backendProxyTarget = process.env.BACKEND_UPSTREAM || 'http://localhost:8080';

const normalizedBackendProxyTarget = backendProxyTarget.startsWith('http')
  ? backendProxyTarget
  : `http://${backendProxyTarget}`;

const nextConfig: NextConfig = {
  output: 'standalone',
  compress: true,
  experimental: {    // Keep visited pages' RSC payload in the router cache so back-navigation is instant.
    staleTimes: {
      dynamic: 30,
      static: 180,
    },
    optimizePackageImports: [
      '@mui/material',
      '@mui/icons-material',
      '@mui/x-data-grid',
      '@mui/x-date-pickers',
      '@fullcalendar/react',
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
  // Nhờ Proxy để Next gửi dữ liệu sang BE thật
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
