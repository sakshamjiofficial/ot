import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  BadgeDollarSign, Users, TrendingUp, Tag,
  Plus, ToggleLeft, ToggleRight, Trash2, RefreshCw, Pencil,
} from 'lucide-react';
import { apiGet, apiPost, apiDelete } from '@/api/client';
import {
  StatCard, Card, Button, Input, Select,
  ConfirmDialog, StatusBadge, Badge, Spinner,
} from '@/components/UI';
import { DataTable } from '@/components/DataTable/DataTable';
import { formatDate, formatNumber } from '@/utils/cn';
import toast from 'react-hot-toast';
import { plansApi } from '@/api/endpoints';
import { SubscriptionPlan } from '@/types';

// ─── API helpers ──────────────────────────────────────────────
const fetchStats    = () => apiGet<any>('/admin/subscriptions/stats');
const fetchCoupons  = () => apiGet<any[]>('/admin/coupons');
const createCoupon  = (data: any) => apiPost('/admin/coupons', data);
const toggleCoupon  = (id: string) => apiPost(`/admin/coupons/${id}/toggle`, {});
const deleteCoupon  = (id: string) => apiDelete(`/admin/coupons/${id}`);

// ─── Main Page ────────────────────────────────────────────────

export default function SubscriptionsPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'coupons'>('overview');

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Tabs */}
      <div className="flex gap-1 rounded-lg border border-surface-600 bg-surface-800 p-1 w-fit">
        {(['overview', 'coupons'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`rounded-md px-5 py-2 text-sm font-medium capitalize transition-colors ${
              activeTab === tab
                ? 'bg-brand-500 text-white'
                : 'text-surface-300 hover:text-white'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && <OverviewTab />}
      {activeTab === 'coupons'  && <CouponsTab />}
    </div>
  );
}

// ─── Overview Tab ─────────────────────────────────────────────

function OverviewTab() {
  const queryClient = useQueryClient();
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [deletePlanId, setDeletePlanId] = useState<number | null>(null);

  const { data: stats, isLoading: isLoadingStats } = useQuery({
    queryKey: ['sub-stats'],
    queryFn:  fetchStats,
    refetchInterval: 60_000,
  });

  const { data: plans = [], isLoading: isLoadingPlans } = useQuery({
    queryKey: ['admin-plans'],
    queryFn:  plansApi.listAll,
    select:   (d) => Array.isArray(d) ? d : [],
  });

  const togglePlanMut = useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) =>
      plansApi.update(id, { isActive }),
    onSuccess:  () => {
      queryClient.invalidateQueries({ queryKey: ['admin-plans'] });
      toast.success('Plan status updated');
    },
    onError:    (err: any) => toast.error(err?.response?.data?.message || 'Failed to update plan status'),
  });

  const deletePlanMut = useMutation({
    mutationFn: (id: number) => plansApi.delete(id),
    onSuccess:  () => {
      queryClient.invalidateQueries({ queryKey: ['admin-plans'] });
      toast.success('Subscription plan deleted/deactivated');
      setDeletePlanId(null);
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to delete plan'),
  });

  if (isLoadingStats || isLoadingPlans) {
    return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Active Subscriptions" value={formatNumber(stats?.activeSubscriptions ?? 0)} icon={<Users size={18} />}          color="green" />
        <StatCard label="Free Trials"           value={formatNumber(stats?.trialSubscriptions  ?? 0)} icon={<Tag size={18} />}             color="blue"  />
        <StatCard label="Expired"               value={formatNumber(stats?.expiredSubscriptions ?? 0)} icon={<RefreshCw size={18} />}      color="default" />
        <StatCard label="Total Revenue"         value={`₹${formatNumber(stats?.totalRevenueInr ?? 0)}`} icon={<TrendingUp size={18} />}   color="red" />
      </div>

      <Card>
        <h3 className="mb-4 font-semibold text-white">Revenue Breakdown</h3>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 text-sm">
          {[
            { label: 'Monthly Plans',  value: '—' },
            { label: 'Annual Plans',   value: '—' },
            { label: 'Family Plans',   value: '—' },
            { label: 'Razorpay',       value: '—' },
            { label: 'Google Play',    value: '—' },
            { label: 'Coupon Savings', value: '—' },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-lg bg-surface-700 px-4 py-3">
              <p className="text-surface-400 text-xs">{label}</p>
              <p className="mt-1 text-lg font-bold text-white">{value}</p>
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs text-surface-400">
          Detailed analytics coming in Phase 2G. Connect your Razorpay dashboard for real-time revenue data.
        </p>
      </Card>

      <Card>
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="font-semibold text-white">Subscription Plans</h3>
            <p className="text-xs text-surface-400">Manage subscription levels, pricing, device limits, and video quality.</p>
          </div>
          <Button size="sm" icon={<Plus size={14} />} onClick={() => { setEditingPlan(null); setShowPlanModal(true); }}>
            Create Plan
          </Button>
        </div>

        <div className="space-y-3">
          {plans.length === 0 ? (
            <p className="text-sm text-surface-300 py-4 text-center">No subscription plans found. Create one to get started.</p>
          ) : (
            plans.map((plan) => {
              const planColor =
                plan.planType === 'free' ? 'text-surface-300' :
                plan.planType === 'basic' ? 'text-blue-400' :
                plan.planType === 'premium' ? 'text-brand-400' :
                plan.planType === 'family' ? 'text-green-400' : 'text-surface-100';

              return (
                <div key={plan.id} className="flex items-center justify-between rounded-lg bg-surface-700 px-4 py-3 border border-surface-600 hover:border-surface-500 transition-colors animate-fade-in">
                  <div className="flex items-center gap-3">
                    <BadgeDollarSign size={16} className={planColor} />
                    <div>
                      <span className={`font-semibold ${planColor}`}>{plan.name}</span>
                      <span className="ml-2 text-xs uppercase bg-surface-600 text-surface-300 px-1.5 py-0.5 rounded font-mono">
                        {plan.planType}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-6 text-sm text-surface-200">
                    <span>₹{plan.priceInr}/{plan.durationDays} days</span>
                    <span>{plan.maxDevices ?? 1} device{(plan.maxDevices ?? 1) > 1 ? 's' : ''}</span>
                    <span>Up to {plan.maxQuality || '1080p'}</span>
                    <Badge variant={plan.isActive ? 'success' : 'default'}>
                      {plan.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                    
                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => togglePlanMut.mutate({ id: plan.id, isActive: !plan.isActive })}
                        className="rounded-lg p-1.5 text-surface-300 hover:bg-surface-600 hover:text-white transition-colors"
                        title={plan.isActive ? 'Deactivate' : 'Activate'}
                      >
                        {plan.isActive ? <ToggleRight size={16} className="text-green-400" /> : <ToggleLeft size={16} />}
                      </button>
                      <button
                        onClick={() => { setEditingPlan(plan); setShowPlanModal(true); }}
                        className="rounded-lg p-1.5 text-surface-300 hover:bg-surface-600 hover:text-white transition-colors"
                        title="Edit Plan"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => setDeletePlanId(plan.id)}
                        className="rounded-lg p-1.5 text-surface-300 hover:bg-red-500/10 hover:text-red-400 transition-colors"
                        title="Delete Plan"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </Card>

      {showPlanModal && (
        <PlanModal
          plan={editingPlan}
          onClose={() => setShowPlanModal(false)}
          onSaved={() => {
            queryClient.invalidateQueries({ queryKey: ['admin-plans'] });
            setShowPlanModal(false);
          }}
        />
      )}

      <ConfirmDialog
        open={!!deletePlanId}
        title="Delete Subscription Plan"
        description="Are you sure you want to delete this subscription plan? If this plan has active subscribers, it will be deactivated (soft-deleted) instead to preserve user history."
        confirmLabel="Delete"
        danger
        onConfirm={() => deletePlanId && deletePlanMut.mutate(deletePlanId)}
        onCancel={() => setDeletePlanId(null)}
      />
    </div>
  );
}

// ─── Coupons Tab ──────────────────────────────────────────────

function CouponsTab() {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [deleteId, setDeleteId]     = useState<string | null>(null);

  const { data: coupons = [], isLoading } = useQuery({
    queryKey: ['admin-coupons'],
    queryFn:  fetchCoupons,
    select:   (d) => Array.isArray(d) ? d : [],
  });

  const toggleMut = useMutation({
    mutationFn: (id: string) => toggleCoupon(id),
    onSuccess:  () => queryClient.invalidateQueries({ queryKey: ['admin-coupons'] }),
    onError:    () => toast.error('Failed to toggle coupon'),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteCoupon(id),
    onSuccess:  () => {
      queryClient.invalidateQueries({ queryKey: ['admin-coupons'] });
      toast.success('Coupon deleted');
      setDeleteId(null);
    },
    onError: () => toast.error('Failed to delete coupon'),
  });

  const columns = [
    {
      key:    'code',
      header: 'Code',
      render: (row: any) => (
        <code className="rounded bg-surface-600 px-2 py-0.5 text-sm font-bold text-brand-400">{row.code}</code>
      ),
    },
    {
      key:    'discount',
      header: 'Discount',
      render: (row: any) => (
        <span className="font-semibold text-green-400">
          {row.discountType === 'percent' ? `${row.discountValue}%` : `₹${row.discountValue}`} off
        </span>
      ),
    },
    {
      key:    'usage',
      header: 'Usage',
      render: (row: any) => (
        <span className="text-surface-200">
          {row.usedCount}{row.maxUses ? `/${row.maxUses}` : ''}
        </span>
      ),
    },
    {
      key:    'expires',
      header: 'Expires',
      render: (row: any) => (
        <span className="text-xs text-surface-300">
          {row.expiresAt ? formatDate(row.expiresAt) : 'Never'}
        </span>
      ),
    },
    {
      key:    'status',
      header: 'Status',
      render: (row: any) => <StatusBadge status={row.isActive ? 'published' : 'archived'} />,
    },
  ];

  return (
    <div className="space-y-5">
      <div className="flex justify-between items-center">
        <p className="text-sm text-surface-300">{coupons.length} coupon{coupons.length !== 1 ? 's' : ''}</p>
        <Button icon={<Plus size={15} />} onClick={() => setShowCreate(true)}>Create Coupon</Button>
      </div>

      <Card padding={false}>
        <DataTable
          columns={columns}
          data={coupons}
          isLoading={isLoading}
          keyField="id"
          emptyMessage="No coupons yet"
          rowActions={(row: any) => (
            <div className="flex justify-end gap-1">
              <button
                onClick={() => toggleMut.mutate(row.id)}
                className="rounded-lg p-1.5 text-surface-400 hover:bg-surface-600 hover:text-white transition-colors"
                title={row.isActive ? 'Deactivate' : 'Activate'}
              >
                {row.isActive ? <ToggleRight size={16} className="text-green-400" /> : <ToggleLeft size={16} />}
              </button>
              <button
                onClick={() => setDeleteId(row.id)}
                className="rounded-lg p-1.5 text-surface-400 hover:bg-red-500/10 hover:text-red-400 transition-colors"
                title="Delete"
              >
                <Trash2 size={14} />
              </button>
            </div>
          )}
        />
      </Card>

      {showCreate && (
        <CreateCouponModal
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            queryClient.invalidateQueries({ queryKey: ['admin-coupons'] });
            setShowCreate(false);
          }}
        />
      )}

      <ConfirmDialog
        open={!!deleteId}
        title="Delete Coupon"
        description="This will permanently delete the coupon code. Any in-flight payments using this code will still be honoured."
        confirmLabel="Delete"
        danger
        onConfirm={() => deleteId && deleteMut.mutate(deleteId)}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}

// ─── Create Coupon Modal ──────────────────────────────────────

function CreateCouponModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({
    code:         '',
    discountType: 'percent',
    discountValue: '',
    maxUses:      '',
    minAmountInr: '',
    planId:       '',
    expiresAt:    '',
  });
  const [loading, setLoading] = useState(false);

  const { data: plans = [] } = useQuery({
    queryKey: ['admin-plans'],
    queryFn:  plansApi.listAll,
    select:   (d) => Array.isArray(d) ? d : [],
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await createCoupon({
        code:         form.code.toUpperCase(),
        discountType: form.discountType,
        discountValue: parseFloat(form.discountValue),
        maxUses:      form.maxUses      ? parseInt(form.maxUses)      : null,
        minAmountInr: form.minAmountInr ? parseFloat(form.minAmountInr) : 0,
        planId:       form.planId       ? parseInt(form.planId)       : null,
        expiresAt:    form.expiresAt    ? new Date(form.expiresAt).toISOString() : null,
      });
      toast.success(`Coupon ${form.code.toUpperCase()} created`);
      onCreated();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to create coupon');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg rounded-xl border border-surface-600 bg-surface-800 p-6 shadow-2xl animate-slide-up">
        <h3 className="mb-5 font-semibold text-white text-lg">Create Coupon</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Code"
              required
              placeholder="SAVE50"
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
            />
            <Select
              label="Discount Type"
              value={form.discountType}
              onChange={(e) => setForm({ ...form, discountType: e.target.value })}
              options={[
                { value: 'percent', label: 'Percent (%)' },
                { value: 'flat',    label: 'Flat (₹)' },
              ]}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label={form.discountType === 'percent' ? 'Discount %' : 'Discount ₹'}
              required
              type="number"
              min="1"
              max={form.discountType === 'percent' ? '100' : undefined}
              placeholder={form.discountType === 'percent' ? '50' : '99'}
              value={form.discountValue}
              onChange={(e) => setForm({ ...form, discountValue: e.target.value })}
            />
            <Input
              label="Max Uses (blank = unlimited)"
              type="number"
              min="1"
              placeholder="e.g. 500"
              value={form.maxUses}
              onChange={(e) => setForm({ ...form, maxUses: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Min Order ₹"
              type="number"
              placeholder="0"
              value={form.minAmountInr}
              onChange={(e) => setForm({ ...form, minAmountInr: e.target.value })}
            />
            <Select
              label="Restrict to Plan"
              value={form.planId}
              onChange={(e) => setForm({ ...form, planId: e.target.value })}
              placeholder="All plans"
              options={plans.map((p: any) => ({ value: p.id.toString(), label: p.name }))}
            />
          </div>
          <Input
            label="Expiry Date (blank = never)"
            type="datetime-local"
            value={form.expiresAt}
            onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" loading={loading} icon={<Plus size={15} />}>
              Create Coupon
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Plan Modal ────────────────────────────────────────────────

interface PlanModalProps {
  plan?: SubscriptionPlan | null;
  onClose: () => void;
  onSaved: () => void;
}

function PlanModal({ plan, onClose, onSaved }: PlanModalProps) {
  const isEdit = !!plan;
  const [form, setForm] = useState({
    name:         plan?.name ?? '',
    planType:     plan?.planType ?? 'basic',
    priceInr:     plan?.priceInr?.toString() ?? '',
    durationDays: plan?.durationDays?.toString() ?? '30',
    maxDevices:   plan?.maxDevices?.toString() ?? '2',
    maxQuality:   plan?.maxQuality ?? '1080p',
    isActive:     plan?.isActive ?? true,
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        name:         form.name,
        planType:     form.planType,
        priceInr:     parseFloat(form.priceInr),
        durationDays: parseInt(form.durationDays),
        maxDevices:   form.maxDevices ? parseInt(form.maxDevices) : undefined,
        maxQuality:   form.maxQuality || undefined,
        isActive:     form.isActive,
      };

      if (isEdit && plan) {
        await plansApi.update(plan.id, payload);
        toast.success(`Plan ${form.name} updated`);
      } else {
        await plansApi.create(payload);
        toast.success(`Plan ${form.name} created`);
      }
      onSaved();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || `Failed to ${isEdit ? 'update' : 'create'} plan`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg rounded-xl border border-surface-600 bg-surface-800 p-6 shadow-2xl animate-slide-up">
        <h3 className="mb-5 font-semibold text-white text-lg">{isEdit ? 'Edit Plan' : 'Create Subscription Plan'}</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Plan Name"
              required
              placeholder="e.g. Premium"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <Select
              label="Plan Type"
              value={form.planType}
              onChange={(e) => setForm({ ...form, planType: e.target.value })}
              options={[
                { value: 'free',    label: 'Free' },
                { value: 'basic',   label: 'Basic' },
                { value: 'premium', label: 'Premium' },
                { value: 'family',  label: 'Family' },
              ]}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Price (INR)"
              required
              type="number"
              min="0"
              placeholder="e.g. 199"
              value={form.priceInr}
              onChange={(e) => setForm({ ...form, priceInr: e.target.value })}
            />
            <Input
              label="Duration (Days)"
              required
              type="number"
              min="1"
              placeholder="e.g. 30"
              value={form.durationDays}
              onChange={(e) => setForm({ ...form, durationDays: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Max Devices"
              type="number"
              min="1"
              placeholder="e.g. 4"
              value={form.maxDevices}
              onChange={(e) => setForm({ ...form, maxDevices: e.target.value })}
            />
            <Select
              label="Max Quality"
              value={form.maxQuality}
              onChange={(e) => setForm({ ...form, maxQuality: e.target.value })}
              options={[
                { value: '480p',  label: '480p (SD)' },
                { value: '720p',  label: '720p (HD)' },
                { value: '1080p', label: '1080p (Full HD)' },
                { value: '4k',    label: '4K (Ultra HD)' },
              ]}
            />
          </div>
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
                Active (Users can subscribe to this plan)
              </label>
            </div>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" loading={loading} icon={isEdit ? undefined : <Plus size={15} />}>
              {isEdit ? 'Save Changes' : 'Create Plan'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

