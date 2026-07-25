'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Bot, ArrowRight, ShieldCheck } from 'lucide-react';
import Link from 'next/link';

export default function PersonaPage() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace('/ai-agents');
    }, 1500);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center">
      <div className="rounded-2xl bg-indigo-50 p-4 text-indigo-600 mb-4">
        <Bot className="h-8 w-8" />
      </div>
      <h2 className="text-xl font-bold text-slate-900">Consolidated System Prompt Management</h2>
      <p className="mt-2 max-w-md text-sm text-slate-600">
        Business Persona, Tone, and System Role instructions have been consolidated into a single source of truth under <strong>AI Agents</strong>.
      </p>
      <div className="mt-6 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-indigo-700 transition">
        <span>Redirecting to AI Agents...</span>
        <ArrowRight className="h-4 w-4 animate-pulse" />
      </div>
      <div className="mt-4">
        <Link href="/ai-agents" className="text-xs font-semibold text-indigo-600 hover:underline">
          Click here if not redirected automatically
        </Link>
      </div>
    </div>
  );
}
