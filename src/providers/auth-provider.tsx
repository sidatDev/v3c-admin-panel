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
  roleLevel?: string | null;
  tenantId: string;
  groupId?: string | null;
  departmentId?: string | null;
  tenantSlug?: string;
  domainId: number | null;
  companyName: string | null;
  image: string | null;
}

interface AuthContextType {
  user: User | null;
  permissions: string[];
  isLoading: boolean;
  isAuthenticated: boolean;
  activeTenantId: string | null;
  setActiveTenant: (tenant: { id: string; name: string; slug: string }) => void;
  login: (data: LoginInput) => Promise<any>;
  signup: (data: SignupInput) => Promise<any>;
  logout: () => Promise<void>;
  checkPermission: (resource: string, action: string) => boolean;
  refreshUser: () => Promise<any>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const RESERVED_PATHS = [
  'api',
  '_next',
  'favicon.ico',
  'login',
  'signup',
  'forgot-password',
  'reset-password',
  'dashboard',
  'analytics',
  'conversations',
  'agent-inbox',
  'ai-agents',
  'ai-logs',
  'leads',
  'manage-widget',
  'integrations',
  'knowledge-base',
  'ai-search',
  'team-management',
  'roles-permissions',
  'domain-settings',
  'billing',
  'account',
  'notifications',
  'departments'
];

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
        const response = await api.get<{ status: string; data: { token?: string; user: User; permissions: string[] } }>('/api/auth/me');
        if (typeof window !== 'undefined' && (response.data as any)?.token) {
          localStorage.setItem('v3c_token', (response.data as any).token);
        }
        if (typeof window !== 'undefined' && response.data?.user?.tenantId && !localStorage.getItem('v3c_active_tenant_id')) {
          localStorage.setItem('v3c_active_tenant_id', response.data.user.tenantId);
          if (response.data.user.tenantSlug) {
            localStorage.setItem('v3c_active_tenant_slug', response.data.user.tenantSlug);
          }
        }
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

  // Accessible tenants query to resolve tenant slug <-> tenant id
  const { data: accessibleTenants = [] } = useQuery<Array<{ id: string; name: string; slug: string }>>({
    queryKey: ['accessible-tenants', user?.id, user?.groupId],
    queryFn: async () => {
      const res = await api.get<{ status: string; data: Array<{ id: string; name: string; slug: string }> }>('/api/auth/accessible-tenants');
      return res.data || [];
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  // Initialize activeTenantId from URL slug if available, falling back to localStorage
  const [activeTenantId, setActiveTenantIdState] = React.useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const segments = window.location.pathname.split('/').filter(Boolean);
      const urlSlug = segments[0];
      const savedSlug = localStorage.getItem('v3c_active_tenant_slug');
      const savedId = localStorage.getItem('v3c_active_tenant_id');

      if (urlSlug && !RESERVED_PATHS.includes(urlSlug) && savedSlug === urlSlug && savedId) {
        return savedId;
      }
      return savedId || null;
    }
    return null;
  });

  // Sync activeTenantId from URL slug when navigating or when accessible tenants resolve
  useEffect(() => {
    if (!pathname) return;
    const segments = pathname.split('/').filter(Boolean);
    if (segments.length === 0) return;

    const firstSegment = segments[0];
    if (RESERVED_PATHS.includes(firstSegment) || firstSegment.includes('.')) {
      return;
    }

    if (accessibleTenants.length > 0) {
      const matched = accessibleTenants.find(t => t.slug === firstSegment);
      if (matched && matched.id !== activeTenantId) {
        if (typeof window !== 'undefined') {
          localStorage.setItem('v3c_active_tenant_id', matched.id);
          localStorage.setItem('v3c_active_tenant_slug', matched.slug);
        }
        setActiveTenantIdState(matched.id);
      }
    } else if (user?.tenantSlug === firstSegment && user.tenantId && user.tenantId !== activeTenantId) {
      if (typeof window !== 'undefined') {
        localStorage.setItem('v3c_active_tenant_id', user.tenantId);
        localStorage.setItem('v3c_active_tenant_slug', user.tenantSlug);
      }
      setActiveTenantIdState(user.tenantId);
    }
  }, [pathname, accessibleTenants, user, activeTenantId]);

