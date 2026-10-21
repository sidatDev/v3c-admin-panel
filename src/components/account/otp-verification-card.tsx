'use client';

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  ShieldCheck,
  KeyRound,
  Send,
  CheckCircle2,
  AlertTriangle,
  Sliders,
} from 'lucide-react';
import { api, ApiError } from '@/lib/api';

interface OtpPolicyConfig {
  otpLength: 4 | 6;
  expirySeconds: number;
  maxAttempts: number;
  deliveryMethod: 'sms_and_email' | 'sms_only' | 'email_only';
  enforceOnAdminPasswordChange: boolean;
  enforceOnConversationAccountModify: boolean;
}

interface OtpVerificationCardProps {
  onAdminOtpVerified?: (otpCode: string) => void;
}

export function OtpVerificationCard({ onAdminOtpVerified }: OtpVerificationCardProps) {
  const queryClient = useQueryClient();

  // Policy Config State
  const [otpLength, setOtpLength] = useState<4 | 6>(6);
  const [expirySeconds, setExpirySeconds] = useState(300);
  const [maxAttempts, setMaxAttempts] = useState(3);
  const [deliveryMethod, setDeliveryMethod] = useState<'sms_and_email' | 'sms_only' | 'email_only'>(
    'sms_and_email'
  );
  const [enforceAdmin, setEnforceAdmin] = useState(true);
  const [enforceConversation, setEnforceConversation] = useState(true);

  // Admin Step-Up OTP State
  const [sandboxCode, setSandboxCode] = useState<string | null>(null);
  const [enteredCode, setEnteredCode] = useState('');
  const [verifiedStatus, setVerifiedStatus] = useState<{
    verified: boolean;
    reason: string;
  } | null>(null);

  const { data: policy, isLoading } = useQuery<OtpPolicyConfig>({
    queryKey: ['account-otp-policy'],
    queryFn: async () => {
      const res = await api.get<{ status: string; data: OtpPolicyConfig }>(
        '/api/account/otp-config'
      );
      return res.data;
    },
  });

  useEffect(() => {
    if (policy) {
      setOtpLength(policy.otpLength);
      setExpirySeconds(policy.expirySeconds);
      setMaxAttempts(policy.maxAttempts);
      setDeliveryMethod(policy.deliveryMethod);
      setEnforceAdmin(policy.enforceOnAdminPasswordChange);
      setEnforceConversation(policy.enforceOnConversationAccountModify);
    }
  }, [policy]);

  const savePolicyMutation = useMutation({
    mutationFn: async () => {
      return api.put<{ status: string; data: OtpPolicyConfig }>('/api/account/otp-config', {
        otpLength,
        expirySeconds,
        maxAttempts,
        deliveryMethod,
        enforceOnAdminPasswordChange: enforceAdmin,
        enforceOnConversationAccountModify: enforceConversation,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['account-otp-policy'] });
      toast.success('OTP verification policy updated');
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : 'Failed to save OTP policy');
    },
  });

  const requestOtpMutation = useMutation({
    mutationFn: async () => {
      return api.post<{
        status: string;
        data: {
          challengeId: string;
          otpLength: number;
          expirySeconds: number;
          sandboxOtpPreview: string;
          targetContact: string;
        };
      }>('/api/account/otp/request', {
        purpose: 'password_change',
      });
    },
    onSuccess: (res) => {
      setSandboxCode(res.data.sandboxOtpPreview);
      setEnteredCode(res.data.sandboxOtpPreview);
      setVerifiedStatus(null);
      toast.success(
        `OTP sent to ${res.data.targetContact} (Sandbox Code: ${res.data.sandboxOtpPreview})`
      );
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : 'Failed to request OTP');
    },
  });

  const verifyOtpMutation = useMutation({
    mutationFn: async (code: string) => {
      return api.post<{
        status: string;
        data: {
          verified: boolean;
          lockedOut: boolean;
          remainingAttempts: number;
          reason: string;
        };
      }>('/api/account/otp/verify', {
        purpose: 'password_change',
        code,
      });
    },
    onSuccess: (res) => {
      setVerifiedStatus({
        verified: res.data.verified,
        reason: res.data.reason,
      });
      if (res.data.verified) {
        toast.success(res.data.reason);
        onAdminOtpVerified?.(enteredCode);
      } else {
        toast.error(res.data.reason);
      }
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : 'OTP verification failed');
    },
  });

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs text-slate-400">Loading OTP Verification Guardrail...</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-white via-indigo-50/20 to-emerald-50/20 p-6 shadow-sm space-y-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/80 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-indigo-600" />
            <h2 className="text-base font-bold text-slate-900">
              Sensitive Account Action & Orchestrator OTP Verification Gate
            </h2>
            <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-[10px] font-bold text-indigo-700">
              Blueprint Sec 4.2 & 4.6
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Requires step-up OTP verification before admin password/security changes and automatically intercepts mid-conversation customer requests to modify account or policy details.
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left: Step-Up OTP Challenge for Sensitive Account Changes */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <KeyRound className="h-4 w-4 text-indigo-600" />
              Step-Up OTP Verification (Admin Sensitive Changes)
            </h3>
            <button
              onClick={() => requestOtpMutation.mutate()}
              disabled={requestOtpMutation.isPending}
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-indigo-500 disabled:opacity-50"
            >
              <Send className="h-3.5 w-3.5" />
              Send {otpLength}-Digit OTP
            </button>
          </div>

          <p className="text-[11px] text-slate-500">
            Request and verify a one-time code before changing your password or sensitive security settings.
          </p>

          {sandboxCode && (
            <div className="rounded-lg border border-amber-200 bg-amber-50/70 px-3 py-2 text-xs text-amber-900 flex items-center justify-between">
              <span>
                Sandbox OTP Issued (expires in {expirySeconds}s):{' '}
                <strong className="font-mono text-sm">{sandboxCode}</strong>
              </span>
              <span className="text-[10px] uppercase font-bold text-amber-700">
                Max {maxAttempts} tries
              </span>
            </div>
          )}

          <div className="flex items-center gap-2">
            <input
              type="text"
              maxLength={6}
              placeholder={`Enter ${otpLength}-digit OTP code`}
              value={enteredCode}
              onChange={(e) => setEnteredCode(e.target.value)}
              className="flex-1 rounded-xl border border-slate-200 px-3.5 py-2 text-sm font-mono tracking-widest text-slate-900 outline-none focus:border-indigo-500"
            />
            <button
              onClick={() => {
                if (!enteredCode.trim()) return toast.error('Enter OTP code');
                verifyOtpMutation.mutate(enteredCode);
              }}
              disabled={verifyOtpMutation.isPending}
              className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-500 disabled:opacity-50"
            >
              Verify OTP
            </button>
          </div>

          {verifiedStatus && (
            <div
              className={`rounded-lg p-2.5 text-xs flex items-center gap-2 font-semibold ${
                verifiedStatus.verified
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}
            >
              {verifiedStatus.verified ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
              )}
              <span>{verifiedStatus.reason}</span>
            </div>
          )}
        </div>

        {/* Right: Orchestrator OTP Policy Configuration */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <Sliders className="h-4 w-4 text-emerald-600" />
              Orchestrator `auth_config` & Lockout Policy
            </h3>
            <button
              onClick={() => savePolicyMutation.mutate()}
              disabled={savePolicyMutation.isPending}
              className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-bold text-white hover:bg-slate-800"
            >
              Save OTP Policy
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-[10px] font-bold text-slate-600 block mb-1">OTP Length</label>
              <select
                value={otpLength}
                onChange={(e) => setOtpLength(Number(e.target.value) as 4 | 6)}
                className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-900"
              >
                <option value={6}>6 Digits</option>
                <option value={4}>4 Digits</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-600 block mb-1">Expiry (sec)</label>
              <input
                type="number"
                min={60}
                max={900}
                value={expirySeconds}
                onChange={(e) => setExpirySeconds(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-900"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-600 block mb-1">
                Max Attempts
              </label>
              <input
                type="number"
                min={1}
                max={5}
                value={maxAttempts}
                onChange={(e) => setMaxAttempts(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-900"
              />
            </div>
          </div>

          <div className="space-y-1.5 pt-1 text-xs text-slate-700">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={enforceAdmin}
                onChange={(e) => setEnforceAdmin(e.target.checked)}
                className="rounded border-slate-300 text-indigo-600"
              />
              <span>Require OTP verification before Admin password changes</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={enforceConversation}
                onChange={(e) => setEnforceConversation(e.target.checked)}
                className="rounded border-slate-300 text-indigo-600"
              />
              <span>
                Enforce Mid-Conversation OTP Gate when customers ask to change phone/policy/account
              </span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
