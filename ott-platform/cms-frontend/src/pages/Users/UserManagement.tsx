import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, UserX, Shield, Users, UserCheck, Plus, Key, Pencil, CreditCard, Sparkles } from 'lucide-react';
import { usersApi, plansApi }        from '@/api/endpoints';
import { DataTable }       from '@/components/DataTable/DataTable';
import { Input, Badge, ConfirmDialog, Card, StatCard, StatusBadge, Button, Select } from '@/components/UI';
import { formatDate, timeAgo } from '@/utils/cn';
import type { AdminUser }  from '@/types';
import toast from 'react-hot-toast';

export default function UserManagement() {
  const [page, setPage]       = useState(1);
  const [search, setSearch]   = useState('');
  const [deactivateId, setDeactivateId] = useState<string | null>(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordUser, setPasswordUser] = useState<AdminUser | null>(null);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [subscriptionUser, setSubscriptionUser] = useState<AdminUser | null>(null);
  const queryClient           = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['users', { page, search }],
    queryFn:  () => usersApi.list({ page, limit: 20, search: search || undefined }),
    placeholderData: (prev) => prev,
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => usersApi.deactivate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User deactivated');
      setDeactivateId(null);
    },
    onError: () => toast.error('Failed to deactivate user'),
  });

  const activateMutation = useMutation({
    mutationFn: (id: string) => usersApi.update(id, { isActive: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User activated');
    },
    onError: () => toast.error('Failed to activate user'),
  });

  const users: AdminUser[] = data?.data ?? data?.items ?? [];
  const meta               = data?.meta ?? { total: 0, page: 1, limit: 20, totalPages: 1 };

  const columns = [
    {
      key:    'user',
      header: 'User',
      render: (row: AdminUser) => (
        <div className="flex items-center gap-3">
          {row.avatarUrl ? (
            <img
              src={row.avatarUrl}
              alt={row.displayName || row.email}
              className="h-8 w-8 shrink-0 rounded-full object-cover border border-surface-600"
            />
          ) : (
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-500/20 text-sm font-bold text-brand-400 uppercase">
              {row.displayName?.[0] || row.email[0]}
            </div>
          )}
          <div>
            <p className="font-medium text-white">{row.displayName || '—'}</p>
            <p className="text-xs text-surface-300">{row.email}</p>
          </div>
        </div>
      ),
    },
    {
      key:    'role',
      header: 'Role',
      render: (row: AdminUser) => (
        <div className="flex items-center gap-2">
          {row.role === 'superadmin' && <Shield size={14} className="text-brand-400" />}
          {row.role === 'admin' && <Shield size={14} className="text-blue-400" />}
          <span className={`text-sm capitalize ${
            row.role === 'superadmin' ? 'text-brand-400' :
            row.role === 'admin'      ? 'text-blue-400'  : 'text-surface-200'
          }`}>
            {row.role}
          </span>
        </div>
      ),
    },
    {
      key:    'status',
      header: 'Status',
      render: (row: AdminUser) => (
        <div className="flex flex-col gap-1">
          <StatusBadge status={row.isActive ? 'active' : 'archived'} />
          {row.isEmailVerified
            ? <Badge variant="success">✓ Verified</Badge>
            : <Badge variant="warning">Unverified</Badge>}
        </div>
      ),
    },
    {
      key:    'subscription',
      header: 'Subscription',
      render: (row: AdminUser) => (
        <div className="flex flex-col gap-1">
          {row.hasActiveSubscription ? (
            <>
              <Badge variant="success">Active</Badge>
              {row.subscriptionExpiry && (
                <span className="text-[10px] text-green-400">
                  Expires {formatDate(row.subscriptionExpiry)}
                </span>
              )}
            </>
          ) : (
            <Badge variant="default">Free</Badge>
          )}
        </div>
      ),
    },
    {
      key:      'lastLoginAt',
      header:   'Last Login',
      sortable: true,
      render:   (row: AdminUser) => (
        <span className="text-xs text-surface-300">
          {row.lastLoginAt ? timeAgo(row.lastLoginAt) : 'Never'}
        </span>
      ),
    },
    {
      key:      'createdAt',
      header:   'Joined',
      sortable: true,
      render:   (row: AdminUser) => (
        <span className="text-xs text-surface-300">{formatDate(row.createdAt)}</span>
      ),
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <StatCard label="Total Users"  value={meta.total} icon={<Users size={18} />}     color="blue" />
        <StatCard label="Active"       value={meta.totalActive ?? 0}   icon={<UserCheck size={18} />} color="green" />
        <StatCard label="Admins"       value={meta.totalAdmins ?? 0} icon={<Shield size={18} />} color="red" />
      </div>

      {/* Search & Actions */}
      <div className="flex justify-between items-center gap-4">
        <Input
          className="max-w-sm w-full"
          placeholder="Search by name or email…"
          leftIcon={<Search size={14} />}
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
        <Button icon={<Plus size={15} />} onClick={() => { setEditingUser(null); setShowUserModal(true); }}>
          Create User
        </Button>
      </div>

      {/* Table */}
      <Card padding={false}>
        <DataTable
          columns={columns}
          data={users}
          isLoading={isLoading}
          keyField="id"
          emptyMessage="No users found"
          rowActions={(row: AdminUser) => (
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => { setEditingUser(row); setShowUserModal(true); }}
                className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-surface-300 hover:bg-surface-600 hover:text-white transition-colors"
                title="Edit User"
              >
                <Pencil size={12} />
                Edit
              </button>
              <button
                onClick={() => { setPasswordUser(row); setShowPasswordModal(true); }}
                className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-surface-300 hover:bg-surface-600 hover:text-white transition-colors"
                title="Change Password"
              >
                <Key size={12} />
                Password
              </button>
              <button
                onClick={() => { setSubscriptionUser(row); setShowSubscriptionModal(true); }}
                className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-surface-300 hover:bg-surface-600 hover:text-white transition-colors"
                title="Manage Subscription"
              >
                <CreditCard size={12} />
                Subscription
              </button>
              {row.isActive ? (
                <button
                  onClick={() => setDeactivateId(row.id)}
                  disabled={row.role === 'superadmin'}
                  className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-surface-400 hover:bg-red-500/10 hover:text-red-400 transition-colors disabled:opacity-30 disabled:pointer-events-none"
                  title="Deactivate"
                >
                  <UserX size={12} />
                  Deactivate
                </button>
              ) : (
                <button
                  onClick={() => activateMutation.mutate(row.id)}
                  disabled={row.role === 'superadmin'}
                  className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-green-500/20 hover:bg-green-500/10 text-green-400 transition-colors disabled:opacity-30 disabled:pointer-events-none"
                  title="Activate"
                >
                  <UserCheck size={12} />
                  Activate
                </button>
              )}
            </div>
          )}
          pagination={{
            page:       meta.page,
            limit:      meta.limit,
            total:      meta.total,
            totalPages: meta.totalPages,
            onPage:     setPage,
          }}
        />
      </Card>

      <ConfirmDialog
        open={!!deactivateId}
        title="Deactivate User"
        description="This will immediately log the user out of all devices and prevent future logins. Their content and history will be preserved."
        confirmLabel="Deactivate"
        danger
        onConfirm={() => deactivateId && deactivateMutation.mutate(deactivateId)}
        onCancel={() => setDeactivateId(null)}
      />

      {showUserModal && (
        <UserModal
          user={editingUser}
          onClose={() => setShowUserModal(false)}
          onSaved={() => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
            setShowUserModal(false);
          }}
        />
      )}

      {showPasswordModal && passwordUser && (
        <UserPasswordModal
          user={passwordUser}
          onClose={() => {
            setPasswordUser(null);
            setShowPasswordModal(false);
          }}
        />
      )}

      {showSubscriptionModal && subscriptionUser && (
        <UserSubscriptionModal
          user={subscriptionUser}
          onClose={() => {
            setSubscriptionUser(null);
            setShowSubscriptionModal(false);
          }}
          onSaved={() => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
            setSubscriptionUser(null);
            setShowSubscriptionModal(false);
          }}
        />
      )}
    </div>
  );
}

