'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { ShieldCheck, Plus, RefreshCw, UserCheck, ShieldAlert, BookOpen, Key, Info } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/providers/auth-provider';
import { 
  createRoleSchema, 
  assignRoleSchema, 
  CreateRoleInput, 
  AssignRoleInput 
} from '@/lib/validators';

interface Role {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  tenantId: string | null;
  permissions: string[];
}

interface Permission {
  id: string;
  resource: string;
  action: string;
  description: string | null;
}

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
}

export default function RolesPermissionsPage() {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'super_admin';
  const queryClient = useQueryClient();
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);

  // Fetch Roles
  const { 
    data: rolesData, 
    isLoading: isRolesLoading, 
    isFetching: isRolesFetching, 
    refetch: refetchRoles 
  } = useQuery({
    queryKey: ['roles'],
    queryFn: async () => {
      const res = await api.get<{ status: string; data: Role[] }>('/api/roles');
      return res.data;
    }
  });

  // Fetch Permissions list (for toggles)
  const { data: permissionsData, isLoading: isPermissionsLoading } = useQuery({
    queryKey: ['permissions'],
    queryFn: async () => {
      const res = await api.get<{ status: string; data: Permission[] }>('/api/roles/permissions');
      return res.data;
    }
  });

  // Fetch Tenant Users (for role assignment dropdown)
  const { data: usersData, isLoading: isUsersLoading } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const res = await api.get<{ status: string; data: User[] }>('/api/roles/users');
      return res.data;
    }
  });

  // Group permissions by resource for easier rendering
  const groupedPermissions = React.useMemo(() => {
    if (!permissionsData) return {};
    const groups: { [resource: string]: Permission[] } = {};
    permissionsData.forEach((perm) => {
      if (!groups[perm.resource]) {
        groups[perm.resource] = [];
      }
      groups[perm.resource].push(perm);
    });
    return groups;
  }, [permissionsData]);

  // Create Role Mutation
  const createRoleMutation = useMutation({
    mutationFn: async (data: CreateRoleInput) => {
      const res = await api.post<{ status: string; data: Role }>('/api/roles', data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      toast.success('Custom role created successfully!');
      setIsCreateModalOpen(false);
      createForm.reset();
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        toast.error(error.message);
      } else {
        toast.error('Failed to create role.');
      }
    }
  });

  // Update Role Permissions Mutation
  const updatePermissionsMutation = useMutation({
    mutationFn: async ({ roleId, permissions }: { roleId: string; permissions: string[] }) => {
      const res = await api.put<{ status: string; message: string }>(
        `/api/roles/${roleId}/permissions`, 
        { permissions }
      );
      return res;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      toast.success('Role permissions updated successfully!');
      // Update local selected role permissions
      if (selectedRole && selectedRole.id === variables.roleId) {
        setSelectedRole({ ...selectedRole, permissions: variables.permissions });
      }
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        toast.error(error.message);
      } else {
        toast.error('Failed to update permissions.');
      }
    }
  });

  // Assign Role to User Mutation
  const assignRoleMutation = useMutation({
    mutationFn: async ({ userId, roleId }: { userId: number; roleId: string }) => {
      const res = await api.post<{ status: string; message: string }>(
        `/api/roles/users/${userId}/assign`, 
        { roleId }
      );
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Role assigned to user successfully!');
      setIsAssignModalOpen(false);
      assignForm.reset();
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        toast.error(error.message);
      } else {
        toast.error('Failed to assign role.');
      }
    }
  });

  // Forms setup with Zod
  const createForm = useForm<CreateRoleInput>({
    resolver: zodResolver(createRoleSchema),
    defaultValues: {
      name: '',
      description: '',
      permissions: [],
    }
  });

  const assignForm = useForm<AssignRoleInput>({
    resolver: zodResolver(assignRoleSchema),
    defaultValues: {
      roleId: '',
    }
  });
  
  const [selectedAssignUserId, setSelectedAssignUserId] = useState<number | null>(null);

  const onCreateSubmit = (data: CreateRoleInput) => {
    createRoleMutation.mutate(data);
  };

  const onAssignSubmit = (data: AssignRoleInput) => {
    if (!selectedAssignUserId) {
      toast.error('Please select a user');
      return;
    }
    assignRoleMutation.mutate({ userId: selectedAssignUserId, roleId: data.roleId });
  };

  // Toggle permission check in currently editing list
  const handlePermissionToggle = (permKey: string) => {
    if (!selectedRole || (selectedRole.isSystem && !isSuperAdmin)) return;
    
    let updatedPerms = [...selectedRole.permissions];
    if (updatedPerms.includes(permKey)) {
      updatedPerms = updatedPerms.filter(p => p !== permKey);
    } else {
      updatedPerms.push(permKey);
    }
    
    // Automatically save update to backend on click
    updatePermissionsMutation.mutate({ roleId: selectedRole.id, permissions: updatedPerms });
  };

  const isLoading = isRolesLoading || isPermissionsLoading || isUsersLoading;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <ShieldCheck className="h-7 w-7 text-indigo-600" />
            Roles & Permissions
          </h1>
          <p className="text-sm text-slate-500">
            Define system roles, toggle granular permissions, and map roles to team members.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => refetchRoles()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw className={`h-4 w-4 ${isRolesFetching ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={() => setIsAssignModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <UserCheck className="h-4 w-4" />
            Assign Role
          </button>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-indigo-500 shadow-sm"
          >
            <Plus className="h-4 w-4" />
            Create Role
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* LEFT PANEL: ROLES LIST */}
          <div className="lg:col-span-1 rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col h-[600px]">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50">
              <h3 className="font-semibold text-slate-900">User Roles</h3>
              <p className="text-xs text-slate-500">Select a role to inspect or edit permissions</p>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {rolesData?.map((role) => {
                const isSelected = selectedRole?.id === role.id;
                return (
                  <button
                    key={role.id}
                    onClick={() => setSelectedRole(role)}
                    className={`w-full text-left p-3.5 rounded-xl border transition-all ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50/30'
                        : 'border-slate-100 hover:bg-slate-50 hover:border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-900 text-sm">{role.name}</span>
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                        role.isSystem 
                          ? 'bg-slate-100 text-slate-600' 
                          : 'bg-indigo-100 text-indigo-700'
                      }`}>
                        {role.isSystem ? 'System' : 'Custom'}
                      </span>
                    </div>
                    {role.description && (
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">{role.description}</p>
                    )}
                    <div className="mt-2.5 flex items-center gap-1.5 text-[10px] text-slate-400">
                      <Key className="h-3 w-3" />
                      <span>{role.permissions.length} active permissions</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* RIGHT PANEL: PERMISSIONS TOGGLE GRID */}
          <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col h-[600px]">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <div>
                <h3 className="font-semibold text-slate-900">
                  {selectedRole ? `Permissions for ${selectedRole.name}` : 'Permission Controls'}
                </h3>
                <p className="text-xs text-slate-500">
                  {selectedRole?.isSystem && !isSuperAdmin
                    ? 'Built-in system roles have read-only immutable permissions.' 
                    : selectedRole 
                    ? 'Click checkboxes to add/remove permissions from this role.'
                    : 'Select a role from the left panel to configure permissions.'}
                </p>
              </div>
              {selectedRole?.isSystem && !isSuperAdmin && (
                <span className="flex items-center gap-1 text-[11px] font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100">
                  <ShieldAlert className="h-3.5 w-3.5" />
                  Read Only
                </span>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {!selectedRole ? (
                <div className="flex h-full flex-col items-center justify-center text-slate-400">
                  <BookOpen className="h-10 w-10 mb-2 stroke-[1.5]" />
                  <p className="text-sm">Please select a role from the list to toggle settings.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {Object.entries(groupedPermissions).map(([resource, perms]) => {
                    const resourceLabels: Record<string, string> = {
                      dashboard: 'Dashboard',
                      analytics: 'Analytics & Performance Metrics',
                      conversations: 'Conversations',
                      agent_inbox: 'Agent Inbox (CRM)',
                      ai_agents: 'AI Agents & Retrieval',
                      ai_logs: 'AI Logs & Telemetry',
                      leads: 'Leads',
                      widget: 'Manage Widget',
                      integrations: 'Integrations',
                      knowledge_base: 'Knowledge Base',
                      ai_search: 'AI Search',
                      team: 'Team Management',
                      roles: 'Roles & Permissions',
                      domain: 'Domain Settings',
                      billing: 'Billing',
                      notifications: 'Notifications',
                      account: 'Account & Profile'
                    };
                    const displayTitle = resourceLabels[resource] || resource.replace(/_/g, ' ').toUpperCase();

                    return (
                      <div key={resource} className="border-b border-slate-100 pb-5 last:border-0 last:pb-0">
                        <h4 className="font-bold text-slate-900 text-sm uppercase tracking-wider mb-3 flex items-center gap-2">
                          <span>{displayTitle}</span>
                        </h4>
                        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                          {perms.map((perm) => {
                            const permKey = `${perm.resource}:${perm.action}`;
                            const isChecked = selectedRole.permissions.includes(permKey);
                            const isDisabled = (selectedRole.isSystem && !isSuperAdmin) || updatePermissionsMutation.isPending;
                            
                            return (
                              <label
                                key={perm.id}
                                className={`flex items-start gap-3 p-3 rounded-lg border text-left cursor-pointer transition-all ${
                                  isChecked
                                    ? 'border-indigo-100 bg-indigo-50/10'
                                    : 'border-slate-100 hover:bg-slate-50'
                                } ${isDisabled ? 'cursor-not-allowed opacity-75' : ''}`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  disabled={isDisabled}
                                  onChange={() => handlePermissionToggle(permKey)}
                                  className="mt-1 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                />
                                <div>
                                  <span className="text-xs font-semibold text-slate-900 capitalize">
                                    {perm.action}
                                  </span>
                                  {perm.description && (
                                    <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-2 leading-relaxed">
                                      {perm.description}
                                    </p>
                                  )}
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* CREATE CUSTOM ROLE MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl animate-fade-in text-white">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Plus className="h-5 w-5 text-indigo-400" />
              Create Custom Role
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Add a new custom user role for mapping specific operational permissions within your workspace.
            </p>

            <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-4 mt-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-300">
                  Role Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Content Moderator"
                  {...createForm.register('name')}
                  className="mt-1.5 w-full rounded-lg border border-slate-800 bg-slate-950/50 px-3 py-2 text-sm text-white outline-none focus:border-indigo-500"
                />
                {createForm.formState.errors.name && (
                  <p className="mt-1 text-xs text-red-400">{createForm.formState.errors.name.message}</p>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-300">
                  Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Describe the duties or access level of this role..."
                  {...createForm.register('description')}
                  className="mt-1.5 w-full rounded-lg border border-slate-800 bg-slate-950/50 px-3 py-2 text-sm text-white outline-none focus:border-indigo-500 resize-none"
                />
              </div>

              {/* Grid of basic default permission selector */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-300 mb-2">
                  Select Base Permissions
                </label>
                <div className="max-h-40 overflow-y-auto rounded-lg border border-slate-800 p-3 space-y-2 bg-slate-950/20">
                  {permissionsData?.map((perm) => {
                    const permKey = `${perm.resource}:${perm.action}`;
                    return (
                      <label key={perm.id} className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                        <input
                          type="checkbox"
                          value={permKey}
                          checked={createForm.watch('permissions')?.includes(permKey) || false}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            const current = createForm.getValues('permissions') || [];
                            if (checked) {
                              createForm.setValue('permissions', [...current, permKey], { shouldValidate: true });
                            } else {
                              createForm.setValue('permissions', current.filter(k => k !== permKey), { shouldValidate: true });
                            }
                          }}
                          className="rounded border-slate-800 bg-slate-950 text-indigo-600"
                        />
                        <span className="font-semibold text-slate-100 capitalize">{perm.action}</span>
                        <span className="text-slate-500 font-mono text-[10px]">({perm.resource})</span>
                      </label>
                    );
                  })}
                </div>
                {createForm.formState.errors.permissions && (
                  <p className="mt-1 text-xs text-red-400">{createForm.formState.errors.permissions.message}</p>
                )}
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="rounded-lg border border-slate-800 bg-slate-800/40 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createRoleMutation.isPending}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
                >
                  {createRoleMutation.isPending ? 'Creating...' : 'Create Role'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ASSIGN ROLE MODAL */}
      {isAssignModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl animate-fade-in text-white">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-indigo-400" />
              Assign Role to Team Member
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Select an existing teammate profile and override their current workspace auth role.
            </p>

            <form onSubmit={assignForm.handleSubmit(onAssignSubmit)} className="space-y-4 mt-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-300">
                  Select User
                </label>
                <select
                  value={selectedAssignUserId || ''}
                  onChange={(e) => setSelectedAssignUserId(e.target.value ? parseInt(e.target.value) : null)}
                  className="mt-1.5 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-indigo-500"
                >
                  <option value="" disabled className="text-slate-600">-- Select Teammate --</option>
                  {usersData?.map((user) => (
                    <option key={user.id} value={user.id} className="bg-slate-900 text-white">
                      {user.name} ({user.email}) — current: {user.role}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-300">
                  Assign New Role
                </label>
                <select
                  {...assignForm.register('roleId')}
                  className="mt-1.5 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-indigo-500"
                >
                  <option value="" disabled className="text-slate-600">-- Select Role --</option>
                  {rolesData?.map((role) => (
                    <option key={role.id} value={role.id} className="bg-slate-900 text-white">
                      {role.name} {role.isSystem ? '(System)' : ''}
                    </option>
                  ))}
                </select>
                {assignForm.formState.errors.roleId && (
                  <p className="mt-1 text-xs text-red-400">{assignForm.formState.errors.roleId.message}</p>
                )}
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAssignModalOpen(false)}
                  className="rounded-lg border border-slate-800 bg-slate-800/40 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={assignRoleMutation.isPending}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
                >
                  {assignRoleMutation.isPending ? 'Assigning...' : 'Assign Role'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
