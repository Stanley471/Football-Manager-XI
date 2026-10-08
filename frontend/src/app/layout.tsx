import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navigation from '@/components/Navigation';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Football Manager XI",
  description: "MVP Football Manager",
};

import { Suspense } from 'react';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} dark`}>
      <body className="bg-zinc-950 text-zinc-100 min-h-screen flex font-sans">
        <Suspense fallback={<div className="w-64 bg-zinc-900 border-r border-zinc-800" />}>
          <Navigation />
        </Suspense>

        {/* Main Content */}
        <main className="flex-1 flex flex-col min-h-screen overflow-auto">
          <div className="flex-1 p-6 lg:p-10 max-w-6xl w-full mx-auto">
            {children}
          </div>
        </main>
      </body>
    </html>
  );
}
