'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Server,
  Lock,
  Activity,
  ShieldCheck,
  AlertTriangle,
  Settings,
  Link2,
} from 'lucide-react';
import { api, ApiError } from '@/lib/api';

type ServerNodeKey = 'server2_kb' | 'server3_logs';
type HostingPlacement = 'sidat_cloud' | 'client_premise_tunnel';
type TunnelProtocol = 'mTLS_1_3' | 'WireGuard' | 'IPSec_VPN';
type KmsMode = 'envelope_aes256' | 'aws_kms' | 'hashicorp_vault' | 'client_byok_kms';
type DegradedModePolicy = 'local_replica_cache' | 'answer_without_kb' | 'escalate_to_human';

interface ServerNodeConfig {
  node: ServerNodeKey;
  title: string;
  roleDescription: string;
  placement: HostingPlacement;
  endpointUrl: string;
  tunnelProtocol: TunnelProtocol;
  kmsMode: KmsMode;
  timeoutMs: number;
  degradedMode: DegradedModePolicy;
  status: 'healthy' | 'degraded_failover' | 'unreachable';
  lastLatencyMs: number;
  lastCheckedAt: string;
}

interface HashChainAuditEntry {
  index: number;
  id: string;
  timestamp: string;
  action: string;
  actor: string;
  payloadSummary: string;
  prevHash: string;
  entryHash: string;
}

interface ProvisioningState {
  nodes: ServerNodeConfig[];
  auditLedger: {
    chainValid: boolean;
    totalEntries: number;
    headHash: string;
    entries: HashChainAuditEntry[];
  };
}

