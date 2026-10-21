'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import {
  ShieldAlert,
  CreditCard,
  Smartphone,
  Wallet,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';

type PaymentMethod = 'card' | 'jazzcash' | 'easypaisa';

interface BundleItem {
  id: string;
  name: string;
  tokens: number;
  amountPkr: number;
  currency: string;
  description: string;
}

interface TransactionItem {
  paymentIntentId: string;
  orderId: string;
  bundleId: string;
  bundleName: string;
  tokens: number;
  amountPkr: number;
  paymentMethod: PaymentMethod;
  status: 'pending' | 'succeeded' | 'failed';
  signature: string;
  maskedAccount?: string;
  createdAt: string;
  completedAt?: string;
}

interface QuotaData {
  tenantId: string;
  baseTokenLimit: number;
  bonusTokens: number;
  totalLimit: number;
  usedTokens: number;
  remainingTokens: number;
  usagePercent: number;
  alertLevel: 'normal' | 'warning_80' | 'critical_95' | 'depleted_100';
  hardStopEnabled: boolean;
  isHardStopped: boolean;
  bundles: BundleItem[];
  transactions: TransactionItem[];
  xpaySandboxInfo?: {
    stageScriptUrl: string;
    accountId: string;
  };
}

export function XPayTokenTopupCard({ onTopupComplete }: { onTopupComplete?: () => void }) {
  const [quota, setQuota] = useState<QuotaData | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);

  // Settings form
  const [limitInput, setLimitInput] = useState<number>(500000);
  const [hardStopInput, setHardStopInput] = useState<boolean>(true);

  // XPay Sandbox Modal State
  const [selectedBundle, setSelectedBundle] = useState<BundleItem | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('card');
  const [intentData, setIntentData] = useState<any | null>(null);
  const [creatingIntent, setCreatingIntent] = useState(false);
  const [confirmingPayment, setConfirmingPayment] = useState(false);

  // Sandbox test inputs
  const [cardNumber, setCardNumber] = useState('4242 •••• •••• 4242');
  const [walletPhone, setWalletPhone] = useState('03001234567');
  const [walletOtp, setWalletOtp] = useState('123456');

  useEffect(() => {
    loadQuota();
  }, []);

  async function loadQuota() {
    try {
      setLoading(true);
      const res: any = await api.get('/api/billing/quota');
      if (res?.data) {
        setQuota(res.data);
        setLimitInput(res.data.baseTokenLimit);
        setHardStopInput(res.data.hardStopEnabled);
      }
    } catch (err: any) {
      console.error('Failed to load token quota:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveQuotaSettings(e: React.FormEvent) {
    e.preventDefault();
    try {
      setSavingSettings(true);
      const res: any = await api.put('/api/billing/quota', {
        baseTokenLimit: Number(limitInput),
        hardStopEnabled: hardStopInput,
      });
      if (res?.data) {
        setQuota(res.data);
        toast.success('Token limit & hard-stop enforcement updated');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to update quota settings');
    } finally {
      setSavingSettings(false);
    }
  }

  async function handleOpenXPayCheckout(bundle: BundleItem, method: PaymentMethod = 'card') {
    setSelectedBundle(bundle);
    setPaymentMethod(method);
    setIntentData(null);
    try {
      setCreatingIntent(true);
      const res: any = await api.post('/api/billing/xpay/create-intent', {
        bundleId: bundle.id,
        paymentMethod: method,
      });
      setIntentData(res.data);
    } catch (err: any) {
      toast.error(err.message || 'Failed to initialize XPay Sandbox Payment Intent');
    } finally {
      setCreatingIntent(false);
    }
  }

  async function handleSwitchMethod(method: PaymentMethod) {
    setPaymentMethod(method);
    if (selectedBundle) {
      await handleOpenXPayCheckout(selectedBundle, method);
    }
  }

  async function handleConfirmSandboxPayment(e: React.FormEvent) {
    e.preventDefault();
    if (!intentData?.paymentIntentId) return;
    try {
      setConfirmingPayment(true);
      const maskedAccount =
        paymentMethod === 'card'
          ? cardNumber.slice(-9)
          : `${paymentMethod.toUpperCase()} (${walletPhone})`;

      const res: any = await api.post('/api/billing/xpay/confirm-sandbox', {
        paymentIntentId: intentData.paymentIntentId,
        maskedAccount,
      });

      if (res?.data?.quota) {
        setQuota(res.data.quota);
      } else {
        await loadQuota();
      }

      toast.success(
        `XPay Sandbox payment succeeded! +${selectedBundle?.tokens.toLocaleString()} tokens credited.`
      );
      setSelectedBundle(null);
      setIntentData(null);
      if (onTopupComplete) onTopupComplete();
    } catch (err: any) {
      toast.error(err.message || 'XPay Sandbox payment confirmation failed');
    } finally {
      setConfirmingPayment(false);
    }
  }

  const pct = quota?.usagePercent || 0;
  const alertLevel = quota?.alertLevel || 'normal';

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-slate-900">
              Phase 5: Token Balance Enforcement &amp; XPay Gateway Top-Ups
            </h3>
            <span className="rounded-full bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-indigo-700">
              XPay Sandbox Active
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Automated 80% warning &amp; 95% critical alerts, 100% hard-stop protection, and instant PKR token bundle top-ups via XPay (Card, JazzCash, EasyPaisa).
          </p>
        </div>

        <button
          onClick={loadQuota}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 self-start"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          Sync Balance
        </button>
      </div>

      {/* Alert Banners for 80% / 95% / 100% */}
      {alertLevel === 'depleted_100' && (
        <div className="flex items-center justify-between rounded-xl border border-rose-300 bg-rose-50 p-4 text-xs text-rose-900">
          <div className="flex items-center gap-2.5">
            <ShieldAlert className="h-5 w-5 text-rose-600 shrink-0" />
            <div>
              <span className="font-bold block">
                100% Token Quota Depleted — {quota?.isHardStopped ? 'AI Hard-Stop Active' : 'Over Quota'}
              </span>
              <span>
                Your workspace has used {quota?.usedTokens.toLocaleString()} of {quota?.totalLimit.toLocaleString()} tokens. Purchase a top-up bundle below via XPay to immediately restore AI responses.
              </span>
            </div>
          </div>
        </div>
      )}

      {alertLevel === 'critical_95' && (
        <div className="flex items-center gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-900">
          <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
          <span>
            <strong>95% Critical Threshold Reached ({pct}% used):</strong> Almost out of monthly tokens. Top up now via XPay to avoid hard-stop interruption.
          </span>
        </div>
      )}

      {alertLevel === 'warning_80' && (
        <div className="flex items-center gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-900">
          <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
          <span>
            <strong>80% Token Usage Warning ({pct}% used):</strong> You have consumed over 80% of your token quota this month.
          </span>
        </div>
      )}

      {/* Token Balance Progress + Enforcement Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-700">
              Monthly Token Balance (Base + XPay Top-Up Credits)
            </span>
            <span className="font-mono font-bold text-slate-900">
              {(quota?.usedTokens || 0).toLocaleString()} / {(quota?.totalLimit || 500000).toLocaleString()} tokens ({pct}%)
            </span>
          </div>

          <div className="relative h-3 w-full overflow-hidden rounded-full bg-slate-200">
            <div
              className={`h-full transition-all duration-500 ${
                pct >= 95
                  ? 'bg-rose-600'
                  : pct >= 80
                  ? 'bg-amber-500'
                  : 'bg-emerald-500'
              }`}
              style={{ width: `${Math.min(100, pct)}%` }}
            />
          </div>

          <div className="grid grid-cols-3 gap-2 pt-1 text-[11px] text-slate-600">
            <div className="rounded-lg bg-white p-2.5 border border-slate-200">
              <span className="block text-[10px] uppercase text-slate-400 font-bold">Base Monthly Limit</span>
              <span className="font-mono font-bold text-slate-900">
                {(quota?.baseTokenLimit || 0).toLocaleString()}
              </span>
            </div>
            <div className="rounded-lg bg-white p-2.5 border border-slate-200">
              <span className="block text-[10px] uppercase text-emerald-600 font-bold">XPay Bonus Credits</span>
              <span className="font-mono font-bold text-emerald-700">
                +{(quota?.bonusTokens || 0).toLocaleString()}
              </span>
            </div>
            <div className="rounded-lg bg-white p-2.5 border border-slate-200">
              <span className="block text-[10px] uppercase text-indigo-600 font-bold">Remaining Balance</span>
              <span className="font-mono font-bold text-indigo-700">
                {(quota?.remainingTokens || 0).toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Quota Enforcement Form */}
        <form
          onSubmit={handleSaveQuotaSettings}
          className="rounded-xl border border-slate-200 bg-white p-4 space-y-3"
        >
          <div className="text-xs font-bold text-slate-900">
            Enforcement &amp; Threshold Settings
          </div>
          <div>
            <label className="block text-[11px] font-medium text-slate-600 mb-1">
              Base Monthly Token Cap
            </label>
            <input
              type="number"
              min={1000}
              step={1000}
              value={limitInput}
              onChange={(e) => setLimitInput(Number(e.target.value))}
              className="w-full rounded-xl border border-slate-300 px-3 py-1.5 text-xs font-mono text-slate-900 focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={hardStopInput}
              onChange={(e) => setHardStopInput(e.target.checked)}
              className="rounded border-slate-300 text-indigo-600"
            />
            <span>Enforce 100% Hard Stop when depleted</span>
          </label>

          <button
            type="submit"
            disabled={savingSettings}
            className="w-full rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
          >
            {savingSettings ? 'Saving...' : 'Save Quota Policy'}
          </button>
        </form>
      </div>

      {/* Token Top-Up Bundles */}
      <div>
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
          Instant Token Top-Up Bundles (XPay Sandbox — Card / JazzCash / EasyPaisa)
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(quota?.bundles || []).map((bundle) => (
            <div
              key={bundle.id}
              className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 flex flex-col justify-between hover:border-indigo-300 transition"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-slate-900">{bundle.name}</span>
                  <Sparkles className="h-4 w-4 text-indigo-600" />
                </div>
                <p className="mt-1 text-xs text-slate-500">{bundle.description}</p>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-xl font-extrabold text-slate-900 font-mono">
                    PKR {bundle.amountPkr.toLocaleString()}
                  </span>
                  <span className="text-[11px] text-emerald-700 font-semibold">
                    (+{bundle.tokens.toLocaleString()} tokens)
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleOpenXPayCheckout(bundle, 'card')}
                className="mt-4 w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-indigo-700"
              >
                <CreditCard className="h-3.5 w-3.5" />
                Buy via XPay Sandbox
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Interactive XPay Sandbox Checkout Modal/Panel */}
      {selectedBundle && (
        <div className="rounded-2xl border-2 border-indigo-600 bg-indigo-50/40 p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-indigo-200 pb-3">
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-indigo-600" />
              <span className="text-sm font-bold text-slate-900">
                XPay Fusion Sandbox Checkout — {selectedBundle.name} (PKR {selectedBundle.amountPkr.toLocaleString()})
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                setSelectedBundle(null);
                setIntentData(null);
              }}
              className="text-xs font-semibold text-slate-500 hover:text-slate-800"
            >
              Cancel
            </button>
          </div>

          {/* Payment Method Selector Tabs */}
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'card', label: 'Debit / Credit Card (Visa/MC/PayPak)', icon: CreditCard },
              { id: 'jazzcash', label: 'JazzCash Mobile Wallet', icon: Smartphone },
              { id: 'easypaisa', label: 'EasyPaisa Mobile Wallet', icon: Wallet },
            ].map((pm) => {
              const Icon = pm.icon;
              return (
                <button
                  key={pm.id}
                  type="button"
                  onClick={() => handleSwitchMethod(pm.id as PaymentMethod)}
                  className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition border ${
                    paymentMethod === pm.id
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {pm.label}
                </button>
              );
            })}
          </div>

          {creatingIntent ? (
            <div className="flex items-center gap-2 py-6 text-xs text-indigo-700">
              <Loader2 className="h-4 w-4 animate-spin" />
              Initializing XPay Sandbox Payment Intent &amp; computing HMAC-SHA256 signature...
            </div>
          ) : (
            intentData && (
              <form onSubmit={handleConfirmSandboxPayment} className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="space-y-3 rounded-xl bg-white p-4 border border-slate-200">
                  {paymentMethod === 'card' ? (
                    <>
                      <label className="block text-xs font-semibold text-slate-700">
                        Sandbox Test Card Number
                      </label>
                      <input
                        type="text"
                        value={cardNumber}
                        onChange={(e) => setCardNumber(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-mono text-slate-900"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          defaultValue="12/28"
                          placeholder="MM/YY"
                          className="rounded-xl border border-slate-300 px-3 py-1.5 text-xs font-mono text-slate-900"
                        />
                        <input
                          type="text"
                          defaultValue="123"
                          placeholder="CVC"
                          className="rounded-xl border border-slate-300 px-3 py-1.5 text-xs font-mono text-slate-900"
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <label className="block text-xs font-semibold text-slate-700">
                        {paymentMethod === 'jazzcash' ? 'JazzCash' : 'EasyPaisa'} Sandbox Mobile Number
                      </label>
                      <input
                        type="text"
                        value={walletPhone}
                        onChange={(e) => setWalletPhone(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-mono text-slate-900"
                      />
                      <label className="block text-xs font-semibold text-slate-700">
                        Sandbox MPIN / OTP
                      </label>
                      <input
                        type="text"
                        value={walletOtp}
                        onChange={(e) => setWalletOtp(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 px-3 py-1.5 text-xs font-mono text-slate-900"
                      />
                    </>
                  )}

                  <button
                    type="submit"
                    disabled={confirmingPayment}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {confirmingPayment ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4" />
                    )}
                    Confirm Sandbox Payment (PKR {selectedBundle.amountPkr.toLocaleString()})
                  </button>
                </div>

                {/* Live XPay Sandbox Intent & HMAC Payload Inspector */}
                <div className="rounded-xl bg-slate-900 p-3.5 text-[11px] font-mono text-slate-200 space-y-1.5 overflow-x-auto">
                  <div className="text-indigo-400 font-bold">
                    POST /public/v1/payment/intent (XPay Sandbox)
                  </div>
                  <div>
                    <span className="text-slate-400">payment_intent_id:</span>{' '}
                    <span className="text-emerald-400">{intentData.paymentIntentId}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">x-account-id:</span>{' '}
                    <span>{intentData.headers?.['x-account-id']}</span>
                  </div>
                  <div className="truncate">
                    <span className="text-slate-400">x-signature (HMAC-SHA256):</span>{' '}
                    <span className="text-amber-300">{intentData.signature}</span>
                  </div>
                  <div className="text-slate-400 pt-1">
                    Tokens to credit: +{selectedBundle.tokens.toLocaleString()} tokens
                  </div>
                </div>
              </form>
            )
          )}
        </div>
      )}

      {/* Recent XPay Top-Up Transactions */}
      {quota?.transactions && quota.transactions.length > 0 && (
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
            Recent XPay Sandbox Transactions
          </h4>
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase text-slate-500">
                <tr>
                  <th className="py-2.5 px-3">Payment Intent ID</th>
                  <th className="py-2.5 px-3">Bundle</th>
                  <th className="py-2.5 px-3">Method</th>
                  <th className="py-2.5 px-3">Amount</th>
                  <th className="py-2.5 px-3">Tokens Credited</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {quota.transactions.slice(0, 5).map((tx) => (
                  <tr key={tx.paymentIntentId}>
                    <td className="py-2 px-3 text-indigo-600">{tx.paymentIntentId}</td>
                    <td className="py-2 px-3 font-sans font-semibold text-slate-800">{tx.bundleName}</td>
                    <td className="py-2 px-3 uppercase">{tx.paymentMethod}</td>
                    <td className="py-2 px-3">PKR {tx.amountPkr.toLocaleString()}</td>
                    <td className="py-2 px-3 text-emerald-700 font-bold">+{tx.tokens.toLocaleString()}</td>
                    <td className="py-2 px-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          tx.status === 'succeeded'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {tx.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
