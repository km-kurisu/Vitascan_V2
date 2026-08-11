import './globals.css';
import React from 'react';
import Link from 'next/link';
import { Activity, ShieldCheck, FileText, Camera } from 'lucide-react';

export const metadata = {
  title: 'VitaScan — Multi-Modal Nutritional Deficiency Intelligence',
  description: 'Joint reasoning nutritional severity grading powered by GAT and CNN vision models.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased flex flex-col min-h-screen">
        {/* Navigation Header */}
        <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <Link href="/" className="flex items-center space-x-3 group">
              <div className="bg-teal-500 p-2 rounded-xl text-slate-950 font-bold group-hover:bg-teal-400 transition-colors">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-teal-400 to-emerald-300 bg-clip-text text-transparent">
                  VitaScan
                </span>
                <span className="ml-2 text-xs font-medium px-2 py-0.5 bg-slate-800 text-teal-400 rounded-full border border-teal-500/20">
                  v2.0 GAT
                </span>
              </div>
            </Link>

            <nav className="flex items-center space-x-6 text-sm font-medium">
              <Link href="/upload" className="text-slate-300 hover:text-teal-400 flex items-center space-x-1 transition-colors">
                <FileText className="w-4 h-4" />
                <span>Upload</span>
              </Link>
              <Link href="/processing" className="text-slate-300 hover:text-teal-400 flex items-center space-x-1 transition-colors">
                <Activity className="w-4 h-4" />
                <span>Processing Status</span>
              </Link>
              <Link href="/results" className="text-slate-300 hover:text-teal-400 flex items-center space-x-1 transition-colors">
                <ShieldCheck className="w-4 h-4" />
                <span>Dashboard</span>
              </Link>
            </nav>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>

        {/* Footer */}
        <footer className="bg-slate-900 border-t border-slate-800 text-slate-400 py-6 text-xs text-center">
          <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <p className="font-medium text-slate-300">VitaScan Nutritional Severity System</p>
              <p>Dept. of Computer Engineering — St. John College of Engineering and Management</p>
            </div>
            <div className="flex space-x-4 text-slate-500">
              <span>Path B (GAT)</span>
              <span>•</span>
              <span>Path A (CNN)</span>
              <span>•</span>
              <span>FSSAI Compliant</span>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
