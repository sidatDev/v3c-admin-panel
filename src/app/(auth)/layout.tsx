'use client';

import React from 'react';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-slate-950 px-4 py-12 sm:px-6 lg:px-8">
      {/* Background gradients */}
      <div className="absolute inset-0 z-0">
        <div className="absolute -top-[40%] -left-[20%] h-[80%] w-[80%] rounded-full bg-indigo-900/20 blur-[120px]" />
        <div className="absolute -bottom-[40%] -right-[20%] h-[80%] w-[80%] rounded-full bg-violet-900/20 blur-[120px]" />
      </div>

      <div className="relative z-10 w-full max-w-md page-enter">
        <div className="mb-8 text-center">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600 font-bold text-white shadow-lg shadow-indigo-600/30">
            V3C
          </div>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-white">
            V3C Platform
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            Intelligent AI Agent & Conversational Analytics
          </p>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60 p-8 shadow-2xl backdrop-blur-xl">
          {children}
        </div>
      </div>
    </div>
  );
}
