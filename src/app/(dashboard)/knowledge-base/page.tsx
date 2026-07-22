'use client';

import React from 'react';
import Link from 'next/link';
import { 
  BookOpen, 
  Globe, 
  FileText, 
  UploadCloud, 
  Terminal, 
  UserCheck, 
  Search,
  ArrowRight 
} from 'lucide-react';

const KB_SECTIONS = [
  {
    title: 'Sitemap Management',
    description: 'Add domain URLs to automatically crawl website pages and refresh knowledge base context.',
    href: '/knowledge-base/sitemap',
    icon: Globe,
    color: 'text-blue-600 bg-blue-50 border-blue-100',
  },
  {
    title: 'Custom Knowledge',
    description: 'Add custom text snippets, FAQs, business rules, and raw policy guidelines.',
    href: '/knowledge-base/custom',
    icon: FileText,
    color: 'text-indigo-600 bg-indigo-50 border-indigo-100',
  },
  {
    title: 'Documents',
    description: 'Upload PDF, DOCX, and TXT documentation directly to SeaweedFS S3 storage.',
    href: '/knowledge-base/documents',
    icon: UploadCloud,
    color: 'text-emerald-600 bg-emerald-50 border-emerald-100',
  },
  {
    title: 'System Prompt',
    description: 'Configure primary system instructions and baseline behavior for AI agents.',
    href: '/knowledge-base/system-prompt',
    icon: Terminal,
    color: 'text-amber-600 bg-amber-50 border-amber-100',
  },
  {
    title: 'Business Persona',
    description: 'Manage brand voice tones, languages, and versioned persona profiles.',
    href: '/knowledge-base/persona',
    icon: UserCheck,
    color: 'text-purple-600 bg-purple-50 border-purple-100',
  },
  {
    title: 'Search Tester',
    description: 'Test search queries against indexed knowledge base items and inspect snippet scores.',
    href: '/knowledge-base/search-tester',
    icon: Search,
    color: 'text-rose-600 bg-rose-50 border-rose-100',
  },
];

export default function KnowledgeBaseOverviewPage() {
  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
          <BookOpen className="h-6 w-6 text-indigo-600" />
          Knowledge Base
        </h1>
        <p className="text-sm text-slate-500">
          Manage website sitemaps, custom text, S3 documents, system prompts, brand personas, and search testing.
        </p>
      </div>

      {/* Grid of Knowledge Sub-modules */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {KB_SECTIONS.map((sec) => {
          const Icon = sec.icon;
          return (
            <Link
              key={sec.href}
              href={sec.href}
              className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:border-indigo-200 hover:shadow-md flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-xl border ${sec.color}`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <ArrowRight className="h-4 w-4 text-slate-400 transition-transform group-hover:translate-x-1 group-hover:text-indigo-600" />
                </div>
                <h3 className="mt-4 text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                  {sec.title}
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-slate-500">
                  {sec.description}
                </p>
              </div>

              <div className="mt-6 flex items-center text-xs font-semibold text-indigo-600">
                Manage Section →
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
