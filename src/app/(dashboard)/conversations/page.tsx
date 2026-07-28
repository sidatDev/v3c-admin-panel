'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { ColumnDef, PaginationState } from '@tanstack/react-table';
import { MessageSquare, Eye, Calendar, User, ArrowRight, RefreshCw, Trash2, Download, Mic, Filter } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { DataTable } from '@/components/ui/data-table';
import { useAuth } from '@/providers/auth-provider';

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
    channel?: string | null;
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
  const { isAuthenticated, isLoading: isLoadingAuth } = useAuth();
  const queryClient = useQueryClient();
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [search, setSearch] = useState('');
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const [period, setPeriod] = useState<string>('3d');
  const [channelFilter, setChannelFilter] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [exporting, setExporting] = useState(false);

  const {
    data: conversationsResponse,
    isLoading,
    isRefetching,
    refetch,
  } = useQuery<PaginatedConversations>({
    queryKey: ['conversations', pagination.pageIndex, pagination.pageSize, search, period, channelFilter, startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('page', (pagination.pageIndex + 1).toString());
      params.append('limit', pagination.pageSize.toString());
      if (search) params.append('search', search);
      if (channelFilter) params.append('channel', channelFilter);

      if (period !== 'custom') {
        params.append('period', period);
      } else {
        if (startDate) params.append('startDate', new Date(startDate).toISOString());
        if (endDate) params.append('endDate', new Date(endDate).toISOString());
      }

      const res = await api.get<PaginatedConversations>(`/api/conversations?${params.toString()}`);
      return res;
    },
    enabled: !isLoadingAuth && isAuthenticated,
  });

  async function handleExportCsv() {
    try {
      setExporting(true);
      const params = new URLSearchParams();
      if (channelFilter) params.append('channel', channelFilter);
      if (period !== 'custom') {
        params.append('period', period);
      } else {
        if (startDate) params.append('startDate', new Date(startDate).toISOString());
        if (endDate) params.append('endDate', new Date(endDate).toISOString());
      }

      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const res = await fetch(`${baseUrl}/api/conversations/export-csv?${params.toString()}`, {
        credentials: 'include',
      });

      if (!res.ok) {
        throw new Error(`Export failed with status ${res.status}`);
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `v3c-conversations-usage-${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('CSV usage report downloaded successfully!');
    } catch (err: any) {
      console.error('CSV Export failed:', err);
      toast.error(err.message || 'Failed to export CSV report');
    } finally {
      setExporting(false);
    }
  }

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
      id: 'channel',
      header: 'Channel',
      cell: ({ row }) => {
        const isVoice = row.original.VisitorSession?.channel === 'voice';
        return isVoice ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200">
            <Mic className="h-3 w-3 text-emerald-600" />
            Realtime Voice
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-700 border border-indigo-200">
            <MessageSquare className="h-3 w-3 text-indigo-600" />
            Text Chat
          </span>
        );
      },
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
            View interaction logs, channel differentiation (Text Chat vs Realtime Voice), and transcripts.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportCsv}
            disabled={exporting}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-indigo-500 transition disabled:opacity-50"
          >
            {exporting ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
            CSV Usage Export
          </button>

          <button
            onClick={() => refetch()}
            disabled={isRefetching}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefetching ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Filter Toolbar: Period + Channel Filter + Custom Date-Time Picker */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="flex flex-wrap items-center gap-4">
          {/* Period Selector */}
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-slate-400" />
            <span className="text-xs font-semibold text-slate-700">Time Filter:</span>
            <div className="flex flex-wrap gap-1 rounded-xl bg-slate-100 p-1">
              {[
                { label: 'Past 24h', value: '24h' },
                { label: 'Past 3 Days', value: '3d' },
                { label: 'Past 7 Days', value: '7d' },
                { label: 'Past 30 Days', value: '30d' },
                { label: 'All Time', value: 'all' },
                { label: 'Custom Range', value: 'custom' },
              ].map((item) => (
                <button
                  key={item.value}
                  onClick={() => setPeriod(item.value)}
                  className={`rounded-lg px-3 py-1 text-xs font-semibold transition ${
                    period === item.value
                      ? 'bg-white text-indigo-600 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Channel Dropdown Filter */}
          <div className="flex items-center gap-2 border-l border-slate-200 pl-4">
            <Filter className="h-4 w-4 text-slate-400" />
            <span className="text-xs font-semibold text-slate-700">Channel:</span>
            <select
              value={channelFilter}
              onChange={(e) => setChannelFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-800 focus:outline-indigo-500"
            >
              <option value="">All Channels</option>
              <option value="chat">Text Chat</option>
              <option value="voice">Realtime Voice</option>
            </select>
          </div>
        </div>

        {/* Custom Date-Time Inputs */}
        {period === 'custom' && (
          <div className="flex items-center gap-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase">Start Date &amp; Time</label>
              <input
                type="datetime-local"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="mt-0.5 rounded-lg border border-slate-300 px-2.5 py-1 text-xs text-slate-800 focus:outline-indigo-500"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase">End Date &amp; Time</label>
              <input
                type="datetime-local"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="mt-0.5 rounded-lg border border-slate-300 px-2.5 py-1 text-xs text-slate-800 focus:outline-indigo-500"
              />
            </div>
          </div>
        )}
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