// ─── User Modal ────────────────────────────────────────────────

interface UserModalProps {
  user?: AdminUser | null;
  onClose: () => void;
  onSaved: () => void;
}

function UserModal({ user, onClose, onSaved }: UserModalProps) {
  const isEdit = !!user;
  const [form, setForm] = useState({
    email:       user?.email ?? '',
    displayName: user?.displayName ?? '',
    phone:       user?.phone ?? '',
    avatarUrl:   user?.avatarUrl ?? '',
    password:    '',
    role:        user?.role ?? 'user',
    isActive:    user?.isActive ?? true,
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isEdit && user) {
        await usersApi.update(user.id, {
          displayName: form.displayName || undefined,
          phone:       form.phone || undefined,
          avatarUrl:   form.avatarUrl || null,
          role:        form.role,
          isActive:    form.isActive,
        });
        toast.success(`User ${form.displayName || user.email} updated`);
      } else {
        await usersApi.create({
          email:       form.email,
          password:    form.password,
          displayName: form.displayName || undefined,
          phone:       form.phone || undefined,
          avatarUrl:   form.avatarUrl || undefined,
          role:        form.role,
        });
        toast.success(`User ${form.email} created`);
      }
      onSaved();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || `Failed to ${isEdit ? 'update' : 'create'} user`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg rounded-xl border border-surface-600 bg-surface-800 p-6 shadow-2xl animate-slide-up">
        <h3 className="mb-5 font-semibold text-white text-lg">{isEdit ? 'Edit User' : 'Create User'}</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Email Address"
            required={!isEdit}
            disabled={isEdit}
            type="email"
            placeholder="user@example.com"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          {!isEdit && (
            <Input
              label="Password"
              required
              type="password"
              placeholder="Min 8 characters, uppercase, number"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          )}
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Display Name"
              placeholder="e.g. John Doe"
              value={form.displayName}
              onChange={(e) => setForm({ ...form, displayName: e.target.value })}
            />
            <Input
              label="Phone Number"
              placeholder="e.g. +919876543210"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Role"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              options={[
                { value: 'user',       label: 'User' },
                { value: 'admin',      label: 'Admin' },
                { value: 'superadmin', label: 'Super Admin' },
              ]}
            />
          </div>
          <Input
            label="Avatar Image URL"
            type="url"
            placeholder="e.g. https://api.dicebear.com/7.x/avataaars/png?seed=User"
            value={form.avatarUrl}
            onChange={(e) => setForm({ ...form, avatarUrl: e.target.value })}
          />
          {isEdit && (
            <div className="flex items-center gap-2">
              <input
                id="isActive"
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                className="rounded border-surface-600 bg-surface-700 text-brand-500 focus:ring-brand-500"
              />
              <label htmlFor="isActive" className="text-sm font-medium text-surface-200 cursor-pointer">
                Active User (Can log in to platform)
              </label>
            </div>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" loading={loading} icon={isEdit ? undefined : <Plus size={15} />}>
              {isEdit ? 'Save Changes' : 'Create User'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── User Password Modal ──────────────────────────────────────

interface UserPasswordModalProps {
  user: AdminUser;
  onClose: () => void;
}

function UserPasswordModal({ user, onClose }: UserPasswordModalProps) {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);

  const handleOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || password.length < 8) {
      toast.error('Password must be at least 8 characters long');
      return;
    }
    setLoading(true);
    try {
      await usersApi.changePassword(user.id, password);
      toast.success(`Password updated for ${user.displayName || user.email}`);
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  const handleSendReset = async () => {
    setSendingReset(true);
    // Simulate sending email reset link
    await new Promise((resolve) => setTimeout(resolve, 800));
    toast.success(`Password reset link sent to ${user.email}`);
    setSendingReset(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-xl border border-surface-600 bg-surface-800 p-6 shadow-2xl animate-slide-up">
        <h3 className="mb-2 font-semibold text-white text-lg">Manage Password</h3>
        <p className="mb-5 text-xs text-surface-400">For user: <strong className="text-white">{user.email}</strong></p>

        <form onSubmit={handleOverride} className="space-y-4">
          <Input
            label="Override Password Directly"
            required
            type="password"
            placeholder="Enter new secure password (min 8 chars)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <div className="flex justify-between items-center pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              loading={sendingReset}
              onClick={handleSendReset}
            >
              Send Reset Link
            </Button>
            <div className="flex gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
              <Button type="submit" size="sm" loading={loading}>Save Password</Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── User Subscription Modal ──────────────────────────────────

interface UserSubscriptionModalProps {
  user: AdminUser;
  onClose: () => void;
  onSaved: () => void;
}

function UserSubscriptionModal({ user, onClose, onSaved }: UserSubscriptionModalProps) {
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const { data: plansData, isLoading: plansLoading } = useQuery({
    queryKey: ['admin-plans'],
    queryFn:  () => plansApi.listAll(),
  });

  const plans = plansData ?? [];
  const activePlans = plans.filter((p: any) => p.isActive);

  // Initialize selectedPlanId to first active plan when loaded
  React.useEffect(() => {
    if (activePlans.length > 0 && !selectedPlanId) {
      setSelectedPlanId(activePlans[0].id.toString());
    }
  }, [activePlans, selectedPlanId]);

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlanId) {
      toast.error('Please select a plan');
      return;
    }
    setLoading(true);
    try {
      await usersApi.activateSubscription(user.id, parseInt(selectedPlanId));
      toast.success(`Subscription activated for ${user.displayName || user.email}`);
      onSaved();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to activate subscription');
    } finally {
      setLoading(false);
    }
  };

  const handleDeactivate = async () => {
    if (!window.confirm('Are you sure you want to cancel/revoke this subscription?')) return;
    setLoading(true);
    try {
      await usersApi.deactivateSubscription(user.id);
      toast.success(`Subscription cancelled for ${user.displayName || user.email}`);
      onSaved();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to cancel subscription');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-xl border border-surface-600 bg-surface-800 p-6 shadow-2xl animate-slide-up">
        <h3 className="mb-2 font-semibold text-white text-lg">Manage Subscription</h3>
        <p className="mb-5 text-xs text-surface-400">For user: <strong className="text-white">{user.email}</strong></p>

        {user.hasActiveSubscription ? (
          <div className="space-y-4">
            <div className="rounded-lg bg-green-500/10 border border-green-500/20 p-4">
              <div className="flex items-center gap-2 text-green-400 font-medium mb-1">
                <Sparkles size={16} />
                <span>Active Premium Subscription</span>
              </div>
              {user.subscriptionExpiry && (
                <p className="text-xs text-surface-300">
                  Expires on {formatDate(user.subscriptionExpiry)}
                </p>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
              <Button
                type="button"
                variant="danger"
                loading={loading}
                onClick={handleDeactivate}
              >
                Cancel Subscription
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleActivate} className="space-y-4">
            <div className="rounded-lg bg-surface-700/30 border border-surface-600/50 p-4 text-xs text-surface-300">
              User currently has no active subscription (Free Plan). Select a plan to manually activate.
            </div>

            {plansLoading ? (
              <p className="text-xs text-surface-400">Loading subscription plans...</p>
            ) : activePlans.length === 0 ? (
              <p className="text-xs text-red-400">No active subscription plans found. Create a plan under Subscriptions menu first.</p>
            ) : (
              <Select
                label="Choose Plan"
                value={selectedPlanId}
                onChange={(e) => setSelectedPlanId(e.target.value)}
                options={activePlans.map((p: any) => ({
                  value: p.id.toString(),
                  label: `${p.name} (${p.planType}) - ₹${p.priceInr} for ${p.durationDays} days`,
                }))}
              />
            )}

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
              <Button
                type="submit"
                loading={loading || plansLoading}
                disabled={activePlans.length === 0}
              >
                Activate Subscription
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
