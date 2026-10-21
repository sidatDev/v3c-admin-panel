'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Database,
  Plus,
  Trash2,
  UploadCloud,
  RefreshCw,
  FileText,
  Globe,
  Play,
  CheckCircle2,
  AlertCircle,
  Clock,
  Layers,
} from 'lucide-react';
import { api } from '@/lib/api';

export interface KnowledgeBaseItem {
  id: string;
  name: string;
  description: string | null;
  tenantId: string;
  createdAt: string;
  updatedAt: string;
  _count?: {
    documents: number;
    agents: number;
  };
}

export interface KbDocumentItem {
  id: string;
  kbId: string;
  type: 'url' | 'text' | 'txt' | 'pdf';
  source: string;
  status: 'pending' | 'processing' | 'ready' | 'failed';
  createdAt: string;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      const base64 = result.includes(';base64,') ? result.split(';base64,').pop()! : result;
      resolve(base64);
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

export function MultiKbManager() {
  const queryClient = useQueryClient();
  const [selectedKbId, setSelectedKbId] = useState<string | null>(null);
  const [newKbName, setNewKbName] = useState('');
  const [newKbDesc, setNewKbDesc] = useState('');

  // Document source addition states
  const [sourceMode, setSourceMode] = useState<'file' | 'url' | 'text'>('file');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [urlOrTextInput, setUrlOrTextInput] = useState('');
  const [processingDocId, setProcessingDocId] = useState<string | null>(null);

  const { data: kbs = [], isLoading: loadingKbs } = useQuery<KnowledgeBaseItem[]>({
    queryKey: ['dashboard-knowledge-bases'],
    queryFn: async () => {
      const res = await api.get<{ status: string; data: KnowledgeBaseItem[] }>('/api/dashboard/knowledge-bases');
      const list = res.data || [];
      if (list.length > 0 && !selectedKbId) {
        setSelectedKbId(list[0].id);
      }
      return list;
    },
  });

  const activeKbId = selectedKbId || kbs[0]?.id || null;

  const {
    data: kbDocuments = [],
    isLoading: loadingDocs,
    refetch: refetchDocs,
  } = useQuery<KbDocumentItem[]>({
    queryKey: ['dashboard-kb-documents', activeKbId],
    queryFn: async () => {
      if (!activeKbId) return [];
      const res = await api.get<{ status: string; data: KbDocumentItem[] }>(
        `/api/dashboard/knowledge-bases/${activeKbId}/documents`
      );
      return res.data || [];
    },
    enabled: !!activeKbId,
  });

  const createKbMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post<{ status: string; data: KnowledgeBaseItem }>('/api/dashboard/knowledge-bases', {
        name: newKbName.trim(),
        description: newKbDesc.trim() || null,
      });
      return res.data;
    },
    onSuccess: (created) => {
      toast.success(`Knowledge Base "${created.name}" created!`);
      setNewKbName('');
      setNewKbDesc('');
      setSelectedKbId(created.id);
      queryClient.invalidateQueries({ queryKey: ['dashboard-knowledge-bases'] });
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Failed to create Knowledge Base');
    },
  });

  const deleteKbMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/dashboard/knowledge-bases/${id}`);
    },
    onSuccess: () => {
      toast.success('Knowledge Base deleted');
      setSelectedKbId(null);
      queryClient.invalidateQueries({ queryKey: ['dashboard-knowledge-bases'] });
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Failed to delete Knowledge Base');
    },
  });

  const uploadFileMutation = useMutation({
    mutationFn: async () => {
      if (!activeKbId || !selectedFile) throw new Error('Select a KB and file first');
      const ext = selectedFile.name.split('.').pop()?.toLowerCase();
      if (ext !== 'txt' && ext !== 'pdf') {
        throw new Error('Only .txt and .pdf files are supported for RAG vector indexing');
      }
      const base64Content = await fileToBase64(selectedFile);
      return api.post<{ status: string; documentId: string; message: string }>(
        `/api/dashboard/knowledge-bases/${activeKbId}/documents/upload`,
        {
          filename: selectedFile.name,
          type: ext,
          content: base64Content,
        }
      );
    },
    onSuccess: (res) => {
      toast.success(res.message || 'File uploaded to Knowledge Base!');
      setSelectedFile(null);
      queryClient.invalidateQueries({ queryKey: ['dashboard-kb-documents', activeKbId] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-knowledge-bases'] });
    },
    onError: (err: any) => {
      toast.error(err?.message || 'File upload failed');
    },
  });

  const addSourceMutation = useMutation({
    mutationFn: async () => {
      if (!activeKbId || !urlOrTextInput.trim()) throw new Error('Source input is required');
      return api.post(`/api/dashboard/knowledge-bases/${activeKbId}/documents`, {
        type: sourceMode === 'url' ? 'url' : 'text',
        source: urlOrTextInput.trim(),
      });
    },
    onSuccess: () => {
      toast.success(`${sourceMode === 'url' ? 'URL' : 'Text'} document added to Knowledge Base!`);
      setUrlOrTextInput('');
      queryClient.invalidateQueries({ queryKey: ['dashboard-kb-documents', activeKbId] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-knowledge-bases'] });
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Failed to add source document');
    },
  });

  const handleProcessDocument = async (docId: string) => {
    if (!activeKbId) return;
    try {
      setProcessingDocId(docId);
      const res = await api.post<{
        status: string;
        documentStatus?: string;
        message: string;
        note?: string;
      }>(`/api/dashboard/knowledge-bases/${activeKbId}/documents/${docId}/process`, {});

      if (res.status === 'failed' || res.documentStatus === 'failed') {
        toast.error(res.note || res.message || 'Document processing failed');
      } else {
        toast.success('Document chunked and embedded into pgvector successfully!');
      }
      await refetchDocs();
    } catch (err: any) {
      toast.error(err?.message || 'Error processing document');
      await refetchDocs();
    } finally {
      setProcessingDocId(null);
    }
  };

  const renderStatusBadge = (status: KbDocumentItem['status']) => {
    if (status === 'ready') {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-700">
          <CheckCircle2 className="h-3 w-3" /> Ready (Embedded)
        </span>
      );
    }
    if (status === 'processing') {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 text-[10px] font-semibold text-indigo-700">
          <RefreshCw className="h-3 w-3 animate-spin" /> Processing
        </span>
      );
    }
    if (status === 'failed') {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 border border-rose-200 px-2.5 py-0.5 text-[10px] font-semibold text-rose-700">
          <AlertCircle className="h-3 w-3" /> Failed
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-[10px] font-semibold text-amber-700">
        <Clock className="h-3 w-3" /> Pending Process
      </span>
    );
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Database className="h-5 w-5 text-indigo-600" />
            Multi-Knowledge Base Hub &amp; Vector Ingestion Engine
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Create isolated Knowledge Bases per specialist agent, upload TXT/PDF files or URLs, and generate 1536-dim pgvector chunks.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Knowledge Bases List + Create Form */}
        <div className="lg:col-span-1 space-y-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Create New Knowledge Base</h3>
            <input
              type="text"
              placeholder="KB Name (e.g. Sales Pricing KB)"
              value={newKbName}
              onChange={(e) => setNewKbName(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none"
            />
            <input
              type="text"
              placeholder="Optional description..."
              value={newKbDesc}
              onChange={(e) => setNewKbDesc(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none"
            />
            <button
              onClick={() => createKbMutation.mutate()}
              disabled={!newKbName.trim() || createKbMutation.isPending}
              className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
            >
              <Plus className="h-3.5 w-3.5" /> Create Knowledge Base
            </button>
          </div>

          <div className="space-y-2">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500 px-1">
              Tenant Knowledge Bases ({kbs.length})
            </div>
            {loadingKbs ? (
              <div className="py-6 text-center text-xs text-slate-400">Loading Knowledge Bases...</div>
            ) : kbs.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-400">
                No Knowledge Bases yet. Create one above.
              </div>
            ) : (
              kbs.map((kb) => (
                <div
                  key={kb.id}
                  onClick={() => setSelectedKbId(kb.id)}
                  className={`cursor-pointer rounded-xl border p-3.5 transition flex items-center justify-between ${
                    activeKbId === kb.id
                      ? 'border-indigo-300 bg-indigo-50/70 text-indigo-950'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className="min-w-0 pr-2">
                    <div className="text-xs font-bold text-slate-900 truncate flex items-center gap-1.5">
                      <Layers className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                      {kb.name}
                    </div>
                    {kb.description && <div className="text-[11px] text-slate-500 truncate mt-0.5">{kb.description}</div>}
                    <div className="text-[10px] text-slate-400 mt-1 font-mono">
                      Docs: {kb._count?.documents ?? 0} | Linked Agents: {kb._count?.agents ?? 0}
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteKbMutation.mutate(kb.id);
                    }}
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg"
                    title="Delete Knowledge Base"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column: Selected KB Documents & Upload/Process Controls */}
        <div className="lg:col-span-2 space-y-4">
          {activeKbId ? (
            <>
              {/* Source Ingestion Bar */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Add Document to Selected Knowledge Base
                  </span>
                  <div className="flex gap-1 rounded-lg bg-slate-200/70 p-0.5">
                    {(['file', 'url', 'text'] as const).map((m) => (
                      <button
                        key={m}
                        onClick={() => setSourceMode(m)}
                        className={`rounded-md px-2.5 py-1 text-[11px] font-semibold uppercase transition ${
                          sourceMode === m ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-600'
                        }`}
                      >
                        {m === 'file' ? 'Upload TXT / PDF' : m}
                      </button>
                    ))}
                  </div>
                </div>

                {sourceMode === 'file' ? (
                  <div className="flex flex-wrap items-center gap-3 pt-1">
                    <input
                      type="file"
                      id="kb-base64-file-input"
                      accept=".txt,.pdf"
                      onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                      className="hidden"
                    />
                    <label
                      htmlFor="kb-base64-file-input"
                      className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                    >
                      <UploadCloud className="h-4 w-4 text-indigo-600" />
                      Choose .TXT or .PDF File
                    </label>
                    {selectedFile && (
                      <span className="text-xs font-medium text-slate-800 truncate max-w-xs">
                        {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                      </span>
                    )}
                    <button
                      onClick={() => uploadFileMutation.mutate()}
                      disabled={!selectedFile || uploadFileMutation.isPending}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
                    >
                      {uploadFileMutation.isPending ? (
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <UploadCloud className="h-3.5 w-3.5" />
                      )}
                      Upload Base64 File
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row gap-2 pt-1">
                    <input
                      type="text"
                      placeholder={
                        sourceMode === 'url'
                          ? 'https://example.com/pricing-or-faq'
                          : 'Paste raw knowledge text, policy, or FAQ answer...'
                      }
                      value={urlOrTextInput}
                      onChange={(e) => setUrlOrTextInput(e.target.value)}
                      className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none"
                    />
                    <button
                      onClick={() => addSourceMutation.mutate()}
                      disabled={!urlOrTextInput.trim() || addSourceMutation.isPending}
                      className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
                    >
                      <Plus className="h-3.5 w-3.5" /> Add {sourceMode.toUpperCase()}
                    </button>
                  </div>
                )}
              </div>

              {/* Documents List Table */}
              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <div className="flex items-center justify-between bg-slate-50 px-4 py-3 border-b border-slate-200">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Knowledge Base Documents ({kbDocuments.length})
                  </span>
                  <button
                    onClick={() => refetchDocs()}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                  >
                    <RefreshCw className="h-3.5 w-3.5" /> Refresh
                  </button>
                </div>

                {loadingDocs ? (
                  <div className="p-8 text-center text-xs text-slate-400">Loading documents...</div>
                ) : kbDocuments.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400">
                    No documents in this Knowledge Base yet. Upload a TXT/PDF file or add a URL above.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-700">
                      <thead className="bg-slate-50/60 border-b border-slate-100 text-[10px] font-bold uppercase text-slate-500">
                        <tr>
                          <th className="p-3">Type</th>
                          <th className="p-3">Source / File Path</th>
                          <th className="p-3">Status</th>
                          <th className="p-3 text-right">Vector Processing</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {kbDocuments.map((doc) => {
                          const displaySource =
                            doc.type === 'txt' || doc.type === 'pdf'
                              ? doc.source.split(/[\\/]/).pop() || doc.source
                              : doc.source;
                          const isProc = processingDocId === doc.id || doc.status === 'processing';
                          return (
                            <tr key={doc.id} className="hover:bg-slate-50/80">
                              <td className="p-3 font-mono uppercase font-bold text-indigo-600">
                                <span className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-0.5 text-[10px]">
                                  {doc.type === 'url' ? (
                                    <Globe className="h-3 w-3" />
                                  ) : (
                                    <FileText className="h-3 w-3" />
                                  )}
                                  {doc.type}
                                </span>
                              </td>
                              <td className="p-3 max-w-xs truncate font-medium text-slate-900" title={doc.source}>
                                {displaySource}
                              </td>
                              <td className="p-3">{renderStatusBadge(doc.status)}</td>
                              <td className="p-3 text-right">
                                <button
                                  onClick={() => handleProcessDocument(doc.id)}
                                  disabled={isProc || doc.status === 'ready'}
                                  className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-indigo-500 disabled:bg-slate-200 disabled:text-slate-500 transition"
                                >
                                  {isProc ? (
                                    <RefreshCw className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <Play className="h-3 w-3" />
                                  )}
                                  {doc.status === 'ready' ? 'Processed' : 'Process & Embed'}
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex h-48 items-center justify-center rounded-xl border border-dashed border-slate-200 text-xs text-slate-400">
              Select or create a Knowledge Base on the left to manage its documents.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
