'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ColumnDef, PaginationState } from '@tanstack/react-table';
import {
  UserCheck,
  Mail,
  Phone,
  Globe,
  Calendar,
  MessageSquare,
  Sparkles,
  RefreshCw,
  Clock,
  ShieldCheck,
  Trash2,
  Bot
} from 'lucide-react';
import { api } from '@/lib/api';
import { DataTable } from '@/components/ui/data-table';
import { useAuth } from '@/providers/auth-provider';
import { usePathname } from 'next/navigation';
import { ChatHistoryModal } from '@/components/leads/chat-history-modal';
import { LeadSearchFilter, LeadFilterValues } from '@/components/leads/lead-search-filter';

interface InterestedClientItem {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  message: string | null;
  ipAddress: string | null;
  createdAt: string;
  PotentialClient?: {
    id: number;
    confidenceScore: number;
    summary: string;
    evaluatedAt: string;
  } | null;
  VisitorSession?: {
    id: number;
    channel: string | null;
    startedAt: string;
    endedAt: string | null;
  } | null;
  _count?: {
    Conversation: number;
  };
}

interface PaginatedResponse {
  status: string;
  data: InterestedClientItem[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export default function InterestedClientsPage() {
  const { user, isAuthenticated, isLoading: isLoadingAuth } = useAuth();
  const pathname = usePathname();
  const segments = pathname.split('/').filter(Boolean);
  const pathSlug = segments.length > 0 && segments[0] !== 'leads' ? segments[0] : null;
  const targetSlug = pathSlug || user?.tenantSlug;

  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [filterValues, setFilterValues] = useState<LeadFilterValues>({
    criteria: 'client',
    term: '',
    startDate: '',
    endDate: '',
  });
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const {
    data: response,
    isLoading,
    isRefetching,
    isError,
    error,
    refetch,
  } = useQuery<PaginatedResponse>({
    queryKey: [
      'interested-leads',
      pagination.pageIndex,
      pagination.pageSize,
      filterValues.criteria,
      filterValues.term,
      filterValues.startDate,
      filterValues.endDate,
      targetSlug,
      user?.tenantId,
    ],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('page', (pagination.pageIndex + 1).toString());
      params.append('limit', pagination.pageSize.toString());
      if (targetSlug) params.append('slug', targetSlug);
      if (user?.tenantId) params.append('tenantId', user.tenantId);

      if (filterValues.criteria === 'date') {
        if (filterValues.startDate) params.append('startDate', filterValues.startDate);
        if (filterValues.endDate) params.append('endDate', filterValues.endDate);
      } else if (filterValues.term.trim()) {
        params.append(filterValues.criteria, filterValues.term.trim());
      }

      return api.get<PaginatedResponse>(`/api/leads/interested?${params.toString()}`);
    },
    enabled: !isLoadingAuth && isAuthenticated,
    refetchInterval: 10000,
  });

  const handleResetFilter = () => {
    setFilterValues({
      criteria: 'client',
      term: '',
      startDate: '',
      endDate: '',
    });
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  };

  const handleOpenChat = (clientId: number) => {
    setSelectedClientId(clientId);
    setIsModalOpen(true);
  };

  const handleDeleteClient = async (clientId: number, clientName?: string) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete ${clientName || 'this client'} from the database? This action cannot be undone.`
    );
    if (!confirmed) return;

    try {
      setDeletingId(clientId);
      await api.delete(`/api/leads/interested/${clientId}`);
      refetch();
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || 'Failed to delete client record.');
    } finally {
      setDeletingId(null);
    }
  };

  const columns: ColumnDef<InterestedClientItem>[] = [
    {
      accessorKey: 'name',
      header: 'Client',
      cell: ({ row }) => {
        const item = row.original;
        return (
          <div className="flex flex-col gap-0.5">
            <span className="font-semibold text-slate-900">{item.name}</span>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
              {item.email && (
                <span className="flex items-center gap-1 hover:text-indigo-600 transition-colors">
                  <Mail className="h-3 w-3" />
                  <a href={`mailto:${item.email}`}>{item.email}</a>
                </span>
              )}
              {item.phone && (
                <span className="flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  <span>{item.phone}</span>
                </span>
              )}
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'message',
      header: 'Inquiry / Message',
      cell: ({ row }) => {
        const msg = row.original.message;
        if (!msg) {
          return <span className="text-xs text-slate-400 italic">No message provided</span>;
        }
        return (
          <p className="line-clamp-2 max-w-xs text-xs text-slate-700 font-normal" title={msg}>
            {msg}
          </p>
        );
      },
    },
    {
      accessorKey: 'ipAddress',
      header: 'Origin & IP',
      cell: ({ row }) => {
        const item = row.original;
        const channel = item.VisitorSession?.channel || 'chat';
        return (
          <div className="flex flex-col gap-1 items-start">
            <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 font-mono text-[11px] font-medium text-slate-600">
              <Globe className="h-3 w-3 text-slate-400" />
              {item.ipAddress || 'Unknown IP'}
            </span>
            <span className="rounded-full bg-slate-100 px-2 py-0.2 text-[10px] font-medium uppercase tracking-wider text-slate-500">
              {channel}
            </span>
          </div>
        );
      },
    },
    {
      accessorKey: 'qualification',
      header: 'AI Qualification',
      cell: ({ row }) => {
        const pot = row.original.PotentialClient;
        if (pot) {
          return (
            <div className="flex flex-col items-start gap-1">
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                <Sparkles className="h-3 w-3 text-emerald-600" />
                Qualified ({pot.confidenceScore}%)
              </span>
              {pot.summary && (
                <p className="text-[11px] text-slate-500 line-clamp-1 max-w-[200px]" title={pot.summary}>
                  {pot.summary}
                </p>
              )}
            </div>
          );
        }
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-medium text-slate-500">
            <Clock className="h-3 w-3 text-slate-400" />
            Unqualified / In Review
          </span>
        );
      },
    },
    {
      accessorKey: 'createdAt',
      header: 'Date Captured',
      cell: ({ row }) => {
        const date = new Date(row.original.createdAt);
        return (
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Calendar className="h-3.5 w-3.5 text-slate-400" />
            <span>{date.toLocaleDateString()}</span>
            <span className="text-[10px] text-slate-400">{date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        );
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const client = row.original;
        const isDeleting = deletingId === client.id;
        return (
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleOpenChat(client.id)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50/60 px-3 py-1.5 text-xs font-semibold text-indigo-700 shadow-2xs transition-all hover:bg-indigo-100 hover:border-indigo-300 hover:text-indigo-800"
            >
              <MessageSquare className="h-3.5 w-3.5" />
              <span>View Chat History</span>
            </button>
            <button
              onClick={() => handleDeleteClient(client.id, client.name)}
              disabled={isDeleting}
              title="Delete client record"
              className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50/60 px-2.5 py-1.5 text-xs font-semibold text-rose-700 shadow-2xs transition-all hover:bg-rose-100 hover:border-rose-300 hover:text-rose-800 disabled:opacity-50 cursor-pointer"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>{isDeleting ? 'Deleting...' : 'Delete'}</span>
            </button>
          </div>
        );
      },
    },
  ];

  const items = response?.data || [];
  const meta = response?.meta || { page: 1, limit: 10, total: 0, totalPages: 1 };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-fade-in">
      {/* HEADER SECTION */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="rounded-xl bg-indigo-50 p-2.5 text-indigo-600 border border-indigo-100">
              <UserCheck className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Interested Clients
              </h1>
              <p className="text-sm text-slate-500">
                Raw pre-session lead capture submissions gathered prior to AI widget conversations
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => refetch()}
            disabled={isLoading || isRefetching}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 shadow-2xs hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefetching ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* ERROR NOTICE IF QUERY FAILS */}
      {isError && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-700 flex items-center justify-between shadow-2xs">
          <span>Failed to sync leads from server: {(error as any)?.message || 'Authentication or network error'}. Please refresh or log in again.</span>
          <button onClick={() => refetch()} className="font-semibold underline ml-3 cursor-pointer">Retry</button>
        </div>
      )}

      {/* METRIC COUNTER BANNER */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
          <p className="text-xs font-medium text-slate-500">Total Inquiries Captured</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{meta.total}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
          <p className="text-xs font-medium text-slate-500">Qualification Rate</p>
          <p className="mt-1 text-2xl font-bold text-indigo-600">
            {meta.total > 0 
              ? `${Math.round((items.filter(i => i.PotentialClient).length / items.length) * 100)}%` 
              : '0%'}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
          <p className="text-xs font-medium text-slate-500">Current Page Volume</p>
          <p className="mt-1 text-2xl font-bold text-slate-700">{items.length} records</p>
        </div>
      </div>

      {/* FIELD-SPECIFIC SEARCH & FILTER BAR */}
      <LeadSearchFilter
        value={filterValues}
        onChange={(updater) => {
          setFilterValues(updater);
          setPagination((prev) => ({ ...prev, pageIndex: 0 }));
        }}
        onReset={handleResetFilter}
      />

      {/* DATA TABLE */}
      <DataTable
        columns={columns}
        data={items}
        isLoading={isLoading}
        pageCount={meta.totalPages}
        pagination={pagination}
        onPaginationChange={setPagination}
      />

      {/* CHAT HISTORY MODAL */}
      <ChatHistoryModal
        clientId={selectedClientId}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedClientId(null);
        }}
      />
    </div>
  );
}
