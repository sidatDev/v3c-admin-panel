'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Percent,
  FileText,
  Plus,
  CheckCircle2,
  Clock,
  Sparkles,
} from 'lucide-react';
import { api, ApiError } from '@/lib/api';

type DiscountType = 'percentage' | 'volume' | 'loyalty' | 'group_code' | 'trial_credit';

interface DiscountRule {
  id: string;
  code: string;
  type: DiscountType;
  percentageOff: number;
  flatAmountOffPkr: number;
  bonusTrialTokens: number;
  minOrderPkr: number;
  validUntil: string;
  appliedBy: string;
  notes: string;
  active: boolean;
}

interface EnterpriseInvoiceRecord {
  id: string;
  invoiceNumber: string;
  requestedTokens: number;
  grossAmountPkr: number;
  discountAppliedPkr: number;
  netAmountPkr: number;
  discountCode?: string;
  status: 'pending_review' | 'invoiced' | 'paid_credited';
  requestedBy: string;
  approvedBy?: string;
  approvalReason?: string;
  createdAt: string;
}

interface DiscountInvoicePayload {
  selfServeThresholdPkr: number;
  discounts: DiscountRule[];
  invoices: EnterpriseInvoiceRecord[];
  currentBonusTokens: number;
  totalTokenLimit: number;
}

interface DiscountInvoiceCardProps {
  onUpdated?: () => void;
}

