import type { Metadata } from 'next';
import '../index.css';
import 'react-toastify/dist/ReactToastify.css';
import '../styles/client.css';
import { fontVariables } from '@/styles/fonts';
import { Providers } from './providers';
import { FontLoader } from '../components/FontLoader';

export const metadata: Metadata = {
  title: {
    default: 'ĐẠI PHÁT | TÀI LỘC - MAY MẮN - THỊNH VƯỢNG',
    template: '%s | ĐẠI PHÁT',
  },
  description: 'Hệ thống xổ số kiến thiết uy tín — nhanh chóng, minh bạch, bảo mật.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="vi"
      className={fontVariables}
      suppressHydrationWarning
    >
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="antialiased" suppressHydrationWarning>
        {/* Icon fonts loaded non-blocking after page is interactive */}
        <FontLoader />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
