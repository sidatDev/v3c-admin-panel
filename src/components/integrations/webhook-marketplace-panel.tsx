'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import {
  Blocks,
  Send,
  ShieldCheck,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Wrench,
  Play,
  Lock,
} from 'lucide-react';
import { toast } from 'sonner';

interface ConnectorItem {
  key: string;
  name: string;
  category: 'CRM' | 'Helpdesk';
  description: string;
  defaultBaseUrl: string;
  defaultEvents: string[];
  integrationId: string | null;
  isEnabled: boolean;
  targetUrl: string;
  subscribedEvents: string[];
  maskPii: boolean;
  hmacSecretConfigured: boolean;
  inboundWebhookUrl: string | null;
}

export function WebhookMarketplacePanel({ onUpdated }: { onUpdated?: () => void }) {
  const [connectors, setConnectors] = useState<ConnectorItem[]>([]);
  const [supportedEvents, setSupportedEvents] = useState<string[]>([]);
  const [integrations, setIntegrations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [togglingKey, setTogglingKey] = useState<string | null>(null);

  // Outbound Webhook Test state
  const [selectedEvent, setSelectedEvent] = useState<string>('lead.captured');
  const [testingWebhook, setTestingWebhook] = useState(false);
  const [lastDeliveryResult, setLastDeliveryResult] = useState<any | null>(null);

  // Mid-Conversation Tool Builder state
  const [selectedIntegrationId, setSelectedIntegrationId] = useState<string>('');
  const [toolName, setToolName] = useState<string>('check_order_status');
  const [toolPath, setToolPath] = useState<string>('/orders/lookup');
  const [creatingTool, setCreatingTool] = useState(false);
  const [executingToolId, setExecutingToolId] = useState<string | null>(null);
  const [toolOutput, setToolOutput] = useState<any | null>(null);

  useEffect(() => {
    loadMarketplace();
  }, []);

  async function loadMarketplace() {
    try {
      setLoading(true);
      const res: any = await api.get('/api/integrations/marketplace');
      if (res?.data) {
        setConnectors(res.data.connectors || []);
        setSupportedEvents(res.data.supportedEvents || []);
        const integList = res.data.integrations || [];
        setIntegrations(integList);
        if (integList.length > 0 && !selectedIntegrationId) {
          setSelectedIntegrationId(integList[0].id);
        }
      }
    } catch (err: any) {
      console.error('Failed to load marketplace:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleConnector(conn: ConnectorItem, nextEnabled: boolean, nextMaskPii?: boolean) {
    try {
      setTogglingKey(conn.key);
      await api.post(`/api/integrations/marketplace/${conn.key}/toggle`, {
        enabled: nextEnabled,
        targetUrl: conn.targetUrl,
        maskPii: nextMaskPii !== undefined ? nextMaskPii : conn.maskPii,
      });
      toast.success(
        `${conn.name} ${nextEnabled ? 'enabled' : 'disabled'} in API Marketplace`
      );
      await loadMarketplace();
      if (onUpdated) onUpdated();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update connector');
    } finally {
      setTogglingKey(null);
    }
  }

  async function handleTestOutboundWebhook() {
    try {
      setTestingWebhook(true);
      setLastDeliveryResult(null);
      const res: any = await api.post('/api/integrations/webhooks/test', {
        event: selectedEvent,
      });
      setLastDeliveryResult(res?.data || null);
      toast.success(
        `Dispatched '${selectedEvent}' to ${res?.data?.dispatchedCount || 0} active connector(s)`
      );
      if (onUpdated) onUpdated();
    } catch (err: any) {
      toast.error(err.message || 'Webhook test failed');
    } finally {
      setTestingWebhook(false);
    }
  }

  async function handleCreateTool(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedIntegrationId || !toolName.trim() || !toolPath.trim()) return;
    try {
      setCreatingTool(true);
      await api.post(`/api/integrations/${selectedIntegrationId}/tools`, {
        name: toolName.trim(),
        path: toolPath.trim(),
        method: 'POST',
      });
      toast.success(`Mid-conversation API tool "${toolName}" registered`);
      await loadMarketplace();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create tool');
    } finally {
      setCreatingTool(false);
    }
  }

  async function handleExecuteTool(toolId: string) {
    try {
      setExecutingToolId(toolId);
      const res: any = await api.post(`/api/integrations/tools/${toolId}/execute`, {
        inputParams: {
          customerPhone: '+923001234567',
          customerEmail: 'customer@example.com',
          orderId: 'ORD-9921',
        },
      });
      setToolOutput(res?.data || null);
      toast.success('Mid-conversation API action executed (with PII masking)');
      if (onUpdated) onUpdated();
    } catch (err: any) {
      toast.error(err.message || 'Failed to execute tool');
    } finally {
      setExecutingToolId(null);
    }
  }

  const allTools = integrations.flatMap((i) =>
    (i.IntegrationTool || []).map((t: any) => ({ ...t, integrationName: i.name }))
  );

  return (
    <div className="space-y-6">
      {/* 1. API Marketplace: 5 Built-in CRM & Helpdesk Connectors */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <Blocks className="h-5 w-5 text-indigo-600" />
              <h3 className="text-base font-bold text-slate-900">
                Phase 6: API Marketplace (5 Built-In CRM &amp; Helpdesk Connectors)
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              One-click toggleable connectors with HMAC-SHA256 signing, 5-attempt automatic retries, and PII masking.
            </p>
          </div>
          <button
            type="button"
            onClick={loadMarketplace}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Sync Marketplace
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {connectors.map((conn) => (
            <div
              key={conn.key}
              className={`rounded-2xl border p-4 flex flex-col justify-between transition ${
                conn.isEnabled
                  ? 'border-indigo-300 bg-indigo-50/30 shadow-xs'
                  : 'border-slate-200 bg-white'
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-bold text-slate-900 block">
                      {conn.name}
                    </span>
                    <span className="inline-block rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-600">
                      {conn.category}
                    </span>
                  </div>

                  <button
                    type="button"
                    disabled={togglingKey === conn.key}
                    onClick={() => handleToggleConnector(conn, !conn.isEnabled)}
                    className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                      conn.isEnabled
                        ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                        : 'bg-slate-900 text-white hover:bg-slate-800'
                    }`}
                  >
                    {togglingKey === conn.key ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : conn.isEnabled ? (
                      'Connected'
                    ) : (
                      'Enable'
                    )}
                  </button>
                </div>

                <p className="text-xs text-slate-500">{conn.description}</p>

                <div className="pt-1">
                  <label className="block text-[10px] font-bold uppercase text-slate-400">
                    Outbound Webhook Endpoint
                  </label>
                  <input
                    type="text"
                    value={conn.targetUrl}
                    onChange={(e) => {
                      const val = e.target.value;
                      setConnectors((prev) =>
                        prev.map((c) => (c.key === conn.key ? { ...c, targetUrl: val } : c))
                      );
                    }}
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-mono text-slate-800"
                  />
                </div>

                {conn.inboundWebhookUrl && (
                  <div className="rounded-lg bg-slate-100 p-2 text-[10px] font-mono text-slate-600 truncate">
                    Inbound URL: {conn.inboundWebhookUrl}
                  </div>
                )}
              </div>

              <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
                <label className="flex items-center gap-1.5 text-slate-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={conn.maskPii}
                    onChange={(e) =>
                      handleToggleConnector(conn, conn.isEnabled, e.target.checked)
                    }
                    className="rounded border-slate-300 text-indigo-600"
                  />
                  <span>Mask PII</span>
                </label>
                <span className="inline-flex items-center gap-1 text-indigo-600 font-semibold">
                  <Lock className="h-3 w-3" /> HMAC-SHA256
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 2. Outbound Webhook Dispatcher & Mid-Conversation API Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Outbound Webhook Tester */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2">
            <Send className="h-4 w-4 text-indigo-600" />
            <h4 className="text-sm font-bold text-slate-900">
              Outbound Webhook Event Dispatcher (HMAC + 5 Retries)
            </h4>
          </div>
          <p className="text-xs text-slate-500">
            Test dispatching a signed V3C event (`x-v3c-signature`) to all active Marketplace CRM connectors.
          </p>

          <div className="flex gap-2">
            <select
              value={selectedEvent}
              onChange={(e) => setSelectedEvent(e.target.value)}
              className="flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-mono text-slate-800"
            >
              {(supportedEvents.length > 0
                ? supportedEvents
                : [
                    'lead.captured',
                    'conversation.started',
                    'conversation.escalated',
                    'conversation.resolved',
                    'feedback.received',
                    'token.alert',
                  ]
              ).map((ev) => (
                <option key={ev} value={ev}>
                  Event: {ev}
                </option>
              ))}
            </select>

            <button
              type="button"
              disabled={testingWebhook}
              onClick={handleTestOutboundWebhook}
              className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {testingWebhook ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Send className="h-3.5 w-3.5" />
              )}
              Dispatch Event
            </button>
          </div>

          {lastDeliveryResult && (
            <div className="rounded-xl bg-slate-900 p-3.5 text-[11px] font-mono text-slate-200 space-y-1">
              <div className="text-emerald-400 font-bold flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Dispatched {lastDeliveryResult.event} ({lastDeliveryResult.dispatchedCount} connector(s))
              </div>
              {(lastDeliveryResult.deliveries || []).map((d: any) => (
                <div key={d.logId} className="truncate text-slate-300">
                  &bull; {d.integrationName}: HTTP {d.statusCode} (Attempt #{d.attemptCount}) | {d.signature.slice(0, 26)}...
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Mid-Conversation API Action Tool Builder */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2">
            <Wrench className="h-4 w-4 text-indigo-600" />
            <h4 className="text-sm font-bold text-slate-900">
              Mid-Conversation API Action Tools (Timeout &amp; PII Masking)
            </h4>
          </div>

          <form onSubmit={handleCreateTool} className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <select
              value={selectedIntegrationId}
              onChange={(e) => setSelectedIntegrationId(e.target.value)}
              className="rounded-xl border border-slate-300 bg-white px-2.5 py-2 text-xs text-slate-800"
            >
              <option value="">Select Integration...</option>
              {integrations.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={toolName}
              onChange={(e) => setToolName(e.target.value)}
              placeholder="Tool name (e.g. lookup_order)"
              className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-mono text-slate-900"
            />
            <div className="flex gap-1.5">
              <input
                type="text"
                value={toolPath}
                onChange={(e) => setToolPath(e.target.value)}
                placeholder="/orders/status"
                className="flex-1 rounded-xl border border-slate-300 px-2.5 py-2 text-xs font-mono text-slate-900"
              />
              <button
                type="submit"
                disabled={creatingTool || !selectedIntegrationId}
                className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
              >
                Add
              </button>
            </div>
          </form>

          {allTools.length > 0 && (
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {allTools.map((t: any) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs"
                >
                  <div>
                    <span className="font-mono font-bold text-slate-900">{t.name}</span>
                    <span className="ml-2 text-[11px] text-slate-500">
                      ({t.integrationName} &bull; {t.method} {t.path})
                    </span>
                  </div>
                  <button
                    type="button"
                    disabled={executingToolId === t.id}
                    onClick={() => handleExecuteTool(t.id)}
                    className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-indigo-700"
                  >
                    {executingToolId === t.id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Play className="h-3 w-3" />
                    )}
                    Test Action
                  </button>
                </div>
              ))}
            </div>
          )}

          {toolOutput && (
            <div className="rounded-xl bg-slate-900 p-3 text-[11px] font-mono text-emerald-300 truncate">
              Result ({toolOutput.statusCode} in {toolOutput.duration}ms):{' '}
              {JSON.stringify(toolOutput.data)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
