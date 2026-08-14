'use client';

import './globals.css';
import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Activity, User, LogIn, ShieldCheck, FileText } from 'lucide-react';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const navLinks = [
    { name: 'Home', href: '/' },
    { name: 'History', href: '/results' },
    { name: 'About', href: '/#about' },
  ];

  return (
    <html lang="en">
      <head>
        <title>VitaScan — Nutritional Deficiency Intelligence</title>
        <meta name="description" content="AI-powered nutritional deficiency assessment and blood report analysis." />
      </head>
      <body className="antialiased flex flex-col min-h-screen bg-[#FAFCFF] text-slate-900">
        {/* Navigation Bar */}
        <header className="bg-white border-b border-slate-200/80 sticky top-0 z-50 shadow-sm">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
            {/* Logo */}
            <Link href="/" className="flex items-center space-x-3 group">
              <div className="w-10 h-10 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center text-white shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
                <Activity className="w-6 h-6" />
              </div>
              <div className="flex flex-col">
                <span className="text-2xl font-black tracking-tight text-slate-900">
                  <span className="text-[#1D61E7]">Vita</span>
                  <span className="text-[#EF4444]">Scan</span>
                </span>
                <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 -mt-1">
                  AI Severity Engine
                </span>
              </div>
            </Link>

            {/* Navigation Links */}
            <nav className="flex items-center space-x-8 text-base font-semibold">
              {navLinks.map((link) => {
                const isActive =
                  pathname === link.href ||
                  (link.href !== '/' && pathname?.startsWith(link.href));
                return (
                  <Link
                    key={link.name}
                    href={link.href}
                    className={`relative py-2 transition-colors ${
                      isActive
                        ? 'text-[#1D61E7] font-bold'
                        : 'text-slate-600 hover:text-[#1D61E7]'
                    }`}
                  >
                    {link.name}
                    {isActive && (
                      <span className="absolute bottom-0 left-0 w-full h-1 bg-[#1D61E7] rounded-full" />
                    )}
                  </Link>
                );
              })}
            </nav>

            {/* Right Quick Actions / Profile */}
            <div className="flex items-center space-x-3">
              <Link
                href="/patient-details"
                className="px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all flex items-center space-x-2"
              >
                <User className="w-4 h-4 text-blue-600" />
                <span>Patient Profile</span>
              </Link>
              <Link
                href="/login"
                className="px-4 py-2 text-xs font-bold text-white bg-[#1D61E7] hover:bg-blue-700 rounded-xl shadow-sm transition-all flex items-center space-x-1.5"
              >
                <LogIn className="w-4 h-4" />
                <span>Login</span>
              </Link>
            </div>
          </div>
        </header>

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
  );
}
