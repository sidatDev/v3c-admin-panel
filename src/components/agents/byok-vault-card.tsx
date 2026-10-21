'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import {
  KeyRound,
  ShieldCheck,
  Trash2,
  Save,
  RefreshCw,
  Loader2,
  Cpu,
} from 'lucide-react';
import { toast } from 'sonner';

interface SecretItem {
  id: string;
  keyName: string;
  maskedValue: string;
  updatedAt: string;
}

interface ByokStatusData {
  tenantId: string;
  activeKeySource: 'byok_openai' | 'byok_openrouter' | 'platform_default';
  activeModel: string;
  isByokActive: boolean;
  secrets: SecretItem[];
}

const SUPPORTED_KEYS = [
  {
    keyName: 'OPENAI_API_KEY',
    label: 'OpenAI API Key (BYOK)',
    placeholder: 'sk-proj-...',
  },
  {
    keyName: 'OPENROUTER_API_KEY',
    label: 'OpenRouter API Key (BYOK)',
    placeholder: 'sk-or-v1-...',
  },
  {
    keyName: 'BYOK_DEFAULT_MODEL',
    label: 'Default Model Override',
    placeholder: 'gpt-4o-mini or openai/gpt-4o-mini or anthropic/claude-3.5-sonnet',
  },
];

export function ByokVaultCard() {
  const [status, setStatus] = useState<ByokStatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedKey, setSelectedKey] = useState('OPENAI_API_KEY');
  const [secretValue, setSecretValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [deletingKey, setDeletingKey] = useState<string | null>(null);

  useEffect(() => {
    loadByokStatus();
  }, []);

  async function loadByokStatus() {
    try {
      setLoading(true);
      const res: any = await api.get('/api/secrets');
      if (res?.data) {
        setStatus(res.data);
      }
    } catch (err: any) {
      console.error('Failed to load BYOK vault status:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveSecret(e: React.FormEvent) {
    e.preventDefault();
    if (!secretValue.trim()) return;
    try {
      setSaving(true);
      await api.post('/api/secrets', {
        keyName: selectedKey,
        value: secretValue.trim(),
      });
      setSecretValue('');
      toast.success(`Encrypted ${selectedKey} saved to BYOK Vault`);
      await loadByokStatus();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save secret');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteSecret(keyName: string) {
    try {
      setDeletingKey(keyName);
      await api.delete(`/api/secrets/${encodeURIComponent(keyName)}`);
      toast.success(`Removed ${keyName}; reverted to platform default`);
      await loadByokStatus();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete secret');
    } finally {
      setDeletingKey(null);
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-indigo-600" />
            <h4 className="text-sm font-bold text-slate-900">
              Phase 3: BYOK (Bring Your Own Key) Encrypted Model Router
            </h4>
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${
                status?.isByokActive
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : 'bg-slate-200 text-slate-700'
              }`}
            >
              <ShieldCheck className="h-3 w-3" />
              {status?.activeKeySource || 'platform_default'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Store tenant-specific OpenAI / OpenRouter keys in the AES-256-GCM Vault.{' '}
            <span className="font-mono text-indigo-700">
              Active Model: {status?.activeModel || 'gpt-4o-mini'}
            </span>
          </p>
        </div>

        <button
          type="button"
          onClick={loadByokStatus}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh Vault
        </button>
      </div>

      {/* Upsert Secret Form */}
      <form onSubmit={handleSaveSecret} className="grid grid-cols-1 md:grid-cols-12 gap-3">
        <div className="md:col-span-4">
          <select
            value={selectedKey}
            onChange={(e) => setSelectedKey(e.target.value)}
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 focus:border-indigo-500 focus:outline-none"
          >
            {SUPPORTED_KEYS.map((k) => (
              <option key={k.keyName} value={k.keyName}>
                {k.label} ({k.keyName})
              </option>
            ))}
          </select>
        </div>

        <div className="md:col-span-6">
          <input
            type={selectedKey === 'BYOK_DEFAULT_MODEL' ? 'text' : 'password'}
            value={secretValue}
            onChange={(e) => setSecretValue(e.target.value)}
            placeholder={
              SUPPORTED_KEYS.find((k) => k.keyName === selectedKey)?.placeholder ||
              'Enter secret value...'
            }
            className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-mono text-slate-900 focus:border-indigo-500 focus:outline-none"
          />
        </div>

        <div className="md:col-span-2">
          <button
            type="submit"
            disabled={saving || !secretValue.trim()}
            className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-indigo-700 disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Encrypt &amp; Save
          </button>
        </div>
      </form>

      {/* Configured Vault Keys List */}
      {status?.secrets && status.secrets.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
          {status.secrets.map((sec) => (
            <div
              key={sec.id}
              className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs"
            >
              <div className="min-w-0 pr-2">
                <div className="font-mono font-bold text-slate-900 flex items-center gap-1.5">
                  <Cpu className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                  <span className="truncate">{sec.keyName}</span>
                </div>
                <div className="font-mono text-[11px] text-emerald-700 truncate mt-0.5">
                  {sec.maskedValue}
                </div>
              </div>
              <button
                type="button"
                disabled={deletingKey === sec.keyName}
                onClick={() => handleDeleteSecret(sec.keyName)}
                className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition"
                title={`Remove ${sec.keyName}`}
              >
                {deletingKey === sec.keyName ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5" />
                )}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
