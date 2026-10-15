'use client';

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ColumnDef, PaginationState } from '@tanstack/react-table';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import {
  Building,
  Building2,
  Plus,
  RefreshCw,
  Edit2,
  Trash2,
  Users,
  CheckCircle2,
  XCircle,
  X,
  AlertTriangle,
  FolderTree
} from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { DataTable } from '@/components/ui/data-table';
import { useAuth } from '@/providers/auth-provider';
import { departmentSchema, DepartmentInput } from '@/lib/validators';

interface Department {
  id: string;
  name: string;
  status: 'ACTIVE' | 'INACTIVE';
  tenantId: string;
  createdAt: string;
  updatedAt: string;
  Tenant?: {
    id: string;
    name: string;
    slug: string;
  };
  _count?: {
    users: number;
  };
}

export default function DepartmentsPage() {
  const { user, activeTenantId } = useAuth();
  const queryClient = useQueryClient();

  const roleLevel = user?.roleLevel || (user?.role === 'super_admin' ? 'L0_PLATFORM' : 'L4_AGENT');
  const canManage = ['L0_PLATFORM', 'L1_GROUP', 'L2_COMPANY'].includes(roleLevel) || user?.role === 'super_admin' || user?.role === 'manager';
  const isMultiTenant = roleLevel === 'L0_PLATFORM' || roleLevel === 'L1_GROUP';

  // State for modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [deletingDept, setDeletingDept] = useState<Department | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });

  // Fetch departments
  const {
    data: departments = [],
    isLoading,
    isFetching,
    refetch
  } = useQuery<Department[]>({
    queryKey: ['departments', user?.id, activeTenantId || user?.tenantId],
    queryFn: async () => {
      const res = await api.get<{ status: string; data: Department[] }>('/api/departments');
      return res.data || [];
    },
    enabled: !!user,
  });

  // Create Form
  const {
    register: registerCreate,
    handleSubmit: handleCreateSubmit,
    reset: resetCreate,
    formState: { errors: createErrors, isSubmitting: isCreating }
  } = useForm<DepartmentInput>({
    resolver: zodResolver(departmentSchema),
    defaultValues: {
      name: '',
      status: 'ACTIVE'
    }
  });

  // Edit Form
  const {
    register: registerEdit,
    handleSubmit: handleEditSubmit,
    reset: resetEdit,
    setValue: setEditValue,
    formState: { errors: editErrors, isSubmitting: isUpdating }
  } = useForm<DepartmentInput>({
    resolver: zodResolver(departmentSchema),
    defaultValues: {
      name: '',
      status: 'ACTIVE'
    }
  });

  // Create Mutation
  const createMutation = useMutation({
    mutationFn: async (data: DepartmentInput) => {
      const res = await api.post<{ status: string; data: Department }>('/api/departments', data);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Department created successfully');
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      setIsCreateOpen(false);
      resetCreate();
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Failed to create department');
    }
  });

  // Update Mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: DepartmentInput }) => {
      const res = await api.put<{ status: string; data: Department }>(`/api/departments/${id}`, data);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Department updated successfully');
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      setEditingDept(null);
      resetEdit();
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Failed to update department');
    }
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/departments/${id}`);
    },
    onSuccess: () => {
      toast.success('Department deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      setDeletingDept(null);
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Failed to delete department');
    }
  });

  const openEditModal = (dept: Department) => {
    setEditingDept(dept);
    setEditValue('name', dept.name);
    setEditValue('status', dept.status);
  };

  // Filtered data based on search
  const filteredDepartments = useMemo(() => {
    if (!searchQuery.trim()) return departments;
    const q = searchQuery.toLowerCase();
    return departments.filter(d => 
      d.name.toLowerCase().includes(q) ||
      (d.Tenant?.name && d.Tenant.name.toLowerCase().includes(q))
    );
  }, [departments, searchQuery]);

  // Table columns definition
  const columns = useMemo<ColumnDef<Department>[]>(() => {
    const cols: ColumnDef<Department>[] = [
      {
        accessorKey: 'name',
        header: 'Department Name',
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100">
              <FolderTree className="h-4 w-4" />
            </div>
            <div>
              <p className="font-semibold text-slate-900">{row.original.name}</p>
              <p className="text-xs text-slate-400">ID: {row.original.id.slice(0, 8)}...</p>
            </div>
          </div>
        ),
      },
    ];

    if (isMultiTenant) {
      cols.push({
        accessorKey: 'Tenant.name',
        header: 'Company / Tenant',
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <Building2 className="h-3.5 w-3.5 text-slate-400" />
            <span className="font-medium text-slate-700">
              {row.original.Tenant?.name || 'Default Company'}
            </span>
          </div>
        ),
      });
    }

    cols.push(
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => {
          const isActive = row.original.status === 'ACTIVE';
          return (
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide border ${
                isActive
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-slate-100 text-slate-600 border-slate-200'
              }`}
            >
              {isActive ? (
                <CheckCircle2 className="h-3 w-3 text-emerald-600" />
              ) : (
                <XCircle className="h-3 w-3 text-slate-400" />
              )}
              {row.original.status}
            </span>
          );
        },
      },
      {
        accessorKey: '_count.users',
        header: 'Team Members',
        cell: ({ row }) => (
          <div className="flex items-center gap-1.5 text-slate-600">
            <Users className="h-3.5 w-3.5 text-slate-400" />
            <span className="font-semibold text-slate-900">
              {row.original._count?.users || 0}
            </span>
            <span className="text-xs text-slate-400">members</span>
          </div>
        ),
      },
      {
        accessorKey: 'createdAt',
        header: 'Created At',
        cell: ({ row }) => (
          <span className="text-xs text-slate-500 font-medium">
            {new Date(row.original.createdAt).toLocaleDateString(undefined, {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            })}
          </span>
        ),
      },
      {
        id: 'actions',
        header: () => <div className="text-right">Actions</div>,
        cell: ({ row }) => {
          if (!canManage) return null;
          return (
            <div className="flex items-center justify-end gap-1">
              <button
                onClick={() => openEditModal(row.original)}
                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors cursor-pointer"
                title="Edit Department"
              >
                <Edit2 className="h-4 w-4" />
              </button>
              <button
                onClick={() => setDeletingDept(row.original)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors cursor-pointer"
                title="Delete Department"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          );
        },
      }
    );

    return cols;
  }, [canManage, isMultiTenant]);

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
            <FolderTree className="h-6 w-6 text-indigo-600" />
            Departments
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Organize team members, permissions, and agent routing into distinct organizational units (L3).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition-all cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </button>

          {canManage && (
            <button
              onClick={() => setIsCreateOpen(true)}
              className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 transition-all active:scale-98 cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              Create Department
            </button>
          )}
        </div>
      </div>

      {/* Main Table */}
      <DataTable
        columns={columns}
        data={filteredDepartments}
        isLoading={isLoading}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search departments by name..."
        pagination={pagination}
        onPaginationChange={setPagination}
        pageCount={Math.ceil(filteredDepartments.length / pagination.pageSize) || 1}
      />

      {/* CREATE MODAL */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                  <Plus className="h-4 w-4" />
                </div>
                <h3 className="font-bold text-slate-900 text-lg">Create Department</h3>
              </div>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit((data: DepartmentInput) => createMutation.mutate(data))} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Department Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g., Customer Support, Sales, Engineering"
                  {...registerCreate('name')}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 placeholder:text-slate-400"
                />
                {createErrors.name && (
                  <p className="mt-1 text-xs text-red-600">{createErrors.name.message}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Status
                </label>
                <select
                  {...registerCreate('status')}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 transition-all active:scale-98 disabled:opacity-50 cursor-pointer"
                >
                  {isCreating ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : null}
                  Create Department
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {editingDept && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                  <Edit2 className="h-4 w-4" />
                </div>
                <h3 className="font-bold text-slate-900 text-lg">Edit Department</h3>
              </div>
              <button
                onClick={() => setEditingDept(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form
              onSubmit={handleEditSubmit((data: DepartmentInput) => {
                if (editingDept) {
                  updateMutation.mutate({ id: editingDept.id, data });
                }
              })}
              className="mt-5 space-y-4"
            >
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Department Name *
                </label>
                <input
                  type="text"
                  {...registerEdit('name')}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 placeholder:text-slate-400"
                />
                {editErrors.name && (
                  <p className="mt-1 text-xs text-red-600">{editErrors.name.message}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Status
                </label>
                <select
                  {...registerEdit('status')}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingDept(null)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 transition-all active:scale-98 disabled:opacity-50 cursor-pointer"
                >
                  {isUpdating ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : null}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deletingDept && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600 mb-4">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <h3 className="font-bold text-slate-900 text-lg">Delete Department</h3>
            <p className="mt-2 text-xs text-slate-500">
              Are you sure you want to delete <span className="font-semibold text-slate-900">{deletingDept.name}</span>? This action cannot be undone.
            </p>

            {deletingDept._count?.users && deletingDept._count.users > 0 ? (
              <div className="mt-3 rounded-lg bg-amber-50 p-2.5 text-xs text-amber-800 border border-amber-200 text-left">
                <strong>Warning:</strong> This department has {deletingDept._count.users} assigned team members. You must reassign them before deleting.
              </div>
            ) : null}

            <div className="flex items-center justify-center gap-2.5 mt-6">
              <button
                type="button"
                onClick={() => setDeletingDept(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleteMutation.isPending || (deletingDept._count?.users ? deletingDept._count.users > 0 : false)}
                onClick={() => deleteMutation.mutate(deletingDept.id)}
                className="rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-red-700 transition-all active:scale-98 disabled:opacity-50 cursor-pointer"
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Delete Department'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
