'use client';

import React from 'react';
import { toast } from 'sonner';
import { AlertTriangle, HelpCircle, Check, X } from 'lucide-react';

interface ConfirmToastOptions {
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'default' | 'danger';
  onConfirm: () => void | Promise<void>;
}

export function showConfirmToast({
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'default',
  onConfirm,
}: ConfirmToastOptions) {
  toast.custom((t) => (
    <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl text-slate-900 w-full max-w-sm">
      <div className="flex items-start gap-3">
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
            variant === 'danger' ? 'bg-red-50 text-red-600' : 'bg-indigo-50 text-indigo-600'
          }`}
        >
          {variant === 'danger' ? (
            <AlertTriangle className="h-5 w-5" />
          ) : (
            <HelpCircle className="h-5 w-5" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-bold text-slate-900 leading-tight">{title}</h4>
          {description && (
            <p className="mt-1 text-xs text-slate-500 leading-normal">{description}</p>
          )}
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100">
        <button
          onClick={() => toast.dismiss(t)}
          className="inline-flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
        >
          <X className="h-3.5 w-3.5" />
          {cancelText}
        </button>
        <button
          onClick={async () => {
            toast.dismiss(t);
            await onConfirm();
          }}
          className={`inline-flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-semibold text-white shadow-xs transition ${
            variant === 'danger'
              ? 'bg-red-600 hover:bg-red-500'
              : 'bg-indigo-600 hover:bg-indigo-500'
          }`}
        >
          <Check className="h-3.5 w-3.5" />
          {confirmText}
        </button>
      </div>
    </div>
  ), {
    duration: 10000,
  });
}
