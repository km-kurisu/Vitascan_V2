'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [userName, setUserName] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    router.push('/');
  };

  return (
    <div className="flex items-center justify-center min-h-[75vh] py-8">
      <div className="bg-white p-8 sm:p-10 rounded-3xl border border-blue-200/80 shadow-md w-full max-w-md space-y-6 text-center">
        <h1 className="text-2xl font-bold text-slate-900">Login</h1>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-3">
            <input
              type="text"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              placeholder="User Name"
              className="w-full px-4 py-3 rounded-xl border border-blue-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400"
              required
            />

            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full px-4 py-3 rounded-xl border border-blue-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400"
              required
            />
          </div>

          <div className="text-right">
            <a
              href="#"
              className="text-xs font-semibold text-[#1D61E7] hover:underline"
            >
              Forgot Password?
            </a>
          </div>

          <button
            type="submit"
            className="w-full py-3.5 bg-[#1D61E7] hover:bg-blue-700 text-white font-bold rounded-xl shadow-md shadow-blue-600/20 transition-all text-sm"
          >
            Login
          </button>
        </form>

        <div className="pt-2 space-y-3 border-t border-slate-100">
          <p className="text-sm font-semibold text-slate-800">
            Don’t have an account?
          </p>

          <Link
            href="/register"
            className="inline-block w-full py-2.5 px-6 border border-slate-200 hover:bg-slate-50 text-slate-800 font-bold rounded-xl transition-all text-sm shadow-xs"
          >
            Register
          </Link>
        </div>
      </div>
    </div>
  );
}
