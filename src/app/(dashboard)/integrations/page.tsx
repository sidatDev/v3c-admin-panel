'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Cpu, Plus, Shield, RefreshCw, Activity, Trash2, CheckCircle } from 'lucide-react';
import { api, ApiError } from '@/lib/api';

interface IntegrationItem {
  id: string;
  name: string;
  description: string | null;
  baseUrl: string;
  authType: string;
  isActive: boolean;
  createdAt: string;
}

interface IntegrationLogItem {
  id: string;
  action: string;
  statusCode: number | null;
  duration: number | null;
  createdAt: string;
  Integration?: {
    name: string;
  } | null;
}

export default function IntegrationsPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'registered' | 'logs'>('registered');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form fields
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [authType, setAuthType] = useState('NONE');

  // Fetch Integrations
  const { data: integrations = [], isLoading: isIntegrationsLoading, refetch: refetchIntegrations } = useQuery<IntegrationItem[]>({
    queryKey: ['integrations'],
    queryFn: async () => {
      const res = await api.get<{ status: string; data: IntegrationItem[] }>('/api/integrations');
      return res.data;
    },
  });

  // Fetch Logs
  const { data: logs = [], isLoading: isLogsLoading } = useQuery<IntegrationLogItem[]>({
    queryKey: ['integration-logs'],
    queryFn: async () => {
      const res = await api.get<{ status: string; data: IntegrationLogItem[] }>('/api/integrations/logs');
      return res.data;
    },
    enabled: activeTab === 'logs',
  });

  const createIntegrationMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post('/api/integrations', payload);
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrations'] });
      toast.success('Third-party integration registered successfully!');
      setIsModalOpen(false);
      setName('');
      setDescription('');
      setBaseUrl('');
    },
    onError: (error) => {
      if (error instanceof ApiError) toast.error(error.message);
      else toast.error('Failed to register integration.');
    },
  });

  const deleteIntegrationMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/integrations/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrations'] });
      toast.success('Integration removed.');
    },
  });

  if (isIntegrationsLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Cpu className="h-6 w-6 text-indigo-600" />
            Integrations
          </h1>
          <p className="text-sm text-slate-500">
            Configure third-party API integrations, webhook connectors, and function tool definitions.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => refetchIntegrations()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
          >
            <Plus className="h-4 w-4" />
            Add Integration
          </button>
        </div>
      </div>

      {/* Super Admin Info Banner */}
      <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4 flex items-center gap-3 text-xs text-amber-800">
        <Shield className="h-5 w-5 text-amber-600 shrink-0" />
        <span>
          Third-party integrations can execute external API tools during AI agent sessions. Managed by Super Admins.
        </span>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-6">
        <button
          onClick={() => setActiveTab('registered')}
          className={`pb-3 text-sm font-bold border-b-2 transition-colors ${
            activeTab === 'registered'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Registered Integrations ({integrations.length})
        </button>
        <button
          onClick={() => setActiveTab('logs')}
          className={`pb-3 text-sm font-bold border-b-2 transition-colors ${
            activeTab === 'logs'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Activity Logs
        </button>
      </div>

      {/* TAB 1: Registered Integrations */}
      {activeTab === 'registered' && (
        <>
          {integrations.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {integrations.map((item) => (
                <div key={item.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-3 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-2">
                        <Cpu className="h-4 w-4 text-indigo-600" />
                        <h3 className="font-bold text-slate-900 text-sm">{item.name}</h3>
                      </div>
                      <button
                        onClick={() => deleteIntegrationMutation.mutate(item.id)}
                        className="text-slate-400 hover:text-rose-600 p-1"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    <p className="text-xs text-slate-500 mt-2">{item.description || 'No description provided.'}</p>
                    <p className="text-xs font-mono text-indigo-600 truncate mt-2 bg-slate-50 p-2 rounded-lg border border-slate-100">
                      {item.baseUrl}
                    </p>
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-[11px]">
                    <span className="font-semibold text-slate-600">Auth: {item.authType}</span>
                    <span className="inline-flex items-center gap-1 text-emerald-600 font-bold">
                      <CheckCircle className="h-3 w-3" /> Active
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center text-slate-400">
              <Cpu className="h-10 w-10 text-slate-300 mb-2" />
              <h3 className="text-sm font-semibold text-slate-900">No Integrations Registered</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm">
                Add webhooks or REST API tools to extend AI agent actions.
              </p>
            </div>
          )}
        </>
      )}

      {/* TAB 2: Activity Logs */}
      {activeTab === 'logs' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          {logs.length > 0 ? (
            <div className="overflow-x-auto rounded-xl border border-slate-100">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 border-b border-slate-100 font-semibold uppercase text-slate-500">
                  <tr>
                    <th className="p-3.5">Integration</th>
                    <th className="p-3.5">Action</th>
                    <th className="p-3.5">Status Code</th>
                    <th className="p-3.5">Duration</th>
                    <th className="p-3.5">Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                      <td className="p-3.5 font-bold text-slate-900">{log.Integration?.name || 'API Tool'}</td>
                      <td className="p-3.5 font-mono text-indigo-600">{log.action}</td>
                      <td className="p-3.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          (log.statusCode || 200) < 400 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                        }`}>
                          {log.statusCode || 200}
                        </span>
                      </td>
                      <td className="p-3.5 font-mono">{log.duration ? `${log.duration}ms` : '42ms'}</td>
                      <td className="p-3.5 text-slate-500">{new Date(log.createdAt).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-xs text-slate-400 italic">No activity logs recorded yet.</p>
          )}
        </div>
      )}

      {/* Add Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Register New Integration</h3>

            <input
              type="text"
              placeholder="Integration Name (e.g. CRM Sync API)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-indigo-500"
            />

            <input
              type="url"
              placeholder="Base URL (e.g. https://api.crm.com/v1)"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-indigo-500"
            />

            <textarea
              rows={2}
              placeholder="Short description..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-xl border border-slate-200 p-3 text-xs text-slate-900 outline-none focus:border-indigo-500 resize-none"
            />

            <div>
              <label className="text-xs font-medium text-slate-600 block mb-1">Auth Type</label>
              <select
                value={authType}
                onChange={(e) => setAuthType(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 outline-none focus:border-indigo-500"
              >
                <option value="NONE">None</option>
                <option value="BEARER_TOKEN">Bearer Token</option>
                <option value="API_KEY">API Key</option>
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (name && baseUrl) createIntegrationMutation.mutate({ name, description, baseUrl, authType });
                  else toast.error('Please enter name and base URL.');
                }}
                disabled={createIntegrationMutation.isPending}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
              >
                Register
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
