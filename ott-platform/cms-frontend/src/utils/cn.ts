import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k     = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i     = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function formatDuration(seconds: number): string {
  if (!seconds) return '—';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins  = Math.floor(diff / 60_000);
  const hrs   = Math.floor(diff / 3_600_000);
  const days  = Math.floor(diff / 86_400_000);
  if (mins  < 1)   return 'just now';
  if (mins  < 60)  return `${mins}m ago`;
  if (hrs   < 24)  return `${hrs}h ago`;
  if (days  < 7)   return `${days}d ago`;
  return formatDate(iso);
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

export function statusColor(status: string): string {
  const map: Record<string, string> = {
    published:  'text-green-400 bg-green-400/10 border-green-400/20',
    processing: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
    draft:      'text-surface-200 bg-surface-600 border-surface-500',
    scheduled:  'text-blue-400 bg-blue-400/10 border-blue-400/20',
    archived:   'text-surface-300 bg-surface-700 border-surface-600',
    pending:    'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
    completed:  'text-green-400 bg-green-400/10 border-green-400/20',
    failed:     'text-red-400 bg-red-400/10 border-red-400/20',
    retrying:   'text-orange-400 bg-orange-400/10 border-orange-400/20',
    active:     'text-blue-400 bg-blue-400/10 border-blue-400/20',
  };
  return map[status] ?? 'text-surface-200 bg-surface-600 border-surface-500';
}
