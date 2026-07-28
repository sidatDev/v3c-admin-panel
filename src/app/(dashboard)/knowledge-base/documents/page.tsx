'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { UploadCloud, File, Trash2, RefreshCw, ExternalLink, HardDrive, CheckCircle } from 'lucide-react';
import { api, ApiError } from '@/lib/api';

interface DocumentItem {
  id: number;
  fileName: string;
  fileSize: number | null;
  url: string | null;
  status: string;
  createdAt: string;
}

export default function DocumentsPage() {
  const queryClient = useQueryClient();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const { data: documents = [], isLoading, refetch, isRefetching } = useQuery<DocumentItem[]>({
    queryKey: ['kb-documents'],
    queryFn: async () => {
      const res = await api.get<{ status: string; data: DocumentItem[] }>('/api/kb/documents');
      return res.data;
    },
  });

  const deleteDocMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/api/kb/documents/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kb-documents'] });
      toast.success('Document deleted from Storage.');
    },
  });

  const handleFileUpload = async () => {
    if (!selectedFile) {
      toast.error('Please select a file to upload.');
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      await api.post('/api/kb/documents/upload', formData);

      toast.success(`'${selectedFile.name}' uploaded successfully to storage!`);
      setSelectedFile(null);
      queryClient.invalidateQueries({ queryKey: ['kb-documents'] });
    } catch (error) {
      toast.error('Failed to upload document to storage.');
    } finally {
      setIsUploading(false);
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return 'N/A';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (isLoading) {
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
            <UploadCloud className="h-6 w-6 text-indigo-600" />
            Documents
          </h1>
          <p className="text-sm text-slate-500">
            Upload PDF, DOCX, and TXT documents directly to storage bucket.
          </p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isRefetching}
          className="inline-flex items-center gap-1.5 self-start rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* File Upload Box */}
      <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-white p-8 text-center shadow-sm hover:border-indigo-400 transition-colors">
        <div className="flex flex-col items-center justify-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 mb-3">
            <HardDrive className="h-7 w-7" />
          </div>

          <h3 className="text-base font-bold text-slate-900">Upload to Storage</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm">
            Drag & drop files here, or click to browse (PDF, DOCX, TXT up to 50MB).
          </p>

          <input
            type="file"
            id="doc-file-input"
            onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
            className="hidden"
            accept=".pdf,.docx,.doc,.txt,.json,.csv"
          />

          <div className="mt-4 flex items-center gap-3">
            <label
              htmlFor="doc-file-input"
              className="cursor-pointer inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
            >
              Select File
            </label>

            {selectedFile && (
              <span className="text-xs font-medium text-slate-900">
                {selectedFile.name} ({formatFileSize(selectedFile.size)})
              </span>
            )}

            {selectedFile && (
              <button
                onClick={handleFileUpload}
                disabled={isUploading}
                className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
              >
                {isUploading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <UploadCloud className="h-3.5 w-3.5" />}
                Upload Now
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Documents Table */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">Stored Documents ({documents.length})</h3>

        {documents.length > 0 ? (
          <div className="overflow-x-auto rounded-xl border border-slate-100">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-100 font-semibold uppercase text-slate-500">
                <tr>
                  <th className="p-3.5">Document Name</th>
                  <th className="p-3.5">Size</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5">Uploaded Date</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {documents.map((doc) => (
                  <tr key={doc.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                    <td className="p-3.5 flex items-center gap-2 font-medium text-slate-900">
                      <File className="h-4 w-4 text-indigo-600 shrink-0" />
                      <span className="truncate max-w-xs">{doc.fileName}</span>
                    </td>

                    <td className="p-3.5 text-slate-500 font-mono">
                      {formatFileSize(doc.fileSize)}
                    </td>

                    <td className="p-3.5">
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-700">
                        <CheckCircle className="h-3 w-3" /> Ready
                      </span>
                    </td>

                    <td className="p-3.5 text-slate-500">
                      {new Date(doc.createdAt).toLocaleDateString()}
                    </td>

                    <td className="p-3.5 text-right flex items-center justify-end gap-2">
                      {doc.url && (
                        <a
                          href={doc.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-indigo-600 hover:text-indigo-800 p-1"
                          title="Open S3 file URL"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      )}
                      <button
                        onClick={() => deleteDocMutation.mutate(doc.id)}
                        className="text-slate-400 hover:text-rose-600 p-1"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-xs text-slate-400 italic">No documents uploaded to storages yet.</p>
        )}
      </div>
    </div>
  );
}