export function ServerProvisioningPanel() {
  const queryClient = useQueryClient();
  const [editingNode, setEditingNode] = useState<ServerNodeConfig | null>(null);
  const [placement, setPlacement] = useState<HostingPlacement>('sidat_cloud');
  const [endpointUrl, setEndpointUrl] = useState('');
  const [tunnelProtocol, setTunnelProtocol] = useState<TunnelProtocol>('mTLS_1_3');
  const [kmsMode, setKmsMode] = useState<KmsMode>('envelope_aes256');
  const [timeoutMs, setTimeoutMs] = useState(650);
  const [degradedMode, setDegradedMode] = useState<DegradedModePolicy>('local_replica_cache');

  const { data, isLoading } = useQuery<ProvisioningState>({
    queryKey: ['server23-provisioning'],
    queryFn: async () => {
      const res = await api.get<{ status: string; data: ProvisioningState }>(
        '/api/integrations/provisioning'
      );
      return res.data;
    },
  });

  const updateNodeMutation = useMutation({
    mutationFn: async (payload: {
      node: ServerNodeKey;
      placement: HostingPlacement;
      endpointUrl: string;
      tunnelProtocol: TunnelProtocol;
      kmsMode: KmsMode;
      timeoutMs: number;
      degradedMode: DegradedModePolicy;
    }) => {
      return api.post(`/api/integrations/provisioning/${payload.node}/config`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['server23-provisioning'] });
      toast.success('Server provisioning & encrypted tunnel configuration updated');
      setEditingNode(null);
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : 'Failed to update node config');
    },
  });

  const probeNodeMutation = useMutation({
    mutationFn: async (payload: { node: ServerNodeKey; simulateTunnelTimeout?: boolean }) => {
      return api.post<{
        status: string;
        data: {
          message: string;
          failoverActivated: boolean;
          latencyMs: number;
        };
      }>(`/api/integrations/provisioning/${payload.node}/probe`, {
        simulateTunnelTimeout: payload.simulateTunnelTimeout,
      });
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['server23-provisioning'] });
      if (res.data.failoverActivated) {
        toast.warning(res.data.message);
      } else {
        toast.success(res.data.message);
      }
    },
  });

  const appendAuditMutation = useMutation({
    mutationFn: async () => {
      return api.post<{
        status: string;
        data: { chainValid: boolean; totalEntries: number; headHash: string };
      }>('/api/integrations/provisioning/server3/audit-chain', {
        action: 'CONVERSATION_PII_MASKED_ARCHIVE',
        actor: 'compliance-officer@v3c.ai',
        payloadSummary:
          'Archived PII-masked customer transcript + voice call recording to Server 3 vault',
      });
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['server23-provisioning'] });
      toast.success(
        `Appended block #${res.data.totalEntries} to Server 3 SHA-256 chain (Integrity: ${
          res.data.chainValid ? 'VALID' : 'BROKEN'
        })`
      );
    },
  });

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs text-slate-400">
          Loading Server 2 & Server 3 Storage Provisioning Adapters...
        </p>
      </div>
    );
  }

  const nodes = data?.nodes || [];
  const ledger = data?.auditLedger;

  return (
    <div className="rounded-2xl border border-cyan-100 bg-gradient-to-br from-white via-cyan-50/20 to-slate-50/40 p-6 shadow-sm space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/80 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Server className="h-5 w-5 text-cyan-600" />
            <h2 className="text-base font-bold text-slate-900">
              Remote Server 2 (KB Vector) & Server 3 (Conversations/Audit) Provisioning (Phase 11)
            </h2>
            <span className="rounded-full bg-cyan-100 px-2.5 py-0.5 text-[10px] font-bold text-cyan-800">
              3-Server Enterprise Topology
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure per-tenant data placement (Sidat Managed Cloud vs Client-Hosted Premise Tunnel), mTLS/WireGuard encryption, KMS keys, degraded failover policies, and Server 3 SHA-256 hash-chained audit verification.
          </p>
        </div>
      </div>

      {/* Server 2 & Server 3 Cards */}
      <div className="grid gap-4 lg:grid-cols-2">
        {nodes.map((n) => (
          <div
            key={n.node}
            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm flex flex-col justify-between space-y-3"
          >
            <div className="space-y-2.5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-xs font-bold text-slate-900">{n.title}</h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">{n.roleDescription}</p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase shrink-0 ${
                    n.status === 'healthy'
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {n.status === 'healthy' ? `Healthy (${n.lastLatencyMs}ms)` : 'Degraded Failover'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 rounded-lg bg-slate-50 p-2.5 text-[11px] border border-slate-100">
                <div>
                  <span className="text-slate-400 block text-[10px]">Hosting Placement</span>
                  <span className="font-bold text-slate-800">
                    {n.placement === 'sidat_cloud'
                      ? 'Sidat Managed Cloud'
                      : 'Client Premise (Remote Tunnel)'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Tunnel & KMS</span>
                  <span className="font-mono font-bold text-cyan-700">
                    {n.tunnelProtocol} • {n.kmsMode}
                  </span>
                </div>
                <div className="col-span-2 truncate">
                  <span className="text-slate-400 text-[10px] mr-1">Endpoint:</span>
                  <span className="font-mono text-slate-700">{n.endpointUrl}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Timeout Budget</span>
                  <span className="font-mono font-semibold text-slate-800">{n.timeoutMs} ms</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Degraded Fallback Policy</span>
                  <span className="font-semibold text-indigo-700">{n.degradedMode}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-2.5">
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() =>
                    probeNodeMutation.mutate({ node: n.node, simulateTunnelTimeout: false })
                  }
                  disabled={probeNodeMutation.isPending}
                  className="inline-flex items-center gap-1 rounded-lg bg-cyan-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-cyan-500"
                >
                  <Activity className="h-3 w-3" /> Probe Tunnel
                </button>
                <button
                  onClick={() =>
                    probeNodeMutation.mutate({ node: n.node, simulateTunnelTimeout: true })
                  }
                  disabled={probeNodeMutation.isPending}
                  className="inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-800 hover:bg-amber-100"
                >
                  <AlertTriangle className="h-3 w-3" /> Test Failover
                </button>
              </div>

              <button
                onClick={() => {
                  setEditingNode(n);
                  setPlacement(n.placement);
                  setEndpointUrl(n.endpointUrl);
                  setTunnelProtocol(n.tunnelProtocol);
                  setKmsMode(n.kmsMode);
                  setTimeoutMs(n.timeoutMs);
                  setDegradedMode(n.degradedMode);
                }}
                className="inline-flex items-center gap-1 text-xs font-bold text-slate-600 hover:text-slate-900"
              >
                <Settings className="h-3.5 w-3.5" /> Configure Adapter
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Server 3 Append-Only SHA-256 Hash-Chained Audit Ledger */}
      {ledger && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-emerald-600" />
                <h3 className="text-xs font-bold text-slate-900">
                  Server 3 Immutable Append-Only Audit Chain (SHA-256 Hash-Linked)
                </h3>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    ledger.chainValid
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-rose-100 text-rose-700'
                  }`}
                >
                  {ledger.chainValid ? 'Chain Verified (Tamper-Free)' : 'Chain Tampered'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Every Server 3 archive & configuration event is cryptographically chained (`prevHash` → `entryHash`) to guarantee regulatory immutability.
              </p>
            </div>

            <button
              onClick={() => appendAuditMutation.mutate()}
              disabled={appendAuditMutation.isPending}
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-bold text-white hover:bg-slate-800 shrink-0"
            >
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
              Append & Verify SHA-256 Audit Block
            </button>
          </div>

          <div className="max-h-36 overflow-y-auto rounded-lg border border-slate-100">
            <table className="w-full text-left text-[11px]">
              <thead className="bg-slate-50 text-[9px] font-bold uppercase text-slate-500">
                <tr>
                  <th className="p-2">#</th>
                  <th className="p-2">Action</th>
                  <th className="p-2">Summary</th>
                  <th className="p-2">Prev Hash</th>
                  <th className="p-2">Entry SHA-256</th>
                </tr>
              </thead>
              <tbody>
                {ledger.entries
                  .slice()
                  .reverse()
                  .map((e) => (
                    <tr key={e.id} className="border-t border-slate-100">
                      <td className="p-2 font-mono font-bold text-slate-700">#{e.index}</td>
                      <td className="p-2 font-mono text-cyan-700 font-semibold">{e.action}</td>
                      <td className="p-2 text-slate-600 truncate max-w-[240px]">
                        {e.payloadSummary}
                      </td>
                      <td className="p-2 font-mono text-[10px] text-slate-400">
                        {e.prevHash.slice(0, 12)}...
                      </td>
                      <td className="p-2 font-mono text-[10px] text-emerald-700 font-bold">
                        {e.entryHash.slice(0, 16)}...
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Configure Node Modal */}
      {editingNode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl space-y-3">
            <h3 className="text-base font-bold text-slate-900">Configure {editingNode.title}</h3>

            <div>
              <label className="text-[11px] font-bold text-slate-600 block mb-1">
                Data Placement Topology
              </label>
              <select
                value={placement}
                onChange={(e) => setPlacement(e.target.value as HostingPlacement)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900"
              >
                <option value="sidat_cloud">Sidat Managed Cloud (Default)</option>
                <option value="client_premise_tunnel">
                  Client-Hosted Premise (Encrypted Tunnel)
                </option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-600 block mb-1">
                Remote Storage / Tunnel Endpoint URL
              </label>
              <input
                type="text"
                value={endpointUrl}
                onChange={(e) => setEndpointUrl(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 font-mono"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  Tunnel Protocol
                </label>
                <select
                  value={tunnelProtocol}
                  onChange={(e) => setTunnelProtocol(e.target.value as TunnelProtocol)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900"
                >
                  <option value="mTLS_1_3">mTLS 1.3</option>
                  <option value="WireGuard">WireGuard VPN</option>
                  <option value="IPSec_VPN">IPSec Site-to-Site</option>
                </select>
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  KMS Key Management
                </label>
                <select
                  value={kmsMode}
                  onChange={(e) => setKmsMode(e.target.value as KmsMode)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900"
                >
                  <option value="envelope_aes256">Envelope AES-256</option>
                  <option value="aws_kms">AWS KMS</option>
                  <option value="hashicorp_vault">HashiCorp Vault</option>
                  <option value="client_byok_kms">Client BYOK HSM</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  Tunnel Timeout (ms)
                </label>
                <input
                  type="number"
                  value={timeoutMs}
                  onChange={(e) => setTimeoutMs(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  Degraded Fallback Mode
                </label>
                <select
                  value={degradedMode}
                  onChange={(e) => setDegradedMode(e.target.value as DegradedModePolicy)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900"
                >
                  <option value="local_replica_cache">Local Replica Cache</option>
                  <option value="answer_without_kb">Answer Without KB</option>
                  <option value="escalate_to_human">Escalate to Human</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setEditingNode(null)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600"
              >
                Cancel
              </button>
              <button
                onClick={() =>
                  updateNodeMutation.mutate({
                    node: editingNode.node,
                    placement,
                    endpointUrl,
                    tunnelProtocol,
                    kmsMode,
                    timeoutMs,
                    degradedMode,
                  })
                }
                className="rounded-lg bg-cyan-600 px-4 py-2 text-xs font-bold text-white hover:bg-cyan-500"
              >
                Save Provisioning Config
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
