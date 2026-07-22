'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { toast } from 'sonner';
import { forgotPasswordSchema, ForgotPasswordInput } from '@/lib/validators';
import { api, ApiError } from '@/lib/api';

export default function ForgotPasswordPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    },
  });

  const onSubmit = async (data: ForgotPasswordInput) => {
    setIsSubmitting(true);
    try {
      await api.post('/api/auth/forgot-password', data);
      setIsSuccess(true);
      toast.success('Password reset email sent successfully!');
    } catch (error) {
      if (error instanceof ApiError) {
        toast.error(error.message);
      } else {
        toast.error('An unexpected error occurred. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-white">Reset password</h3>
        <p className="text-sm text-slate-400">
          We&apos;ll send you a link to reset your account password
        </p>
      </div>

      {isSuccess ? (
        <div className="rounded-lg border border-emerald-800/30 bg-emerald-950/20 p-4 text-center">
          <p className="text-sm text-emerald-400">
            Check your email inbox for a link to reset your password.
          </p>
          <div className="mt-4">
            <Link
              href="/login"
              className="text-sm font-semibold text-indigo-400 hover:text-indigo-300 hover:underline"
            >
              Back to login
            </Link>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
              Email Address
            </label>
            <input
              type="email"
              placeholder="name@company.com"
              {...register('email')}
              className={`mt-1.5 w-full rounded-lg border bg-slate-950/50 px-3 py-2 text-sm text-white placeholder-slate-500 outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 ${
                errors.email ? 'border-red-500' : 'border-slate-800'
              }`}
            />
            {errors.email && (
              <p className="mt-1 text-xs text-red-400">{errors.email.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-2 flex w-full items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-indigo-600/10 transition-all hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50"
          >
            {isSubmitting ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              'Send Reset Link'
            )}
          </button>
        </form>
      )}

      {!isSuccess && (
        <div className="text-center text-xs text-slate-400">
          Remembered your password?{' '}
          <Link href="/login" className="text-indigo-400 hover:text-indigo-300 hover:underline">
            Sign in
          </Link>
        </div>
      )}
    </div>
  );
}
