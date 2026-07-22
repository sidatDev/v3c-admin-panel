'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Users, Plus, Shield, RefreshCw, Edit2, Trash2, Mail, CheckCircle, XCircle } from 'lucide-react';
import { api, ApiError } from '@/lib/api';

interface TeamMemberItem {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  status: string;
  roleName: string;
  roleId: string | null;
  createdAt: string;
}

interface RoleItem {
  id: string;
  name: string;
  description: string | null;
}

export default function TeamManagementPage() {
  const queryClient = useQueryClient();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<TeamMemberItem | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [roleId, setRoleId] = useState('');

  // Fetch Team
  const { data: team = [], isLoading, refetch, isRefetching } = useQuery<TeamMemberItem[]>({
    queryKey: ['team-members'],
    queryFn: async () => {
      const res = await api.get<{ status: string; data: TeamMemberItem[] }>('/api/team');
      return res.data;
    },
  });

  // Fetch Roles
  const { data: roles = [] } = useQuery<RoleItem[]>({
    queryKey: ['roles-list'],
    queryFn: async () => {
      const res = await api.get<{ status: string; data: RoleItem[] }>('/api/roles');
      return res.data;
    },
  });

  const addMemberMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post('/api/team', payload);
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-members'] });
      toast.success('Team member invited successfully!');
      setIsAddModalOpen(false);
      setName('');
      setEmail('');
      setPhone('');
      setPassword('');
      setRoleId('');
    },
    onError: (error) => {
      if (error instanceof ApiError) toast.error(error.message);
      else toast.error('Failed to invite team member.');
    },
  });

  const updateMemberMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: any }) => {
      const res = await api.put(`/api/team/${id}`, payload);
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-members'] });
      toast.success('Team member updated!');
      setIsEditModalOpen(false);
      setSelectedUser(null);
    },
    onError: (error) => {
      if (error instanceof ApiError) toast.error(error.message);
      else toast.error('Failed to update team member.');
    },
  });

  const disableMemberMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/api/team/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-members'] });
      toast.success('Team member access disabled.');
    },
  });

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Users className="h-6 w-6 text-indigo-600" />
            Team Management
          </h1>
          <p className="text-sm text-slate-500">
            Invite colleagues, assign custom RBAC roles, and manage access status.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            disabled={isRefetching}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
          >
            <Plus className="h-4 w-4" />
            Add Member
          </button>
        </div>
      </div>

      {/* Team Members Table */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">Team Members ({team.length})</h3>

        {team.length > 0 ? (
          <div className="overflow-x-auto rounded-xl border border-slate-100">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-100 font-semibold uppercase text-slate-500">
                <tr>
                  <th className="p-3.5">Member</th>
                  <th className="p-3.5">Role</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5">Joined Date</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {team.map((member) => (
                  <tr key={member.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                    <td className="p-3.5">
                      <p className="font-bold text-slate-900">{member.name}</p>
                      <p className="text-slate-400 text-[11px]">{member.email}</p>
                    </td>

                    <td className="p-3.5">
                      <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-0.5 text-[10px] font-bold text-indigo-700 uppercase">
                        <Shield className="h-3 w-3" /> {member.roleName}
                      </span>
                    </td>

                    <td className="p-3.5">
                      {member.status === 'active' ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                          <CheckCircle className="h-3 w-3" /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                          <XCircle className="h-3 w-3" /> {member.status}
                        </span>
                      )}
                    </td>

                    <td className="p-3.5 text-slate-500 whitespace-nowrap">
                      {new Date(member.createdAt).toLocaleDateString()}
                    </td>

                    <td className="p-3.5 text-right flex items-center justify-end gap-2">
                      <button
                        onClick={() => {
                          setSelectedUser(member);
                          setRoleId(member.roleId || '');
                          setIsEditModalOpen(true);
                        }}
                        className="text-slate-400 hover:text-indigo-600 p-1"
                        title="Edit Role & Status"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => disableMemberMutation.mutate(member.id)}
                        className="text-slate-400 hover:text-rose-600 p-1"
                        title="Disable Access"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-xs text-slate-400 italic">No team members added yet.</p>
        )}
      </div>

      {/* Add Member Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Invite Team Member</h3>

            <input
              type="text"
              placeholder="Full Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-indigo-500"
            />

            <input
              type="email"
              placeholder="Email Address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-indigo-500"
            />

            <input
              type="password"
              placeholder="Temporary Password (optional)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-indigo-500"
            />

            <div>
              <label className="text-xs font-medium text-slate-600 block mb-1">Assign Role</label>
              <select
                value={roleId}
                onChange={(e) => setRoleId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs text-slate-900 outline-none focus:border-indigo-500"
              >
                <option value="">Select Role...</option>
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (name && email) addMemberMutation.mutate({ name, email, password, roleId, phone });
                  else toast.error('Please enter name and email.');
                }}
                disabled={addMemberMutation.isPending}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
              >
                Invite Member
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Role Modal */}
      {isEditModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Edit Member: {selectedUser.name}</h3>

            <div>
              <label className="text-xs font-medium text-slate-600 block mb-1">Assigned Role</label>
              <select
                value={roleId}
                onChange={(e) => setRoleId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 outline-none focus:border-indigo-500"
              >
                <option value="">Select Role...</option>
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  updateMemberMutation.mutate({ id: selectedUser.id, payload: { roleId } });
                }}
                disabled={updateMemberMutation.isPending}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
              >
                Update Role
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
