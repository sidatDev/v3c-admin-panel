'use client';

import React, { createContext, useContext, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter, usePathname } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { LoginInput, SignupInput } from '@/lib/validators';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  tenantId: string;
  domainId: number | null;
  companyName: string | null;
  image: string | null;
}

interface AuthContextType {
  user: User | null;
  permissions: string[];
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (data: LoginInput) => Promise<any>;
  signup: (data: SignupInput) => Promise<any>;
  logout: () => Promise<void>;
  checkPermission: (resource: string, action: string) => boolean;
  refreshUser: () => Promise<any>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const pathname = usePathname();

  // Fetch current user and permissions
  const {
    data: authData,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['auth-user'],
    queryFn: async () => {
      try {
        const response = await api.get<{ status: string; data: { user: User; permissions: string[] } }>('/api/auth/me');
        return response.data;
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          return null; // Silent failure for unauthenticated users
        }
        throw error;
      }
    },
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes stale time
  });

  const user = authData?.user || null;
  const permissions = authData?.permissions || [];
  const isAuthenticated = !!user;

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async (data: LoginInput) => {
      const res = await api.post<{ status: string; data: { user: User; permissions: string[] } }>('/api/auth/login', data);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['auth-user'], data);
      router.push('/dashboard');
    },
  });

  // Signup mutation
  const signupMutation = useMutation({
    mutationFn: async (data: SignupInput) => {
      const res = await api.post<{ status: string; data: { user: User; permissions: string[] } }>('/api/auth/signup', data);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['auth-user'], data);
      router.push('/dashboard');
    },
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: async () => {
      await api.post('/api/auth/logout');
    },
    onSuccess: () => {
      queryClient.setQueryData(['auth-user'], null);
      queryClient.clear();
      router.push('/login');
    },
  });

  // Role permissions check helper
  const checkPermission = (resource: string, action: string): boolean => {
    if (!user) return false;
    // Super admin bypasses all authorization checks
    if (user.role === 'super_admin') return true;
    
    const requiredPermission = `${resource}:${action}`;
    return permissions.includes(requiredPermission);
  };

  // Route protection rules
  useEffect(() => {
    if (isLoading) return;

    const isAuthRoute = ['/login', '/signup', '/forgot-password', '/reset-password'].some(route => 
      pathname.startsWith(route)
    );

    if (!isAuthenticated && !isAuthRoute) {
      // Force redirect to login if accessing protected dashboard routes
      router.push('/login');
    } else if (isAuthenticated && isAuthRoute) {
      // If logged in, redirect away from auth pages to dashboard
      router.push('/dashboard');
    }
  }, [isAuthenticated, isLoading, pathname, router]);

  const value: AuthContextType = {
    user,
    permissions,
    isLoading,
    isAuthenticated,
    login: loginMutation.mutateAsync,
    signup: signupMutation.mutateAsync,
    logout: logoutMutation.mutateAsync,
    checkPermission,
    refreshUser: refetch,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
