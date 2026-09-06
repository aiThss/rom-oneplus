import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: 'Kho ROM Việt — ROM, firmware & recovery',
  description:
    'Tra cứu ROM, firmware, OrangeFox Recovery và OTA. Ưu tiên OnePlus, giao diện tiếng Việt.',
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
