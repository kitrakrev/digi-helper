import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Omni-Brief Platform',
  description: 'AI-powered multi-tenant platform for unified communications',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased font-sans bg-background text-foreground">
        {children}
      </body>
    </html>
  );
}
