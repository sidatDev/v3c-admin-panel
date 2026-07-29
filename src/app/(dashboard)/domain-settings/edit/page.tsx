'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  Globe,
  ArrowLeft,
  UploadCloud,
  RefreshCw,
  Sparkles,
  Eye,
  Trash2,
  CheckCircle2,
  ImageIcon,
  X,
  ShieldCheck,
} from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/providers/auth-provider';

interface WebsiteItem {
  id: number;
  domain: string;
  publicKey: string;
  privateKey: string;
  packageType: string;
  createdAt: string;
}

interface BrandingData {
  companyName: string;
  pageTitle: string;
  logoUrl: string | null;
  faviconUrl: string | null;
  accentColor: string;
}

interface DomainData {
  branding: BrandingData;
  websites: WebsiteItem[];
}

function EditBrandingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const domainIdParam = searchParams.get('domainId') || '';

  const { isAuthenticated, isLoading: isLoadingAuth } = useAuth();
  const queryClient = useQueryClient();

  const [selectedDomainId, setSelectedDomainId] = useState<string>(domainIdParam);
  const [selectedDomainName, setSelectedDomainName] = useState<string>('Global Default Workspace');

  const [companyName, setCompanyName] = useState('');
  const [pageTitle, setPageTitle] = useState('');
  const [accentColor, setAccentColor] = useState('#4F46E5');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [faviconFile, setFaviconFile] = useState<File | null>(null);

  const [deleteLogo, setDeleteLogo] = useState(false);
  const [deleteFavicon, setDeleteFavicon] = useState(false);

  const { data, isLoading } = useQuery<DomainData>({
    queryKey: ['domain-settings'],
    queryFn: async () => {
      const res = await api.get<{ status: string; data: DomainData }>('/api/domain');
      return res.data;
    },
    enabled: !isLoadingAuth && isAuthenticated,
  });

  const branding = data?.branding;
  const websites = data?.websites || [];

  useEffect(() => {
    if (domainIdParam && websites.length > 0) {
      const matched = websites.find((w) => String(w.id) === domainIdParam);
      if (matched) {
        setSelectedDomainId(String(matched.id));
        setSelectedDomainName(matched.domain);
      }
    } else if (websites.length > 0) {
      setSelectedDomainId(String(websites[0].id));
      setSelectedDomainName(websites[0].domain);
    } else if (branding?.companyName) {
      setSelectedDomainName(branding.companyName);
    }
  }, [domainIdParam, websites, branding]);

  useEffect(() => {
    if (branding) {
      setCompanyName(branding.companyName || 'V3C Platform');
      setPageTitle(branding.pageTitle || `${branding.companyName || 'V3C Platform'}'s Workspace`);
      setAccentColor(branding.accentColor || '#4F46E5');
    }
  }, [branding]);

  const updateBrandingMutation = useMutation({
    mutationFn: async () => {
      const formData = new FormData();
      if (companyName) formData.append('companyName', companyName);
      if (pageTitle) formData.append('pageTitle', pageTitle);
      if (accentColor) formData.append('accentColor', accentColor);
      if (selectedDomainId) formData.append('domainId', selectedDomainId);
      if (logoFile) formData.append('logo', logoFile);
      if (faviconFile) formData.append('favicon', faviconFile);
      if (deleteLogo) formData.append('deleteLogo', 'true');
      if (deleteFavicon) formData.append('deleteFavicon', 'true');

      await api.put('/api/domain/branding', formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['domain-settings'] });
      toast.success('White-Label Branding settings saved successfully!');
      router.push('/domain-settings');
    },
    onError: (error) => {
      if (error instanceof ApiError) toast.error(error.message);
      else toast.error('Failed to save branding settings.');
    },
  });

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Top Breadcrumb & Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/domain-settings"
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 shadow-xs hover:bg-slate-50 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Domain Settings
          </Link>
          <span className="text-slate-300">/</span>
          <span className="text-xs font-semibold text-slate-500">Edit Branding</span>
        </div>

        <button
          onClick={() => updateBrandingMutation.mutate()}
          disabled={updateBrandingMutation.isPending}
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-50 transition-colors"
        >
          <UploadCloud className="h-4 w-4" />
          {updateBrandingMutation.isPending ? 'Saving...' : 'Save Branding Settings'}
        </button>
      </div>

      {/* Main Page Title Header */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-indigo-600" />
            Edit White-Label Branding Settings
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Target Scope: <span className="font-bold text-indigo-700">{selectedDomainName}</span>
          </p>
        </div>
        {selectedDomainId && (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 border border-emerald-100 shrink-0">
            <ShieldCheck className="h-4 w-4" /> Domain Specific Config
          </span>
        )}
      </div>

      {/* FORM INPUTS FORM */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 border-b border-slate-100 pb-3">
          Branding Details & Assets
        </h3>

        {/* Target Domain Scope */}
        <div>
          <label className="text-xs font-semibold text-slate-700 block mb-1">Target Website / Registered Domain Scope</label>
          <select
            value={selectedDomainId}
            onChange={(e) => {
              const val = e.target.value;
              setSelectedDomainId(val);
              const selected = websites.find((w) => String(w.id) === val);
              setSelectedDomainName(selected ? selected.domain : (branding?.companyName || 'Tenant Workspace'));
            }}
            className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-xs text-slate-900 outline-none focus:border-indigo-500 bg-white"
          >
            <option value="">-- Apply to All Registered Websites ({branding?.companyName || 'Tenant Workspace'}) --</option>
            {websites.map((w) => (
              <option key={w.id} value={w.id}>
                {w.domain} (ID: {w.id})
              </option>
            ))}
          </select>
        </div>

        {/* Frontend Page Title (<title>) */}
        <div>
          <label className="text-xs font-semibold text-slate-700 block mb-1">
            Frontend Browser Tab Title (<code className="text-indigo-600 font-mono">&lt;title&gt;</code>)
          </label>
          <input
            type="text"
            placeholder="e.g. Salaam Takaful Limited - Customer Care Portal"
            value={pageTitle}
            onChange={(e) => setPageTitle(e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-indigo-500"
          />
          <p className="text-[11px] text-slate-400 mt-1">
            This title will appear in the browser tab when users visit your tenant frontend URL (e.g. <code className="text-slate-600">/salaam-takaful-limited</code>). If left blank, it defaults to &quot;{companyName || 'Company'}&apos;s Workspace&quot;.
          </p>
        </div>

        {/* Company / Brand Name */}
        <div>
          <label className="text-xs font-semibold text-slate-700 block mb-1">Company / Brand Name</label>
          <input
            type="text"
            placeholder="e.g. Salaam Takaful Limited"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-indigo-500"
          />
        </div>

        {/* Accent Color */}
        <div>
          <label className="text-xs font-semibold text-slate-700 block mb-1">Brand Accent Color</label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={accentColor}
              onChange={(e) => setAccentColor(e.target.value)}
              className="h-10 w-12 rounded-lg border border-slate-200 p-1 cursor-pointer bg-white"
            />
            <input
              type="text"
              value={accentColor}
              onChange={(e) => setAccentColor(e.target.value)}
              className="w-36 rounded-xl border border-slate-200 px-3 py-2 text-xs font-mono text-slate-900 outline-none focus:border-indigo-500 uppercase"
            />
          </div>
        </div>

        {/* Brand Logo Upload + Specs Badge & Preview */}
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <label className="text-xs font-bold text-slate-800">Brand Logo Image</label>
            <span className="rounded-full bg-indigo-100 px-3 py-1 text-[11px] font-bold text-indigo-800 w-fit">
              Recommended: 512 × 512 px (or max 220 × 56 px)
            </span>
          </div>
          <p className="text-[11px] text-slate-500">
            Supported Formats: PNG, SVG, WEBP (Transparent background recommended for clear display).
          </p>

          {/* VISUAL IMAGE PREVIEW BOX FOR LOGO */}
          {(logoFile || (branding?.logoUrl && !deleteLogo)) && (
            <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-2 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                  <ImageIcon className="h-4 w-4 text-indigo-600" />
                  Logo Image Preview
                </span>
                <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-semibold border border-emerald-100">
                  {logoFile ? `Selected: ${logoFile.name}` : 'Saved Logo Active'}
                </span>
              </div>
              <div className="flex items-center gap-4 rounded-lg bg-slate-900/90 p-4 border border-slate-800">
                <img
                  src={logoFile ? URL.createObjectURL(logoFile) : branding!.logoUrl!}
                  alt="Brand Logo Preview"
                  className="h-12 max-w-[200px] object-contain"
                />
                <div className="text-xs text-slate-300 space-y-1">
                  <p className="font-semibold text-white">Main Workspace Logo</p>
                  <p className="text-[10px] text-slate-400 font-mono">Rendered on header & splash screens</p>
                </div>
              </div>
            </div>
          )}

          <input
            type="file"
            accept="image/*"
            onChange={(e) => {
              setLogoFile(e.target.files?.[0] || null);
              setDeleteLogo(false);
            }}
            className="w-full text-xs text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-500"
          />
          {((branding?.logoUrl && !deleteLogo) || logoFile) && (
            <div className="flex items-center justify-between pt-2 border-t border-slate-200">
              <span className="text-[11px] text-emerald-700 font-medium flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" /> Logo preview active
              </span>
              <button
                type="button"
                onClick={() => {
                  setLogoFile(null);
                  setDeleteLogo(true);
                }}
                className="text-xs font-semibold text-rose-600 hover:text-rose-700 flex items-center gap-1"
              >
                <Trash2 className="h-3.5 w-3.5" /> Remove Logo
              </button>
            </div>
          )}
        </div>

        {/* Brand Favicon Upload + Specs Badge & Preview */}
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <label className="text-xs font-bold text-slate-800">Brand Favicon Icon</label>
            <span className="rounded-full bg-indigo-100 px-3 py-1 text-[11px] font-bold text-indigo-800 w-fit">
              Recommended: 32 × 32 px or 64 × 64 px (Square 1:1)
            </span>
          </div>
          <p className="text-[11px] text-slate-500">
            Supported Formats: ICO, PNG, WEBP (Appears in the browser tab next to the page title).
          </p>

          {/* VISUAL IMAGE PREVIEW BOX FOR FAVICON */}
          {(faviconFile || (branding?.faviconUrl && !deleteFavicon)) && (
            <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-2 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                  <Globe className="h-4 w-4 text-indigo-600" />
                  Favicon Icon Preview
                </span>
                <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-semibold border border-emerald-100">
                  {faviconFile ? `Selected: ${faviconFile.name}` : 'Saved Favicon Active'}
                </span>
              </div>
              <div className="flex items-center gap-3 rounded-lg bg-slate-900 p-3 border border-slate-800">
                <div className="h-8 w-8 rounded bg-slate-800 flex items-center justify-center border border-slate-700">
                  <img
                    src={faviconFile ? URL.createObjectURL(faviconFile) : branding!.faviconUrl!}
                    alt="Brand Favicon Preview"
                    className="h-6 w-6 object-contain"
                  />
                </div>
                <div className="text-xs text-slate-300">
                  <p className="font-semibold text-white">Browser Tab Favicon (1:1 Ratio)</p>
                  <p className="text-[10px] text-slate-400 font-mono">Rendered on address bar & bookmarks</p>
                </div>
              </div>
            </div>
          )}

          <input
            type="file"
            accept="image/*"
            onChange={(e) => {
              setFaviconFile(e.target.files?.[0] || null);
              setDeleteFavicon(false);
            }}
            className="w-full text-xs text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-500"
          />
          {((branding?.faviconUrl && !deleteFavicon) || faviconFile) && (
            <div className="flex items-center justify-between pt-2 border-t border-slate-200">
              <span className="text-[11px] text-emerald-700 font-medium flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" /> Favicon preview active
              </span>
              <button
                type="button"
                onClick={() => {
                  setFaviconFile(null);
                  setDeleteFavicon(true);
                }}
                className="text-xs font-semibold text-rose-600 hover:text-rose-700 flex items-center gap-1"
              >
                <Trash2 className="h-3.5 w-3.5" /> Remove Favicon
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Save Action Controls */}
      <div className="flex justify-end gap-3 pt-2">
        <Link
          href="/domain-settings"
          className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 shadow-xs"
        >
          Cancel
        </Link>
        <button
          type="button"
          onClick={() => updateBrandingMutation.mutate()}
          disabled={updateBrandingMutation.isPending}
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-2.5 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 shadow-sm"
        >
          <UploadCloud className="h-4 w-4" />
          {updateBrandingMutation.isPending ? 'Saving Settings...' : 'Save Branding Settings'}
        </button>
      </div>
    </div>
  );
}

export default function EditBrandingPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-[60vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
        </div>
      }
    >
      <EditBrandingContent />
    </Suspense>
  );
}
