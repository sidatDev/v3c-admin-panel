'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import {
  GitBranch,
  Play,
  Plus,
  Trash2,
  AlertOctagon,
  CheckCircle2,
  PauseCircle,
  ArrowRight,
  Loader2,
  Sparkles,
  LayoutGrid,
} from 'lucide-react';
import { toast } from 'sonner';

interface WorkflowItem {
  id: string;
  name: string;
  description: string;
  builderMode: 'wizard' | 'canvas';
  triggerEvent: string;
  conditions: { id: string; field: string; operator: string; value: string | number }[];
  actions: { id: string; type: string; config: Record<string, any> }[];
  canvas: {
    nodes: { id: string; type: string; label: string; x: number; y: number }[];
    edges: { id: string; source: string; target: string; label?: string }[];
  };
  version: number;
  status: 'active' | 'paused';
  consecutiveFailures: number;
  totalRuns: number;
}

export function WorkflowBuilderPanel() {
  const [workflows, setWorkflows] = useState<WorkflowItem[]>([]);
  const [selectedWf, setSelectedWf] = useState<WorkflowItem | null>(null);
  const [viewMode, setViewMode] = useState<'wizard' | 'canvas'>('wizard');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [simTrace, setSimTrace] = useState<any | null>(null);

  // Builder form state
  const [name, setName] = useState('');
  const [triggerEvent, setTriggerEvent] = useState('feedback.received');
  const [condField, setCondField] = useState('rating');
  const [condOp, setCondOp] = useState('lt');
  const [condVal, setCondVal] = useState('3');
  const [actionType, setActionType] = useState('create_escalation');

  useEffect(() => {
    loadWorkflows();
  }, []);

  async function loadWorkflows() {
    try {
      setLoading(true);
      const res: any = await api.get('/api/integrations/workflows');
      const list: WorkflowItem[] = res?.data || [];
      setWorkflows(list);
      if (list.length > 0 && !selectedWf) {
        selectWorkflow(list[0]);
      } else if (selectedWf) {
        const updated = list.find((w) => w.id === selectedWf.id);
        if (updated) selectWorkflow(updated);
      }
    } catch (err) {
      console.error('Failed to load workflows:', err);
    } finally {
      setLoading(false);
    }
  }

  function selectWorkflow(wf: WorkflowItem) {
    setSelectedWf(wf);
    setViewMode(wf.builderMode || 'wizard');
    setName(wf.name);
    setTriggerEvent(wf.triggerEvent);
    if (wf.conditions?.[0]) {
      setCondField(wf.conditions[0].field);
      setCondOp(wf.conditions[0].operator);
      setCondVal(String(wf.conditions[0].value));
    }
    if (wf.actions?.[0]) {
      setActionType(wf.actions[0].type);
    }
    setSimTrace(null);
  }

  async function handleSaveWorkflow(isNew: boolean = false) {
    if (!name.trim()) return;
    try {
      setSaving(true);
      const res: any = await api.post('/api/integrations/workflows', {
        id: isNew ? undefined : selectedWf?.id,
        name: name.trim(),
        builderMode: viewMode,
        triggerEvent,
        status: 'active',
        conditions: [
          {
            id: 'cond_1',
            field: condField,
            operator: condOp,
            value: isNaN(Number(condVal)) ? condVal : Number(condVal),
          },
        ],
        actions: [
          {
            id: 'act_1',
            type: actionType,
            config: {
              reason: 'workflow_automated_trigger',
              event: triggerEvent,
              title: `Workflow Alert: ${name}`,
            },
          },
        ],
      });
      toast.success(
        isNew
          ? 'New workflow created (v1)'
          : `Workflow updated to v${res?.data?.version || 2}`
      );
      await loadWorkflows();
      if (res?.data) selectWorkflow(res.data);
    } catch (err: any) {
      toast.error(err.message || 'Failed to save workflow');
    } finally {
      setSaving(false);
    }
  }

  async function handleSimulate(simulateFailure: boolean = false) {
    if (!selectedWf) return;
    try {
      setSimulating(true);
      const res: any = await api.post(
        `/api/integrations/workflows/${selectedWf.id}/simulate`,
        {
          dryRun: !simulateFailure,
          simulateFailure,
          payload: {
            rating: 2,
            usagePercent: 85,
            channel: 'whatsapp',
            sessionId: '749',
          },
        }
      );
      setSimTrace(res?.data || null);
      if (res?.data?.autoPaused) {
        toast.error(
          'Governance Rule Triggered: Workflow auto-paused after 3 consecutive failures!'
        );
      } else if (simulateFailure) {
        toast.warning(
          `Failure recorded (${res?.data?.consecutiveFailures}/3 strikes before auto-pause)`
        );
      } else {
        toast.success('Workflow simulation completed successfully');
      }
      await loadWorkflows();
    } catch (err: any) {
      toast.error(err.message || 'Simulation failed');
    } finally {
      setSimulating(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await api.delete(`/api/integrations/workflows/${id}`);
      toast.success('Workflow deleted');
      setSelectedWf(null);
      await loadWorkflows();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete workflow');
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-6">
      {/* Header + Mode Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <GitBranch className="h-5 w-5 text-indigo-600" />
            <h3 className="text-base font-bold text-slate-900">
              Phase 8: Workflow Engine (Step-by-Step Wizard &amp; Visual Canvas Builder)
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Event-driven automation with dry-run simulation, version tracking, and automatic governance pause after 3 consecutive failures.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1">
            <button
              type="button"
              onClick={() => setViewMode('wizard')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                viewMode === 'wizard'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Sparkles className="h-3.5 w-3.5" />
              Wizard Builder
            </button>
            <button
              type="button"
              onClick={() => setViewMode('canvas')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                viewMode === 'canvas'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              Visual Canvas
            </button>
          </div>

          <button
            type="button"
            disabled={saving}
            onClick={() => {
              setName('New Automated Workflow');
              handleSaveWorkflow(true);
            }}
            className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800"
          >
            <Plus className="h-3.5 w-3.5" /> New Workflow
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Workflows List */}
        <div className="space-y-2.5">
          {workflows.map((wf) => (
            <div
              key={wf.id}
              onClick={() => selectWorkflow(wf)}
              className={`cursor-pointer rounded-2xl border p-4 transition ${
                selectedWf?.id === wf.id
                  ? 'border-indigo-400 bg-indigo-50/50 shadow-xs'
                  : 'border-slate-200 bg-white hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 truncate">{wf.name}</span>
                <div className="flex items-center gap-1.5">
                  <span className="rounded bg-indigo-100 px-1.5 py-0.5 text-[10px] font-mono font-bold text-indigo-700">
                    v{wf.version}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                      wf.status === 'active'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {wf.status}
                  </span>
                </div>
              </div>
              <p className="mt-1 text-[11px] text-slate-500 line-clamp-2">{wf.description}</p>
              <div className="mt-2 flex items-center justify-between text-[10px] font-mono text-slate-400">
                <span>Trigger: {wf.triggerEvent}</span>
                <span>Failures: {wf.consecutiveFailures}/3</span>
              </div>
            </div>
          ))}
        </div>

        {/* Right: Wizard / Canvas Editor + Simulator */}
        {selectedWf && (
          <div className="lg:col-span-2 space-y-4">
            {selectedWf.status === 'paused' && (
              <div className="flex items-center justify-between rounded-xl border border-rose-300 bg-rose-50 p-3.5 text-xs text-rose-900">
                <div className="flex items-center gap-2 font-semibold">
                  <PauseCircle className="h-4 w-4 text-rose-600" />
                  <span>
                    Governance Auto-Paused: This workflow hit {selectedWf.consecutiveFailures}/3 consecutive failures. Click &ldquo;Save &amp; Reactivate&rdquo; to resume.
                  </span>
                </div>
              </div>
            )}

            {viewMode === 'wizard' ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                      Workflow Name
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                      Step 1: Event Trigger
                    </label>
                    <select
                      value={triggerEvent}
                      onChange={(e) => setTriggerEvent(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-mono text-slate-800"
                    >
                      <option value="feedback.received">feedback.received (CSAT Rated)</option>
                      <option value="lead.captured">lead.captured (New Lead)</option>
                      <option value="conversation.escalated">conversation.escalated</option>
                      <option value="bundle_80">bundle_80 (80% Token Alert)</option>
                      <option value="bundle_95">bundle_95 (95% Critical Alert)</option>
                    </select>
                  </div>
                </div>

                {/* Step 2: Condition */}
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                    Step 2: Filter Condition (IF)
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <input
                      type="text"
                      value={condField}
                      onChange={(e) => setCondField(e.target.value)}
                      placeholder="Field (e.g. rating)"
                      className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-mono text-slate-900"
                    />
                    <select
                      value={condOp}
                      onChange={(e) => setCondOp(e.target.value)}
                      className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-mono text-slate-800"
                    >
                      <option value="lt">less than (&lt;)</option>
                      <option value="gt">greater than (&gt;)</option>
                      <option value="gte">greater or equal (&gt;=)</option>
                      <option value="equals">equals (==)</option>
                      <option value="contains">contains</option>
                    </select>
                    <input
                      type="text"
                      value={condVal}
                      onChange={(e) => setCondVal(e.target.value)}
                      placeholder="Value"
                      className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-mono text-slate-900"
                    />
                  </div>
                </div>

                {/* Step 3: Action */}
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                    Step 3: Automated Action (THEN)
                  </label>
                  <select
                    value={actionType}
                    onChange={(e) => setActionType(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-mono text-slate-800"
                  >
                    <option value="create_escalation">create_escalation (Open Human Takeover Ticket)</option>
                    <option value="dispatch_webhook">dispatch_webhook (Send Signed CRM Webhook)</option>
                    <option value="send_notification">send_notification (Notify Admin Portal)</option>
                  </select>
                </div>
              </div>
            ) : (
              /* Visual Canvas Node Graph */
              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-6 text-white">
                <div className="text-[11px] font-mono text-slate-400 mb-4 flex items-center justify-between">
                  <span>VISUAL WORKFLOW CANVAS — {selectedWf.name} (v{selectedWf.version})</span>
                  <span className="text-emerald-400">{selectedWf.canvas?.nodes?.length || 3} Nodes Connected</span>
                </div>
                <div className="flex flex-wrap items-center gap-3 py-4">
                  {(selectedWf.canvas?.nodes || []).map((node, i, arr) => (
                    <React.Fragment key={node.id}>
                      <div
                        className={`rounded-xl border px-4 py-3 text-xs font-mono shadow-md ${
                          node.type === 'trigger'
                            ? 'border-indigo-500 bg-indigo-950/80 text-indigo-200'
                            : node.type === 'condition'
                            ? 'border-amber-500 bg-amber-950/80 text-amber-200'
                            : 'border-emerald-500 bg-emerald-950/80 text-emerald-200'
                        }`}
                      >
                        <div className="text-[9px] uppercase tracking-wider opacity-70">{node.type}</div>
                        <div className="font-bold mt-0.5">{node.label}</div>
                      </div>
                      {i < arr.length - 1 && (
                        <ArrowRight className="h-4 w-4 text-slate-500 shrink-0" />
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => handleSaveWorkflow(false)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
                >
                  {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                  {selectedWf.status === 'paused' ? 'Save & Reactivate' : `Save Version (v${selectedWf.version + 1})`}
                </button>

                <button
                  type="button"
                  disabled={simulating}
                  onClick={() => handleSimulate(false)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
                >
                  <Play className="h-3.5 w-3.5" /> Simulate Dry-Run
                </button>

                <button
                  type="button"
                  disabled={simulating}
                  onClick={() => handleSimulate(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900 hover:bg-amber-100"
                >
                  <AlertOctagon className="h-3.5 w-3.5 text-amber-600" />
                  Test Failure Strike ({selectedWf.consecutiveFailures}/3)
                </button>
              </div>

              <button
                type="button"
                onClick={() => handleDelete(selectedWf.id)}
                className="inline-flex items-center gap-1 rounded-xl border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50"
              >
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </button>
            </div>

            {simTrace && (
              <div className="rounded-xl bg-slate-900 p-3.5 text-[11px] font-mono text-slate-200 space-y-1">
                <div className="text-indigo-400 font-bold">
                  Simulation Trace (v{simTrace.version} &bull; Status: {simTrace.status} &bull; Failures: {simTrace.consecutiveFailures}/3)
                </div>
                <div>Conditions Passed: {String(simTrace.conditionsPassed)}</div>
                <div>Actions Trace: {JSON.stringify(simTrace.actionTrace)}</div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
