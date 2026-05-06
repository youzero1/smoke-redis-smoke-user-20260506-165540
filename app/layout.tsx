import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Smoke Redis Migration',
  description: 'A tool to smoke test and manage Redis migrations',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
