'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { toast } from 'sonner';
import { signupSchema, SignupInput } from '@/lib/validators';
import { useAuth } from '@/providers/auth-provider';
import { ApiError } from '@/lib/api';

export default function SignupPage() {
  const { signup } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupInput>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      companyName: '',
    },
  });

  const onSubmit = async (data: SignupInput) => {
    setIsSubmitting(true);
    try {
      await signup(data);
      toast.success('Successfully created account and logged in!');
    } catch (error: any) {
      console.error('[Signup] Error during registration:', error);
      if (error instanceof ApiError) {
        toast.error(error.message);
      } else if (error?.message) {
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
        <h3 className="text-lg font-medium text-white">Create an account</h3>
        <p className="text-sm text-slate-400">Get started with your free tenant dashboard</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
            Full Name
          </label>
          <input
            type="text"
            placeholder="John Doe"
            {...register('name')}
            className={`mt-1.5 w-full rounded-lg border bg-slate-950/50 px-3 py-2 text-sm text-white placeholder-slate-500 outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 ${
              errors.name ? 'border-red-500' : 'border-slate-800'
            }`}
          />
          {errors.name && (
            <p className="mt-1 text-xs text-red-400">{errors.name.message}</p>
          )}
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
            Company / Organization
          </label>
          <input
            type="text"
            placeholder="Sidat Tech"
            {...register('companyName')}
            className={`mt-1.5 w-full rounded-lg border bg-slate-950/50 px-3 py-2 text-sm text-white placeholder-slate-500 outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 ${
              errors.companyName ? 'border-red-500' : 'border-slate-800'
            }`}
          />
          {errors.companyName && (
            <p className="mt-1 text-xs text-red-400">{errors.companyName.message}</p>
          )}
        </div>

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

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
            Password
          </label>
          <input
            type="password"
            placeholder="••••••••"
            {...register('password')}
            className={`mt-1.5 w-full rounded-lg border bg-slate-950/50 px-3 py-2 text-sm text-white placeholder-slate-500 outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 ${
              errors.password ? 'border-red-500' : 'border-slate-800'
            }`}
          />
          {errors.password && (
            <p className="mt-1 text-xs text-red-400">{errors.password.message}</p>
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
            'Create Account'
          )}
        </button>
      </form>

      <div className="text-center text-xs text-slate-400">
        Already have an account?{' '}
        <Link href="/login" className="text-indigo-400 hover:text-indigo-300 hover:underline">
          Sign in
        </Link>
      </div>
    </div>
  );
}
