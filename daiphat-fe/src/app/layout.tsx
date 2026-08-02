import type { Metadata } from 'next';
import { Inter, Barlow, Public_Sans } from 'next/font/google';
import '../index.css';
import 'react-toastify/dist/ReactToastify.css';
import '../styles/client.css';
import { Providers } from './providers';
import { FontLoader } from '../components/FontLoader';

const inter = Inter({
  subsets: ['latin', 'vietnamese'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-inter',
  display: 'swap',
});

const barlow = Barlow({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800', '900'],
  variable: '--font-barlow',
  display: 'swap',
});

const publicSans = Public_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-public-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Đại Phát Lottery Platform',
  description: 'Nền tảng mua vé và theo dõi kết quả xổ số trực tuyến uy tín',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" className={`${inter.variable} ${barlow.variable} ${publicSans.variable}`}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="antialiased">
        {/* Icon fonts loaded non-blocking after page is interactive */}
        <FontLoader />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
