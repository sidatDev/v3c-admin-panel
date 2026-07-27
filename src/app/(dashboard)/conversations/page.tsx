'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { ColumnDef, PaginationState } from '@tanstack/react-table';
import { MessageSquare, Eye, Calendar, User, ArrowRight, RefreshCw, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { DataTable } from '@/components/ui/data-table';

interface ConversationItem {
  id: number;
  message: string;
  sender: string;
  createdAt: string;
  Lead?: {
    id: number;
    name: string;
    email: string | null;
    phone: string | null;
    status: string;
  } | null;
  Agent?: {
    id: string;
    name: string;
  } | null;
  VisitorSession?: {
    id: number;
    referrer: string | null;
    landingPage: string | null;
    startedAt: string;
    status: string;
  } | null;
}

interface PaginatedConversations {
  data: ConversationItem[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export default function ConversationsPage() {
  const queryClient = useQueryClient();
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [search, setSearch] = useState('');
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const {
    data: conversationsResponse,
    isLoading,
    isRefetching,
    refetch,
  } = useQuery<PaginatedConversations>({
    queryKey: ['conversations', pagination.pageIndex, pagination.pageSize, search],
    queryFn: async () => {
      const res = await api.get<PaginatedConversations>(
        `/api/conversations?page=${pagination.pageIndex + 1}&limit=${pagination.pageSize}&search=${encodeURIComponent(search)}`
      );
      return res;
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/api/conversations/${id}`);
    },
    onSuccess: () => {
      toast.success('Conversation deleted successfully!');
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      setDeletingId(null);
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to delete conversation');
      setDeletingId(null);
    },
  });

  const handleDelete = (id: number) => {
    if (window.confirm(`Are you sure you want to delete conversation #${id}?`)) {
      setDeletingId(id);
      deleteMutation.mutate(id);
    }
  };

  const columns: ColumnDef<ConversationItem, any>[] = [
    {
      accessorKey: 'id',
      header: 'ID',
      cell: ({ row }) => (
        <span className="font-mono text-xs font-semibold text-slate-500">
          #{row.original.id}
        </span>
      ),
    },
    {
      accessorKey: 'Lead',
      header: 'Lead / Visitor',
      cell: ({ row }) => {
        const lead = row.original.Lead;
        return (
          <div className="flex flex-col">
            <span className="font-medium text-slate-900">
              {lead?.name || 'Anonymous Visitor'}
            </span>
            <span className="text-xs text-slate-400">
              {lead?.email || 'No email collected'}
            </span>
          </div>
        );
      },
    },
    {
      accessorKey: 'message',
      header: 'Latest Message',
      cell: ({ row }) => (
        <p className="max-w-md truncate text-xs text-slate-600" title={row.original.message}>
          <span className="font-semibold text-slate-800 capitalize">{row.original.sender}: </span>
          {row.original.message}
        </p>
      ),
    },
    {
      accessorKey: 'Agent',
      header: 'Assigned Agent',
      cell: ({ row }) => (
        <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
          {row.original.Agent?.name || 'V3C AI Assistant'}
        </span>
      ),
    },
    {
      accessorKey: 'createdAt',
      header: 'Date & Time',
      cell: ({ row }) => (
        <span className="text-xs text-slate-500 whitespace-nowrap">
          {new Date(row.original.createdAt).toLocaleString('en-US', {
            dateStyle: 'short',
            timeStyle: 'short',
          })}
        </span>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <Link
            href={`/conversations/${row.original.id}`}
            className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-500 hover:underline"
          >
            <Eye className="h-3.5 w-3.5" />
            View
          </Link>
          <button
            onClick={() => handleDelete(row.original.id)}
            disabled={deletingId === row.original.id}
            title="Delete Conversation"
            className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 hover:text-red-500 disabled:opacity-50"
          >
            {deletingId === row.original.id ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Trash2 className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <MessageSquare className="h-6 w-6 text-indigo-600" />
            Conversations
          </h1>
          <p className="text-sm text-slate-500">
            View interaction logs, transcripts, and visitor session details.
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

      {/* Conversations Table */}
      <DataTable
        columns={columns}
        data={conversationsResponse?.data || []}
        isLoading={isLoading}
        pageCount={conversationsResponse?.meta?.totalPages || 1}
        pagination={pagination}
        onPaginationChange={setPagination}
        searchQuery={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by message or lead name..."
      />
    </div>
  );
}
