'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/providers/auth-provider';
import { toast } from 'sonner';
import { 
  Users, 
  MessageSquare, 
  UserCheck, 
  RefreshCw, 
  ArrowUpRight, 
  ShieldAlert,
  HardDrive
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';

interface DashboardStats {
  conversationsCount: number;
  activeAgentsCount: number;
  leadsCount: number;
  subscription: {
    packagePlan: string;
    price: string;
    nextBillingDate: string;
    conversationsIncluded: number;
    conversationsUsed: number;
    leadsIncluded: number;
    leadsUsed: number;
    storage: string;
  } | null;
}

interface DailyVisitors {
  date: string;
  count: number;
}

export default function DashboardPage() {
  const { isAuthenticated, user } = useAuth();
  
  // 1. Fetch dashboard metrics
  const { 
    data: stats, 
    isLoading: isStatsLoading, 
    refetch: refetchStats,
    isRefetching: isStatsRefetching
  } = useQuery<DashboardStats>({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const res = await api.get<{ status: string; data: DashboardStats }>('/api/dashboard/stats');
      return res.data;
    },
    enabled: isAuthenticated && !!user,
  });

  // 2. Fetch daily visitors chart timeseries
  const {
    data: visitorsData,
    isLoading: isVisitorsLoading,
    refetch: refetchVisitors,
    isRefetching: isVisitorsRefetching
  } = useQuery<DailyVisitors[]>({
    queryKey: ['dashboard-visitors'],
    queryFn: async () => {
      const res = await api.get<{ status: string; data: DailyVisitors[] }>('/api/dashboard/visitors');
      return res.data;
    },
    enabled: isAuthenticated && !!user,
  });

  const handleRefreshAll = () => {
    refetchStats();
    refetchVisitors();
  };

  const isRefreshing = isStatsRefetching || isVisitorsRefetching;
  const isLoading = isStatsLoading || isVisitorsLoading;

  // Format date helper for the chart axis
  const formatChartDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  // Helper for progress calculations
  const calculatePercent = (used: number, included: number) => {
    if (!included) return 0;
    const pct = (used / included) * 100;
    return Math.min(100, Math.max(0, Math.round(pct)));
  };

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  // Fallback defaults for missing subscription configurations
  const sub = stats?.subscription || {
    packagePlan: 'Free Trial',
    price: '$0',
    nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    conversationsIncluded: 1000,
    conversationsUsed: stats?.conversationsCount || 0,
    leadsIncluded: 100,
    leadsUsed: stats?.leadsCount || 0,
    storage: '100MB'
  };

  const convoPercent = calculatePercent(sub.conversationsUsed, sub.conversationsIncluded);
  const leadsPercent = calculatePercent(sub.leadsUsed, sub.leadsIncluded);

  return (
    <div className="space-y-8">
      {/* Top Welcome Title */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-500">
            Monitor real-time interactions, leads, and operational billing limits.
          </p>
        </div>
        <button
          onClick={handleRefreshAll}
          disabled={isRefreshing}
          className="inline-flex items-center gap-1.5 self-start rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {/* Total Conversations */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-500">Conversations</span>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-600">
              <MessageSquare className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-bold tracking-tight text-slate-900">
              {stats?.conversationsCount || 0}
            </span>
            <span className="block text-[10px] text-slate-400 font-semibold tracking-wide uppercase mt-1">
              Active sessions in history
            </span>
          </div>
        </div>

        {/* Active Agents */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-500">Active Agents</span>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-600">
              <Users className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-bold tracking-tight text-slate-900">
              {stats?.activeAgentsCount || 0}
            </span>
            <span className="block text-[10px] text-slate-400 font-semibold tracking-wide uppercase mt-1">
              Live web widgets deployed
            </span>
          </div>
        </div>

        {/* Leads Captured */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-500">Leads Captured</span>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 border border-amber-100 text-amber-600">
              <UserCheck className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-bold tracking-tight text-slate-900">
              {stats?.leadsCount || 0}
            </span>
            <span className="block text-[10px] text-slate-400 font-semibold tracking-wide uppercase mt-1">
              Contact logs in Lead table
            </span>
          </div>
        </div>
      </div>

      {/* Main Grid: Chart & Limits */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Side: Area Chart (Recharts) */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col h-[400px]">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="font-semibold text-slate-900">Conversations Overview</h3>
              <p className="text-xs text-slate-500">Volume distribution over the past 30 days</p>
            </div>
          </div>
          
          <div className="flex-1 mt-6 select-none text-xs">
            {visitorsData && visitorsData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={visitorsData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorConvs" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={formatChartDate} 
                    tickLine={false} 
                    axisLine={false} 
                    stroke="#94a3b8" 
                  />
                  <YAxis 
                    tickLine={false} 
                    axisLine={false} 
                    stroke="#94a3b8"
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{ background: '#0f172a', border: 'none', borderRadius: '8px', color: '#fff' }}
                    labelFormatter={(label: any) => new Date(label).toLocaleDateString('en-US', { dateStyle: 'medium' })}
                    formatter={(value) => [`${value} sessions`, 'Conversations']}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="count" 
                    stroke="#4f46e5" 
                    strokeWidth={2} 
                    fillOpacity={1} 
                    fill="url(#colorConvs)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center border border-dashed border-slate-200 rounded-xl bg-slate-50 text-slate-400">
                No conversation history available for chart metrics.
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Subscription and limits usage panel */}
        <div className="lg:col-span-1 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col justify-between h-[400px]">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="font-semibold text-slate-900">Billing & Quotas</h3>
                <p className="text-xs text-slate-500">Plan boundaries allocation status</p>
              </div>
            </div>

            {/* Plan Display card */}
            <div className="mt-4 rounded-xl bg-indigo-50/50 border border-indigo-100/50 p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-700">
                  {sub.packagePlan}
                </span>
                <span className="text-sm font-bold text-slate-900">{sub.price} / mo</span>
              </div>
              <p className="text-[10px] text-slate-500 mt-2">
                Renewal billing date: {new Date(sub.nextBillingDate).toLocaleDateString('en-US', { dateStyle: 'medium' })}
              </p>
            </div>

            {/* Limits bars list */}
            <div className="mt-6 space-y-4">
              {/* Conversations limit */}
              <div>
                <div className="flex items-center justify-between text-xs font-medium text-slate-600 mb-1">
                  <span>Conversations Used</span>
                  <span>{sub.conversationsUsed} / {sub.conversationsIncluded}</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-indigo-600 h-full rounded-full transition-all duration-500" 
                    style={{ width: `${convoPercent}%` }}
                  />
                </div>
              </div>

              {/* Leads limit */}
              <div>
                <div className="flex items-center justify-between text-xs font-medium text-slate-600 mb-1">
                  <span>Leads Count</span>
                  <span>{sub.leadsUsed} / {sub.leadsIncluded}</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-indigo-600 h-full rounded-full transition-all duration-500" 
                    style={{ width: `${leadsPercent}%` }}
                  />
                </div>
              </div>

              {/* Storage limits */}
              <div>
                <div className="flex items-center justify-between text-xs font-medium text-slate-600 mb-1">
                  <span className="flex items-center gap-1">
                    <HardDrive className="h-3.5 w-3.5 text-slate-400" />
                    Storage Limit
                  </span>
                  <span>{sub.storage}</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-indigo-600 h-full rounded-full transition-all duration-500" 
                    style={{ width: '4%' }} // Static visual indicator for default storage
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-4 flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
              <ShieldAlert className="h-3.5 w-3.5 text-amber-500" />
              Upgrade limits anytime
            </span>
            <button 
              onClick={() => toast.info('Upgrade requests are processed under Subscription Settings.')}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-500 inline-flex items-center gap-0.5"
            >
              Request Upgrade <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
