import type { Metadata } from 'next';
import './globals.css';

const faviconPng = '/favicon-oneplus-vietnam-v3.png';

export const metadata: Metadata = {
  title: 'Kho ROM Việt — ROM, firmware & recovery',
  description:
    'Tra cứu ROM, firmware, OrangeFox Recovery và OTA. Ưu tiên OnePlus, giao diện tiếng Việt.',
  icons: {
    icon: [{ url: faviconPng, type: 'image/png', sizes: '64x64' }],
    shortcut: faviconPng,
    apple: faviconPng,
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <head>
        <link rel="icon" href={faviconPng} type="image/png" sizes="64x64" />
        <link rel="shortcut icon" href={faviconPng} type="image/png" />
        <link rel="apple-touch-icon" href={faviconPng} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
