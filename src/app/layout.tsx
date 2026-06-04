import type { Metadata } from 'next';
import { Outfit } from 'next/font/google';
import './globals.css';

const outfit = Outfit({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-outfit',
});

export const viewport = {
  width: 'device-width',
  initialScale: 1,
};

export const metadata: Metadata = {
  title: 'RepoGPT — AI Repository Intelligence & Code Visualizer',
  description: 'Instantly clone, parse, index, and visualize public GitHub codebases. Chat with your repository using semantic search and local AI.',
  keywords: ['AI repository intelligence', 'code visualizer', 'dependency graph', 'semantic code search', 'developer onboarding'],
  authors: [{ name: 'RepoGPT Team' }],
  icons: {
    icon: '/Favicon.png',
    shortcut: '/Favicon.png',
    apple: '/Logo.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${outfit.variable} dark scroll-smooth h-full antialiased`}>
      <body className="min-h-full bg-slate-950 text-slate-100 flex flex-col font-sans">
        {children}
      </body>
    </html>
  );
}
