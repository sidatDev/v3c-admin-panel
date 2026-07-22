'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { UserCheck, Plus, CheckCircle, RefreshCw, History, Shield } from 'lucide-react';
import { api, ApiError } from '@/lib/api';

interface PersonaVersionItem {
  id: string;
  name: string;
  tone: string;
  language: string;
  instructions: string;
  status: string;
  version: number;
  createdAt: string;
}

interface PersonaData {
  id: string;
  activeVersionId: string | null;
  PersonaVersion_Persona_activeVersionIdToPersonaVersion: PersonaVersionItem | null;
  PersonaVersion_PersonaVersion_personaIdToPersona: PersonaVersionItem[];
}

export default function PersonaPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [tone, setTone] = useState('professional');
  const [language, setLanguage] = useState('English');
  const [instructions, setInstructions] = useState('');

  const { data: personaData, isLoading, refetch, isRefetching } = useQuery<PersonaData>({
    queryKey: ['kb-persona'],
    queryFn: async () => {
      const res = await api.get<{ status: string; data: PersonaData }>('/api/kb/persona');
      return res.data;
    },
  });

  const createVersionMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post('/api/kb/persona/versions', payload);
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kb-persona'] });
      toast.success('New persona version created!');
      setIsModalOpen(false);
      setName('');
      setInstructions('');
    },
    onError: (error) => {
      if (error instanceof ApiError) toast.error(error.message);
      else toast.error('Failed to create persona version.');
    },
  });

  const activateVersionMutation = useMutation({
    mutationFn: async (versionId: string) => {
      await api.put(`/api/kb/persona/versions/${versionId}/activate`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kb-persona'] });
      toast.success('Persona version activated!');
    },
  });

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  const activeVer = personaData?.PersonaVersion_Persona_activeVersionIdToPersonaVersion;
  const versions = personaData?.PersonaVersion_PersonaVersion_personaIdToPersona || [];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <UserCheck className="h-6 w-6 text-indigo-600" />
            Business Persona
          </h1>
          <p className="text-sm text-slate-500">
            Configure brand tone of voice, language preferences, and versioned persona profiles.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            disabled={isRefetching}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
          >
            <Plus className="h-4 w-4" />
            New Version
          </button>
        </div>
      </div>

      {/* Active Persona Banner */}
      <div className="rounded-2xl border border-indigo-200 bg-indigo-50/50 p-6 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-indigo-700">
            <CheckCircle className="h-4 w-4 text-indigo-600" /> Currently Active Persona
          </span>
          <span className="text-xs font-mono text-indigo-600">Version v{activeVer?.version || 1}</span>
        </div>

        <h2 className="text-lg font-bold text-slate-900">{activeVer?.name || 'Default Persona'}</h2>

        <div className="flex gap-4 text-xs font-medium text-slate-600">
          <span>Tone: <strong className="text-slate-900 capitalize">{activeVer?.tone || 'professional'}</strong></span>
          <span>Language: <strong className="text-slate-900">{activeVer?.language || 'English'}</strong></span>
        </div>

        <p className="text-xs text-slate-700 bg-white p-3 rounded-xl border border-indigo-100/80 leading-relaxed">
          {activeVer?.instructions || 'Be polite, empathetic, and clear in all responses.'}
        </p>
      </div>

      {/* Version History Table */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
          <History className="h-4 w-4 text-slate-500" /> Version History ({versions.length})
        </h3>

        <div className="overflow-x-auto rounded-xl border border-slate-100">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-100 font-semibold uppercase text-slate-500">
              <tr>
                <th className="p-3.5">Version</th>
                <th className="p-3.5">Name</th>
                <th className="p-3.5">Tone</th>
                <th className="p-3.5">Language</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {versions.map((ver) => {
                const isActive = ver.id === personaData?.activeVersionId;
                return (
                  <tr key={ver.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                    <td className="p-3.5 font-mono font-bold text-slate-900">v{ver.version}</td>
                    <td className="p-3.5 font-medium text-slate-900">{ver.name}</td>
                    <td className="p-3.5 capitalize">{ver.tone}</td>
                    <td className="p-3.5">{ver.language}</td>
                    <td className="p-3.5">
                      {isActive ? (
                        <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                          {ver.status}
                        </span>
                      )}
                    </td>
                    <td className="p-3.5 text-right">
                      {!isActive && (
                        <button
                          onClick={() => activateVersionMutation.mutate(ver.id)}
                          className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:underline"
                        >
                          Activate
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Form */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Create Persona Version</h3>

            <input
              type="text"
              placeholder="Persona Version Name (e.g. Friendly Support v2)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-indigo-500"
            />

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1">Tone</label>
                <select
                  value={tone}
                  onChange={(e) => setTone(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 outline-none focus:border-indigo-500"
                >
                  <option value="professional">Professional</option>
                  <option value="friendly">Friendly</option>
                  <option value="empathetic">Empathetic</option>
                  <option value="concise">Concise</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1">Language</label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 outline-none focus:border-indigo-500"
                >
                  <option value="English">English</option>
                  <option value="Spanish">Spanish</option>
                  <option value="French">French</option>
                  <option value="German">German</option>
                </select>
              </div>
            </div>

            <textarea
              rows={4}
              placeholder="Detailed tone instructions & behavior guidelines..."
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              className="w-full rounded-xl border border-slate-200 p-3 text-xs text-slate-900 outline-none focus:border-indigo-500 resize-none"
            />

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (name && instructions) createVersionMutation.mutate({ name, tone, language, instructions });
                  else toast.error('Please enter name and instructions.');
                }}
                disabled={createVersionMutation.isPending}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
              >
                Create Version
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