  const setActiveTenant = (tenant: { id: string; name: string; slug: string }) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('v3c_active_tenant_id', tenant.id);
      localStorage.setItem('v3c_active_tenant_slug', tenant.slug);
    }
    setActiveTenantIdState(tenant.id);
    queryClient.removeQueries();

    // Preserve the current path under the new tenant slug
    const segments = pathname.split('/').filter(Boolean);
    let targetPath = `/${tenant.slug}/dashboard`;

    if (segments.length > 0) {
      const firstSegment = segments[0];
      if (RESERVED_PATHS.includes(firstSegment)) {
        targetPath = `/${tenant.slug}/${segments.join('/')}`;
      } else {
        const rest = segments.slice(1).join('/');
        targetPath = rest ? `/${tenant.slug}/${rest}` : `/${tenant.slug}/dashboard`;
      }
    }

    const search = typeof window !== 'undefined' ? window.location.search : '';
    router.push(`${targetPath}${search}`);
  };

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async (data: LoginInput) => {
      const res = await api.post<{ status: string; data: { user: User; permissions: string[] } }>('/api/auth/login', data);
      return res.data;
    },
    onSuccess: (data: any) => {
      if (typeof window !== 'undefined' && data?.token) {
        localStorage.setItem('v3c_token', data.token);
      }
      queryClient.setQueryData(['auth-user'], data);
      const targetSlug = data.user?.tenantSlug || 'v3c-system-tenant';
      router.push(`/${targetSlug}/dashboard`);
    },
  });

  // Signup mutation
  const signupMutation = useMutation({
    mutationFn: async (data: SignupInput) => {
      const res = await api.post<{ status: string; data: { user: User; permissions: string[] } }>('/api/auth/signup', data);
      return res.data;
    },
    onSuccess: (data: any) => {
      if (typeof window !== 'undefined' && data?.token) {
        localStorage.setItem('v3c_token', data.token);
      }
      queryClient.setQueryData(['auth-user'], data);
      const targetSlug = data.user?.tenantSlug || 'v3c-system-tenant';
      router.push(`/${targetSlug}/dashboard`);
    },
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: async () => {
      try {
        await api.post('/api/auth/logout');
      } catch (e) {
        // Ignore 401 or network errors on logout
      }
    },
    onSuccess: () => {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('v3c_token');
        localStorage.removeItem('v3c_active_tenant_id');
      }
      setActiveTenantIdState(null);
      queryClient.cancelQueries();
      queryClient.setQueryData(['auth-user'], null);
      queryClient.clear();
    },
    onError: () => {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('v3c_token');
        localStorage.removeItem('v3c_active_tenant_id');
      }
      setActiveTenantIdState(null);
      queryClient.cancelQueries();
      queryClient.setQueryData(['auth-user'], null);
      queryClient.clear();
    },
  });

  // Role permissions check helper
  const checkPermission = (resource: string, action: string): boolean => {
    if (!user) return false;
    // Super admin bypasses all authorization checks
    if (user.role === 'super_admin') return true;
    
    const normAction = action === 'read' ? 'view' : action;
    const requiredPermission = `${resource}:${normAction}`;
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
      // If logged in, redirect away from auth pages to user tenant dashboard
      const targetSlug = user?.tenantSlug || 'v3c-system-tenant';
      router.push(`/${targetSlug}/dashboard`);
    }
  }, [isAuthenticated, isLoading, pathname, router, user?.tenantSlug]);

  const value: AuthContextType = {
    user,
    permissions,
    isLoading,
    isAuthenticated,
    activeTenantId,
    setActiveTenant,
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
