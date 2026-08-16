import './globals.css';
import React from 'react';
import Link from 'next/link';
import { ClerkProvider } from '@clerk/nextjs';
import Navbar from '@/components/Navbar';

export const metadata = {
  title: 'VitaScan — Nutritional Deficiency Intelligence',
  description: 'AI-powered nutritional deficiency assessment and blood report analysis.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

  return (
    <ClerkProvider publishableKey={publishableKey}>
      <html lang="en">
        <body className="antialiased flex flex-col min-h-screen bg-[#FAFCFF] text-slate-900">
          {/* Navigation Bar */}
          <Navbar />

          {/* Main Content Area */}
          <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {children}
          </main>

          {/* Footer */}
          <footer className="bg-white border-t border-slate-200 text-slate-500 py-8 text-xs">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="space-y-1 text-center md:text-left">
                <p className="font-bold text-slate-800 text-sm">
                  <span className="text-[#1D61E7]">Vita</span>
                  <span className="text-[#EF4444]">Scan</span> — Precision Multi-Modal Nutritional Intelligence
                </p>
                <p className="text-slate-400">
                  St. John College of Engineering and Management • Dept. of Computer Engineering
                </p>
              </div>
              <div className="flex items-center space-x-6 text-slate-500 font-medium">
                <Link href="/upload" className="hover:text-blue-600 transition-colors">
                  Blood Upload (Path B)
                </Link>
                <span>•</span>
                <Link href="/upload" className="hover:text-purple-600 transition-colors">
                  Skin/Symptom Photo (Path A)
                </Link>
                <span>•</span>
                <Link href="/results" className="hover:text-emerald-600 transition-colors">
                  Results
                </Link>
              </div>
            </div>
          </footer>
        </body>
      </html>
    </ClerkProvider>
  );
}
