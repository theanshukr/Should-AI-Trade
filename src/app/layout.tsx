import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Should AI Trade? | Every Trade Must Earn Its Yes',
  description: 'An AI-assisted, multi-agent trading decision and risk-control platform with Red Team adversarial audits and deterministic risk gates.',
  icons: {
    icon: [
      { url: '/logo.png', type: 'image/png' },
      { url: '/favicon.ico', sizes: 'any' }
    ],
    shortcut: '/logo.png',
    apple: '/logo.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#121117] text-[#e2e8f0] antialiased">
        {children}
      </body>
    </html>
  );
}
