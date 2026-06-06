import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Users, Film, Tv, Zap, TrendingUp,
  Clock, CheckCircle2, AlertCircle, Activity,
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { dashboardApi, uploadApi, contentApi } from '@/api/endpoints';
import { StatCard, Card, StatusBadge, Spinner } from '@/components/UI';
import { formatNumber, timeAgo } from '@/utils/cn';

// Mock chart data — in production, add a /admin/analytics endpoint
const PLAY_DATA = Array.from({ length: 14 }, (_, i) => ({
  date:  `Day ${i + 1}`,
  plays: Math.floor(Math.random() * 5000 + 1000),
  users: Math.floor(Math.random() * 800 + 200),
}));

const RESOLUTION_DATA = [
  { name: '1080p', value: 42 },
  { name: '720p',  value: 31 },
  { name: '480p',  value: 18 },
  { name: '360p',  value: 9  },
];

const CUSTOM_TOOLTIP_STYLE = {
  backgroundColor: '#1a1a1a',
  border: '1px solid #333',
  borderRadius: '8px',
  padding: '8px 12px',
  fontSize: '12px',
};

export default function Dashboard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn:  dashboardApi.stats,
    refetchInterval: 30_000,
  });

  const { data: jobs = [] } = useQuery({
    queryKey: ['recent-jobs'],
    queryFn:  () => uploadApi.listJobs(undefined, 5),
    refetchInterval: 10_000,
    select: (d) => Array.isArray(d) ? d.slice(0, 5) : [],
  });

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Total Users"
          value={formatNumber(stats?.totalUsers ?? 0)}
          icon={<Users size={20} />}
          color="blue"
          trend={{ value: 12, label: 'vs last week' }}
        />
        <StatCard
          label="Movies"
          value={stats?.totalMovies ?? 0}
          icon={<Film size={20} />}
          color="red"
        />
        <StatCard
          label="Series"
          value={stats?.totalSeries ?? 0}
          icon={<Tv size={20} />}
          color="green"
        />
        <StatCard
          label="Processing"
          value={stats?.processing ?? 0}
          icon={<Zap size={20} />}
          color="yellow"
        />
      </div>

      {/* Queue Stats Row */}
      {stats?.queueStats && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
          {[
            { label: 'Queue: Waiting',   value: stats.queueStats.waiting,   color: 'text-yellow-400' },
            { label: 'Queue: Active',    value: stats.queueStats.active,    color: 'text-blue-400' },
            { label: 'Queue: Completed', value: stats.queueStats.completed, color: 'text-green-400' },
            { label: 'Queue: Failed',    value: stats.queueStats.failed,    color: 'text-red-400' },
            { label: 'Queue: Delayed',   value: stats.queueStats.delayed,   color: 'text-surface-200' },
          ].map((item) => (
            <Card key={item.label} className="flex flex-col items-center justify-center py-4">
              <p className={`text-2xl font-bold ${item.color}`}>{item.value}</p>
              <p className="mt-1 text-xs text-surface-300">{item.label}</p>
            </Card>
          ))}
        </div>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">

        {/* Plays Chart */}
        <Card className="xl:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-white">Plays & Active Users</h3>
              <p className="text-xs text-surface-300">Last 14 days</p>
            </div>
            <TrendingUp size={18} className="text-brand-400" />
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={PLAY_DATA}>
              <defs>
                <linearGradient id="plays" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#e50914" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#e50914" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="users" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
              <XAxis dataKey="date" tick={{ fill: '#666', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#666', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={CUSTOM_TOOLTIP_STYLE} />
              <Legend wrapperStyle={{ fontSize: '12px', color: '#999' }} />
              <Area type="monotone" dataKey="plays" stroke="#e50914" strokeWidth={2} fill="url(#plays)" dot={false} />
              <Area type="monotone" dataKey="users" stroke="#3b82f6" strokeWidth={2} fill="url(#users)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        {/* Resolution Chart */}
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-white">Stream Quality</h3>
              <p className="text-xs text-surface-300">Distribution %</p>
            </div>
            <Activity size={18} className="text-blue-400" />
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={RESOLUTION_DATA} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" horizontal={false} />
              <XAxis type="number" tick={{ fill: '#666', fontSize: 11 }} axisLine={false} tickLine={false} unit="%" />
              <YAxis type="category" dataKey="name" tick={{ fill: '#999', fontSize: 12 }} axisLine={false} tickLine={false} width={40} />
              <Tooltip contentStyle={CUSTOM_TOOLTIP_STYLE} formatter={(v) => `${v}%`} />
              <Bar dataKey="value" fill="#e50914" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Recent Jobs */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <h3 className="mb-4 font-semibold text-white">Recent Transcoding Jobs</h3>
          {jobs.length === 0 ? (
            <p className="py-6 text-center text-sm text-surface-400">No recent jobs</p>
          ) : (
            <div className="space-y-3">
              {jobs.map((job) => (
                <div key={job.id} className="flex items-center gap-3 rounded-lg bg-surface-700 px-4 py-3">
                  <div className={`shrink-0 rounded-full p-1.5 ${
                    job.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                    job.status === 'failed'    ? 'bg-red-500/20   text-red-400'  :
                    job.status === 'processing'? 'bg-blue-500/20  text-blue-400' :
                    'bg-surface-600 text-surface-300'
                  }`}>
                    {job.status === 'completed' ? <CheckCircle2 size={14} /> :
                     job.status === 'failed'    ? <AlertCircle  size={14} /> :
                     <Clock size={14} />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-white">
                      {job.originalFilename || `Job ${job.id.slice(0, 8)}`}
                    </p>
                    <p className="text-xs text-surface-400">{timeAgo(job.createdAt)}</p>
                  </div>
                  <StatusBadge status={job.status} />
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Content Summary */}
        <Card>
          <h3 className="mb-4 font-semibold text-white">Content Status</h3>
          <div className="space-y-3">
            {[
              { label: 'Published',  value: stats?.published  ?? 0, color: 'bg-green-500'  },
              { label: 'Processing', value: stats?.processing ?? 0, color: 'bg-blue-500'   },
              { label: 'Draft',      value: (stats?.totalMovies ?? 0) + (stats?.totalSeries ?? 0) - (stats?.published ?? 0) - (stats?.processing ?? 0), color: 'bg-surface-500' },
            ].map((item) => {
              const total = (stats?.totalMovies ?? 0) + (stats?.totalSeries ?? 0) || 1;
              const pct   = Math.round((item.value / total) * 100);
              return (
                <div key={item.label}>
                  <div className="mb-1.5 flex justify-between text-xs">
                    <span className="text-surface-300">{item.label}</span>
                    <span className="font-medium text-white">{item.value}</span>
                  </div>
                  <div className="h-2 rounded-full bg-surface-600">
                    <div
                      className={`h-2 rounded-full ${item.color} transition-all duration-500`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}