export function DiscountInvoiceCard({ onUpdated }: DiscountInvoiceCardProps) {
  const queryClient = useQueryClient();
  const [isDiscountModalOpen, setIsDiscountModalOpen] = useState(false);

  // Discount Creation Form
  const [code, setCode] = useState('');
  const [type, setType] = useState<DiscountType>('percentage');
  const [percentageOff, setPercentageOff] = useState(15);
  const [bonusTrialTokens, setBonusTrialTokens] = useState(250000);
  const [minOrderPkr, setMinOrderPkr] = useState(0);
  const [notes, setNotes] = useState('');

  // Enterprise Invoice Request Form
  const [requestedTokens, setRequestedTokens] = useState(5000000);
  const [grossAmountPkr, setGrossAmountPkr] = useState(150000);
  const [promoCode, setPromoCode] = useState('SIDAT15');

  const { data, isLoading } = useQuery<DiscountInvoicePayload>({
    queryKey: ['billing-discounts-invoices'],
    queryFn: async () => {
      const res = await api.get<{ status: string; data: DiscountInvoicePayload }>(
        '/api/billing/discounts-and-invoices'
      );
      return res.data;
    },
  });

  const createDiscountMutation = useMutation({
    mutationFn: async (payload: any) => {
      return api.post('/api/billing/discounts', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billing-discounts-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['billing-quota'] });
      onUpdated?.();
      toast.success('Discount rule created & logged to commercial audit trail');
      setIsDiscountModalOpen(false);
      setCode('');
      setNotes('');
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : 'Failed to create discount');
    },
  });

  const requestInvoiceMutation = useMutation({
    mutationFn: async (payload: {
      requestedTokens: number;
      grossAmountPkr: number;
      discountCode?: string;
    }) => {
      return api.post<{ status: string; data: EnterpriseInvoiceRecord }>(
        '/api/billing/invoices/request',
        payload
      );
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['billing-discounts-invoices'] });
      toast.success(
        `Invoice ${res.data.invoiceNumber} generated! Net payable: PKR ${res.data.netAmountPkr.toLocaleString()} (Saved PKR ${res.data.discountAppliedPkr.toLocaleString()})`
      );
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : 'Failed to submit invoice request');
    },
  });

  const approveCreditMutation = useMutation({
    mutationFn: async (invoiceId: string) => {
      return api.post(`/api/billing/invoices/${invoiceId}/approve-credit`, {
        approvedBy: 'Sidat Super User',
        reason: 'Bank transfer verified against commercial invoice',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billing-discounts-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['billing-quota'] });
      onUpdated?.();
      toast.success('Enterprise invoice approved & tokens credited to tenant balance!');
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : 'Failed to credit invoice');
    },
  });

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs text-slate-400">Loading Discount Engine & Enterprise Invoices...</p>
      </div>
    );
  }

  const discounts = data?.discounts || [];
  const invoices = data?.invoices || [];

  return (
    <div className="rounded-2xl border border-amber-200/80 bg-gradient-to-br from-white via-amber-50/20 to-indigo-50/20 p-6 shadow-sm space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/80 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Percent className="h-5 w-5 text-amber-600" />
            <h2 className="text-base font-bold text-slate-900">
              Platform Discount Engine & Large-Order Enterprise Invoice Flow (Blueprint Sec 6.3 & 6.5)
            </h2>
            <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-bold text-amber-800">
              5 Discount Types + Invoice Credit
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Orders above PKR {(data?.selfServeThresholdPkr || 100000).toLocaleString()} route to the formal Enterprise Invoice flow with Percentage, Volume, Loyalty, Group Code, and Trial Credit support.
          </p>
        </div>

        <button
          onClick={() => setIsDiscountModalOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-amber-500"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Discount / Trial Credit
        </button>
      </div>

      {/* Active Discounts Grid */}
      <div className="grid gap-3 sm:grid-cols-3">
        {discounts.map((d) => (
          <div
            key={d.id}
            className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs space-y-1.5"
          >
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                {d.code}
              </span>
              <span className="rounded bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-700">
                {d.type.replace('_', ' ')}
              </span>
            </div>
            <p className="text-xs font-bold text-slate-900">
              {d.type === 'trial_credit'
                ? `+${d.bonusTrialTokens.toLocaleString()} Free Trial Tokens`
                : `${d.percentageOff}% Off ${
                    d.minOrderPkr > 0 ? `(Min PKR ${d.minOrderPkr.toLocaleString()})` : ''
                  }`}
            </p>
            <p className="text-[11px] text-slate-500 truncate">{d.notes}</p>
            <div className="text-[10px] text-slate-400">
              By {d.appliedBy} • Valid until {new Date(d.validUntil).toLocaleDateString()}
            </div>
          </div>
        ))}
      </div>

      {/* Large-Order Enterprise Invoice Request & Approval */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
          <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
            <FileText className="h-4 w-4 text-indigo-600" />
            Request Large-Order Enterprise Invoice (&gt; PKR 100,000)
          </h3>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-[10px] font-bold text-slate-600 block mb-1">
                Token Allocation
              </label>
              <input
                type="number"
                value={requestedTokens}
                onChange={(e) => setRequestedTokens(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-mono text-slate-900"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-600 block mb-1">
                Gross Amount (PKR)
              </label>
              <input
                type="number"
                value={grossAmountPkr}
                onChange={(e) => setGrossAmountPkr(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-mono text-slate-900"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-600 block mb-1">
                Promo / Group Code
              </label>
              <input
                type="text"
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value)}
                placeholder="e.g. SIDAT15"
                className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-mono text-slate-900 uppercase"
              />
            </div>
          </div>

          <button
            onClick={() =>
              requestInvoiceMutation.mutate({
                requestedTokens,
                grossAmountPkr,
                discountCode: promoCode,
              })
            }
            disabled={requestInvoiceMutation.isPending}
            className="w-full rounded-xl bg-slate-900 py-2 text-xs font-bold text-white hover:bg-slate-800 disabled:opacity-50"
          >
            Generate Formal Enterprise Invoice with Discount
          </button>
        </div>

        {/* Invoices Table & Super User Credit Button */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-2.5">
          <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 text-emerald-600" />
            Enterprise Invoices & Super User Manual Token Credit ({invoices.length})
          </h3>

          {invoices.length === 0 ? (
            <p className="text-xs text-slate-400 italic py-4">
              No enterprise invoices generated yet. Submit a request on the left to test.
            </p>
          ) : (
            <div className="max-h-40 overflow-y-auto space-y-2">
              {invoices.map((inv) => (
                <div
                  key={inv.id}
                  className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50/70 p-2.5 text-xs"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-slate-900">
                        {inv.invoiceNumber}
                      </span>
                      <span className="font-semibold text-indigo-700">
                        +{inv.requestedTokens.toLocaleString()} tokens
                      </span>
                      {inv.discountCode && (
                        <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold text-amber-800">
                          {inv.discountCode} (-PKR {inv.discountAppliedPkr.toLocaleString()})
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Net Payable: <strong>PKR {inv.netAmountPkr.toLocaleString()}</strong> (Gross: PKR{' '}
                      {inv.grossAmountPkr.toLocaleString()})
                    </p>
                  </div>

                  {inv.status === 'paid_credited' ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-bold text-emerald-700">
                      <CheckCircle2 className="h-3 w-3" /> Credited
                    </span>
                  ) : (
                    <button
                      onClick={() => approveCreditMutation.mutate(inv.id)}
                      disabled={approveCreditMutation.isPending}
                      className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-[11px] font-bold text-white hover:bg-emerald-500 shrink-0"
                    >
                      <Clock className="h-3 w-3" /> Confirm & Credit Tokens
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add Discount Modal */}
      {isDiscountModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl space-y-3">
            <h3 className="text-base font-bold text-slate-900">
              Create Discount Rule or Trial Credit (Blueprint Sec 6.5)
            </h3>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  Discount Code
                </label>
                <input
                  type="text"
                  placeholder="e.g. LOYALTY25"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-mono text-slate-900 uppercase"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  Discount Type
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as DiscountType)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900"
                >
                  <option value="percentage">Percentage Discount</option>
                  <option value="volume">Volume Discount</option>
                  <option value="loyalty">Loyalty Discount</option>
                  <option value="group_code">Group Subsidiary Code</option>
                  <option value="trial_credit">Free Trial Token Credit</option>
                </select>
              </div>
            </div>

            {type === 'trial_credit' ? (
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  Free Trial Tokens to Credit Immediately
                </label>
                <input
                  type="number"
                  value={bonusTrialTokens}
                  onChange={(e) => setBonusTrialTokens(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-mono text-slate-900"
                />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">
                    Percentage Off (%)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={percentageOff}
                    onChange={(e) => setPercentageOff(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">
                    Min Order (PKR)
                  </label>
                  <input
                    type="number"
                    value={minOrderPkr}
                    onChange={(e) => setMinOrderPkr(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900"
                  />
                </div>
              </div>
            )}

            <input
              type="text"
              placeholder="Audit notes (e.g. Approved for Q4 conglomerate renewal)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900"
            />

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setIsDiscountModalOpen(false)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (!code.trim()) return toast.error('Enter discount code');
                  createDiscountMutation.mutate({
                    code,
                    type,
                    percentageOff,
                    bonusTrialTokens,
                    minOrderPkr,
                    notes,
                  });
                }}
                disabled={createDiscountMutation.isPending}
                className="rounded-lg bg-amber-600 px-4 py-2 text-xs font-bold text-white hover:bg-amber-500"
              >
                Create Rule
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
