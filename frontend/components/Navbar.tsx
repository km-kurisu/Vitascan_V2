'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Activity, User, LogIn } from 'lucide-react';
import { SignedIn, SignedOut, UserButton } from '@clerk/nextjs';

export default function Navbar() {
  const pathname = usePathname();

  const navLinks = [
    { name: 'Home', href: '/' },
    { name: 'History', href: '/results' },
    { name: 'About', href: '/#about' },
    { name: 'Reminders', href: '/reminders' },
  ];

  return (
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

          {/* Clerk Auth Navigation Buttons */}
          <SignedIn>
            <UserButton afterSignOutUrl="/" />
          </SignedIn>
          <SignedOut>
            <Link
              href="/login"
              className="px-4 py-2 text-xs font-bold text-white bg-[#1D61E7] hover:bg-blue-700 rounded-xl shadow-sm transition-all flex items-center space-x-1.5"
            >
              <LogIn className="w-4 h-4" />
              <span>Login</span>
            </Link>
          </SignedOut>
        </div>
      </div>
    </header>
  );
}
