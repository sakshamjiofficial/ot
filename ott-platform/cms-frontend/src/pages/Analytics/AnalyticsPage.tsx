import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell, LineChart, Line
} from 'recharts';
import {
  Play, Clock, Users, BadgeDollarSign, Laptop, Search, Tag, TrendingUp, RefreshCw, BarChart2
} from 'lucide-react';
import { analyticsApi } from '@/api/endpoints';
import { Card, StatCard, Spinner } from '@/components/UI';
import { formatNumber, formatDuration } from '@/utils/cn';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#f97316'];

const CUSTOM_TOOLTIP_STYLE = {
  backgroundColor: '#1a1a1a',
  border: '1px solid #333',
  borderRadius: '8px',
  padding: '8px 12px',
  fontSize: '12px',
};

type TabId = 'playback' | 'revenue' | 'content' | 'searches' | 'genres';

export default function AnalyticsPage() {
  const [activeTab, setActiveTab] = useState<TabId>('playback');

  // Overview query
  const { data: overview, isLoading: isOverviewLoading, refetch: refetchOverview } = useQuery({
    queryKey: ['analytics-overview'],
    queryFn: analyticsApi.getOverview,
  });

  // Tab specific queries
  const { data: playbackTrends = [], isLoading: isPlaybackLoading, refetch: refetchPlayback } = useQuery({
    queryKey: ['analytics-playback-trends'],
    queryFn: analyticsApi.getPlaybackTrends,
    enabled: activeTab === 'playback',
  });

  const { data: deviceBreakdown = [], isLoading: isDeviceLoading, refetch: refetchDevices } = useQuery({
    queryKey: ['analytics-device-breakdown'],
    queryFn: analyticsApi.getDeviceBreakdown,
    enabled: activeTab === 'playback',
  });

  const { data: revenueTrends = [], isLoading: isRevenueLoading, refetch: refetchRevenue } = useQuery({
    queryKey: ['analytics-revenue-trends'],
    queryFn: analyticsApi.getRevenueTrends,
    enabled: activeTab === 'revenue',
  });

  const { data: subscriptionBreakdown = [], isLoading: isSubLoading, refetch: refetchSubs } = useQuery({
    queryKey: ['analytics-sub-breakdown'],
    queryFn: analyticsApi.getSubscriptionBreakdown,
    enabled: activeTab === 'revenue',
  });

  const { data: topContent = [], isLoading: isTopLoading, refetch: refetchTop } = useQuery({
    queryKey: ['analytics-top-content'],
    queryFn: analyticsApi.getTopContent,
    enabled: activeTab === 'content',
  });

  const { data: searchAnalytics = [], isLoading: isSearchLoading, refetch: refetchSearch } = useQuery({
    queryKey: ['analytics-searches'],
    queryFn: analyticsApi.getSearchAnalytics,
    enabled: activeTab === 'searches',
  });

  const { data: genrePerformance = [], isLoading: isGenreLoading, refetch: refetchGenre } = useQuery({
    queryKey: ['analytics-genre-performance'],
    queryFn: analyticsApi.getGenrePerformance,
    enabled: activeTab === 'genres',
  });

  const handleRefresh = () => {
    refetchOverview();
    if (activeTab === 'playback') {
      refetchPlayback();
      refetchDevices();
    } else if (activeTab === 'revenue') {
      refetchRevenue();
      refetchSubs();
    } else if (activeTab === 'content') {
      refetchTop();
    } else if (activeTab === 'searches') {
      refetchSearch();
    } else if (activeTab === 'genres') {
      refetchGenre();
    }
  };

  const isTabLoading =
    (activeTab === 'playback' && (isPlaybackLoading || isDeviceLoading)) ||
    (activeTab === 'revenue' && (isRevenueLoading || isSubLoading)) ||
    (activeTab === 'content' && isTopLoading) ||
    (activeTab === 'searches' && isSearchLoading) ||
    (activeTab === 'genres' && isGenreLoading);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <BarChart2 className="text-brand-500" size={26} />
            Analytics Dashboard
          </h1>
          <p className="text-sm text-surface-300">
            Real-time platform insights, subscription revenue, content usage, and system performance.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            className="inline-flex items-center gap-2 rounded-lg border border-surface-500 bg-surface-800 hover:border-surface-400 hover:bg-surface-700 px-3 py-2 text-sm font-medium text-surface-100 transition-all focus:outline-none"
          >
            <RefreshCw size={16} className={isTabLoading || isOverviewLoading ? 'animate-spin' : ''} />
            Refresh Data
          </button>
        </div>
      </div>

      {/* Overview stats cards */}
      {isOverviewLoading ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="h-28 animate-pulse flex items-center justify-center">
              <div className="h-5 w-24 bg-surface-700 rounded mb-2"></div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard
            label="Total Plays"
            value={formatNumber(overview?.totalPlays ?? 0)}
            icon={<Play size={20} />}
            color="red"
          />
          <StatCard
            label="Watch Time"
            value={formatDuration(overview?.totalWatchSeconds ?? 0)}
            icon={<Clock size={20} />}
            color="green"
          />
          <StatCard
            label="Active Subscriptions"
            value={formatNumber(overview?.activeSubscriptions ?? 0)}
            icon={<Users size={20} />}
            color="blue"
          />
          <StatCard
            label="Total Revenue"
            value={`₹${formatNumber(overview?.totalRevenue ?? 0)}`}
            icon={<BadgeDollarSign size={20} />}
            color="yellow"
          />
        </div>
      )}

      {/* Tabs list */}
      <div className="flex border-b border-surface-700 overflow-x-auto pb-px">
        {[
          { id: 'playback', label: 'Playback & Devices', icon: <Play size={16} /> },
          { id: 'revenue', label: 'Revenue & Plans', icon: <BadgeDollarSign size={16} /> },
          { id: 'content', label: 'Top Content', icon: <TrendingUp size={16} /> },
          { id: 'searches', label: 'Search Queries', icon: <Search size={16} /> },
          { id: 'genres', label: 'Genre Analytics', icon: <Tag size={16} /> },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as TabId)}
            className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-medium transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? 'border-brand-500 text-brand-400 font-semibold'
                : 'border-transparent text-surface-300 hover:text-white'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {isTabLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Spinner size="lg" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* PLAYBACK TAB */}
          {activeTab === 'playback' && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              {/* Daily playback trend chart */}
              <Card className="lg:col-span-2">
                <div className="mb-4">
                  <h3 className="font-semibold text-white">Daily Plays & Active Viewers</h3>
                  <p className="text-xs text-surface-300">Playback trend over the last 14 days</p>
                </div>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={playbackTrends}>
                    <defs>
                      <linearGradient id="plays-grad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#e50914" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#e50914" stopOpacity={0.02} />
                      </linearGradient>
                      <linearGradient id="viewers-grad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                    <XAxis dataKey="date" tick={{ fill: '#666', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#666', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={CUSTOM_TOOLTIP_STYLE} />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    <Area name="Plays" type="monotone" dataKey="plays" stroke="#e50914" strokeWidth={2} fill="url(#plays-grad)" />
                    <Area name="Unique Viewers" type="monotone" dataKey="users" stroke="#3b82f6" strokeWidth={2} fill="url(#viewers-grad)" />
                  </AreaChart>
                </ResponsiveContainer>
              </Card>

              {/* Devices chart */}
              <Card>
                <div className="mb-4">
                  <h3 className="font-semibold text-white">Device Breakdown</h3>
                  <p className="text-xs text-surface-300">Device type usage distribution</p>
                </div>
                {deviceBreakdown.length === 0 ? (
                  <div className="flex h-64 items-center justify-center text-sm text-surface-400">
                    No device data recorded yet.
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie
                          data={deviceBreakdown}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="count"
                          nameKey="device_type"
                        >
                          {deviceBreakdown.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={CUSTOM_TOOLTIP_STYLE} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="mt-4 w-full grid grid-cols-2 gap-2 text-xs">
                      {deviceBreakdown.map((item, index) => (
                        <div key={item.device_type} className="flex items-center gap-2">
                          <span
                            className="inline-block h-3 w-3 rounded-full"
                            style={{ backgroundColor: COLORS[index % COLORS.length] }}
                          />
                          <span className="capitalize text-surface-200">{item.device_type}</span>
                          <span className="font-medium text-white ml-auto">({item.count})</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            </div>
          )}

          {/* REVENUE TAB */}
          {activeTab === 'revenue' && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              {/* Daily revenue trend chart */}
              <Card className="lg:col-span-2">
                <div className="mb-4">
                  <h3 className="font-semibold text-white">Daily Subscriptions & Revenue</h3>
                  <p className="text-xs text-surface-300">Collected amounts over the last 30 days</p>
                </div>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={revenueTrends}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                    <XAxis dataKey="date" tick={{ fill: '#666', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis yAxisId="left" tick={{ fill: '#666', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fill: '#666', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={CUSTOM_TOOLTIP_STYLE} />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    <Line yAxisId="left" type="monotone" name="Revenue (₹)" dataKey="revenue" stroke="#f59e0b" strokeWidth={2} activeDot={{ r: 8 }} />
                    <Line yAxisId="right" type="monotone" name="New Signups" dataKey="signups" stroke="#10b981" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </Card>

              {/* Subscriptions by plan table */}
              <Card>
                <div className="mb-4">
                  <h3 className="font-semibold text-white">Active Subscriptions</h3>
                  <p className="text-xs text-surface-300">Breakdown by plan tier</p>
                </div>
                {subscriptionBreakdown.length === 0 ? (
                  <div className="flex h-64 items-center justify-center text-sm text-surface-400">
                    No active subscriptions.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {subscriptionBreakdown.map((sub, index) => (
                      <div key={sub.plan_name} className="rounded-lg bg-surface-700/50 p-4 border border-surface-700">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-white capitalize">{sub.plan_name}</span>
                          <span
                            className="inline-block px-2 py-0.5 rounded text-xs font-semibold"
                            style={{
                              backgroundColor: `${COLORS[index % COLORS.length]}20`,
                              color: COLORS[index % COLORS.length]
                            }}
                          >
                            {sub.plan_type}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <p className="text-surface-300">Active Subs</p>
                            <p className="text-base font-bold text-white mt-0.5">{sub.count}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-surface-300">All-time Revenue</p>
                            <p className="text-base font-bold text-white mt-0.5">₹{formatNumber(sub.revenue)}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          )}

          {/* TOP CONTENT TAB */}
          {activeTab === 'content' && (
            <Card padding={false}>
              <div className="p-6 border-b border-surface-700">
                <h3 className="font-semibold text-white">Top 10 Contents</h3>
                <p className="text-xs text-surface-300">Most played movies and TV shows sorted by total view count</p>
              </div>
              {topContent.length === 0 ? (
                <p className="py-12 text-center text-sm text-surface-400">No content plays recorded yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-surface-200">
                    <thead className="bg-surface-750 text-xs font-semibold uppercase text-surface-300 border-b border-surface-750">
                      <tr>
                        <th className="px-6 py-4">Rank</th>
                        <th className="px-6 py-4">Title</th>
                        <th className="px-6 py-4">Type</th>
                        <th className="px-6 py-4">Plays</th>
                        <th className="px-6 py-4">Total Watch Duration</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-700">
                      {topContent.map((item, index) => (
                        <tr key={item.id} className="hover:bg-surface-700/50 transition-colors">
                          <td className="px-6 py-4 font-bold text-brand-400">#{index + 1}</td>
                          <td className="px-6 py-4 font-medium text-white">{item.title}</td>
                          <td className="px-6 py-4 capitalize font-mono text-xs text-surface-300">{item.type}</td>
                          <td className="px-6 py-4 font-semibold text-white">{formatNumber(item.plays)}</td>
                          <td className="px-6 py-4 text-surface-400 font-mono text-xs">{formatDuration(item.watch_seconds)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          )}

          {/* SEARCH QUERIES TAB */}
          {activeTab === 'searches' && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              {/* Queries stats table */}
              <Card className="lg:col-span-2" padding={false}>
                <div className="p-6 border-b border-surface-700">
                  <h3 className="font-semibold text-white">Top Search Phrases</h3>
                  <p className="text-xs text-surface-300">Most queried terms by platform users</p>
                </div>
                {searchAnalytics.length === 0 ? (
                  <p className="py-12 text-center text-sm text-surface-400">No queries tracked yet.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-surface-200">
                      <thead className="bg-surface-750 text-xs font-semibold uppercase text-surface-300 border-b border-surface-750">
                        <tr>
                          <th className="px-6 py-4">Query Phrase</th>
                          <th className="px-6 py-4">Searches Count</th>
                          <th className="px-6 py-4">Average Results Returned</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-surface-700">
                        {searchAnalytics.map((item) => (
                          <tr key={item.query} className="hover:bg-surface-700/50 transition-colors">
                            <td className="px-6 py-4 font-medium text-white italic">"{item.query}"</td>
                            <td className="px-6 py-4 font-semibold text-white">{formatNumber(item.count)}</td>
                            <td className="px-6 py-4 text-surface-400 font-mono text-xs">
                              {item.avg_results?.toFixed(1) ?? 0}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>

              {/* Tips / Insights card */}
              <Card>
                <div className="mb-4">
                  <h3 className="font-semibold text-white">Search Insights</h3>
                  <p className="text-xs text-surface-300">How to optimize your catalogue</p>
                </div>
                <div className="space-y-4 text-sm text-surface-200">
                  <div className="rounded-lg bg-surface-700/30 p-3 border border-surface-700">
                    <p className="font-semibold text-brand-400">Track Zero Results</p>
                    <p className="text-xs mt-1 text-surface-300">
                      Queries returning 0 results represent direct unmet demand. Use this list to prioritize content licensing or uploading.
                    </p>
                  </div>
                  <div className="rounded-lg bg-surface-700/30 p-3 border border-surface-700">
                    <p className="font-semibold text-blue-400">Alternative Slugs</p>
                    <p className="text-xs mt-1 text-surface-300">
                      Check spelling variations in searches. Adding common typos as tags or alternative titles can boost discovery scores.
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* GENRES PERFORMANCE TAB */}
          {activeTab === 'genres' && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              {/* Genre plays chart */}
              <Card className="lg:col-span-2">
                <div className="mb-4">
                  <h3 className="font-semibold text-white">Genre Plays Distribution</h3>
                  <p className="text-xs text-surface-300">Total plays across categories</p>
                </div>
                {genrePerformance.length === 0 ? (
                  <div className="flex h-64 items-center justify-center text-sm text-surface-400">
                    No plays recorded per genre yet.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={genrePerformance}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                      <XAxis dataKey="genre_name" tick={{ fill: '#666', fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: '#666', fontSize: 11 }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={CUSTOM_TOOLTIP_STYLE} />
                      <Bar dataKey="plays" name="Plays Count" fill="#e50914" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </Card>

              {/* Genre Table summary */}
              <Card padding={false}>
                <div className="p-6 border-b border-surface-700">
                  <h3 className="font-semibold text-white">Watch time per Genre</h3>
                  <p className="text-xs text-surface-300">Categorized user engagement</p>
                </div>
                {genrePerformance.length === 0 ? (
                  <p className="py-12 text-center text-sm text-surface-400">No records found.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-surface-200">
                      <thead className="bg-surface-750 text-xs font-semibold uppercase text-surface-300 border-b border-surface-750">
                        <tr>
                          <th className="px-6 py-4">Genre</th>
                          <th className="px-6 py-4">Plays</th>
                          <th className="px-6 py-4">Watch Duration</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-surface-700">
                        {genrePerformance.map((genre) => (
                          <tr key={genre.genre_name} className="hover:bg-surface-700/50 transition-colors">
                            <td className="px-6 py-4 font-medium text-white">{genre.genre_name}</td>
                            <td className="px-6 py-4 font-semibold text-white">{formatNumber(genre.plays)}</td>
                            <td className="px-6 py-4 text-surface-400 font-mono text-xs">{formatDuration(genre.watch_seconds)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
