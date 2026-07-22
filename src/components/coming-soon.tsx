'use client';

import React from 'react';
import { Clock } from 'lucide-react';

interface ComingSoonProps {
  title: string;
  description?: string;
}

export default function ComingSoon({ title, description }: ComingSoonProps) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 animate-pulse-slow">
        <Clock className="h-8 w-8" />
      </div>
      
      <h1 className="mt-6 text-2xl font-bold text-slate-900 tracking-tight">
        {title} — Coming Soon
      </h1>
      
      <p className="mt-2 max-w-md text-sm text-slate-500">
        {description || 'We are working hard to build this feature. Check back shortly for updates!'}
      </p>

      <div className="mt-8 flex gap-3">
        <div className="h-1.5 w-1.5 rounded-full bg-indigo-600" />
        <div className="h-1.5 w-1.5 rounded-full bg-indigo-600/60" />
        <div className="h-1.5 w-1.5 rounded-full bg-indigo-600/30" />
      </div>
    </div>
  );
}
