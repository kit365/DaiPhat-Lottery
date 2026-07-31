import type { Metadata } from 'next';
import '../index.css';
import '../App.css';
import 'react-toastify/dist/ReactToastify.css';
import '../styles/client.css';
import { Providers } from './providers';

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
    <html lang="vi">
      <body className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
