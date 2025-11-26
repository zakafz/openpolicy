import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/ui/toast";
import { WorkspaceProvider } from "@/context/workspace";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://openpolicyhq.com'),
  title: {
    default: 'OpenPolicy - Modern Policy Documentation Platform',
    template: '%s | OpenPolicy'
  },
  description: 'Create, manage, and publish policy documents with ease. OpenPolicy is a modern platform for teams to collaborate on compliance, legal, and internal documentation.',
  keywords: ['policy documentation', 'compliance', 'legal documents', 'team collaboration', 'document management', 'policy management'],
  authors: [{ name: 'OpenPolicy' }],
  creator: 'OpenPolicy',
  publisher: 'OpenPolicy',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://openpolicyhq.com',
    siteName: 'OpenPolicy',
    title: 'OpenPolicy - Modern Policy Documentation Platform',
    description: 'Create, manage, and publish policy documents with ease. Collaborate on compliance and legal documentation.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'OpenPolicy - Policy Documentation Platform',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'OpenPolicy - Modern Policy Documentation Platform',
    description: 'Create, manage, and publish policy documents with ease.',
    images: ['/og-image.png'],
    creator: '@openpolicyhq',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="bg-background" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ToastProvider timeout={2000}>
          <WorkspaceProvider>{children}</WorkspaceProvider>
          <Analytics />
          <SpeedInsights />
        </ToastProvider>
      </body>
    </html>
  );
}
