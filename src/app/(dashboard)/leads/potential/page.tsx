'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ColumnDef, PaginationState } from '@tanstack/react-table';
import {
  Sparkles,
  Mail,
  Phone,
  Calendar,
  MessageSquare,
  RefreshCw,
  Tag,
  Flame,
  Award,
  CheckCircle2,
  AlertCircle,
  Trash2
} from 'lucide-react';
import { api } from '@/lib/api';
import { DataTable } from '@/components/ui/data-table';
import { useAuth } from '@/providers/auth-provider';
import { usePathname } from 'next/navigation';
import { ChatHistoryModal } from '@/components/leads/chat-history-modal';

interface PotentialClientItem {
  id: number;
  interestedClientId: number;
  confidenceScore: number;
  summary: string;
  reasoning: string | null;
  keyIntents: string[];
  evaluatedAt: string;
  createdAt: string;
  InterestedClient: {
    id: number;
    name: string;
    email: string | null;
    phone: string | null;
    message: string | null;
    ipAddress: string | null;
    createdAt: string;
    VisitorSession?: {
      id: number;
      channel: string | null;
      startedAt: string;
      endedAt: string | null;
    } | null;
    _count?: {
      Conversation: number;
    };
  };
}

interface PaginatedResponse {
  status: string;
  data: PotentialClientItem[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export default function PotentialClientsPage() {
  const { user, isAuthenticated, isLoading: isLoadingAuth } = useAuth();
  const pathname = usePathname();
  const segments = pathname.split('/').filter(Boolean);
  const pathSlug = segments.length > 0 && segments[0] !== 'leads' ? segments[0] : null;
  const targetSlug = pathSlug || user?.tenantSlug;

  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [search, setSearch] = useState('');
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
    queryKey: ['potential-leads', pagination.pageIndex, pagination.pageSize, search, targetSlug, user?.tenantId],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('page', (pagination.pageIndex + 1).toString());
      params.append('limit', pagination.pageSize.toString());
      if (targetSlug) params.append('slug', targetSlug);
      if (user?.tenantId) params.append('tenantId', user.tenantId);
      if (search) params.append('search', search);

      return api.get<PaginatedResponse>(`/api/leads/potential?${params.toString()}`);
    },
    enabled: !isLoadingAuth && isAuthenticated,
    refetchInterval: 10000,
  });

  const handleOpenChat = (clientId: number) => {
    setSelectedClientId(clientId);
    setIsModalOpen(true);
  };

  const handleDeletePotentialClient = async (id: number, clientName?: string) => {
    const confirmed = window.confirm(
      `Are you sure you want to remove the qualification for ${clientName || 'this client'}? This will remove them from Potential Clients.`
    );
    if (!confirmed) return;

    try {
      setDeletingId(id);
      await api.delete(`/api/leads/potential/${id}`);
      refetch();
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || 'Failed to remove qualification.');
    } finally {
      setDeletingId(null);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) {
      return {
        badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        bar: 'bg-emerald-500',
        label: 'High Intent',
      };
    }
    if (score >= 65) {
      return {
        badge: 'bg-teal-50 text-teal-700 border-teal-200',
        bar: 'bg-teal-500',
        label: 'Moderate Intent',
      };
    }
    return {
      badge: 'bg-amber-50 text-amber-700 border-amber-200',
      bar: 'bg-amber-500',
      label: 'Warm Lead',
    };
  };

  const columns: ColumnDef<PotentialClientItem>[] = [
    {
      accessorKey: 'confidenceScore',
      header: 'AI Confidence Score',
      cell: ({ row }) => {
        const score = row.original.confidenceScore;
        const style = getScoreColor(score);
        return (
          <div className="flex flex-col gap-1.5 min-w-[120px]">
            <div className="flex items-center justify-between">
              <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-bold ${style.badge}`}>
                <Flame className="h-3 w-3" />
                {score}/100
              </span>
              <span className="text-[10px] font-medium text-slate-500">{style.label}</span>
            </div>
            {/* Progress bar */}
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full transition-all duration-500 ${style.bar}`}
                style={{ width: `${Math.min(score, 100)}%` }}
              />
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'client',
      header: 'Qualified Client',
      cell: ({ row }) => {
        const client = row.original.InterestedClient;
        return (
          <div className="flex flex-col gap-0.5">
            <span className="font-semibold text-slate-900">{client.name}</span>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
              {client.email && (
                <span className="flex items-center gap-1 hover:text-indigo-600 transition-colors">
                  <Mail className="h-3 w-3" />
                  <a href={`mailto:${client.email}`}>{client.email}</a>
                </span>
              )}
              {client.phone && (
                <span className="flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  <span>{client.phone}</span>
                </span>
              )}
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'summary',
      header: 'Executive AI Summary & Reasoning',
      cell: ({ row }) => {
        const item = row.original;
        return (
          <div className="max-w-md space-y-1">
            <p className="text-xs font-medium text-slate-800 line-clamp-2" title={item.summary}>
              {item.summary}
            </p>
            {item.reasoning && (
              <p className="text-[11px] text-slate-500 italic line-clamp-1" title={item.reasoning}>
                Rationale: {item.reasoning}
              </p>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: 'keyIntents',
      header: 'Key Intents Detected',
      cell: ({ row }) => {
        const intents = row.original.keyIntents || [];
        if (intents.length === 0) {
          return <span className="text-xs text-slate-400 italic">None specified</span>;
        }
        return (
          <div className="flex flex-wrap gap-1 max-w-[200px]">
            {intents.slice(0, 3).map((intent, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-700"
              >
                <Tag className="h-2.5 w-2.5 text-slate-400" />
                {intent}
              </span>
            ))}
            {intents.length > 3 && (
              <span className="rounded bg-slate-50 px-1.5 py-0.5 text-[10px] text-slate-500">
                +{intents.length - 3}
              </span>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: 'evaluatedAt',
      header: 'Evaluated',
      cell: ({ row }) => {
        const date = new Date(row.original.evaluatedAt);
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
        const item = row.original;
        const clientId = item.interestedClientId;
        const isDeleting = deletingId === item.id;
        return (
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleOpenChat(clientId)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50/60 px-3 py-1.5 text-xs font-semibold text-indigo-700 shadow-2xs transition-all hover:bg-indigo-100 hover:border-indigo-300 hover:text-indigo-800"
            >
              <MessageSquare className="h-3.5 w-3.5" />
              <span>View Chat History</span>
            </button>
            <button
              onClick={() => handleDeletePotentialClient(item.id, item.InterestedClient?.name)}
              disabled={isDeleting}
              title="Delete qualification record"
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

  const highIntentCount = items.filter(i => i.confidenceScore >= 80).length;
  const avgScore = items.length > 0 
    ? Math.round(items.reduce((acc, curr) => acc + curr.confidenceScore, 0) / items.length) 
    : 0;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-fade-in">
      {/* HEADER SECTION */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="rounded-xl bg-emerald-50 p-2.5 text-emerald-600 border border-emerald-100">
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Potential Clients
              </h1>
              <p className="text-sm text-slate-500">
                AI-qualified leads verified by OpenAI with high purchase intent (confidence score ≥ 50%)
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
          <span>Failed to sync qualified leads from server: {(error as any)?.message || 'Authentication or network error'}. Please refresh or log in again.</span>
          <button onClick={() => refetch()} className="font-semibold underline ml-3 cursor-pointer">Retry</button>
        </div>
      )}

      {/* METRIC COUNTER BANNER */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-slate-500">Total Qualified Leads</p>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="mt-1 text-2xl font-bold text-slate-900">{meta.total}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-slate-500">High Intent Leads (≥ 80%)</p>
            <Flame className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="mt-1 text-2xl font-bold text-emerald-600">{highIntentCount}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-slate-500">Average Confidence Score</p>
            <Award className="h-4 w-4 text-indigo-500" />
          </div>
          <p className="mt-1 text-2xl font-bold text-slate-800">{avgScore}%</p>
        </div>
      </div>

      {/* DATA TABLE */}
      <DataTable
        columns={columns}
        data={items}
        isLoading={isLoading}
        pageCount={meta.totalPages}
        pagination={pagination}
        onPaginationChange={setPagination}
        searchQuery={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by client name, summary, reasoning, or intent..."
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
