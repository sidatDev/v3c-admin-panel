'use client';

import React from 'react';
import Link from 'next/link';
import { 
  BookOpen, 
  Globe, 
  FileText, 
  UploadCloud, 
  ArrowRight 
} from 'lucide-react';
import { MultiKbManager } from '@/components/knowledge-base/multi-kb-manager';
import { KbGovernancePanel } from '@/components/knowledge-base/kb-governance-panel';

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
    title: 'Documents & Vector Hub',
    description: 'Upload PDF and TXT documentation directly to Knowledge Bases and trigger pgvector embeddings.',
    href: '/knowledge-base/documents',
    icon: UploadCloud,
    color: 'text-emerald-600 bg-emerald-50 border-emerald-100',
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
          Manage specialist Knowledge Bases, Base64 TXT/PDF vector ingestion, website sitemaps, and custom text.
        </p>
      </div>

      {/* Multi-Knowledge Base Hub & Vector Ingestion Engine */}
      <MultiKbManager />

      {/* KB Approval Workflow, Expiry Tagging & 1-Click Version Rollback (Blueprint Sec 5.3 & 5.4) */}
      <KbGovernancePanel />

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
