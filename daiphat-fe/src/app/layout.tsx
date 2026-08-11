import type { Metadata } from 'next';
import '../index.css';
import 'react-toastify/dist/ReactToastify.css';
import '../styles/client.css';
import { fontVariables } from '@/styles/fonts';
import { Providers } from './providers';
import { FontLoader } from '../components/FontLoader';
const DAI_PHAT_LOGO = 'https://i.ibb.co/YBYnq3HR/z7824247008533-94446d3b6c16598cda67404d805c15c4-removebg-preview.png';
import { CLIENT_FAVICON } from '@/client/constants/clientBannerAssets';

export const metadata: Metadata = {
  title: {
    default: 'ĐẠI PHÁT | TÀI LỘC - MAY MẮN - THỊNH VƯỢNG',
    template: '%s | ĐẠI PHÁT',
  },
  description: 'Hệ thống xổ số kiến thiết uy tín — nhanh chóng, minh bạch, bảo mật.',
  icons: {
    icon: CLIENT_FAVICON || DAI_PHAT_LOGO,
    shortcut: CLIENT_FAVICON || DAI_PHAT_LOGO,
    apple: CLIENT_FAVICON || DAI_PHAT_LOGO,
  },
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
        <link rel="icon" type="image/jpeg" href={DAI_PHAT_LOGO} />
        <link rel="shortcut icon" href={DAI_PHAT_LOGO} />
        <link rel="apple-touch-icon" href={DAI_PHAT_LOGO} />
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
