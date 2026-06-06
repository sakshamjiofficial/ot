import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  RefreshCw, AlertCircle, CheckCircle2, Clock, Loader2,
  Zap, XCircle, ChevronDown, ChevronUp, Activity,
} from 'lucide-react';
import { uploadApi }   from '@/api/endpoints';
import { Button, ProgressBar, StatusBadge, Card, StatCard, Spinner } from '@/components/UI';
import { formatDateTime, timeAgo, formatBytes } from '@/utils/cn';
import { cn } from '@/utils/cn';
import type { TranscodingJob } from '@/types';
import toast from 'react-hot-toast';

const QUEUE_REFRESH_MS = 5000;

export default function EncodingQueue() {
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [expandedId, setExpandedId]     = useState<string | null>(null);
  const queryClient = useQueryClient();

  // ── Queue Stats ────────────────────────────────────────────
  const { data: stats } = useQuery({
    queryKey: ['queue-stats'],
    queryFn:  uploadApi.queueStats,
    refetchInterval: QUEUE_REFRESH_MS,
  });

  // ── Job List ───────────────────────────────────────────────
  const { data: jobs = [], isLoading, isFetching } = useQuery({
    queryKey: ['encoding-jobs', statusFilter],
    queryFn:  () => uploadApi.listJobs(statusFilter || undefined, 100),
    refetchInterval: QUEUE_REFRESH_MS,
    select: (data) => Array.isArray(data) ? data : [],
  });

  // ── Retry mutation ─────────────────────────────────────────
  const retryMutation = useMutation({
    mutationFn: (videoAssetId: string) => uploadApi.retryJob(videoAssetId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['encoding-jobs'] });
      queryClient.invalidateQueries({ queryKey: ['queue-stats'] });
      toast.success('Job re-queued');
    },
    onError: () => toast.error('Failed to retry job'),
  });

  const STATUS_TABS = [
    { value: '',           label: 'All' },
    { value: 'pending',    label: 'Pending' },
    { value: 'processing', label: 'Processing' },
    { value: 'completed',  label: 'Completed' },
    { value: 'failed',     label: 'Failed' },
  ];

  return (
    <div className="space-y-6">

      {/* Stats Row */}
      {stats && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
          {[
            { label: 'Waiting',   value: stats.waiting,   icon: <Clock size={18} />,       color: 'yellow' },
            { label: 'Active',    value: stats.active,    icon: <Activity size={18} />,     color: 'blue'   },
            { label: 'Completed', value: stats.completed, icon: <CheckCircle2 size={18} />, color: 'green'  },
            { label: 'Failed',    value: stats.failed,    icon: <XCircle size={18} />,      color: 'red'    },
            { label: 'Delayed',   value: stats.delayed,   icon: <Zap size={18} />,          color: 'default'},
          ].map((s) => (
            <StatCard key={s.label} label={s.label} value={s.value} icon={s.icon} color={s.color as any} />
          ))}
        </div>
      )}

      {/* Filter Tabs + Refresh */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1 rounded-lg border border-surface-600 bg-surface-800 p-1">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setStatusFilter(tab.value)}
              className={cn(
                'rounded-md px-4 py-1.5 text-sm font-medium transition-colors',
                statusFilter === tab.value
                  ? 'bg-brand-500 text-white'
                  : 'text-surface-300 hover:text-white',
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <button
          onClick={() => queryClient.invalidateQueries({ queryKey: ['encoding-jobs'] })}
          className={cn(
            'flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-surface-300',
            'hover:bg-surface-700 hover:text-white transition-colors',
          )}
        >
          <RefreshCw size={14} className={cn(isFetching && 'animate-spin')} />
          Refresh
        </button>
      </div>

      {/* Job List */}
      <Card padding={false}>
        {isLoading ? (
          <div className="flex justify-center py-16">
            <Spinner size="lg" />
          </div>
        ) : jobs.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <CheckCircle2 className="mb-3 text-surface-500" size={40} />
            <p className="text-surface-300">No jobs found</p>
          </div>
        ) : (
          <div className="divide-y divide-surface-700">
            {jobs.map((job) => (
              <JobRow
                key={job.id}
                job={job}
                expanded={expandedId === job.id}
                onToggle={() => setExpandedId(expandedId === job.id ? null : job.id)}
                onRetry={() => job.videoAssetId && retryMutation.mutate(job.videoAssetId)}
                isRetrying={retryMutation.isPending}
              />
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

// ─── Job Row ──────────────────────────────────────────────────

function JobRow({
  job, expanded, onToggle, onRetry, isRetrying,
}: {
  job:        TranscodingJob;
  expanded:   boolean;
  onToggle:   () => void;
  onRetry:    () => void;
  isRetrying: boolean;
}) {
  const isProcessing = job.status === 'processing';
  const isFailed     = job.status === 'failed';

  return (
    <div className="group">
      <div
        className="flex cursor-pointer items-center gap-4 px-5 py-4 hover:bg-surface-700/50 transition-colors"
        onClick={onToggle}
      >
        {/* Status Icon */}
        <div className={cn(
          'shrink-0 rounded-lg p-2',
          isProcessing  ? 'bg-blue-500/20   text-blue-400'   :
          isFailed      ? 'bg-red-500/20    text-red-400'    :
          job.status === 'completed' ? 'bg-green-500/20 text-green-400' :
          'bg-surface-700 text-surface-300',
        )}>
          {isProcessing ? <Loader2 size={16} className="animate-spin" /> :
           isFailed     ? <AlertCircle size={16} /> :
           job.status === 'completed' ? <CheckCircle2 size={16} /> :
           <Clock size={16} />}
        </div>

        {/* Name & Meta */}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-white">
            {job.originalFilename || `Job ${job.id.slice(0, 8)}`}
          </p>
          <p className="mt-0.5 text-xs text-surface-300">
            {timeAgo(job.createdAt)}
            {job.startedAt && ` · started ${timeAgo(job.startedAt)}`}
            {job.retryCount > 0 && ` · retry #${job.retryCount}`}
          </p>
        </div>

        {/* Progress */}
        {isProcessing && (
          <div className="w-32 shrink-0">
            <div className="mb-1 flex justify-between text-xs text-surface-300">
              <span>Encoding</span>
              <span>{job.progress}%</span>
            </div>
            <ProgressBar value={job.progress} color="blue" />
          </div>
        )}

        {/* Status badge */}
        <div className="shrink-0"><StatusBadge status={job.status} /></div>

        {/* Actions */}
        <div className="flex shrink-0 items-center gap-2">
          {isFailed && (
            <Button
              size="xs"
              variant="outline"
              icon={<RefreshCw size={12} />}
              loading={isRetrying}
              onClick={(e) => { e.stopPropagation(); onRetry(); }}
            >
              Retry
            </Button>
          )}
          <span className="text-surface-500">
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </span>
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t border-surface-700 bg-surface-700/30 px-5 py-4 animate-fade-in">
          <div className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
            <InfoCell label="Job ID"     value={job.id.slice(0, 12) + '…'} />
            <InfoCell label="Priority"   value={String(job.priority)} />
            <InfoCell label="Worker"     value={job.workerId || '—'} />
            <InfoCell label="Attempts"   value={String(job.retryCount)} />
            {job.startedAt   && <InfoCell label="Started"    value={formatDateTime(job.startedAt)} />}
            {job.completedAt && <InfoCell label="Completed"  value={formatDateTime(job.completedAt)} />}
          </div>

          {/* Progress bar detail */}
          {isProcessing && (
            <div className="mt-3">
              <ProgressBar value={job.progress} color="blue" className="h-3" />
              <p className="mt-1 text-xs text-surface-300">{job.progress}% complete</p>
            </div>
          )}

          {/* Error detail */}
          {isFailed && job.errorMessage && (
            <div className="mt-3 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3">
              <p className="text-xs font-medium text-red-400">Error</p>
              <p className="mt-1 font-mono text-xs text-red-300 whitespace-pre-wrap">{job.errorMessage}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function InfoCell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-surface-400">{label}</p>
      <p className="mt-0.5 font-mono text-surface-100">{value}</p>
    </div>
  );
}
